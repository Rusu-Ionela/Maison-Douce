const axios = require("axios");

const BASE_URL = process.env.API_BASE || "http://localhost:5000/api";
const EMAIL = process.env.TEST_EMAIL || "test@example.com";
const PASSWORD = process.env.TEST_PASSWORD || "TestMaison2026!@#";
const SLOT_TIME = process.env.SLOT_TIME || "09:00";

const placeholderImage =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z/D/PwAHggJ/Pdx6ygAAAABJRU5ErkJggg==";

function dateStr(daysAhead = 1) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split("T")[0];
}

async function seedUser() {
  const res = await axios.post(`${BASE_URL}/auth/seed-test-user`, {
    email: EMAIL,
    password: PASSWORD,
    rol: "admin",
  });
  return res.data;
}

async function ensureSlot(client, date) {
  await client.post("/calendar/availability/default", {
    slots: [{ date, time: SLOT_TIME, capacity: 5 }],
  });
}

async function createDesign(client, userId, status = "draft") {
  const payload = {
    clientId: userId,
    forma: "rotund",
    culori: ["#f6d7c3"],
    mesaj: "Test design",
    imageData: placeholderImage,
    options: {
      blat: "vanilie",
      crema: "vanilie",
      umplutura: "capsuni",
      decor: "floral",
      topping: "fructe",
      culoare: "#f6d7c3",
      font: "Georgia",
    },
    pretEstimat: 420,
    timpPreparareOre: 24,
    status,
  };
  const { data } = await client.post("/personalizare", payload);
  return data.id;
}

async function sendPersonalizare(client, designId, userId) {
  await client.post("/comenzi-personalizate", {
    clientId: userId,
    numeClient: "Tester",
    preferinte: "Comanda din script",
    imagine: placeholderImage,
    designId,
    options: { custom: true },
    pretEstimat: 450,
    timpPreparareOre: 24,
  });
}

async function createOrder(client, date, time, productId, designId, userId) {
  const payload = {
    clientId: userId,
    items: [
      {
        productId,
        name: "Test tort",
        qty: 1,
        price: 350,
        personalizari: { designId },
      },
    ],
    metodaLivrare: "ridicare",
    dataLivrare: date,
    oraLivrare: time,
    prestatorId: "default",
  };
  const { data } = await client.post("/comenzi/creeaza-cu-slot", payload);
  return data;
}

async function runChecklist() {
  console.log("Start checklist:", { base: BASE_URL });
  const seed = await seedUser();
  const token = seed.token;
  const client = axios.create({
    baseURL: BASE_URL,
    headers: { Authorization: `Bearer ${token}` },
  });
  const userId = seed.user?._id || seed.user?.id;
  const targetDate = dateStr(2);
  console.log("Ensuring slot", { date: targetDate, time: SLOT_TIME });
  await ensureSlot(client, targetDate);
  console.log("Slot ensured.");

  console.log("Creating design draft...");
  const designId = await createDesign(client, userId, "draft");
  console.log("Design saved:", designId);

  console.log("Sending personalizare to patiser...");
  await sendPersonalizare(client, designId, userId);

  console.log("Fetching product to use in order...");
  const products = await client.get("/torturi", { params: { limit: 1 } });
  const product = Array.isArray(products.data?.items) ? products.data.items[0] : null;
  if (!product?._id) throw new Error("Nu exista torturi pentru test.");

  console.log("Creating order with slot...");
  const order = await createOrder(client, targetDate, SLOT_TIME, product._id, designId, userId);
  console.log("Order created:", order._id);

  const notifications = await client.get("/notificari", {
    params: { userId },
  });
  console.log("Notificari gasite:", notifications.data.length);

  const production = await client.get("/admin/production/board", {
    params: { date: targetDate },
  });
  console.log("Board entries:", (production.data.board || []).length);

  const album = await client.post("/albume", {
    titlu: "Test album",
    fisiere: ["https://example.com/cake.png"],
    utilizatorId: userId,
  });
  console.log("Album creat:", album.data._id);

  const notifFromAlbum = await client.get("/notificari", {
    params: { userId },
  });
  console.log("Notificari actualizate:", notifFromAlbum.data.length);

  console.log("Checklist complete. Order:", order._id);
}

runChecklist().catch((err) => {
  console.error("Checklist failure:", err.message || err);
  process.exit(1);
});
