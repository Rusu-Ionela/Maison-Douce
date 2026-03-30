require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const crypto = require("crypto");
const { log, serializeError } = require("./utils/log");
const {
  getAllowedClientOrigins,
  validateRuntimeConfig,
  normalizeOriginUrl,
} = require("./utils/runtime");

function validateCriticalEnv() {
  const { missing, invalid } = validateRuntimeConfig();

  if (missing.length > 0 || invalid.length > 0) {
    log("error", "missing_required_env", {
      missing,
      invalid,
    });
    process.exit(1);
  }
}

validateCriticalEnv();

const app = express();
mongoose.set("strictQuery", true);
const server = http.createServer(app);
const bootAt = Date.now();

app.set("trust proxy", Number(process.env.TRUST_PROXY || 1));
app.set("etag", false);

const BASE_CLIENT_URL =
  String(process.env.BASE_CLIENT_URL || "").trim() || "http://localhost:5173";
const ORIGIN = normalizeOriginUrl(BASE_CLIENT_URL) || BASE_CLIENT_URL;
const CORS_ORIGINS = getAllowedClientOrigins();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      return callback(null, CORS_ORIGINS.includes(origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
  })
);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts:
      process.env.NODE_ENV === "production"
        ? {
            maxAge: 15552000,
            includeSubDomains: true,
            preload: true,
          }
        : false,
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin",
    },
  })
);
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

morgan.token("request-id", (req) => req.id || "-");
app.use((req, res, next) => {
  req.id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  res.setHeader("X-Request-Id", req.id);
  next();
});
app.use(
  morgan(":method :url :status :response-time ms rid=:request-id", {
    stream: {
      write: (message) => log("info", "http_request", { raw: message.trim() }),
    },
  })
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === "test" ? 5000 : 200,
  })
);
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.get("/api/health", (_req, res) => {
  const mongoStates = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  res.json({
    ok: true,
    uptimeSec: Math.round((Date.now() - bootAt) / 1000),
    timestamp: new Date().toISOString(),
    services: {
      mongo: mongoStates[mongoose.connection.readyState] || "unknown",
    },
  });
});

try {
  const stripeWebhookHandler = require("./routes/stripeWebhook");
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    stripeWebhookHandler
  );
  log("info", "route_mounted", {
    mountPath: "/api/stripe/webhook",
    routePath: "./routes/stripeWebhook",
    raw: true,
  });
} catch (err) {
  log("warn", "route_mount_skipped", {
    mountPath: "/api/stripe/webhook",
    routePath: "./routes/stripeWebhook",
    error: serializeError(err),
  });
}

const BODY_LIMIT = process.env.BODY_LIMIT || "10mb";
app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));

function deepSanitize(obj) {
  if (!obj || typeof obj !== "object") return;
  for (const key of Object.keys(obj)) {
    if (key.startsWith("$") || key.includes(".")) delete obj[key];
    else deepSanitize(obj[key]);
  }
}

app.use((req, _res, next) => {
  if (req.path === "/api/stripe/webhook") return next();
  if (req.body && typeof req.body === "object") deepSanitize(req.body);
  if (req.params && typeof req.params === "object") deepSanitize(req.params);
  if (req.query && typeof req.query === "object") deepSanitize(req.query);
  next();
});

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res, filePath) => {
      res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
      res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
      if (!/\.(png|jpe?g|gif|webp|svg|pdf|txt|csv)$/i.test(filePath)) {
        res.setHeader("Content-Disposition", "attachment");
      }
      if (/\\misc\\|\/misc\//i.test(filePath)) {
        res.setHeader("Cache-Control", "private, no-store");
      }
    },
  })
);

function mount(mountPath, routePath) {
  try {
    app.use(mountPath, require(routePath));
    log("info", "route_mounted", { mountPath, routePath });
  } catch (err) {
    log("error", "route_mount_failed", {
      mountPath,
      routePath,
      error: serializeError(err),
    });
  }
}

if (process.env.NODE_ENV !== "production") {
  mount("/api/dev-payments", "./routes/devPayments");
}

mount("/api/utilizatori", "./routes/utilizatori");
mount("/api/torturi", "./routes/torturi");
mount("/api/ingrediente", "./routes/ingredient.routes");
mount("/api/umpluturi", "./routes/umpluturi");
mount("/api/produse-studio", "./routes/produseStudio");
mount("/api/produseStudio", "./routes/produseStudio");
mount("/api/calendar", "./routes/calendar");
mount("/api/calendar-admin", "./routes/calendarAdmin");
mount("/api/rezervari", "./routes/rezervari");
mount("/api/comenzi", "./routes/comenzi");
mount("/api/rapoarte", "./routes/rapoarte");
mount("/api/rapoarte-rezervari", "./routes/rapoarteRezervariRoutes");
mount("/api/recenzii", "./routes/recenzii");
mount("/api/albume", "./routes/albumeRoutes");
mount("/api/partajare", "./routes/partajareRoutes");
mount("/api/contact", "./routes/contact");
mount("/api/monitoring", "./routes/monitoring");
mount("/api/audit", "./routes/audit");
mount("/api/upload", "./routes/upload");
mount("/api/notificari", "./routes/notificari");
mount("/api/notificari-foto", "./routes/notificariFotoRoutes");
mount("/api/admin/production", "./routes/adminProduction");

mount("/api/fidelizare", "./routes/fidelizare");
mount("/api/recommendations", "./routes/recommendations");
mount("/api/personalizare", "./routes/personalizare");
mount("/api/coupon", "./routes/coupon");
mount("/api/comenzi-personalizate", "./routes/comenziPersonalizate");
mount("/api/cutie-lunara", "./routes/cutieLunara");
mount("/api/ai", "./routes/ai");
mount("/api/assistant", "./routes/assistant");
mount("/api/assistant", "./routes/assistantAdmin");
mount("/api/auth", "./routes/auth");

mount("/api/mesaje-chat", "./routes/mesajChat");
mount("/api/chat", "./routes/chat");
mount("/api/push", "./routes/push");

mount("/api/reset-parola", "./routes/resetParola");

const stripeKey =
  process.env.STRIPE_SECRET_KEY ||
  process.env.STRIPE_SECRET ||
  process.env.STRIPE_SK ||
  "";
mount("/api/stripe", "./routes/stripe");
if (!stripeKey) {
  log("warn", "stripe_fallback_mode");
}

app.use((_req, res) => res.status(404).json({ message: "Ruta nu exista." }));

const errorHandler = (err, req, res, _next) => {
  log("error", "request_error", {
    requestId: req?.id,
    path: req?.path,
    method: req?.method,
    error: serializeError(err),
  });

  const status = Number(err?.status || err?.statusCode || 500);
  const publicMessage =
    status >= 500
      ? "Eroare server."
      : err?.publicMessage || err?.message || "Cererea nu a putut fi procesata.";

  res.status(status).json({
    success: false,
    message: publicMessage,
    requestId: req?.id,
    error: process.env.NODE_ENV === "development" ? err?.message : undefined,
  });
};

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const MONGO_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/torturi?directConnection=true&family=4";

log("info", "mongo_config", { configured: Boolean(MONGO_URI) });

(async () => {
  try {
    if (MONGO_URI && !MONGO_URI.includes("<cluster>")) {
      await mongoose.connect(MONGO_URI);
      log("info", "mongo_connected");

      mongoose.connection.on("error", (err) => {
        log("error", "mongo_runtime_error", { error: serializeError(err) });
      });

      try {
        const socketModule = require("./socket");
        socketModule.init(server);
        log("info", "socket_initialized");
      } catch (err) {
        log("warn", "socket_init_failed", { error: serializeError(err) });
      }
    } else {
      log("warn", "mongo_skipped_dev");
    }

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        log("error", "port_in_use", {
          port: PORT,
          message: `Portul ${PORT} este deja folosit. Schimba PORT in .env`,
        });
        process.exit(1);
      }
      throw err;
    });

    server.listen(PORT, () => {
      log("info", "server_started", {
        port: PORT,
        origin: ORIGIN,
      });
    });
  } catch (err) {
    log("error", "mongo_connection_error", { error: serializeError(err) });
    process.exit(1);
  }
})();

process.on("unhandledRejection", (err) =>
  log("error", "unhandled_rejection", { error: serializeError(err) })
);
