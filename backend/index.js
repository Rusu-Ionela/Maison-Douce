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

app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// --- SECURITY MIDDLEWARE ---
app.use(helmet());
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// --- HEALTH ---
app.get("/api/health", (_req, res) => res.send("ok"));

// --- STRIPE WEBHOOK: RAW ---
try {
  const stripeWebhookHandler = require("./routes/stripeWebhook");
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);
  console.log("✓ Mounted /api/stripe/webhook (RAW)");
} catch {
  console.warn("⚠ Stripe webhook route not mounted (routes/stripeWebhook missing?)");
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

// --- ROUTES ---
if (process.env.NODE_ENV !== "production") {
  mount("/api/dev-payments", "./routes/devPayments");
}

// --- ROUTES ---
if (process.env.NODE_ENV !== "production") {
  mount("/api/dev-payments", "./routes/devPayments");
}

mount("/api/utilizatori", "./routes/utilizatori");
mount("/api/torturi", "./routes/torturi");
mount("/api/produse-studio", "./routes/produseStudio");
mount("/api/calendar", "./routes/calendar");
mount("/api/calendar-admin", "./routes/calendarAdmin");
mount("/api/rezervari", "./routes/rezervari");
mount("/api/comenzi", "./routes/comenzi");
mount("/api/rapoarte", "./routes/rapoarte");
mount("/api/rapoarte-rezervari", "./routes/rapoarteRezervariRoutes");
mount("/api/recenzii", "./routes/recenzii");
mount("/api/albume", "./routes/albumeRoutes");
mount("/api/notificari", "./routes/notificari");
mount("/api/notificari-foto", "./routes/notificariFotoRoutes");

// 🆕 NOILE RUTE - CALENDAR, FIDELIZARE, RAPOARTE
mount("/api/fidelizare", "./routes/fidelizare");

// ... rest of routes
const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET || process.env.STRIPE_SK || "";
if (stripeKey) {
  mount("/api/stripe", "./routes/stripe");
} else {
  console.warn("⚠ STRIPE_SECRET_KEY missing — skipping /api/stripe");
}

[
  "mesaje-chat", "chat", "comenzi-personalizate", "fidelizare",
  "recommendations", "personalizare", "reset-parola", "cutie-lunara", "coupon"
].forEach((rp) => mount(`/api/${rp}`, "./routes/notImplemented"));

// --- 404 ---
app.use((_req, res) => res.status(404).json({ message: "Ruta nu există." }));

// --- ERROR HANDLER ---
const errorHandler = (err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Eroare server",
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

app.use(errorHandler);

// --- SOCKET.IO ---
const io = new Server(server, {
  cors: { origin: CORS_ORIGINS, methods: ["GET", "POST"], credentials: true },
});

io.of("/user-chat").on("connection", (socket) => {
  console.log("user-chat connected:", socket.id);
  socket.on("sendMessage", (data) => io.of("/user-chat").emit("receiveMessage", data));
});

// --- MONGO + LISTEN ---
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/torturi?directConnection=true&family=4";

console.log("MONGO_URI =", MONGO_URI);

(async () => {
  try {
    if (MONGO_URI && !MONGO_URI.includes("<cluster>")) {
      await mongoose.connect(MONGO_URI);
      console.log("MongoDB conectat");

      mongoose.connection.on('error', err => {
        console.error('MongoDB error:', err);
      });
    } else {
      console.warn("MONGODB_URI lipsă/placeholder — sar peste Mongo (DEV)");
    }

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`❌ Portul ${PORT} este deja folosit. Schimbă PORT în .env`);
        process.exit(1);
      } else throw err;
    });

    server.listen(PORT, () => {
      console.log(`API server pe http://localhost:${PORT} (origin: ${ORIGIN})`);
    });
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
})();

process.on("unhandledRejection", (err) => console.error("Unhandled rejection:", err));