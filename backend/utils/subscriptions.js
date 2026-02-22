const Comanda = require("../models/Comanda");
const CutieLunara = require("../models/CutieLunara");

const PLAN_PRICE_MAP = {
  basic: 400,
  premium: 600,
  deluxe: 900,
};

function normalizePlan(raw) {
  const plan = String(raw || "").trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(PLAN_PRICE_MAP, plan) ? plan : null;
}

function getPlanPrice(plan) {
  const normalized = normalizePlan(plan);
  if (!normalized) return null;
  return PLAN_PRICE_MAP[normalized];
}

function isPaidOrder(comanda) {
  return comanda?.paymentStatus === "paid" || comanda?.statusPlata === "paid";
}

function isSubscriptionOrder(comanda) {
  return String(comanda?.tip || "") === "abonament_cutie";
}

function extractPlanFromOrder(comanda) {
  const fromDetails = normalizePlan(comanda?.customDetails?.plan);
  if (fromDetails) return fromDetails;

  const firstItem = Array.isArray(comanda?.items) ? comanda.items[0] : null;
  const fromProductId = normalizePlan(
    String(firstItem?.productId || "").replace(/^abonament-/, "")
  );
  if (fromProductId) return fromProductId;

  return null;
}

async function activateCutieFromComanda(comanda) {
  if (!comanda || !isSubscriptionOrder(comanda) || !isPaidOrder(comanda)) {
    return null;
  }

  const plan = extractPlanFromOrder(comanda);
  if (!plan) return null;

  const preferinte = String(comanda?.customDetails?.preferinte || "").trim();
  const pretLunar = getPlanPrice(plan) || 0;

  let abonament = await CutieLunara.findOne({ clientId: comanda.clientId });
  if (!abonament) {
    abonament = new CutieLunara({ clientId: comanda.clientId });
  }

  const wasAlreadyActive = abonament.activ === true;
  abonament.plan = plan;
  abonament.preferinte = preferinte;
  abonament.activ = true;
  abonament.pretLunar = pretLunar;
  abonament.statusPlata = "paid";
  abonament.pendingOrderId = null;
  abonament.ultimaComandaId = comanda._id;
  abonament.ultimaPlataLa = new Date();
  if (!abonament.dataActivare) {
    abonament.dataActivare = new Date();
  }

  await abonament.save();
  return { abonament, wasAlreadyActive };
}

async function activateCutieFromOrderId(orderId) {
  const comanda = await Comanda.findById(orderId);
  if (!comanda) return null;
  return activateCutieFromComanda(comanda);
}

module.exports = {
  PLAN_PRICE_MAP,
  normalizePlan,
  getPlanPrice,
  isPaidOrder,
  isSubscriptionOrder,
  activateCutieFromComanda,
  activateCutieFromOrderId,
};
