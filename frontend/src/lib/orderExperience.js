function normalizeText(value = "") {
  return String(value || "").trim();
}

export function normalizeOrderStatus(status = "") {
  const value = normalizeText(status).toLowerCase();
  if (!value) return "plasata";
  return value;
}

export function canReviewDeliveredOrder(order) {
  const status = normalizeOrderStatus(order?.status);
  return ["livrata", "ridicata", "picked_up", "delivered"].includes(status);
}

function getTimelineTemplate(order = {}) {
  const deliveryMethod = normalizeText(order?.metodaLivrare).toLowerCase();
  return [
    { id: "plasata", label: "Preluata" },
    { id: "acceptata", label: "Confirmata" },
    { id: "in_lucru", label: "In lucru" },
    { id: "gata", label: "Gata" },
    {
      id: deliveryMethod === "livrare" ? "livrata" : "ridicata",
      label: deliveryMethod === "livrare" ? "Livrata" : "Ridicata",
    },
  ];
}

function statusIndex(timeline, status) {
  const normalized = normalizeOrderStatus(status);
  const aliases = {
    in_asteptare: "plasata",
    confirmata: "acceptata",
    predat_curierului: "gata",
    out_for_delivery: "gata",
    delivered: "livrata",
    picked_up: "ridicata",
  };
  const resolved = aliases[normalized] || normalized;
  return timeline.findIndex((item) => item.id === resolved);
}

export function buildOrderTimeline(order = {}) {
  const status = normalizeOrderStatus(order?.status);
  if (["anulata", "refuzata", "cancelled", "canceled"].includes(status)) {
    return [
      {
        id: status,
        label: status === "refuzata" ? "Refuzata" : "Anulata",
        state: "blocked",
        note: normalizeText(order?.motivRefuz || ""),
      },
    ];
  }

  const timeline = getTimelineTemplate(order);
  const activeIndex = Math.max(0, statusIndex(timeline, status));
  const history = Array.isArray(order?.statusHistory) ? order.statusHistory : [];

  return timeline.map((step, index) => {
    const matchedHistory = history
      .filter((entry) => statusIndex(timeline, entry?.status) === index)
      .slice(-1)[0];
    return {
      ...step,
      state: index < activeIndex ? "done" : index === activeIndex ? "current" : "todo",
      note: normalizeText(matchedHistory?.note || ""),
      at: matchedHistory?.at || null,
    };
  });
}

export function getOrderStatusTone(order = {}) {
  const status = normalizeOrderStatus(order?.status);
  if (["livrata", "ridicata", "picked_up", "delivered", "gata"].includes(status)) {
    return "success";
  }
  if (["anulata", "refuzata", "cancelled", "canceled"].includes(status)) {
    return "error";
  }
  if (["acceptata", "confirmata", "in_lucru"].includes(status)) {
    return "info";
  }
  return "warning";
}

export function buildOrderChatLink(order = {}) {
  const params = new URLSearchParams();
  if (order?.prestatorId) {
    params.set("providerId", String(order.prestatorId));
  }
  const orderLabel = normalizeText(order?.numeroComanda) || `#${String(order?._id || "").slice(-6)}`;
  params.set("context", `Comanda ${orderLabel}`);
  params.set(
    "message",
    `Salut! Revin cu detalii pentru comanda ${orderLabel}. Am nevoie de o confirmare privind decorul, statusul sau livrarea.`
  );
  return `/chat?${params.toString()}`;
}
