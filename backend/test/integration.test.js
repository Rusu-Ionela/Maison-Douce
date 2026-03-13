const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");
const mongoose = require("mongoose");
const Stripe = require("stripe");
const CalendarSlotEntry = require("../models/CalendarSlotEntry");
const Utilizator = require("../models/Utilizator");

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function futureDate(daysAhead = 3) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().slice(0, 10);
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close((error) => {
        if (error) reject(error);
        else resolve(port);
      });
    });
  });
}

async function waitForHealth(baseUrl, attempts = 80) {
  let lastError = null;

  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        return;
      }
      lastError = new Error(`Health returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await wait(250);
  }

  throw lastError || new Error("Server health check failed.");
}

async function stopChild(child) {
  if (!child || child.exitCode !== null) {
    return;
  }

  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        // Ignore cleanup errors.
      }
    }, 5000);

    child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });

    try {
      child.kill("SIGTERM");
    } catch {
      clearTimeout(timeout);
      resolve();
    }
  });
}

function clearDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  for (const entry of fs.readdirSync(dirPath)) {
    fs.rmSync(path.join(dirPath, entry), { recursive: true, force: true });
  }
}

function createRequest(baseUrl) {
  return async function request(pathname, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.token) {
      headers.Authorization = `Bearer ${options.token}`;
    }

    let body;
    if (options.rawBody !== undefined) {
      body = options.rawBody;
    } else if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    const response = await fetch(`${baseUrl}${pathname}`, {
      method: options.method || "GET",
      headers,
      body,
    });

    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    return {
      status: response.status,
      data,
      headers: Object.fromEntries(response.headers.entries()),
    };
  };
}

function createMongoUri(baseUri) {
  const fallbackBase = "mongodb://127.0.0.1:27017/tort_app_integration";
  const source = String(baseUri || fallbackBase);
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const [root, query = ""] = source.split("?");
  const slashIndex = root.lastIndexOf("/");
  const prefix = slashIndex >= 0 ? root.slice(0, slashIndex + 1) : `${root}/`;
  const databaseName = slashIndex >= 0 ? root.slice(slashIndex + 1) : "tort_app_integration";
  const nextRoot = `${prefix}${databaseName}_${suffix}`;
  return query ? `${nextRoot}?${query}` : nextRoot;
}

async function createHarness(envOverrides = {}) {
  const backendDir = path.join(__dirname, "..");
  const mailOutboxDir = path.join(backendDir, "uploads", "mail-outbox");
  const port = await getFreePort();
  const mongoUri = createMongoUri(
    envOverrides.MONGODB_URI ||
      envOverrides.MONGO_URI ||
      process.env.MONGODB_URI ||
      process.env.MONGO_URI
  );
  const baseUrl = `http://127.0.0.1:${port}/api`;
  const logs = [];

  const child = spawn("node", ["index.js"], {
    cwd: backendDir,
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: String(port),
      MONGODB_URI: mongoUri,
      JWT_SECRET: process.env.JWT_SECRET || "integration-secret",
      BASE_CLIENT_URL: "http://127.0.0.1:5173",
      STRIPE_SECRET_KEY: "",
      STRIPE_SECRET: "",
      STRIPE_SK: "",
      STRIPE_WEBHOOK_SECRET: "",
      SMTP_USER: "",
      SMTP_PASS: "",
      ...envOverrides,
      PORT: String(port),
      MONGODB_URI: mongoUri,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => logs.push(chunk.toString()));
  child.stderr.on("data", (chunk) => logs.push(chunk.toString()));

  child.once("exit", (code) => {
    if (code !== 0) {
      logs.push(`server exited early with code ${code}`);
    }
  });

  try {
    await waitForHealth(baseUrl);
  } catch (error) {
    await stopChild(child);
    throw new Error(
      `Backend test server failed to start: ${error.message}\n${logs.join("")}`
    );
  }

  await mongoose.connect(mongoUri);

  return {
    baseUrl,
    logs,
    request: createRequest(baseUrl),
    async resetDb() {
      await mongoose.connection.db.dropDatabase();
      clearDirectory(mailOutboxDir);
    },
    clearMailOutbox() {
      clearDirectory(mailOutboxDir);
    },
    readLatestResetToken() {
      if (!fs.existsSync(mailOutboxDir)) {
        throw new Error("Mail outbox directory is missing.");
      }

      const files = fs
        .readdirSync(mailOutboxDir)
        .map((name) => ({
          name,
          fullPath: path.join(mailOutboxDir, name),
          mtimeMs: fs.statSync(path.join(mailOutboxDir, name)).mtimeMs,
        }))
        .sort((left, right) => right.mtimeMs - left.mtimeMs);

      if (!files.length) {
        throw new Error("No reset email found in outbox.");
      }

      const latest = JSON.parse(fs.readFileSync(files[0].fullPath, "utf8"));
      const match = String(latest.html || "").match(/token=([^"&<]+)/i);
      if (!match?.[1]) {
        throw new Error("Reset token not found in outbox email.");
      }

      return decodeURIComponent(match[1]);
    },
    async stop() {
      await mongoose.connection.close();
      await stopChild(child);
    },
  };
}

function uniqueEmail(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

test("backend integration flows", async (t) => {
  const harness = await createHarness();

  async function registerUser(role = "client") {
    const password = "Secret123!";
    const response = await harness.request("/utilizatori/register", {
      method: "POST",
      body: {
        nume: `User ${role}`,
        email: uniqueEmail(role),
        parola: password,
        rol: role,
        inviteCode: role === "patiser" ? "PATISER-INVITE" : "",
        telefon: "+37360000000",
        adresa: "Strada Test 1",
      },
    });

    return {
      ...response,
      password,
      token: response.data?.token,
      user: response.data?.user,
      email: response.data?.user?.email,
    };
  }

  async function createOrder(token, overrides = {}) {
    return harness.request("/comenzi", {
      method: "POST",
      token,
      body: {
        items: [
          {
            productId: "cake-1",
            name: "Tort test",
            qty: 1,
            price: 150,
          },
        ],
        metodaLivrare: "ridicare",
        prestatorId: "default",
        dataLivrare: futureDate(4),
        oraLivrare: "12:00",
        ...overrides,
      },
    });
  }

  async function seedUser(role = "admin") {
    const email = uniqueEmail(role);
    const password = "Secret123!";
    const response = await harness.request("/auth/seed-test-user", {
      method: "POST",
      body: {
        email,
        password,
        rol: role,
      },
    });

    return {
      ...response,
      email,
      password,
      token: response.data?.token,
      user: response.data?.user,
    };
  }

  try {
    await t.test("public auth blocks admin registration and supports login/me", async () => {
      await harness.resetDb();

      const adminRegister = await harness.request("/utilizatori/register", {
        method: "POST",
        body: {
          nume: "Admin public",
          email: uniqueEmail("admin"),
          parola: "Secret123!",
          rol: "admin",
        },
      });
      assert.equal(adminRegister.status, 403);

      const clientRegister = await registerUser("client");
      assert.equal(clientRegister.status, 201);
      assert.ok(clientRegister.token);
      assert.equal(clientRegister.user.rol, "client");

      const login = await harness.request("/utilizatori/login", {
        method: "POST",
        body: {
          email: clientRegister.user.email,
          parola: clientRegister.password,
        },
      });
      assert.equal(login.status, 200);
      assert.ok(login.data?.token);

      const me = await harness.request("/utilizatori/me", {
        token: login.data.token,
      });
      assert.equal(me.status, 200);
      assert.equal(me.data?.email, clientRegister.user.email);
    });

    await t.test("reset password issues a mail token and invalidates the old password", async () => {
      await harness.resetDb();

      const client = await registerUser("client");
      assert.equal(client.status, 201);
      harness.clearMailOutbox();

      const sendReset = await harness.request("/reset-parola/send-reset-email", {
        method: "POST",
        body: { email: client.user.email },
      });
      assert.equal(sendReset.status, 200);
      assert.match(sendReset.data?.message || "", /Daca exista un cont/i);

      const rawToken = harness.readLatestResetToken();
      assert.ok(rawToken);

      const userBeforeReset = await Utilizator.findOne({ email: client.user.email })
        .select("+resetToken +resetTokenExp +parolaHash +parola")
        .lean();
      assert.ok(userBeforeReset?.resetToken);
      assert.ok(userBeforeReset?.resetTokenExp);

      const resetPassword = await harness.request("/utilizatori/reset-password", {
        method: "POST",
        body: {
          token: rawToken,
          newPassword: "NewSecret123!",
        },
      });
      assert.equal(resetPassword.status, 200);
      assert.equal(resetPassword.data?.ok, true);

      const oldLogin = await harness.request("/utilizatori/login", {
        method: "POST",
        body: {
          email: client.user.email,
          parola: client.password,
        },
      });
      assert.equal(oldLogin.status, 401);

      const newLogin = await harness.request("/utilizatori/login", {
        method: "POST",
        body: {
          email: client.user.email,
          parola: "NewSecret123!",
        },
      });
      assert.equal(newLogin.status, 200);
      assert.ok(newLogin.data?.token);

      const userAfterReset = await Utilizator.findOne({ email: client.user.email })
        .select("+resetToken +resetTokenExp")
        .lean();
      assert.equal(userAfterReset?.resetToken || "", "");
      assert.equal(userAfterReset?.resetTokenExp, undefined);
    });

    await t.test("client runtime errors are accepted through the monitoring endpoint", async () => {
      await harness.resetDb();

      const client = await registerUser("client");
      assert.equal(client.status, 201);

      const report = await harness.request("/monitoring/client-error", {
        method: "POST",
        body: {
          kind: "react_render_error",
          message: "Boundary exploded",
          stack: "Error: Boundary exploded",
          componentStack: "at App",
          url: "http://127.0.0.1:5173/profil",
          userId: client.user._id,
          userEmail: client.user.email,
          userRole: client.user.rol,
          release: "test-suite",
          metadata: {
            page: "profil",
          },
        },
      });
      assert.equal(report.status, 202);
      assert.equal(report.data?.ok, true);
    });

    await t.test("api responses expose hardened security headers", async () => {
      const health = await harness.request("/health");
      assert.equal(health.status, 200);
      assert.equal(health.headers["x-content-type-options"], "nosniff");
      assert.equal(health.headers["x-frame-options"], "DENY");
      assert.equal(
        health.headers["referrer-policy"],
        "strict-origin-when-cross-origin"
      );
      assert.equal(
        health.headers["permissions-policy"],
        "camera=(), microphone=(), geolocation=()"
      );
    });

    await t.test("admin actions are persisted in the audit trail", async () => {
      await harness.resetDb();

      const client = await registerUser("client");
      const admin = await seedUser("admin");
      assert.equal(client.status, 201);
      assert.equal(admin.status, 200);

      const createdOrder = await createOrder(client.token);
      assert.equal(createdOrder.status, 201);

      const updateStatus = await harness.request(`/comenzi/${createdOrder.data._id}/status`, {
        method: "PATCH",
        token: admin.token,
        body: {
          status: "anulata",
          note: "Audit integration test",
        },
      });
      assert.equal(updateStatus.status, 200);

      const auditLogs = await harness.request(
        "/audit?action=order.status.updated&entityType=comanda&limit=5",
        {
          token: admin.token,
        }
      );
      assert.equal(auditLogs.status, 200);
      assert.ok(Array.isArray(auditLogs.data?.items));
      assert.equal(auditLogs.data.items.length, 1);
      assert.equal(auditLogs.data.items[0].action, "order.status.updated");
      assert.equal(String(auditLogs.data.items[0].entityId), String(createdOrder.data._id));
      assert.equal(auditLogs.data.items[0].actorRole, "admin");
    });

    await t.test("orders and wallets remain owner scoped", async () => {
      await harness.resetDb();

      const owner = await registerUser("client");
      const other = await registerUser("client");
      assert.equal(owner.status, 201);
      assert.equal(other.status, 201);

      const createdOrder = await createOrder(owner.token);
      assert.equal(createdOrder.status, 201);
      const orderId = createdOrder.data?._id;
      assert.ok(orderId);

      const ownerOrder = await harness.request(`/comenzi/${orderId}`, {
        token: owner.token,
      });
      assert.equal(ownerOrder.status, 200);

      const otherOrder = await harness.request(`/comenzi/${orderId}`, {
        token: other.token,
      });
      assert.equal(otherOrder.status, 403);

      const ownerWallet = await harness.request(
        `/fidelizare/client/${owner.user.id}`,
        {
          token: owner.token,
        }
      );
      assert.equal(ownerWallet.status, 200);
      assert.equal(ownerWallet.data?.puncteCurent, 0);

      const otherWallet = await harness.request(
        `/fidelizare/client/${owner.user.id}`,
        {
          token: other.token,
        }
      );
      assert.equal(otherWallet.status, 403);
    });

    await t.test("coupon and fidelizare flows update totals consistently", async () => {
      await harness.resetDb();

      const admin = await seedUser("admin");
      const client = await registerUser("client");
      assert.equal(admin.status, 200);
      assert.equal(client.status, 201);

      const couponCreate = await harness.request("/coupon/create", {
        method: "POST",
        token: admin.token,
        body: {
          cod: "SAVE10",
          procentReducere: 10,
        },
      });
      assert.equal(couponCreate.status, 200);

      const couponOrder = await createOrder(client.token);
      assert.equal(couponOrder.status, 201);
      const couponApply = await harness.request("/coupon/apply", {
        method: "POST",
        token: client.token,
        body: {
          cod: "save10",
          comandaId: couponOrder.data._id,
        },
      });
      assert.equal(couponApply.status, 200);
      assert.equal(couponApply.data?.discount, 15);
      assert.equal(couponApply.data?.newTotal, 135);

      const couponOrderDetail = await harness.request(
        `/comenzi/${couponOrder.data._id}`,
        { token: client.token }
      );
      assert.equal(couponOrderDetail.status, 200);
      assert.equal(couponOrderDetail.data?.discountTotal, 15);
      assert.equal(couponOrderDetail.data?.voucherCode, "SAVE10");
      assert.equal(couponOrderDetail.data?.totalFinal, 135);

      const addPoints = await harness.request("/fidelizare/add-points", {
        method: "POST",
        token: admin.token,
        body: {
          utilizatorId: client.user.id,
          puncte: 220,
          sursa: "integration-test",
        },
      });
      assert.equal(addPoints.status, 200);
      assert.equal(addPoints.data?.fidelizare?.puncteCurent, 220);

      const pointsOrder = await createOrder(client.token);
      assert.equal(pointsOrder.status, 201);
      const applyPoints = await harness.request("/fidelizare/apply-points", {
        method: "POST",
        token: client.token,
        body: {
          utilizatorId: client.user.id,
          puncte: 100,
          comandaId: pointsOrder.data._id,
        },
      });
      assert.equal(applyPoints.status, 200);
      assert.equal(applyPoints.data?.discount, 50);
      assert.equal(applyPoints.data?.newTotal, 100);
      assert.equal(applyPoints.data?.puncteRamase, 120);

      const pointsOrderDetail = await harness.request(
        `/comenzi/${pointsOrder.data._id}`,
        { token: client.token }
      );
      assert.equal(pointsOrderDetail.status, 200);
      assert.equal(pointsOrderDetail.data?.pointsUsed, 100);
      assert.equal(pointsOrderDetail.data?.totalFinal, 100);

      const redeemVoucher = await harness.request("/fidelizare/redeem", {
        method: "POST",
        token: client.token,
        body: {
          utilizatorId: client.user.id,
          puncteDeUtilizat: 100,
        },
      });
      assert.equal(redeemVoucher.status, 200);
      assert.ok(redeemVoucher.data?.voucher?.cod);
      assert.equal(redeemVoucher.data?.puncteCurent, 20);

      const voucherOrder = await createOrder(client.token);
      assert.equal(voucherOrder.status, 201);
      const applyVoucher = await harness.request("/fidelizare/apply-voucher", {
        method: "POST",
        token: client.token,
        body: {
          utilizatorId: client.user.id,
          cod: redeemVoucher.data.voucher.cod,
          comandaId: voucherOrder.data._id,
        },
      });
      assert.equal(applyVoucher.status, 200);
      assert.equal(applyVoucher.data?.discount, 50);
      assert.equal(applyVoucher.data?.newTotal, 100);

      const wallet = await harness.request(
        `/fidelizare/client/${client.user.id}`,
        { token: client.token }
      );
      assert.equal(wallet.status, 200);
      assert.equal(wallet.data?.puncteCurent, 20);

      const blockedCoupon = await harness.request("/coupon/apply", {
        method: "POST",
        token: client.token,
        body: {
          cod: "SAVE10",
          comandaId: voucherOrder.data._id,
        },
      });
      assert.equal(blockedCoupon.status, 409);
    });

    await t.test("subscriptions support pause resume pending plan changes and staff management", async () => {
      await harness.resetDb();

      const client = await registerUser("client");
      const staff = await registerUser("patiser");
      assert.equal(client.status, 201);
      assert.equal(staff.status, 201);

      const initialCheckout = await harness.request("/cutie-lunara/checkout", {
        method: "POST",
        token: client.token,
        body: {
          plan: "basic",
          preferinte: "fara nuci",
        },
      });
      assert.equal(initialCheckout.status, 201);
      assert.ok(initialCheckout.data?.comandaId);

      const pendingSubscription = await harness.request("/cutie-lunara/me", {
        token: client.token,
      });
      assert.equal(pendingSubscription.status, 200);
      assert.equal(pendingSubscription.data?.abonament?.activ, false);
      assert.equal(pendingSubscription.data?.abonament?.plan, "basic");
      assert.equal(pendingSubscription.data?.abonament?.statusPlata, "pending");

      const blockedResume = await harness.request(
        `/cutie-lunara/${pendingSubscription.data.abonament._id}/resume`,
        {
          method: "PATCH",
          token: client.token,
        }
      );
      assert.equal(blockedResume.status, 409);

      const firstPayment = await harness.request("/stripe/fallback-confirm", {
        method: "POST",
        token: client.token,
        body: { comandaId: initialCheckout.data.comandaId },
      });
      assert.equal(firstPayment.status, 200);

      const firstActivation = await harness.request(
        `/cutie-lunara/activate-from-order/${initialCheckout.data.comandaId}`,
        {
          method: "POST",
          token: client.token,
        }
      );
      assert.equal(firstActivation.status, 200);
      assert.equal(firstActivation.data?.abonament?.activ, true);
      assert.equal(firstActivation.data?.abonament?.plan, "basic");

      const savedPreferences = await harness.request(
        `/cutie-lunara/${firstActivation.data.abonament._id}`,
        {
          method: "PATCH",
          token: client.token,
          body: {
            preferinte: "fara nuci si arahide",
          },
        }
      );
      assert.equal(savedPreferences.status, 200);
      assert.equal(savedPreferences.data?.abonament?.preferinte, "fara nuci si arahide");

      const pause = await harness.request(
        `/cutie-lunara/${firstActivation.data.abonament._id}/pause`,
        {
          method: "PATCH",
          token: client.token,
        }
      );
      assert.equal(pause.status, 200);
      assert.equal(pause.data?.abonament?.activ, false);

      const resume = await harness.request(
        `/cutie-lunara/${firstActivation.data.abonament._id}/resume`,
        {
          method: "PATCH",
          token: client.token,
        }
      );
      assert.equal(resume.status, 200);
      assert.equal(resume.data?.abonament?.activ, true);

      const blockedDirectPlanChange = await harness.request(
        `/cutie-lunara/${firstActivation.data.abonament._id}`,
        {
          method: "PATCH",
          token: client.token,
          body: {
            plan: "premium",
          },
        }
      );
      assert.equal(blockedDirectPlanChange.status, 409);

      const pendingChange = await harness.request("/cutie-lunara/checkout", {
        method: "POST",
        token: client.token,
        body: {
          plan: "deluxe",
          preferinte: "fara gluten",
        },
      });
      assert.equal(pendingChange.status, 201);

      const reusedPendingChange = await harness.request("/cutie-lunara/checkout", {
        method: "POST",
        token: client.token,
        body: {
          plan: "deluxe",
          preferinte: "fara gluten si capsuni",
        },
      });
      assert.equal(reusedPendingChange.status, 200);
      assert.equal(
        String(reusedPendingChange.data?.comandaId),
        String(pendingChange.data?.comandaId)
      );

      const activeWithPendingChange = await harness.request("/cutie-lunara/me", {
        token: client.token,
      });
      assert.equal(activeWithPendingChange.status, 200);
      assert.equal(activeWithPendingChange.data?.abonament?.activ, true);
      assert.equal(activeWithPendingChange.data?.abonament?.plan, "basic");
      assert.equal(activeWithPendingChange.data?.abonament?.pendingPlan, "deluxe");
      assert.equal(
        activeWithPendingChange.data?.abonament?.pendingPreferinte,
        "fara gluten si capsuni"
      );

      const staffList = await harness.request("/cutie-lunara", {
        token: staff.token,
      });
      assert.equal(staffList.status, 200);
      assert.equal(staffList.data?.length, 1);
      assert.equal(staffList.data?.[0]?.pendingPlan, "deluxe");

      const secondPayment = await harness.request("/stripe/fallback-confirm", {
        method: "POST",
        token: client.token,
        body: { comandaId: pendingChange.data.comandaId },
      });
      assert.equal(secondPayment.status, 200);

      const secondActivation = await harness.request(
        `/cutie-lunara/activate-from-order/${pendingChange.data.comandaId}`,
        {
          method: "POST",
          token: client.token,
        }
      );
      assert.equal(secondActivation.status, 200);
      assert.equal(secondActivation.data?.abonament?.activ, true);
      assert.equal(secondActivation.data?.abonament?.plan, "deluxe");
      assert.equal(secondActivation.data?.abonament?.pendingPlan, undefined);
      assert.equal(secondActivation.data?.abonament?.pendingOrderId, null);

      const stoppedByStaff = await harness.request(
        `/cutie-lunara/${secondActivation.data.abonament._id}/stop`,
        {
          method: "PATCH",
          token: staff.token,
        }
      );
      assert.equal(stoppedByStaff.status, 200);
      assert.equal(stoppedByStaff.data?.abonament?.activ, false);
      assert.equal(stoppedByStaff.data?.abonament?.pendingOrderId, null);
    });

    await t.test("calendar reserve creates reservation, order and slot usage", async () => {
      await harness.resetDb();

      const staff = await registerUser("patiser");
      const client = await registerUser("client");
      assert.equal(staff.status, 201);
      assert.equal(client.status, 201);

      const date = futureDate(5);
      const addSlot = await harness.request("/calendar/availability/default", {
        method: "POST",
        token: staff.token,
        body: {
          slots: [{ date, time: "14:00", capacity: 2 }],
        },
      });
      assert.equal(addSlot.status, 200);
      assert.equal(addSlot.data?.ok, true);

      const reserve = await harness.request("/calendar/reserve", {
        method: "POST",
        token: client.token,
        body: {
          prestatorId: "default",
          date,
          time: "14:00",
          metoda: "ridicare",
          subtotal: 120,
          descriere: "Tort aniversar",
        },
      });
      assert.equal(reserve.status, 200);
      assert.equal(reserve.data?.ok, true);
      assert.ok(reserve.data?.comandaId);
      assert.ok(reserve.data?.rezervareId);

      const order = await harness.request(`/comenzi/${reserve.data.comandaId}`, {
        token: client.token,
      });
      assert.equal(order.status, 200);
      assert.equal(order.data?.total, 120);

      const availability = await harness.request(
        `/calendar/availability/default?from=${date}&to=${date}`
      );
      assert.equal(availability.status, 200);
      assert.equal(availability.data?.slots?.[0]?.used, 1);
      assert.equal(availability.data?.slots?.[0]?.free, 1);
    });

    await t.test("staff can reschedule an order and owner can cancel it with slot rollback", async () => {
      await harness.resetDb();

      const staff = await registerUser("patiser");
      const client = await registerUser("client");
      assert.equal(staff.status, 201);
      assert.equal(client.status, 201);

      const firstDate = futureDate(7);
      const secondDate = futureDate(8);

      const addFirstSlot = await harness.request("/calendar/availability/default", {
        method: "POST",
        token: staff.token,
        body: {
          slots: [{ date: firstDate, time: "10:00", capacity: 1 }],
        },
      });
      const addSecondSlot = await harness.request("/calendar/availability/default", {
        method: "POST",
        token: staff.token,
        body: {
          slots: [{ date: secondDate, time: "11:30", capacity: 1 }],
        },
      });
      assert.equal(addFirstSlot.status, 200);
      assert.equal(addSecondSlot.status, 200);

      await CalendarSlotEntry.updateOne(
        { prestatorId: "default", date: firstDate, time: "10:00" },
        { $set: { used: 1 } }
      );

      const createdOrder = await createOrder(client.token, {
        prestatorId: "default",
        dataLivrare: firstDate,
        oraLivrare: "10:00",
        items: [
          {
            productId: "cake-slot",
            name: "Tort slot",
            qty: 1,
            price: 180,
          },
        ],
      });
      assert.equal(createdOrder.status, 201);
      const orderId = createdOrder.data?._id;
      assert.ok(orderId);

      const reschedule = await harness.request(`/comenzi/${orderId}/schedule`, {
        method: "PATCH",
        token: staff.token,
        body: {
          dataLivrare: secondDate,
          oraLivrare: "11:30",
        },
      });
      assert.equal(reschedule.status, 200);
      assert.equal(reschedule.data?.ok, true);

      const firstAvailability = await harness.request(
        `/calendar/availability/default?from=${firstDate}&to=${firstDate}`
      );
      const secondAvailability = await harness.request(
        `/calendar/availability/default?from=${secondDate}&to=${secondDate}`
      );
      assert.equal(firstAvailability.status, 200);
      assert.equal(secondAvailability.status, 200);
      assert.equal(firstAvailability.data?.slots?.[0]?.used, 0);
      assert.equal(secondAvailability.data?.slots?.[0]?.used, 1);

      const cancelByOwner = await harness.request(`/comenzi/${orderId}/cancel`, {
        method: "PATCH",
        token: client.token,
      });
      assert.equal(cancelByOwner.status, 200);
      assert.equal(cancelByOwner.data?.ok, true);

      const canceledOrder = await harness.request(`/comenzi/${orderId}`, {
        token: client.token,
      });
      assert.equal(canceledOrder.status, 200);
      assert.equal(canceledOrder.data?.status, "anulata");

      const rolledBackAvailability = await harness.request(
        `/calendar/availability/default?from=${secondDate}&to=${secondDate}`
      );
      assert.equal(rolledBackAvailability.status, 200);
      assert.equal(rolledBackAvailability.data?.slots?.[0]?.used, 0);
    });

    await t.test("fallback payment confirmation only works for the owner", async () => {
      await harness.resetDb();

      const owner = await registerUser("client");
      const other = await registerUser("client");
      const createdOrder = await createOrder(owner.token);
      assert.equal(createdOrder.status, 201);
      const orderId = createdOrder.data?._id;

      const otherConfirm = await harness.request("/stripe/fallback-confirm", {
        method: "POST",
        token: other.token,
        body: { comandaId: orderId },
      });
      assert.equal(otherConfirm.status, 403);

      const ownerConfirm = await harness.request("/stripe/fallback-confirm", {
        method: "POST",
        token: owner.token,
        body: { comandaId: orderId },
      });
      assert.equal(ownerConfirm.status, 200);
      assert.equal(ownerConfirm.data?.paymentStatus, "paid");

      const paidOrder = await harness.request(`/comenzi/${orderId}`, {
        token: owner.token,
      });
      assert.equal(paidOrder.status, 200);
      assert.equal(paidOrder.data?.paymentStatus, "paid");
      assert.equal(paidOrder.data?.statusPlata, "paid");
    });
  } finally {
    await harness.stop();
  }
});

test("stripe webhook integration awards payment state and fidelizare once", async (t) => {
  const webhookSecret = "whsec_test_integration";
  const stripe = new Stripe("sk_test_integration", {
    apiVersion: "2023-10-16",
  });
  const harness = await createHarness({
    STRIPE_SECRET_KEY: "sk_test_integration",
    STRIPE_WEBHOOK_SECRET: webhookSecret,
  });

  async function registerClient() {
    const password = "Secret123!";
    const response = await harness.request("/utilizatori/register", {
      method: "POST",
      body: {
        nume: "Stripe Client",
        email: uniqueEmail("stripe-client"),
        parola: password,
        rol: "client",
      },
    });
    return {
      ...response,
      password,
      token: response.data?.token,
      user: response.data?.user,
    };
  }

  try {
    await harness.resetDb();

    const client = await registerClient();
    assert.equal(client.status, 201);

    const order = await harness.request("/comenzi", {
      method: "POST",
      token: client.token,
      body: {
        items: [
          {
            productId: "cake-webhook",
            name: "Tort webhook",
            qty: 1,
            price: 150,
          },
        ],
        metodaLivrare: "ridicare",
        prestatorId: "default",
        dataLivrare: futureDate(6),
        oraLivrare: "16:00",
      },
    });
    assert.equal(order.status, 201);
    const orderId = order.data?._id;
    assert.ok(orderId);

    const eventPayload = JSON.stringify({
      id: "evt_test_payment_intent_succeeded",
      object: "event",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_test_webhook",
          object: "payment_intent",
          metadata: { orderId },
        },
      },
    });
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: eventPayload,
      secret: webhookSecret,
    });

    const webhookResponse = await harness.request("/stripe/webhook", {
      method: "POST",
      rawBody: eventPayload,
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": signature,
      },
    });
    assert.equal(webhookResponse.status, 200);
    assert.equal(webhookResponse.data?.received, true);

    const paidOrder = await harness.request(`/comenzi/${orderId}`, {
      token: client.token,
    });
    assert.equal(paidOrder.status, 200);
    assert.equal(paidOrder.data?.paymentStatus, "paid");
    assert.equal(paidOrder.data?.statusPlata, "paid");

    const walletAfterFirstWebhook = await harness.request(
      `/fidelizare/client/${client.user.id}`,
      { token: client.token }
    );
    assert.equal(walletAfterFirstWebhook.status, 200);
    assert.equal(walletAfterFirstWebhook.data?.puncteCurent, 15);

    const secondWebhook = await harness.request("/stripe/webhook", {
      method: "POST",
      rawBody: eventPayload,
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": signature,
      },
    });
    assert.equal(secondWebhook.status, 200);

    const walletAfterSecondWebhook = await harness.request(
      `/fidelizare/client/${client.user.id}`,
      { token: client.token }
    );
    assert.equal(walletAfterSecondWebhook.status, 200);
    assert.equal(walletAfterSecondWebhook.data?.puncteCurent, 15);
  } finally {
    await harness.stop();
  }
});
