const DEFAULT_PRESTATOR_ID = "";
const DEFAULT_API_BASE_URL = "/api";
const DEFAULT_MIN_LEAD_HOURS = 24;

const buildConfig = {
  VITE_API_URL: String(import.meta.env.VITE_API_URL || "").trim(),
  VITE_PRESTATOR_ID: String(import.meta.env.VITE_PRESTATOR_ID || "").trim(),
  VITE_STRIPE_PK: String(import.meta.env.VITE_STRIPE_PK || "").trim(),
  VITE_MIN_LEAD_HOURS: String(import.meta.env.VITE_MIN_LEAD_HOURS || "").trim(),
};

function getRuntimeConfigObject() {
  if (typeof window === "undefined") return {};
  const config = window.__APP_RUNTIME_CONFIG__;
  return config && typeof config === "object" ? config : {};
}

function readConfigString(key, fallback = "") {
  const runtimeValue = String(getRuntimeConfigObject()[key] || "").trim();
  if (runtimeValue) return runtimeValue;

  const buildValue = String(buildConfig[key] || "").trim();
  if (buildValue) return buildValue;

  return fallback;
}

const apiBaseUrl = readConfigString("VITE_API_URL", DEFAULT_API_BASE_URL).replace(
  /\/$/,
  ""
);
const prestatorEnvId = readConfigString("VITE_PRESTATOR_ID", "");
const stripePublicKey = readConfigString("VITE_STRIPE_PK", "");
const rawMinLeadHours = readConfigString(
  "VITE_MIN_LEAD_HOURS",
  String(DEFAULT_MIN_LEAD_HOURS)
);
const parsedMinLeadHours = Number(rawMinLeadHours);
const minLeadHours =
  Number.isFinite(parsedMinLeadHours) && parsedMinLeadHours > 0
    ? parsedMinLeadHours
    : DEFAULT_MIN_LEAD_HOURS;

export function getApiBaseUrl() {
  return apiBaseUrl;
}

export function getConfiguredPrestatorId() {
  return prestatorEnvId || DEFAULT_PRESTATOR_ID;
}

export function hasPrestatorEnvConfig() {
  return Boolean(prestatorEnvId);
}

export function getPrestatorCalendarOwnerId(user) {
  return String(user?._id || user?.id || prestatorEnvId || DEFAULT_PRESTATOR_ID);
}

export function isPrestatorCalendarFallback(user) {
  return !String(user?._id || user?.id || "").trim() && !hasPrestatorEnvConfig();
}

export function getPrestatorEnvWarningMessage() {
  return (
    "VITE_PRESTATOR_ID nu este configurat ca fallback. Aplicatia va incerca sa " +
    "foloseasca lista reala de prestatori din baza de date."
  );
}

export function getStripePublicKey() {
  return stripePublicKey;
}

export function hasStripePublicKey() {
  return Boolean(stripePublicKey);
}

export function getMinLeadHours() {
  return minLeadHours;
}

export function getStripePublicKeyWarningMessage() {
  return (
    "VITE_STRIPE_PK nu este configurat. Stripe Checkout poate functiona doar in redirect mode " +
    "daca backendul este activ, iar Payment Element ramane indisponibil in UI."
  );
}
