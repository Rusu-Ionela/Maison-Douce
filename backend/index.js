require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const { Server } = require("socket.io");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");

const app = express();
mongoose.set("strictQuery", true);
const server = http.createServer(app);

// --- ORIGIN / CORS ---
const ORIGIN = process.env.BASE_CLIENT_URL || "http://localhost:5173";
const CORS_ORIGINS = [ORIGIN, "http://localhost:5173", "http://localhost:5174"];

app.use(
  cors({
    origin: CORS_ORIGINS,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// --- SECURITY MIDDLEWARE ---
app.use(helmet());
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// --- HEALTH ---
app.get("/api/health", (_req, res) => res.send("ok"));

// --- STRIPE WEBHOOK: RAW ---
try {
  const stripeWebhookHandler = require("./routes/stripeWebhook");
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    stripeWebhookHandler
  );
  console.log("✓ Mounted /api/stripe/webhook (RAW)");
} catch {
  console.warn(
    "⚠ Stripe webhook route not mounted (routes/stripeWebhook missing?)"
  );
}

// --- BODY PARSERS ---
const BODY_LIMIT = process.env.BODY_LIMIT || "10mb";
app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));

// --- Anti NoSQL injection minimalist ---
function deepSanitize(obj) {
  if (!obj || typeof obj !== "object") return;
  for (const k of Object.keys(obj)) {
    if (k.startsWith("$") || k.includes(".")) delete obj[k];
    else deepSanitize(obj[k]);
  }
}

app.use((req, _res, next) => {
  if (req.path === "/api/stripe/webhook") return next();
  if (req.body && typeof req.body === "object") deepSanitize(req.body);
  if (req.params && typeof req.params === "object") deepSanitize(req.params);
  if (req.query && typeof req.query === "object") deepSanitize(req.query);
  next();
});

// --- STATIC ---
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

// --- Helper mount ---
function mount(mountPath, routePath) {
  try {
    app.use(mountPath, require(routePath));
    console.log(`✓ Mounted ${mountPath} -> ${routePath}`);
  } catch (err) {
    console.error(`✗ Failed to mount ${mountPath} from ${routePath}`);
    console.error(err.message || err);
  }
}

// --- DEV ROUTES ---
if (process.env.NODE_ENV !== "production") {
  mount("/api/dev-payments", "./routes/devPayments");
}

// --- CORE ROUTES ---
mount("/api/utilizatori", "./routes/utilizatori");
mount("/api/torturi", "./routes/torturi");
mount("/api/ingrediente", "./routes/ingredient.routes");
mount("/api/produse-studio", "./routes/produseStudio");
mount("/api/calendar", "./routes/calendar");
mount("/api/calendar-admin", "./routes/calendarAdmin");
mount("/api/rezervari", "./routes/rezervari");
mount("/api/comenzi", "./routes/comenzi");
mount("/api/rapoarte", "./routes/rapoarte");
mount("/api/rapoarte-rezervari", "./routes/rapoarteRezervariRoutes");
mount("/api/recenzii", "./routes/recenzii");
mount("/api/albume", "./routes/albumeRoutes");
mount("/api/partajare", "./routes/partajareRoutes");
mount("/api/upload", "./routes/upload");
mount("/api/notificari", "./routes/notificari");
mount("/api/notificari-foto", "./routes/notificariFotoRoutes");
mount("/api/admin/production", "./routes/adminProduction");

// --- FIDELIZARE, RECOMANDĂRI, EXTRA ---
mount("/api/fidelizare", "./routes/fidelizare");
mount("/api/recommendations", "./routes/recommendations");
mount("/api/personalizare", "./routes/personalizare");
mount("/api/coupon", "./routes/coupon");
mount("/api/comenzi-personalizate", "./routes/comenziPersonalizate");
mount("/api/cutie-lunara", "./routes/cutieLunara");
mount("/api/ai", "./routes/ai");
mount("/api/auth", "./routes/auth");

// --- CHAT / MESAJE ---
mount("/api/mesaje-chat", "./routes/mesajChat");
mount("/api/chat", "./routes/chat");
mount("/api/push", "./routes/push");

// --- RESET PAROLĂ ---
mount("/api/reset-parola", "./routes/resetParola");

// --- STRIPE NORMAL ---
const stripeKey =
  process.env.STRIPE_SECRET_KEY ||
  process.env.STRIPE_SECRET ||
  process.env.STRIPE_SK ||
  "";
if (stripeKey) {
  mount("/api/stripe", "./routes/stripe");
} else {
  console.warn("⚠ STRIPE_SECRET_KEY missing — skipping /api/stripe");
}

// ❌ NU MAI MONTĂM notImplemented PESTE RUTELE REALE ❌
// Dacă ai vreo rută care chiar nu e gata, poți să o lași explicit, de ex.:
// mount("/api/ceva-nerealizat", "./routes/notImplemented");

// --- 404 ---
app.use((_req, res) => res.status(404).json({ message: "Ruta nu există." }));

// --- ERROR HANDLER ---
const errorHandler = (err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Eroare server",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
};

app.use(errorHandler);

// --- SOCKET.IO ---
// Socket.io initialization is deferred until after MongoDB connects
// to ensure persistence (MesajChat) is available. It will be initialized
// below inside the startup routine once the DB connection succeeds.

// --- MONGO + LISTEN ---
const PORT = process.env.PORT || 5000;
const MONGO_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/torturi?directConnection=true&family=4";

console.log("MONGO_URI =", MONGO_URI);

(async () => {
  try {
    if (MONGO_URI && !MONGO_URI.includes("<cluster>")) {
      await mongoose.connect(MONGO_URI);
      console.log("MongoDB conectat");

      mongoose.connection.on("error", (err) => {
        console.error("MongoDB error:", err);
      });
      // init sockets after mongo connected so we can persist messages reliably
      try {
        const socketModule = require("./socket");
        socketModule.init(server);
        console.log("✓ Socket.io initialized after MongoDB connection");
      } catch (e) {
        console.warn("Socket.io init failed after Mongo connect:", e?.message || e);
      }
    } else {
      console.warn("MONGODB_URI lipsă/placeholder — sar peste Mongo (DEV)");
    }

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(
          `❌ Portul ${PORT} este deja folosit. Schimbă PORT în .env`
        );
        process.exit(1);
      } else throw err;
    });

    server.listen(PORT, () => {
      console.log(
        `API server pe http://localhost:${PORT} (origin: ${ORIGIN})`
      );
    });
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
})();

process.on("unhandledRejection", (err) =>
  console.error("Unhandled rejection:", err)
);
