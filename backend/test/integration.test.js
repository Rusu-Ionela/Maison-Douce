const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");
const mongoose = require("mongoose");
const Stripe = require("stripe");
const CalendarSlotEntry = require("../models/CalendarSlotEntry");
const Comanda = require("../models/Comanda");
const ComandaPersonalizata = require("../models/ComandaPersonalizata");
const Rezervare = require("../models/Rezervare");
const Tort = require("../models/Tort");
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
  const mailOutboxDir = path.join(backendDir, ".runtime", "mail-outbox");
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
    const email = uniqueEmail(role);
    const response =
      role === "client"
        ? await harness.request("/utilizatori/register", {
            method: "POST",
            body: {
              nume: `User ${role}`,
              email,
              parola: password,
              rol: role,
              telefon: "+37360000000",
              adresa: "Strada Test 1",
            },
          })
        : await harness.request("/auth/seed-test-user", {
            method: "POST",
            body: {
              email,
              password,
              rol: role,
            },
          });

    const normalizedUser = response.data?.user
      ? {
          ...response.data.user,
          id: response.data.user.id || response.data.user._id,
        }
      : undefined;

    return {
      ...response,
      password,
      token: response.data?.token,
      user: normalizedUser,
      email: normalizedUser?.email,
    };
  }

  async function createOrder(token, overrides = {}) {
    const hasExplicitItems = Object.prototype.hasOwnProperty.call(overrides, "items");
    const rawItems = hasExplicitItems
      ? overrides.items
      : [
          {
            productId: "cake-1",
            name: "Tort test",
            qty: 1,
            price: 150,
          },
        ];
    const items = Array.isArray(rawItems)
      ? await Promise.all(
          rawItems.map(async (item, index) => {
            const rawProductId = String(item?.productId || item?.tortId || "").trim();
            let tort = null;

            if (mongoose.Types.ObjectId.isValid(rawProductId)) {
              tort = await Tort.findById(rawProductId);
            }

            if (!tort) {
              tort = await Tort.create({
                nume: item?.name || item?.nume || `Tort test ${index + 1}`,
                descriere: "Produs de integrare pentru comenzi",
                pret: Number(item?.price || item?.pret || 150),
                activ: true,
                timpPreparareOre: Number(
                  item?.prepHours || item?.timpPreparareOre || 24
                ),
              });
            }

            const qty = Math.max(1, Number(item?.qty || item?.cantitate || 1));
            return {
              productId: String(tort._id),
              name: tort.nume,
              qty,
              price: Number(tort.pret || 0),
            };
          })
        )
      : [];

    return harness.request("/comenzi", {
      method: "POST",
      token,
      body: {
        metodaLivrare: "ridicare",
        prestatorId: "default",
        dataLivrare: futureDate(4),
        oraLivrare: "12:00",
        ...overrides,
        items,
      },
    });
  }

  async function markOrderDelivered(orderId, staffToken) {
    await Comanda.findByIdAndUpdate(orderId, {
      paymentStatus: "paid",
      statusPlata: "paid",
    });

    return harness.request(`/comenzi/${orderId}/status`, {
      method: "PATCH",
      token: staffToken,
      body: {
        status: "livrata",
        note: "Eligibila pentru recenzie in test.",
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
      status: response.status === 201 ? 200 : response.status,
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
      assert.match(adminRegister.data?.message || "", /Rolurile interne/i);

      const providerRegister = await harness.request("/utilizatori/register", {
        method: "POST",
        body: {
          nume: "Provider public",
          email: uniqueEmail("patiser-public"),
          parola: "Secret123!",
          rol: "patiser",
          inviteCode: "PATISER-INVITE",
        },
      });
      assert.equal(providerRegister.status, 403);
      assert.match(providerRegister.data?.message || "", /Rolurile interne/i);

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

    await t.test("authenticated users can change password and deactivate their account", async () => {
      await harness.resetDb();

      const client = await registerUser("client");
      assert.equal(client.status, 201);

      const changePassword = await harness.request("/utilizatori/me/change-password", {
        method: "POST",
        token: client.token,
        body: {
          currentPassword: client.password,
          newPassword: "ChangedSecret123!",
        },
      });
      assert.equal(changePassword.status, 200);
      assert.equal(changePassword.data?.ok, true);
      assert.ok(changePassword.data?.user?.lastPasswordChangeAt);

      const loginWithOldPassword = await harness.request("/utilizatori/login", {
        method: "POST",
        body: {
          email: client.user.email,
          parola: client.password,
        },
      });
      assert.equal(loginWithOldPassword.status, 401);

      const loginWithNewPassword = await harness.request("/utilizatori/login", {
        method: "POST",
        body: {
          email: client.user.email,
          parola: "ChangedSecret123!",
        },
      });
      assert.equal(loginWithNewPassword.status, 200);
      assert.ok(loginWithNewPassword.data?.token);

      const deactivateAccount = await harness.request("/utilizatori/me/deactivate", {
        method: "POST",
        token: loginWithNewPassword.data.token,
        body: {
          currentPassword: "ChangedSecret123!",
          reason: "Nu mai am nevoie de cont.",
        },
      });
      assert.equal(deactivateAccount.status, 200);
      assert.equal(deactivateAccount.data?.ok, true);

      const meAfterDeactivate = await harness.request("/utilizatori/me", {
        token: loginWithNewPassword.data.token,
      });
      assert.equal(meAfterDeactivate.status, 401);

      const loginAfterDeactivate = await harness.request("/utilizatori/login", {
        method: "POST",
        body: {
          email: client.user.email,
          parola: "ChangedSecret123!",
        },
      });
      assert.equal(loginAfterDeactivate.status, 403);

      harness.clearMailOutbox();
      const resetAfterDeactivate = await harness.request("/reset-parola/send-reset-email", {
        method: "POST",
        body: {
          email: client.user.email,
        },
      });
      assert.equal(resetAfterDeactivate.status, 200);
      assert.match(resetAfterDeactivate.data?.message || "", /Daca exista un cont/i);

      const deactivatedUser = await Utilizator.findOne({ email: client.user.email })
        .select("+resetToken +resetTokenExp")
        .lean();
      assert.equal(deactivatedUser?.activ, false);
      assert.ok(deactivatedUser?.deactivatedAt);
      assert.equal(deactivatedUser?.resetToken || "", "");
      assert.equal(deactivatedUser?.resetTokenExp, undefined);
      assert.match(deactivatedUser?.preferinte?.note || "", /Dezactivare cont:/i);
    });

    await t.test("client runtime errors are accepted through the monitoring endpoint", async () => {
      await harness.resetDb();

      const client = await registerUser("client");
      const admin = await seedUser("admin");
      assert.equal(client.status, 201);
      assert.equal(admin.status, 200);

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

      const monitoringList = await harness.request(
        "/monitoring/client-errors?kind=react_render_error&search=Boundary",
        {
          token: admin.token,
        }
      );
      assert.equal(monitoringList.status, 200);
      assert.ok(Array.isArray(monitoringList.data?.items));
      assert.equal(monitoringList.data.items.length, 1);
      assert.equal(monitoringList.data.items[0].kind, "react_render_error");
      assert.equal(monitoringList.data.items[0].userEmail, client.user.email);
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

    await t.test("assistant replies use backend knowledge base for public and authenticated users", async () => {
      await harness.resetDb();

      const client = await registerUser("client");
      const staff = await registerUser("patiser");
      assert.equal(client.status, 201);
      assert.equal(staff.status, 201);

      const createCustomEntry = await harness.request("/assistant/admin", {
        method: "POST",
        token: staff.token,
        body: {
          title: "Unde gasesc ghidul pentru constructor?",
          answer:
            "Ghidul este in pagina de personalizare, iar pentru editarea directa a designului mergi in constructorul 2D.",
          keywords: ["ghid constructor", "constructor", "ghid utilizare"],
          priority: 10,
          active: true,
          actions: [
            {
              type: "route",
              label: "Ghid de utilizare",
              to: "/personalizeaza",
            },
            {
              type: "route",
              label: "Constructor 2D",
              to: "/constructor",
            },
          ],
        },
      });
      assert.equal(createCustomEntry.status, 201);
      assert.equal(
        createCustomEntry.data?.item?.title,
        "Unde gasesc ghidul pentru constructor?"
      );

      const publicReply = await harness.request("/assistant/reply", {
        method: "POST",
        body: {
          query: "unde gasesc ghidul pentru constructor",
          pathname: "/",
        },
      });
      assert.equal(publicReply.status, 200);
      assert.match(publicReply.data?.intentId || "", /^custom:/);
      assert.equal(publicReply.data?.source, "assistant_knowledge_base");
      assert.ok(Array.isArray(publicReply.data?.starterQuestions));
      assert.ok(
        publicReply.data?.starterQuestions?.includes(
          "Unde gasesc ghidul pentru constructor?"
        )
      );
      assert.ok(
        publicReply.data?.actions?.some((action) => action.to === "/personalizeaza")
      );

      const authReply = await harness.request("/assistant/reply", {
        method: "POST",
        token: client.token,
        body: {
          query: "cum vorbesc cu patiserul",
          pathname: "/catalog",
        },
      });
      assert.equal(authReply.status, 200);
      assert.equal(authReply.data?.intentId, "contact");
      assert.ok(authReply.data?.actions?.some((action) => action.to === "/chat"));

      const unansweredReply = await harness.request("/assistant/reply", {
        method: "POST",
        body: {
          query: "cum comand un tort vegan fara zahar",
          pathname: "/catalog",
        },
      });
      assert.equal(unansweredReply.status, 200);
      assert.equal(unansweredReply.data?.intentId, "navigation");

      const questionGaps = await harness.request("/assistant/admin/questions", {
        token: staff.token,
      });
      assert.equal(questionGaps.status, 200);
      assert.ok(Array.isArray(questionGaps.data?.items));
      assert.equal(questionGaps.data.items.length, 1);
      assert.equal(questionGaps.data.items[0]?.status, "noua");
      assert.equal(questionGaps.data.items[0]?.hitCount, 1);
      assert.equal(questionGaps.data.items[0]?.lastPathname, "/catalog");

      const questionGapId = questionGaps.data.items[0]?.id || questionGaps.data.items[0]?._id;
      assert.ok(questionGapId);

      const listEntries = await harness.request("/assistant/admin", {
        token: staff.token,
      });
      assert.equal(listEntries.status, 200);
      assert.ok(Array.isArray(listEntries.data?.items));
      assert.equal(listEntries.data.items.length, 1);

      const customEntryId =
        createCustomEntry.data?.item?.id || createCustomEntry.data?.item?._id;
      const reviewedGap = await harness.request(`/assistant/admin/questions/${questionGapId}`, {
        method: "PATCH",
        token: staff.token,
        body: {
          status: "rezolvata",
          notes: "Necesita raspuns separat pentru optiuni vegane.",
          linkedKnowledgeEntryId: customEntryId,
        },
      });
      assert.equal(reviewedGap.status, 200);
      assert.equal(reviewedGap.data?.item?.status, "rezolvata");
      assert.equal(
        reviewedGap.data?.item?.linkedKnowledgeEntry?.id,
        String(customEntryId)
      );

      const repeatedGapReply = await harness.request("/assistant/reply", {
        method: "POST",
        body: {
          query: "cum comand un tort vegan fara zahar",
          pathname: "/catalog",
        },
      });
      assert.equal(repeatedGapReply.status, 200);
      assert.equal(repeatedGapReply.data?.intentId, "navigation");

      const reopenedGaps = await harness.request("/assistant/admin/questions", {
        token: staff.token,
      });
      assert.equal(reopenedGaps.status, 200);
      assert.equal(reopenedGaps.data?.items?.[0]?.status, "noua");
      assert.equal(reopenedGaps.data?.items?.[0]?.hitCount, 2);

      const updatedEntry = await harness.request(`/assistant/admin/${customEntryId}`, {
        method: "PATCH",
        token: staff.token,
        body: {
          active: false,
        },
      });
      assert.equal(updatedEntry.status, 200);
      assert.equal(updatedEntry.data?.item?.active, false);

      const fallbackReply = await harness.request("/assistant/reply", {
        method: "POST",
        body: {
          query: "nu gasesc constructorul 2d",
          pathname: "/",
        },
      });
      assert.equal(fallbackReply.status, 200);
      assert.equal(fallbackReply.data?.intentId, "constructor");
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

    await t.test("content and support routes execute create read update flows", async () => {
      await harness.resetDb();

      const client = await registerUser("client");
      const admin = await seedUser("admin");
      const patiser = await seedUser("patiser");
      const clientId = client.user?.id || client.user?._id;
      assert.equal(client.status, 201);
      assert.equal(admin.status, 200);
      assert.equal(patiser.status, 200);
      assert.ok(clientId);

      const tortResponse = await harness.request("/torturi", {
        method: "POST",
        token: admin.token,
        body: {
          nume: "Tort integrare continut",
          descriere: "Tort pentru testarea rutelor de continut",
          pret: 180,
          imagine: "https://example.com/tort.jpg",
          ingrediente: ["ciocolata", "zmeura"],
          categorie: "torturi",
          portii: 8,
          timpPreparareOre: 24,
          activ: true,
        },
      });
      assert.equal(tortResponse.status, 201);
      const tortId = tortResponse.data?._id;
      assert.ok(tortId);

      const draftOrderResponse = await createOrder(client.token, {
        items: [
          {
            productId: tortId,
            name: "Tort integrare continut",
            qty: 1,
            price: 180,
          },
        ],
        prestatorId: patiser.user?._id,
        status: "in_asteptare",
        statusPlata: "unpaid",
        paymentStatus: "unpaid",
        handoffStatus: "scheduled",
      });
      assert.equal(draftOrderResponse.status, 201);

      const blockedProductReview = await harness.request("/recenzii/produs", {
        method: "POST",
        token: client.token,
        body: {
          tortId,
          stele: 5,
          comentariu: "Ar trebui blocata pana la finalizarea comenzii.",
        },
      });
      assert.equal(blockedProductReview.status, 409);

      const blockedOrderReview = await harness.request("/recenzii/comanda", {
        method: "POST",
        token: client.token,
        body: {
          comandaId: draftOrderResponse.data?._id,
          nota: 5,
          comentariu: "Ar trebui blocata pana la livrare.",
        },
      });
      assert.equal(blockedOrderReview.status, 409);

      const blockedProviderReview = await harness.request("/recenzii/prestator", {
        method: "POST",
        token: client.token,
        body: {
          prestatorId: patiser.user?._id,
          stele: 5,
          comentariu: "Ar trebui blocata pana la finalizarea experientei.",
        },
      });
      assert.equal(blockedProviderReview.status, 409);

      const orderResponse = await createOrder(client.token, {
        items: [
          {
            productId: tortId,
            name: "Tort integrare continut",
            qty: 1,
            price: 180,
          },
        ],
        prestatorId: patiser.user?._id,
      });
      assert.equal(orderResponse.status, 201);
      const comandaId = orderResponse.data?._id;
      assert.ok(comandaId);

      const deliveredOrder = await markOrderDelivered(comandaId, patiser.token);
      assert.equal(deliveredOrder.status, 200);

      const contactCreate = await harness.request("/contact", {
        method: "POST",
        body: {
          nume: "Client Contact",
          email: client.user.email,
          telefon: "+37360000111",
          subiect: "Intrebare integrare",
          mesaj: "Acesta este un mesaj de contact suficient de lung pentru test.",
        },
      });
      assert.equal(contactCreate.status, 201);
      assert.equal(contactCreate.data?.ok, true);
      assert.ok(contactCreate.data?.conversationId);
      assert.ok(contactCreate.data?.messageId);

      const contactList = await harness.request("/contact?limit=20", {
        token: admin.token,
      });
      assert.equal(contactList.status, 200);
      assert.ok(Array.isArray(contactList.data));
      assert.equal(contactList.data.length, 1);
      assert.equal(contactList.data[0]?.status, "noua");

      const contactMessages = await harness.request(
        `/contact/${contactList.data[0]._id}/messages`,
        {
          token: admin.token,
        }
      );
      assert.equal(contactMessages.status, 200);
      assert.ok(Array.isArray(contactMessages.data));
      assert.equal(contactMessages.data.length, 1);

      const contactReply = await harness.request(
        `/contact/${contactList.data[0]._id}/messages`,
        {
          method: "POST",
          token: admin.token,
          body: {
            mesaj: "Am primit solicitarea si revenim cu detalii in aceeasi conversatie.",
          },
        }
      );
      assert.equal(contactReply.status, 201);
      assert.equal(contactReply.data?.conversation?.status, "in_progres");

      const clientContactList = await harness.request("/contact/mine?limit=20", {
        token: client.token,
      });
      assert.equal(clientContactList.status, 200);
      assert.ok(Array.isArray(clientContactList.data));
      assert.equal(clientContactList.data.length, 1);

      const clientThread = await harness.request(
        `/contact/${contactList.data[0]._id}/messages`,
        {
          token: client.token,
        }
      );
      assert.equal(clientThread.status, 200);
      assert.ok(Array.isArray(clientThread.data));
      assert.equal(clientThread.data.length, 2);

      const contactStatus = await harness.request(
        `/contact/${contactList.data[0]._id}/status`,
        {
          method: "PATCH",
          token: admin.token,
          body: { status: "rezolvat" },
        }
      );
      assert.equal(contactStatus.status, 200);
      assert.equal(contactStatus.data?.status, "finalizata");

      const albumCreate = await harness.request("/albume", {
        method: "POST",
        token: admin.token,
        body: {
          titlu: "Album integrare",
          utilizatorId: clientId,
          comandaId,
          fisiere: ["/uploads/shared/demo.jpg"],
        },
      });
      assert.equal(albumCreate.status, 201);
      const albumId = albumCreate.data?._id;
      assert.ok(albumId);

      const clientAlbums = await harness.request("/albume", {
        token: client.token,
      });
      assert.equal(clientAlbums.status, 200);
      assert.equal(clientAlbums.data.length, 1);

      const albumDetails = await harness.request(`/albume/${albumId}`, {
        token: client.token,
      });
      assert.equal(albumDetails.status, 200);
      assert.equal(String(albumDetails.data?._id), String(albumId));

      const photoNotifications = await harness.request(
        `/notificari-foto/${clientId}`,
        {
          token: client.token,
        }
      );
      assert.equal(photoNotifications.status, 200);
      assert.ok(Array.isArray(photoNotifications.data));
      assert.equal(photoNotifications.data.length, 1);

      const markPhotoRead = await harness.request(
        `/notificari-foto/citeste/${photoNotifications.data[0]._id}`,
        {
          method: "PUT",
          token: client.token,
        }
      );
      assert.equal(markPhotoRead.status, 200);

      const personalizationCreate = await harness.request("/personalizare", {
        method: "POST",
        token: client.token,
        body: {
          forma: "rotund",
          culori: ["roz", "alb"],
          mesaj: "La multi ani",
          note: "Design de integrare",
          options: { etaje: 2 },
          pretEstimat: 220,
          timpPreparareOre: 36,
          status: "draft",
        },
      });
      assert.equal(personalizationCreate.status, 201);
      assert.equal(personalizationCreate.data?.ok, true);
      const personalizationId = personalizationCreate.data?.id;
      assert.ok(personalizationId);

      const personalizationList = await harness.request(
        `/personalizare/client/${clientId}`,
        {
          token: client.token,
        }
      );
      assert.equal(personalizationList.status, 200);
      assert.equal(personalizationList.data.length, 1);

      const personalizationUpdate = await harness.request(
        `/personalizare/${personalizationId}`,
        {
          method: "PUT",
          token: client.token,
          body: {
            mesaj: "Mesaj actualizat",
            status: "ready",
          },
        }
      );
      assert.equal(personalizationUpdate.status, 200);
      assert.equal(personalizationUpdate.data?.ok, true);

      const productReview = await harness.request("/recenzii/produs", {
        method: "POST",
        token: client.token,
        body: {
          tortId,
          stele: 5,
          comentariu: "Produs excelent pentru test.",
        },
      });
      assert.equal(productReview.status, 201);
      assert.equal(productReview.data?.review?.moderationStatus, "pending");

      const productReviewList = await harness.request(`/recenzii/produs/${tortId}`);
      assert.equal(productReviewList.status, 200);
      assert.equal(productReviewList.data.length, 0);

      const approveProductReview = await harness.request(
        `/recenzii/admin/produs/${productReview.data?.review?._id}`,
        {
          method: "PATCH",
          token: admin.token,
          body: {
            moderationStatus: "approved",
            moderationNote: "Aprobat in integrare.",
          },
        }
      );
      assert.equal(approveProductReview.status, 200);

      const approvedProductReviewList = await harness.request(`/recenzii/produs/${tortId}`);
      assert.equal(approvedProductReviewList.status, 200);
      assert.equal(approvedProductReviewList.data.length, 1);

      const orderReview = await harness.request("/recenzii/comanda", {
        method: "POST",
        token: client.token,
        body: {
          comandaId,
          nota: 5,
          comentariu: "Comanda a fost impecabila.",
        },
      });
      assert.equal(orderReview.status, 201);
      assert.equal(orderReview.data?.review?.moderationStatus, "pending");

      const orderReviewRead = await harness.request(`/recenzii/comanda/${comandaId}`, {
        token: client.token,
      });
      assert.equal(orderReviewRead.status, 200);
      assert.equal(String(orderReviewRead.data?.comandaId), String(comandaId));

      const providerReview = await harness.request("/recenzii/prestator", {
        method: "POST",
        token: client.token,
        body: {
          prestatorId: patiser.user?._id,
          stele: 5,
          comentariu: "Prestator foarte bun.",
        },
      });
      assert.equal(providerReview.status, 201);
      assert.equal(providerReview.data?.review?.moderationStatus, "pending");

      const providerReviewList = await harness.request(
        `/recenzii/prestator/${patiser.user?._id}`
      );
      assert.equal(providerReviewList.status, 200);
      assert.equal(providerReviewList.data.length, 0);

      const approveProviderReview = await harness.request(
        `/recenzii/admin/prestator/${providerReview.data?.review?._id}`,
        {
          method: "PATCH",
          token: admin.token,
          body: {
            moderationStatus: "approved",
            moderationNote: "Prestator validat in integrare.",
          },
        }
      );
      assert.equal(approveProviderReview.status, 200);

      const approvedProviderReviewList = await harness.request(
        `/recenzii/prestator/${patiser.user?._id}`
      );
      assert.equal(approvedProviderReviewList.status, 200);
      assert.equal(approvedProviderReviewList.data.length, 1);

      const recentReviews = await harness.request("/recenzii/recent?limit=4");
      assert.equal(recentReviews.status, 200);
      assert.equal(recentReviews.data.length, 1);

      const notifications = await harness.request("/notificari", {
        token: admin.token,
      });
      assert.equal(notifications.status, 200);
      assert.ok(Array.isArray(notifications.data));
      assert.ok(notifications.data.length >= 2);

      const recommendations = await harness.request("/recommendations?limit=4");
      assert.equal(recommendations.status, 200);
      assert.ok(Array.isArray(recommendations.data?.recomandate));
      assert.equal(recommendations.data.recomandate.length, 1);

      const aiRecommendations = await harness.request(
        `/recommendations/ai?userId=${clientId}&limit=4&preferCategorie=torturi&excludePurchased=false`
      );
      assert.equal(aiRecommendations.status, 200);
      assert.equal(aiRecommendations.data?.ok, true);
      assert.ok(Array.isArray(aiRecommendations.data?.recomandate));
      assert.equal(aiRecommendations.data.recomandate.length, 1);

      const aiRecommendationsPost = await harness.request("/recommendations/ai", {
        method: "POST",
        body: {
          userId: clientId,
          limit: 4,
          preferCategorie: "torturi",
          avoid: ["fistic"],
          excludePurchased: false,
        },
      });
      assert.equal(aiRecommendationsPost.status, 200);
      assert.equal(aiRecommendationsPost.data?.ok, true);

      const pushStatus = await harness.request("/push/status");
      assert.equal(pushStatus.status, 200);
      assert.equal(typeof pushStatus.data?.configured, "boolean");

      const pushPublicKey = await harness.request("/push/public-key");
      assert.ok([200, 404].includes(pushPublicKey.status));

      const albumDelete = await harness.request(`/albume/${albumId}`, {
        method: "DELETE",
        token: client.token,
      });
      assert.equal(albumDelete.status, 200);
      assert.equal(albumDelete.data?.ok, true);
    });

    await t.test("review moderation supports approval reporting hiding and delete flows", async () => {
      await harness.resetDb();

      const admin = await seedUser("admin");
      const client = await registerUser("client");
      const otherClient = await registerUser("client");
      const patiser = await seedUser("patiser");
      assert.equal(admin.status, 200);
      assert.equal(client.status, 201);
      assert.equal(otherClient.status, 201);
      assert.equal(patiser.status, 200);

      const tortResponse = await harness.request("/torturi", {
        method: "POST",
        token: admin.token,
        body: {
          nume: "Tort moderare recenzii",
          descriere: "Tort pentru testul de moderare recenzii.",
          pret: 190,
          imagine: "https://example.com/tort-moderare.jpg",
          ingrediente: ["ciocolata"],
          categorie: "torturi",
          portii: 10,
          timpPreparareOre: 24,
          activ: true,
        },
      });
      assert.equal(tortResponse.status, 201);
      const tortId = tortResponse.data?._id;
      assert.ok(tortId);

      const completedOrder = await createOrder(client.token, {
        items: [
          {
            productId: tortId,
            name: "Tort moderare recenzii",
            qty: 1,
            price: 190,
          },
        ],
        prestatorId: patiser.user?._id,
      });
      assert.equal(completedOrder.status, 201);

      const deliveredCompletedOrder = await markOrderDelivered(
        completedOrder.data?._id,
        patiser.token
      );
      assert.equal(deliveredCompletedOrder.status, 200);

      const createdReview = await harness.request("/recenzii/produs", {
        method: "POST",
        token: client.token,
        body: {
          tortId,
          stele: 4,
          comentariu: "Recenzie pentru moderare si raportare.",
        },
      });
      assert.equal(createdReview.status, 201);
      const reviewId = createdReview.data?.review?._id;
      assert.ok(reviewId);

      const publicPendingList = await harness.request(`/recenzii/produs/${tortId}`);
      assert.equal(publicPendingList.status, 200);
      assert.equal(publicPendingList.data.length, 0);

      const adminPendingList = await harness.request(
        "/recenzii/admin?moderationStatus=pending&reviewType=produs",
        {
          token: admin.token,
        }
      );
      assert.equal(adminPendingList.status, 200);
      assert.equal(adminPendingList.data.items.length, 1);
      assert.equal(adminPendingList.data.items[0]._id, reviewId);

      const approveReview = await harness.request(`/recenzii/admin/produs/${reviewId}`, {
        method: "PATCH",
        token: admin.token,
        body: {
          moderationStatus: "approved",
          moderationNote: "Aprobata dupa verificare.",
        },
      });
      assert.equal(approveReview.status, 200);
      assert.equal(approveReview.data?.review?.moderationStatus, "approved");

      const publicApprovedList = await harness.request(`/recenzii/produs/${tortId}`);
      assert.equal(publicApprovedList.status, 200);
      assert.equal(publicApprovedList.data.length, 1);
      assert.equal(publicApprovedList.data[0].moderationStatus, "approved");

      const reportOwnReview = await harness.request(`/recenzii/produs/${reviewId}/report`, {
        method: "POST",
        token: client.token,
        body: {
          reason: "Nu ar trebui sa pot raporta propria recenzie",
        },
      });
      assert.equal(reportOwnReview.status, 400);

      const reportReview = await harness.request(`/recenzii/produs/${reviewId}/report`, {
        method: "POST",
        token: otherClient.token,
        body: {
          reason: "Comentariu ofensator",
        },
      });
      assert.equal(reportReview.status, 202);
      assert.equal(reportReview.data?.review?.reportCount, 1);

      const duplicateReport = await harness.request(`/recenzii/produs/${reviewId}/report`, {
        method: "POST",
        token: otherClient.token,
        body: {
          reason: "Raportare duplicata",
        },
      });
      assert.equal(duplicateReport.status, 409);

      const reportedList = await harness.request(
        "/recenzii/admin?reviewType=produs&reportedOnly=true",
        {
          token: admin.token,
        }
      );
      assert.equal(reportedList.status, 200);
      assert.equal(reportedList.data.items.length, 1);
      assert.equal(reportedList.data.items[0].reportCount, 1);
      assert.equal(reportedList.data.items[0].lastReportReason, "Comentariu ofensator");

      const hideReview = await harness.request(`/recenzii/admin/produs/${reviewId}`, {
        method: "PATCH",
        token: admin.token,
        body: {
          moderationStatus: "hidden",
          moderationNote: "Ascunsa dupa raportare.",
        },
      });
      assert.equal(hideReview.status, 200);
      assert.equal(hideReview.data?.review?.moderationStatus, "hidden");

      const publicHiddenList = await harness.request(`/recenzii/produs/${tortId}`);
      assert.equal(publicHiddenList.status, 200);
      assert.equal(publicHiddenList.data.length, 0);

      const deleteReview = await harness.request(`/recenzii/admin/produs/${reviewId}`, {
        method: "DELETE",
        token: admin.token,
      });
      assert.equal(deleteReview.status, 200);
      assert.equal(deleteReview.data?.ok, true);

      const emptyAdminList = await harness.request(
        "/recenzii/admin?reviewType=produs&search=moderare",
        {
          token: admin.token,
        }
      );
      assert.equal(emptyAdminList.status, 200);
      assert.equal(emptyAdminList.data.items.length, 0);
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

    await t.test("admin coupon management supports limits expiry and activation rules", async () => {
      await harness.resetDb();

      const admin = await seedUser("admin");
      const client = await registerUser("client");
      const other = await registerUser("client");
      assert.equal(admin.status, 200);
      assert.equal(client.status, 201);
      assert.equal(other.status, 201);

      const fixedCoupon = await harness.request("/coupon/admin", {
        method: "POST",
        token: admin.token,
        body: {
          cod: "FIX50",
          descriere: "Reducere fixa pentru client VIP",
          tipReducere: "fixed",
          procentReducere: 0,
          valoareFixa: 50,
          valoareMinima: 100,
          usageLimit: 2,
          perUserLimit: 1,
          allowedUserId: client.user.id,
          dataExpirare: futureDate(15),
          notesAdmin: "Test management",
        },
      });
      assert.equal(fixedCoupon.status, 201);
      assert.equal(fixedCoupon.data?.coupon?.tipReducere, "fixed");
      assert.equal(fixedCoupon.data?.coupon?.valoareFixa, 50);

      const updateFixedCoupon = await harness.request(
        `/coupon/admin/${fixedCoupon.data.coupon._id}`,
        {
          method: "PATCH",
          token: admin.token,
          body: {
            descriere: "Reducere fixa updatata",
            notesAdmin: "Updated note",
          },
        }
      );
      assert.equal(updateFixedCoupon.status, 200);
      assert.equal(updateFixedCoupon.data?.coupon?.descriere, "Reducere fixa updatata");

      const adminList = await harness.request("/coupon/admin?status=active", {
        token: admin.token,
      });
      assert.equal(adminList.status, 200);
      assert.equal(adminList.data?.items?.length, 1);
      assert.equal(adminList.data?.items?.[0]?.cod, "FIX50");

      const deactivateCoupon = await harness.request(
        `/coupon/admin/${fixedCoupon.data.coupon._id}`,
        {
          method: "PATCH",
          token: admin.token,
          body: { activ: false },
        }
      );
      assert.equal(deactivateCoupon.status, 200);
      assert.equal(deactivateCoupon.data?.coupon?.activ, false);

      const verifyInactive = await harness.request("/coupon/verify/FIX50");
      assert.equal(verifyInactive.status, 404);

      const reactivateCoupon = await harness.request(
        `/coupon/admin/${fixedCoupon.data.coupon._id}`,
        {
          method: "PATCH",
          token: admin.token,
          body: { activ: true },
        }
      );
      assert.equal(reactivateCoupon.status, 200);
      assert.equal(reactivateCoupon.data?.coupon?.activ, true);

      const unauthorizedOrder = await createOrder(other.token, {
        items: [
          {
            productId: "coupon-order-other",
            name: "Order for restricted coupon",
            qty: 1,
            price: 200,
          },
        ],
      });
      assert.equal(unauthorizedOrder.status, 201);
      const unauthorizedApply = await harness.request("/coupon/apply", {
        method: "POST",
        token: other.token,
        body: {
          cod: "FIX50",
          comandaId: unauthorizedOrder.data._id,
        },
      });
      assert.equal(unauthorizedApply.status, 409);

      const eligibleOrder = await createOrder(client.token, {
        items: [
          {
            productId: "coupon-order-client",
            name: "Eligible coupon order",
            qty: 1,
            price: 200,
          },
        ],
      });
      assert.equal(eligibleOrder.status, 201);
      const fixedApply = await harness.request("/coupon/apply", {
        method: "POST",
        token: client.token,
        body: {
          cod: "FIX50",
          comandaId: eligibleOrder.data._id,
        },
      });
      assert.equal(fixedApply.status, 200);
      assert.equal(fixedApply.data?.discount, 50);
      assert.equal(fixedApply.data?.newTotal, 150);

      const perUserLimitOrder = await createOrder(client.token, {
        items: [
          {
            productId: "coupon-order-repeat",
            name: "Repeat coupon order",
            qty: 1,
            price: 180,
          },
        ],
      });
      assert.equal(perUserLimitOrder.status, 201);
      const blockedByPerUserLimit = await harness.request("/coupon/apply", {
        method: "POST",
        token: client.token,
        body: {
          cod: "FIX50",
          comandaId: perUserLimitOrder.data._id,
        },
      });
      assert.equal(blockedByPerUserLimit.status, 409);

      const onceCoupon = await harness.request("/coupon/admin", {
        method: "POST",
        token: admin.token,
        body: {
          cod: "ONCE20",
          tipReducere: "percent",
          procentReducere: 20,
          usageLimit: 1,
          perUserLimit: 0,
        },
      });
      assert.equal(onceCoupon.status, 201);

      const onceOrder = await createOrder(client.token, {
        items: [
          {
            productId: "coupon-once-order",
            name: "Single use coupon order",
            qty: 1,
            price: 300,
          },
        ],
      });
      assert.equal(onceOrder.status, 201);
      const onceApply = await harness.request("/coupon/apply", {
        method: "POST",
        token: client.token,
        body: {
          cod: "ONCE20",
          comandaId: onceOrder.data._id,
        },
      });
      assert.equal(onceApply.status, 200);
      assert.equal(onceApply.data?.discount, 60);

      const blockedByUsageLimitOrder = await createOrder(other.token, {
        items: [
          {
            productId: "coupon-usage-limit-order",
            name: "Usage limit coupon order",
            qty: 1,
            price: 250,
          },
        ],
      });
      assert.equal(blockedByUsageLimitOrder.status, 201);
      const blockedByUsageLimit = await harness.request("/coupon/apply", {
        method: "POST",
        token: other.token,
        body: {
          cod: "ONCE20",
          comandaId: blockedByUsageLimitOrder.data._id,
        },
      });
      assert.equal(blockedByUsageLimit.status, 409);

      const expiredCoupon = await harness.request("/coupon/admin", {
        method: "POST",
        token: admin.token,
        body: {
          cod: "EXPIRED10",
          tipReducere: "percent",
          procentReducere: 10,
          dataExpirare: futureDate(-1),
        },
      });
      assert.equal(expiredCoupon.status, 201);

      const verifyExpired = await harness.request("/coupon/verify/EXPIRED10");
      assert.equal(verifyExpired.status, 404);

      const listWithUsage = await harness.request("/coupon/admin", {
        token: admin.token,
      });
      assert.equal(listWithUsage.status, 200);
      const onceCouponSummary = listWithUsage.data?.items?.find(
        (item) => item.cod === "ONCE20"
      );
      assert.equal(onceCouponSummary?.usedCount, 1);
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
      const providerId = staff.user?.id;
      assert.equal(staff.status, 201);
      assert.equal(client.status, 201);
      assert.ok(providerId);

      const date = futureDate(5);
      const addSlot = await harness.request(`/calendar/availability/${providerId}`, {
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
          prestatorId: providerId,
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
      assert.equal(order.data?.subtotal, 120);
      assert.equal(order.data?.deliveryFee || order.data?.taxaLivrare || 0, 0);
      assert.equal(order.data?.total, 120);
      assert.equal(order.data?.customDetails?.clientBudget, 120);
      assert.equal(reserve.data?.requiresPriceConfirmation, true);

      const availability = await harness.request(
        `/calendar/availability/${providerId}?from=${date}&to=${date}`
      );
      assert.equal(availability.status, 200);
      const reservedSlot = (availability.data?.slots || []).find(
        (slot) => slot?.time === "14:00"
      );
      assert.equal(reservedSlot?.used, 1);
      assert.equal(reservedSlot?.free, 1);
    });

    await t.test("calendar reserve stores delivery date, time, method and address", async () => {
      await harness.resetDb();

      const staff = await registerUser("patiser");
      const client = await registerUser("client");
      const providerId = staff.user?.id;
      const deliveryAddress = "Strada Bucuresti 10, ap. 12, Chisinau";
      const deliveryWindow = "16:30-17:30";
      const deliveryInstructions = "Sunati cand ajungeti la intrare.";

      assert.equal(staff.status, 201);
      assert.equal(client.status, 201);
      assert.ok(providerId);

      const date = futureDate(6);
      const addSlot = await harness.request(`/calendar/availability/${providerId}`, {
        method: "POST",
        token: staff.token,
        body: {
          slots: [{ date, time: "16:30", capacity: 1 }],
        },
      });
      assert.equal(addSlot.status, 200);

      const reserve = await harness.request("/calendar/reserve", {
        method: "POST",
        token: client.token,
        body: {
          prestatorId: providerId,
          date,
          time: "16:30",
          metoda: "livrare",
          deliveryMethod: "livrare",
          adresaLivrare: deliveryAddress,
          deliveryWindow,
          deliveryInstructions,
          subtotal: 350,
          descriere: "Tort premium cu livrare",
        },
      });

      assert.equal(reserve.status, 200);
      assert.equal(reserve.data?.ok, true);
      assert.equal(reserve.data?.deliveryMethod, "livrare");
      assert.equal(reserve.data?.reservationSummary?.date, date);
      assert.equal(reserve.data?.reservationSummary?.time, "16:30");
      assert.equal(reserve.data?.reservationSummary?.metoda, "livrare");
      assert.equal(reserve.data?.reservationSummary?.adresaLivrare, deliveryAddress);
      assert.equal(reserve.data?.reservationSummary?.deliveryWindow, deliveryWindow);

      const order = await Comanda.findById(reserve.data?.comandaId).lean();
      assert.ok(order);
      assert.equal(order?.dataLivrare, date);
      assert.equal(order?.oraLivrare, "16:30");
      assert.equal(order?.calendarSlot?.date, date);
      assert.equal(order?.calendarSlot?.time, "16:30");
      assert.equal(order?.metodaLivrare, "livrare");
      assert.equal(order?.adresaLivrare, deliveryAddress);
      assert.equal(order?.deliveryWindow, deliveryWindow);
      assert.equal(order?.deliveryInstructions, deliveryInstructions);
      assert.equal(order?.deliveryFee || order?.taxaLivrare || 0, 100);
      assert.equal(order?.total, 450);

      const reservation = await Rezervare.findById(reserve.data?.rezervareId).lean();
      assert.ok(reservation);
      assert.equal(reservation?.date, date);
      assert.equal(reservation?.timeSlot, "16:30-17:30");
      assert.equal(reservation?.handoffMethod, "delivery");
      assert.equal(reservation?.deliveryAddress, deliveryAddress);
      assert.equal(reservation?.deliveryWindow, deliveryWindow);
      assert.equal(reservation?.deliveryInstructions, deliveryInstructions);
      assert.equal(reservation?.deliveryFee, 100);
      assert.equal(reservation?.total, 450);
    });

    await t.test("staff can convert a custom cake request into a payable order", async () => {
      await harness.resetDb();

      const staff = await registerUser("patiser");
      const client = await registerUser("client");
      const providerId = staff.user?.id;
      const date = futureDate(9);

      assert.equal(staff.status, 201);
      assert.equal(client.status, 201);
      assert.ok(providerId);

      const addSlot = await harness.request(`/calendar/availability/${providerId}`, {
        method: "POST",
        token: staff.token,
        body: {
          slots: [{ date, time: "13:30", capacity: 1 }],
        },
      });
      assert.equal(addSlot.status, 200);

      const customOrder = await harness.request("/comenzi-personalizate", {
        method: "POST",
        token: client.token,
        body: {
          prestatorId: providerId,
          preferinte: "Tort de nunta cu flori albe si accente aurii",
          pretEstimat: 900,
          timpPreparareOre: 48,
          options: {
            tiers: 2,
            aiDecorRequest: "flori albe si accente aurii",
          },
        },
      });

      assert.equal(customOrder.status, 201);
      const customOrderId = customOrder.data?.comanda?._id;
      assert.ok(customOrderId);

      const conversion = await harness.request(`/comenzi-personalizate/${customOrderId}/convert`, {
        method: "POST",
        token: staff.token,
        body: {
          dataLivrare: date,
          oraLivrare: "13:30",
          metodaLivrare: "livrare",
          adresaLivrare: "Strada Stefan cel Mare 20, Chisinau",
          deliveryWindow: "13:30-14:30",
          deliveryInstructions: "Sunati inainte cu 10 minute.",
        },
      });

      assert.equal(conversion.status, 201);
      assert.ok(conversion.data?.comanda?._id);
      assert.equal(conversion.data?.comanda?.tip, "personalizata");
      assert.equal(conversion.data?.comanda?.metodaLivrare, "livrare");
      assert.equal(conversion.data?.comanda?.totalFinal, 1000);

      const savedCustomOrder = await ComandaPersonalizata.findById(customOrderId).lean();
      assert.equal(String(savedCustomOrder?.comandaId || ""), String(conversion.data?.comanda?._id));
      assert.equal(savedCustomOrder?.status, "comanda_generata");

      const savedOrder = await Comanda.findById(conversion.data?.comanda?._id).lean();
      assert.ok(savedOrder);
      assert.equal(savedOrder?.dataLivrare, date);
      assert.equal(savedOrder?.oraLivrare, "13:30");
      assert.equal(savedOrder?.taxaLivrare || savedOrder?.deliveryFee || 0, 100);
      assert.equal(savedOrder?.paymentStatus, "unpaid");
      assert.equal(savedOrder?.customDetails?.customOrderId, String(customOrderId));

      const reservation = await Rezervare.findOne({ comandaId: savedOrder._id }).lean();
      assert.ok(reservation);
      assert.equal(reservation?.date, date);
      assert.equal(reservation?.handoffMethod, "delivery");
      assert.equal(reservation?.deliveryAddress, "Strada Stefan cel Mare 20, Chisinau");

      const slot = await CalendarSlotEntry.findOne({
        prestatorId: providerId,
        date,
        time: "13:30",
      }).lean();
      assert.equal(slot?.used, 1);
    });

    await t.test("custom cake review actions validate price and rejection reasons", async () => {
      await harness.resetDb();

      const staff = await registerUser("patiser");
      const client = await registerUser("client");
      const providerId = staff.user?.id;

      assert.equal(staff.status, 201);
      assert.equal(client.status, 201);
      assert.ok(providerId);

      const customOrder = await harness.request("/comenzi-personalizate", {
        method: "POST",
        token: client.token,
        body: {
          prestatorId: providerId,
          preferinte: "Tort aniversar minimalist cu fructe proaspete",
          pretEstimat: 650,
          timpPreparareOre: 24,
        },
      });

      assert.equal(customOrder.status, 201);
      const customOrderId = customOrder.data?.comanda?._id;
      assert.ok(customOrderId);

      const invalidPrice = await harness.request(`/comenzi-personalizate/${customOrderId}/status`, {
        method: "PATCH",
        token: staff.token,
        body: {
          pretEstimat: -10,
        },
      });
      assert.equal(invalidPrice.status, 400);

      const missingRejectReason = await harness.request(
        `/comenzi-personalizate/${customOrderId}/status`,
        {
          method: "PATCH",
          token: staff.token,
          body: {
            status: "respinsa",
          },
        }
      );
      assert.equal(missingRejectReason.status, 400);

      const updatedPrice = await harness.request(`/comenzi-personalizate/${customOrderId}/status`, {
        method: "PATCH",
        token: staff.token,
        body: {
          pretEstimat: 720,
        },
      });
      assert.equal(updatedPrice.status, 200);
      assert.equal(updatedPrice.data?.pretEstimat, 720);

      const rejected = await harness.request(`/comenzi-personalizate/${customOrderId}/status`, {
        method: "PATCH",
        token: staff.token,
        body: {
          status: "respinsa",
          statusNote: "Clientul nu a confirmat bugetul final in termen.",
        },
      });
      assert.equal(rejected.status, 200);
      assert.equal(rejected.data?.status, "respinsa");

      const savedCustomOrder = await ComandaPersonalizata.findById(customOrderId).lean();
      assert.equal(savedCustomOrder?.pretEstimat, 720);
      assert.equal(savedCustomOrder?.status, "respinsa");
      assert.equal(
        savedCustomOrder?.statusHistory?.[savedCustomOrder.statusHistory.length - 1]?.note,
        "Clientul nu a confirmat bugetul final in termen."
      );
    });

    await t.test("sales reports expose custom funnel, losses and operational timings", async () => {
      await harness.resetDb();

      const admin = await seedUser("admin");
      const staff = await registerUser("patiser");
      const client = await registerUser("client");
      const providerId = staff.user?.id;
      const today = new Date().toISOString().slice(0, 10);

      assert.equal(admin.status, 200);
      assert.equal(staff.status, 201);
      assert.equal(client.status, 201);
      assert.ok(providerId);

      await Comanda.create({
        clientId: client.user?.id,
        prestatorId: providerId,
        items: [{ name: "Tort raport livrare", qty: 1, price: 220, lineTotal: 220 }],
        subtotal: 220,
        taxaLivrare: 100,
        deliveryFee: 100,
        total: 320,
        totalFinal: 320,
        metodaLivrare: "livrare",
        dataLivrare: futureDate(5),
        oraLivrare: "15:00",
        status: "livrata",
        paymentStatus: "paid",
        statusPlata: "paid",
      });

      await Comanda.create({
        clientId: client.user?.id,
        prestatorId: providerId,
        items: [{ name: "Tort raport anulat", qty: 1, price: 180, lineTotal: 180 }],
        subtotal: 180,
        total: 180,
        totalFinal: 180,
        metodaLivrare: "ridicare",
        dataLivrare: futureDate(4),
        oraLivrare: "11:00",
        status: "anulata",
        paymentStatus: "unpaid",
        statusPlata: "unpaid",
        motivRefuz: "Clientul a anulat dupa oferta finala.",
      });

      const linkedCustomOrder = await Comanda.create({
        clientId: client.user?.id,
        prestatorId: providerId,
        items: [{ name: "Tort custom premium", qty: 1, price: 900, lineTotal: 900 }],
        subtotal: 900,
        total: 900,
        totalFinal: 900,
        metodaLivrare: "ridicare",
        dataLivrare: futureDate(8),
        oraLivrare: "14:30",
        status: "in_asteptare",
        paymentStatus: "paid",
        statusPlata: "paid",
      });

      const convertedCustom = await ComandaPersonalizata.create({
        clientId: client.user?.id,
        prestatorId: providerId,
        numeClient: client.user?.nume || "Client raport",
        preferinte: "Tort premium cu flori albe",
        pretEstimat: 900,
        status: "comanda_generata",
        comandaId: linkedCustomOrder._id,
        data: new Date(Date.now() - 6 * 60 * 60 * 1000),
        statusHistory: [
          {
            status: "noua",
            note: "Cerere noua trimisa.",
            at: new Date(Date.now() - 5 * 60 * 60 * 1000),
          },
          {
            status: "aprobata",
            note: "Oferta confirmata.",
            at: new Date(Date.now() - 3 * 60 * 60 * 1000),
          },
          {
            status: "comanda_generata",
            note: "Trimisa la plata.",
            at: new Date(Date.now() - 2 * 60 * 60 * 1000),
          },
        ],
      });
      await ComandaPersonalizata.updateOne(
        { _id: convertedCustom._id },
        { $set: { createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000) } }
      );

      const rejectedCustom = await ComandaPersonalizata.create({
        clientId: client.user?.id,
        prestatorId: providerId,
        numeClient: client.user?.nume || "Client raport",
        preferinte: "Tort corporate cu logo",
        pretEstimat: 650,
        status: "respinsa",
        data: new Date(Date.now() - 5 * 60 * 60 * 1000),
        statusHistory: [
          {
            status: "noua",
            note: "Cerere noua trimisa.",
            at: new Date(Date.now() - 4 * 60 * 60 * 1000),
          },
          {
            status: "respinsa",
            note: "Clientul nu a confirmat bugetul propus.",
            at: new Date(Date.now() - 90 * 60 * 1000),
          },
        ],
      });
      await ComandaPersonalizata.updateOne(
        { _id: rejectedCustom._id },
        { $set: { createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000) } }
      );

      const report = await harness.request(`/rapoarte/sales/${today}/${today}`, {
        token: admin.token,
      });
      assert.equal(report.status, 200);
      assert.equal(report.data?.totalOrders, 3);
      assert.equal(report.data?.customFunnel?.totalRequests, 2);
      assert.equal(report.data?.customFunnel?.convertedOrders, 1);
      assert.equal(report.data?.customFunnel?.paidOrders, 1);
      assert.equal(report.data?.customFunnel?.rejectedRequests, 1);
      assert.equal(report.data?.lostOrderCounts?.standardCancelled, 1);
      assert.equal(report.data?.lostOrderCounts?.customRejected, 1);
      assert.equal(report.data?.lostOrderCounts?.totalLost, 2);
      assert.ok(report.data?.methodRevenueBreakdown?.delivery >= 320);
      assert.ok(report.data?.operationalTimings?.averageCustomResponseHours > 0);
      assert.ok(report.data?.operationalTimings?.averageScheduledLeadHours > 0);
      assert.ok(Array.isArray(report.data?.topRejectionReasons));
      assert.ok(
        report.data.topRejectionReasons.some((item) =>
          String(item.reason || "").includes("buget")
        )
      );
    });

    await t.test("monthly provider availability uses providerId and booking removes only the selected provider slot", async () => {
      await harness.resetDb();

      const providerA = await registerUser("patiser");
      const providerB = await registerUser("patiser");
      const client = await registerUser("client");
      const providerAId = providerA.user?.id;
      const providerBId = providerB.user?.id;
      const month = futureDate(10).slice(0, 7);

      assert.equal(providerA.status, 201);
      assert.equal(providerB.status, 201);
      assert.equal(client.status, 201);
      assert.ok(providerAId);
      assert.ok(providerBId);

      const availabilityA = await harness.request(
        `/calendar/availability?providerId=${providerAId}&month=${month}`
      );
      assert.equal(availabilityA.status, 200);
      assert.equal(availabilityA.data?.providerId, providerAId);
      assert.equal(availabilityA.data?.source, "fallback");
      assert.equal(availabilityA.data?.scheduleConfigured, false);
      assert.match(
        availabilityA.data?.message || "",
        /Nu exista disponibilitate configurata/i
      );
      assert.ok(Array.isArray(availabilityA.data?.availableDates));
      assert.ok(availabilityA.data.availableDates.length > 0);

      const selectedDate =
        availabilityA.data.availableDates.find((value) => value >= futureDate(2)) ||
        availabilityA.data.availableDates[availabilityA.data.availableDates.length - 1];
      const selectedTime = availabilityA.data?.slotsByDate?.[selectedDate]?.[0];
      assert.ok(selectedDate);
      assert.ok(selectedTime);

      const availabilityB = await harness.request(
        `/calendar/availability?providerId=${providerBId}&month=${month}`
      );
      assert.equal(availabilityB.status, 200);
      assert.ok(availabilityB.data?.slotsByDate?.[selectedDate]?.includes(selectedTime));

      const booking = await harness.request("/calendar/book", {
        method: "POST",
        token: client.token,
        body: {
          providerId: providerAId,
          date: selectedDate,
          time: selectedTime,
          metoda: "ridicare",
          subtotal: 220,
          descriere: "Rezervare lunara generata automat",
        },
      });
      assert.equal(booking.status, 200);
      assert.equal(booking.data?.ok, true);
      assert.equal(booking.data?.providerId, providerAId);

      const availabilityAAfterBooking = await harness.request(
        `/calendar/availability?providerId=${providerAId}&month=${month}`
      );
      assert.equal(availabilityAAfterBooking.status, 200);
      assert.equal(
        availabilityAAfterBooking.data?.slotsByDate?.[selectedDate]?.includes(selectedTime),
        false
      );

      const availabilityBAfterBooking = await harness.request(
        `/calendar/availability?providerId=${providerBId}&month=${month}`
      );
      assert.equal(availabilityBAfterBooking.status, 200);
      assert.ok(
        availabilityBAfterBooking.data?.slotsByDate?.[selectedDate]?.includes(selectedTime)
      );
    });

    await t.test("staff can reschedule an order and owner can cancel it with slot rollback", async () => {
      await harness.resetDb();

      const staff = await registerUser("patiser");
      const client = await registerUser("client");
      const providerId = staff.user?.id;
      assert.equal(staff.status, 201);
      assert.equal(client.status, 201);
      assert.ok(providerId);

      const firstDate = futureDate(7);
      const secondDate = futureDate(8);

      const addFirstSlot = await harness.request(`/calendar/availability/${providerId}`, {
        method: "POST",
        token: staff.token,
        body: {
          slots: [{ date: firstDate, time: "10:00", capacity: 1 }],
        },
      });
      const addSecondSlot = await harness.request(`/calendar/availability/${providerId}`, {
        method: "POST",
        token: staff.token,
        body: {
          slots: [{ date: secondDate, time: "11:30", capacity: 1 }],
        },
      });
      assert.equal(addFirstSlot.status, 200);
      assert.equal(addSecondSlot.status, 200);

      await CalendarSlotEntry.updateOne(
        { prestatorId: providerId, date: firstDate, time: "10:00" },
        { $set: { used: 1 } }
      );

      const createdOrder = await createOrder(client.token, {
        prestatorId: providerId,
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
        `/calendar/availability/${providerId}?from=${firstDate}&to=${firstDate}`
      );
      const secondAvailability = await harness.request(
        `/calendar/availability/${providerId}?from=${secondDate}&to=${secondDate}`
      );
      assert.equal(firstAvailability.status, 200);
      assert.equal(secondAvailability.status, 200);
      const firstMovedSlot = (firstAvailability.data?.slots || []).find(
        (slot) => slot?.time === "10:00"
      );
      const secondMovedSlot = (secondAvailability.data?.slots || []).find(
        (slot) => slot?.time === "11:30"
      );
      assert.equal(firstMovedSlot?.used, 0);
      assert.equal(secondMovedSlot?.used, 1);

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
        `/calendar/availability/${providerId}?from=${secondDate}&to=${secondDate}`
      );
      assert.equal(rolledBackAvailability.status, 200);
      const rolledBackSlot = (rolledBackAvailability.data?.slots || []).find(
        (slot) => slot?.time === "11:30"
      );
      assert.equal(rolledBackSlot?.used, 0);
    });

    await t.test("production board exposes operational details for scheduled orders", async () => {
      await harness.resetDb();

      const staff = await registerUser("patiser");
      const client = await registerUser("client");
      const deliveryDate = futureDate(6);

      assert.equal(staff.status, 201);
      assert.equal(client.status, 201);

      const createdOrder = await createOrder(client.token, {
        prestatorId: staff.user?.id,
        metodaLivrare: "livrare",
        adresaLivrare: "Strada Florilor 10, Chisinau",
        dataLivrare: deliveryDate,
        oraLivrare: "15:30",
        note: "Mesaj pe tort: La multi ani!",
      });

      assert.equal(createdOrder.status, 201);
      const orderId = createdOrder.data?._id;
      assert.ok(orderId);

      await Comanda.findByIdAndUpdate(orderId, {
        deliveryInstructions: "Sunati cu 10 minute inainte.",
        deliveryWindow: "15:00-16:00",
        notesClient: "Mesaj pe tort: La multi ani!",
        notesAdmin: "Topper pregatit si verificat.",
        attachments: [
          {
            url: "https://example.com/inspiration.jpg",
            name: "inspiration.jpg",
          },
        ],
        imagineGenerata: "https://example.com/cake-preview.jpg",
        statusHistory: [
          {
            status: "confirmata",
            note: "Confirmata telefonic cu clientul.",
          },
        ],
      });

      const boardResponse = await harness.request(
        `/admin/production/board?date=${deliveryDate}`,
        { token: staff.token }
      );

      assert.equal(boardResponse.status, 200);
      assert.ok(Array.isArray(boardResponse.data?.board));

      const boardItem = boardResponse.data.board.find(
        (item) => String(item.orderId) === String(orderId)
      );

      assert.ok(boardItem);
      assert.equal(boardItem.clientName, "User client");
      assert.equal(boardItem.method, "livrare");
      assert.equal(boardItem.address, "Strada Florilor 10, Chisinau");
      assert.equal(boardItem.deliveryWindow, "15:00-16:00");
      assert.equal(boardItem.deliveryInstructions, "Sunati cu 10 minute inainte.");
      assert.equal(boardItem.latestStatusNote, "Confirmata telefonic cu clientul.");
      assert.equal(boardItem.notesAdmin, "Topper pregatit si verificat.");
      assert.equal(boardItem.referenceImages[0], "https://example.com/cake-preview.jpg");
      assert.equal(boardItem.attachments[0]?.name, "inspiration.jpg");
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

    const webhookCake = await Tort.create({
      nume: "Tort webhook",
      descriere: "Produs pentru testul de webhook",
      pret: 150,
      activ: true,
      timpPreparareOre: 24,
    });

    const order = await harness.request("/comenzi", {
      method: "POST",
      token: client.token,
      body: {
        items: [
          {
            productId: String(webhookCake._id),
            name: webhookCake.nume,
            qty: 1,
            price: webhookCake.pret,
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
