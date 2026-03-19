const mongoose = require("mongoose");

let Utilizator = null;
try {
  Utilizator = require("../models/Utilizator");
} catch {
  Utilizator = null;
}

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isValidDateOnly(value) {
  const match = DATE_ONLY_RE.exec(String(value || "").trim());
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function validateDateOnly(value, label) {
  if (!value) {
    throw new Error(`${label} este obligatoriu.`);
  }
  if (!isValidDateOnly(value)) {
    throw new Error(`${label} trebuie sa fie o data valida in format YYYY-MM-DD.`);
  }
  return String(value).trim();
}

function buildStringDateRange(field, from, to, options = {}) {
  const {
    required = false,
    fromLabel = "from",
    toLabel = "to",
  } = options;

  const cleanFrom = from ? validateDateOnly(from, fromLabel) : "";
  const cleanTo = to ? validateDateOnly(to, toLabel) : "";

  if (required && (!cleanFrom || !cleanTo)) {
    throw new Error(`${fromLabel} si ${toLabel} sunt obligatorii.`);
  }
  if (cleanFrom && cleanTo && cleanFrom > cleanTo) {
    throw new Error(`${fromLabel} trebuie sa fie mai mica sau egala cu ${toLabel}.`);
  }
  if (!cleanFrom && !cleanTo) {
    return {};
  }

  const range = {};
  if (cleanFrom) range.$gte = cleanFrom;
  if (cleanTo) range.$lte = cleanTo;
  return { [field]: range };
}

function buildCreatedAtRange(field, from, to, options = {}) {
  const {
    required = false,
    fromLabel = "startDate",
    toLabel = "endDate",
  } = options;

  const cleanFrom = from ? validateDateOnly(from, fromLabel) : "";
  const cleanTo = to ? validateDateOnly(to, toLabel) : "";

  if (required && (!cleanFrom || !cleanTo)) {
    throw new Error(`${fromLabel} si ${toLabel} sunt obligatorii.`);
  }
  if (cleanFrom && cleanTo && cleanFrom > cleanTo) {
    throw new Error(`${fromLabel} trebuie sa fie mai mica sau egala cu ${toLabel}.`);
  }
  if (!cleanFrom && !cleanTo) {
    return {};
  }

  const range = {};
  if (cleanFrom) {
    const [year, month, day] = cleanFrom.split("-").map(Number);
    range.$gte = new Date(year, month - 1, day, 0, 0, 0, 0);
  }
  if (cleanTo) {
    const [year, month, day] = cleanTo.split("-").map(Number);
    range.$lte = new Date(year, month - 1, day, 23, 59, 59, 999);
  }
  return { [field]: range };
}

function readNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getOrderItems(doc) {
  if (Array.isArray(doc?.items) && doc.items.length > 0) return doc.items;
  if (Array.isArray(doc?.produse) && doc.produse.length > 0) return doc.produse;
  return [];
}

function getItemName(item) {
  return (
    item?.name ||
    item?.nume ||
    item?.tortName ||
    item?.productName ||
    item?.productId ||
    item?.tortId ||
    "Produs"
  );
}

function getItemQty(item, fallback = 0) {
  const raw = item?.qty ?? item?.cantitate;
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return fallback;
}

function getOrderItemQuantity(doc) {
  return getOrderItems(doc).reduce((sum, item) => sum + getItemQty(item, 1), 0);
}

function summarizeOrderItems(doc) {
  const items = getOrderItems(doc);
  if (items.length > 0) {
    return items
      .map((item) => `${getItemName(item)} x${getItemQty(item, 1)}`)
      .join(" | ");
  }

  if (doc?.preferinte) return String(doc.preferinte);
  if (doc?.customDetails?.descriere) return String(doc.customDetails.descriere);
  if (doc?.tortId) return `Tort ${doc.tortId}`;
  return "";
}

function getOrderDeliveryFee(doc) {
  if (doc?.taxaLivrare != null) return readNumber(doc.taxaLivrare, 0);
  if (doc?.deliveryFee != null) return readNumber(doc.deliveryFee, 0);
  return 0;
}

function getOrderTotal(doc) {
  if (doc?.totalFinal != null) return readNumber(doc.totalFinal, 0);
  if (doc?.total != null) return readNumber(doc.total, 0);
  return 0;
}

function normalizeDeliveryMethod(value) {
  switch (String(value || "").trim().toLowerCase()) {
    case "delivery":
    case "livrare":
      return "delivery";
    case "courier":
      return "courier";
    default:
      return "pickup";
  }
}

function formatUserLabel(user, fallbackId) {
  if (user?.name) return user.name;
  if (user?.email) return user.email;
  return String(fallbackId || "").trim() || "Client";
}

async function buildUserMap(rawIds) {
  const userMap = new Map();
  if (!Utilizator) return userMap;

  const ids = [...new Set((rawIds || []).map((value) => String(value || "").trim()))]
    .filter(Boolean)
    .filter((value) => mongoose.isValidObjectId(value));

  if (ids.length === 0) return userMap;

  const users = await Utilizator.find({ _id: { $in: ids } })
    .select("nume prenume email telefon")
    .lean();

  users.forEach((user) => {
    const fullName = [user.nume, user.prenume].filter(Boolean).join(" ").trim();
    userMap.set(String(user._id), {
      name: fullName || user.email || "",
      email: user.email || "",
      telefon: user.telefon || "",
    });
  });

  return userMap;
}

module.exports = {
  buildCreatedAtRange,
  buildStringDateRange,
  buildUserMap,
  formatUserLabel,
  getItemName,
  getItemQty,
  getOrderDeliveryFee,
  getOrderItemQuantity,
  getOrderItems,
  getOrderTotal,
  isValidDateOnly,
  normalizeDeliveryMethod,
  readNumber,
  summarizeOrderItems,
  validateDateOnly,
};
