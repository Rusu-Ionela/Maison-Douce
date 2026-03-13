const DEFAULT_PRESTATOR_ID = "default";
const prestatorEnvId = String(import.meta.env.VITE_PRESTATOR_ID || "").trim();
const stripePublicKey = String(import.meta.env.VITE_STRIPE_PK || "").trim();

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
    'VITE_PRESTATOR_ID nu este configurat. Aplicatia foloseste calendarul fallback "default", ' +
    "iar sloturile pot lipsi sau pot apartine altui prestator."
  );
}

export function getStripePublicKey() {
  return stripePublicKey;
}

export function hasStripePublicKey() {
  return Boolean(stripePublicKey);
}

export function getStripePublicKeyWarningMessage() {
  return (
    "VITE_STRIPE_PK nu este configurat. Stripe Checkout poate functiona doar in redirect mode " +
    "daca backendul este activ, iar Payment Element ramane indisponibil in UI."
  );
}
