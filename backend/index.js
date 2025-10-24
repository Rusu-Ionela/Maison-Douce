// ---------- 1) ENV ----------
require("dotenv").config();

// ---------- 2) IMPORTS ----------
const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const { Server } = require("socket.io");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");

// ---------- 3) APP + SERVER ----------
const app = express();
mongoose.set("strictQuery", true);
const server = http.createServer(app);

// ---------- 4) ORIGIN / CORS / SECURITATE GLOBALĂ ----------
const ORIGIN = process.env.BASE_CLIENT_URL || "http://localhost:5173";
const CORS_ORIGINS = [ORIGIN, "http://localhost:5173", "http://localhost:5174"];

app.use(
  cors({
    origin: CORS_ORIGINS,
    credentials: false, // ← Bearer JWT, fără cookie-uri
  })
);

app.use(helmet());
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 })); // 100 req / 15 min / IP

// ---------- 5) HEALTH ----------
app.get("/api/health", (_req, res) => res.send("ok"));

// ---------- 6) STRIPE WEBHOOK (RAW) — O SINGURĂ DATĂ, ÎNAINTE DE BODY PARSERS ----------
try {
  const stripeWebhookHandler = require("./routes/stripeWebhook");
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);
  console.log("✓ Mounted /api/stripe/webhook (RAW)");
} catch (e) {
  console.warn("⚠ Stripe webhook route not mounted (routes/stripeWebhook missing?)");
}

// ---------- 7) BODY PARSERS (după webhook) ----------
const BODY_LIMIT = process.env.BODY_LIMIT || "10mb";
app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));

// ---------- 7.1) SANITIZARE MANUALĂ (sărim peste webhook) ----------
function deepSanitize(obj) {
  if (!obj || typeof obj !== "object") return;
  for (const key of Object.keys(obj)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete obj[key];
      continue;
    }
    deepSanitize(obj[key]);
  }
}
app.use((req, _res, next) => {
  if (req.path === "/api/stripe/webhook") return next();
  if (req.body && typeof req.body === "object") deepSanitize(req.body);
  if (req.params && typeof req.params === "object") deepSanitize(req.params);
  if (req.query && typeof req.query === "object") deepSanitize(req.query);
  next();
});

// ---------- 8) STATIC ----------
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res, filePath) => {
      if (!/\.(png|jpe?g|gif|webp|svg|pdf|txt|csv)$/i.test(filePath)) {
        res.setHeader("Content-Disposition", "attachment");
      }
    },
  })
);

// ---------- Helper de montare cu erori clare ----------
function mount(mountPath, routePath) {
  try {
    app.use(mountPath, require(routePath));
    console.log(`✓ Mounted ${mountPath} -> ${routePath}`);
  } catch (err) {
    console.error(`✗ Failed to mount ${mountPath} from ${routePath}`);
    console.error(err.message || err);
  }
}

// ---------- 9) ROUTES ----------
if (process.env.NODE_ENV !== "production") {
  mount("/api/dev-payments", "./routes/devPayments");
}

// rute de bază
mount("/api/calendar-admin", "./routes/calendarAdmin");
mount("/api/utilizatori", "./routes/utilizatori");


mount("/api/calendar", "./routes/calendar");
mount("/api/rezervari", "./routes/rezervari");
mount("/api/rapoarte", "./routes/rapoarte");
mount("/api/torturi", "./routes/torturi");
mount("/api/recenzii", "./routes/recenzii");
mount("/api/produse-studio", "./routes/produseStudio");
mount("/api/chat", "./routes/chatRoutes");
mount("/api/mesaje-chat", "./routes/mesajeChatRoutes");
mount("/api/comenzi-personalizate", "./routes/comenziPersonalizate");
mount("/api/notificari", "./routes/notificari");
mount("/api/partajare", "./routes/partajareRoutes");
mount("/api/albume", "./routes/albumeRoutes");
mount("/api/fidelizare", "./routes/fidelizareRoutes");
mount("/api/rapoarte-rezervari", "./routes/rapoarteRezervariRoutes");
mount("/api/recommendations", "./routes/recommendations");
mount("/api/personalizare", "./routes/personalizare");
mount("/api/notificari-foto", "./routes/notificariFotoRoutes");
mount("/api/reset-parola", "./routes/resetParola");
mount("/api/cutie-lunara", "./routes/cutieLunara");
mount("/api/coupon", "./routes/coupon");

// Stripe (doar dacă există cheia — ca să nu te forțeze acum)
if (process.env.STRIPE_SECRET) {
  mount("/api/stripe", "./routes/stripe");     // create-checkout-session, create-payment-intent, etc.

} else {
  console.warn("⚠ STRIPE_SECRET missing — skipping /api/stripe and /api/payments routes");
}

// ---------- 10) 404 ----------
app.use((req, res) => res.status(404).json({ message: "Ruta nu există." }));
app.use('/api/comenzi', require('./middleware/requireAuth'), require('./routes/comenzi'));

// ---------- 11) ERROR HANDLER ----------
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Eroare server" });
});

// ---------- 12) SOCKET.IO ----------
const io = new Server(server, {
  cors: { origin: CORS_ORIGINS, methods: ["GET", "POST"], credentials: true },
});
io.of("/user-chat").on("connection", (socket) => {
  console.log("user-chat connected:", socket.id);
  socket.on("sendMessage", (data) => io.of("/user-chat").emit("receiveMessage", data));
});

// ---------- 13) MONGO + LISTEN ----------
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/torturi";

(async () => {
  let mongoOk = false;
  if (MONGO_URI && !MONGO_URI.includes("<cluster>")) {
    try {
      await mongoose.connect(MONGO_URI);
      mongoOk = true;
      console.log("MongoDB conectat");
    } catch (err) {
      console.error("Eroare MongoDB:", err.message);
    }
  } else {
    console.warn("MONGODB_URI lipsă sau placeholder — sar peste conectarea la Mongo (DEV)");
  }
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`❌ Portul ${PORT} este deja folosit. Închide procesul sau schimbă portul în .env`);
      process.exit(1);
    } else {
      throw err;
    }
  });

  server.listen(PORT, () => {
    console.log(`API server pornit pe http://localhost:${PORT} (origin: ${ORIGIN})${mongoOk ? "" : " — fără Mongo (DEV)"}`);
  });
})();

// ---------- 14) PROMISE ERRORS ----------
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});

