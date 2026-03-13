const test = require("node:test");
const assert = require("node:assert/strict");
const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");
const mongoose = require("mongoose");

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

function createRequest(baseUrl) {
  return async function request(pathname, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.token) {
      headers.Authorization = `Bearer ${options.token}`;
    }

    let body;
    if (options.body !== undefined) {
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

    return { status: response.status, data };
  };
}

async function createHarness() {
  const backendDir = path.join(__dirname, "..");
  const port = await getFreePort();
  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    "mongodb://127.0.0.1:27017/tort_app_integration";
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
