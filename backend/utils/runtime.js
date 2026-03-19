const DEV_CLIENT_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:3000",
];

const WEAK_VALUE_PATTERNS = [
  /^change[_-]?me/i,
  /^changeme$/i,
  /^secret$/i,
  /^password$/i,
  /^test(pass|ing)?/i,
  /^jwt[_-]?secret$/i,
  /^patiser[_-]?invite$/i,
];

function isProductionEnv() {
  return process.env.NODE_ENV === "production";
}

function normalizeOriginUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
}

function getAllowedClientOrigins() {
  const origins = new Set();
  const baseOrigin = normalizeOriginUrl(process.env.BASE_CLIENT_URL || "");
  const extraOrigins = String(process.env.ADDITIONAL_CORS_ORIGINS || "")
    .split(",")
    .map((value) => normalizeOriginUrl(value))
    .filter(Boolean);

  if (baseOrigin) {
    origins.add(baseOrigin);
  }
  extraOrigins.forEach((origin) => origins.add(origin));

  if (!isProductionEnv()) {
    DEV_CLIENT_ORIGINS.forEach((origin) => origins.add(origin));
  }

  return Array.from(origins);
}

function hasMongoConfig() {
  return Boolean(String(process.env.MONGODB_URI || process.env.MONGO_URI || "").trim());
}

function getStripeSecretKey() {
  return String(
    process.env.STRIPE_SECRET_KEY ||
      process.env.STRIPE_SECRET ||
      process.env.STRIPE_SK ||
      ""
  ).trim();
}

function hasStripeKey() {
  return Boolean(getStripeSecretKey());
}

function hasEmailTransportConfig() {
  const host = String(process.env.SMTP_HOST || "").trim();
  const service = String(process.env.SMTP_SERVICE || "").trim();
  const user = String(process.env.SMTP_USER || process.env.EMAIL_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || process.env.EMAIL_PASS || "").trim();

  return Boolean(user && pass && (host || service));
}

function isMailOutboxFallbackEnabled() {
  return (
    !isProductionEnv() ||
    String(process.env.ALLOW_MAIL_OUTBOX_FALLBACK || "").trim().toLowerCase() ===
      "true"
  );
}

function isWeakSecret(value, minLength = 12) {
  const raw = String(value || "").trim();
  if (!raw) return true;
  if (raw.length < minLength) return true;
  return WEAK_VALUE_PATTERNS.some((pattern) => pattern.test(raw));
}

function hasHttpsClientUrl() {
  const baseUrl = String(process.env.BASE_CLIENT_URL || "").trim();
  if (!baseUrl) return false;

  try {
    const parsed = new URL(baseUrl);
    const isLocalhost = ["localhost", "127.0.0.1"].includes(parsed.hostname);
    return parsed.protocol === "https:" || isLocalhost;
  } catch {
    return false;
  }
}

function validateRuntimeConfig() {
  const missing = [];
  const invalid = [];
  const hasStripe = hasStripeKey();
  const jwtSecret = String(process.env.JWT_SECRET || "").trim();
  const inviteCode = String(process.env.PATISER_INVITE_CODE || "").trim();
  const baseClientUrl = String(process.env.BASE_CLIENT_URL || "").trim();
  const stripeWebhookSecret = String(process.env.STRIPE_WEBHOOK_SECRET || "").trim();

  if (!jwtSecret) {
    missing.push("JWT_SECRET");
  } else if (isProductionEnv() && isWeakSecret(jwtSecret, 32)) {
    invalid.push("JWT_SECRET must be at least 32 chars and not use a placeholder value");
  }

  if (!isProductionEnv()) {
    return { missing, invalid };
  }

  if (!baseClientUrl) {
    missing.push("BASE_CLIENT_URL");
  } else if (!normalizeOriginUrl(baseClientUrl)) {
    invalid.push("BASE_CLIENT_URL must be a valid absolute URL");
  } else if (!hasHttpsClientUrl()) {
    invalid.push("BASE_CLIENT_URL must use https in production");
  }

  if (!hasMongoConfig()) {
    missing.push("MONGODB_URI");
  }

  if (!inviteCode) {
    missing.push("PATISER_INVITE_CODE");
  } else if (isWeakSecret(inviteCode, 12)) {
    invalid.push(
      "PATISER_INVITE_CODE must be at least 12 chars and not use a predictable default"
    );
  }

  if (!hasStripe) {
    missing.push("STRIPE_SECRET_KEY");
  }
  if (hasStripe && !stripeWebhookSecret) {
    missing.push("STRIPE_WEBHOOK_SECRET");
  }
  if (stripeWebhookSecret && !/^whsec_/i.test(stripeWebhookSecret)) {
    invalid.push("STRIPE_WEBHOOK_SECRET must look like a Stripe webhook secret");
  }
  if (hasStripe && !/^sk_/i.test(getStripeSecretKey())) {
    invalid.push("STRIPE_SECRET_KEY must look like a Stripe secret key");
  }

  if (!hasEmailTransportConfig()) {
    missing.push("SMTP_HOST/SMTP_SERVICE + SMTP_USER + SMTP_PASS");
  }

  return { missing, invalid };
}

module.exports = {
  getAllowedClientOrigins,
  getStripeSecretKey,
  hasEmailTransportConfig,
  hasMongoConfig,
  hasStripeKey,
  isMailOutboxFallbackEnabled,
  isProductionEnv,
  normalizeOriginUrl,
  validateRuntimeConfig,
};
