import api from "./api";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function getApiErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.message || fallbackMessage;
}

export const queryKeys = {
  stripeStatus: () => ["stripe-status"],
  orderDetail: (orderId) => ["orders", "detail", orderId],
  mySubscription: () => ["subscriptions", "me"],
  adminSubscriptions: () => ["admin", "subscriptions"],
  adminCoupons: (filters = {}) => [
    "admin",
    "coupons",
    filters.search || "",
    filters.status || "",
  ],
  adminReviews: (filters = {}) => [
    "admin",
    "reviews",
    filters.reviewType || "",
    filters.moderationStatus || "",
    String(Boolean(filters.reportedOnly)),
    filters.search || "",
    Number(filters.limit || 50),
  ],
  adminAudit: (filters = {}) => [
    "admin",
    "audit",
    filters.action || "",
    filters.entityType || "",
    filters.entityId || "",
    filters.actorId || "",
    Number(filters.limit || 50),
  ],
  adminClientErrors: (filters = {}) => [
    "admin",
    "monitoring",
    "client-errors",
    filters.kind || "",
    filters.search || "",
    Number(filters.limit || 50),
  ],
  paymentIntent: (orderId, totalFinal) => [
    "payments",
    "intent",
    orderId,
    Number(totalFinal || 0),
  ],
  wallet: (userId) => ["wallet", userId],
  clientOrders: (userId) => ["orders", "client", userId],
  myNotifications: () => ["notifications", "me"],
  photoNotifications: (userId) => ["notifications", "photo", userId],
  adminOrders: () => ["admin", "orders"],
  reservations: () => ["reservations"],
  adminNotifications: () => ["admin", "notifications"],
};

export async function fetchStripeStatus() {
  try {
    const { data } = await api.get("/stripe/status");
    return {
      enabled: Boolean(data?.enabled),
      fallbackAvailable: data?.fallbackAvailable !== false,
      mode: data?.mode || "unknown",
    };
  } catch {
    return {
      enabled: false,
      fallbackAvailable: true,
      mode: "unknown",
    };
  }
}

export async function fetchOrderDetails(orderId) {
  const { data } = await api.get(`/comenzi/${orderId}`);
  return data;
}

export async function fetchMySubscription() {
  const { data } = await api.get("/cutie-lunara/me");
  return data?.abonament || null;
}

export async function fetchAdminSubscriptions() {
  const { data } = await api.get("/cutie-lunara");
  return asArray(data);
}

export async function fetchAdminCoupons(filters = {}) {
  const { data } = await api.get("/coupon/admin", {
    params: {
      search: filters.search || "",
      status: filters.status || "",
    },
  });
  return asArray(data?.items);
}

export async function fetchAdminReviews(filters = {}) {
  const { data } = await api.get("/recenzii/admin", {
    params: {
      reviewType: filters.reviewType || "",
      moderationStatus: filters.moderationStatus || "",
      reportedOnly: Boolean(filters.reportedOnly),
      search: filters.search || "",
      limit: Number(filters.limit || 50),
    },
  });
  return asArray(data?.items);
}

export async function fetchAdminAuditLogs(filters = {}) {
  const { data } = await api.get("/audit", {
    params: {
      action: filters.action || "",
      entityType: filters.entityType || "",
      entityId: filters.entityId || "",
      actorId: filters.actorId || "",
      limit: Number(filters.limit || 50),
    },
  });
  return asArray(data?.items);
}

export async function fetchAdminClientErrors(filters = {}) {
  const { data } = await api.get("/monitoring/client-errors", {
    params: {
      kind: filters.kind || "",
      search: filters.search || "",
      limit: Number(filters.limit || 50),
    },
  });
  return asArray(data?.items);
}

export async function fetchWalletDetails(userId) {
  const { data } = await api.get(`/fidelizare/client/${userId}`);
  return {
    puncteCurent: Number(data?.puncteCurent || 0),
    reduceriDisponibile: asArray(data?.reduceriDisponibile),
  };
}

export async function fetchClientOrders(userId) {
  const { data } = await api.get(`/comenzi/client/${userId}`);
  return asArray(data);
}

export async function fetchMyNotifications() {
  const { data } = await api.get("/notificari/me");
  return asArray(data);
}

export async function fetchPhotoNotifications(userId) {
  const { data } = await api.get(`/notificari-foto/${userId}`);
  return asArray(data);
}

export async function fetchAdminOrders() {
  const { data } = await api.get("/comenzi");
  return asArray(data).filter((item) => item?._source !== "rezervare");
}

export async function fetchReservations() {
  const { data } = await api.get("/rezervari");
  return asArray(data);
}

export async function fetchAdminNotifications() {
  const { data } = await api.get("/notificari");
  return asArray(data);
}
