const Ingredient = require("../models/Ingredient.model");
const { notifyAdmins } = require("../utils/notifications");

const ALERT_INTERVAL_MS = 12 * 60 * 60 * 1000;
const EXPIRING_SOON_DAYS = 3;

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function daysUntilExpiration(dateValue) {
  if (!dateValue) return null;
  const end = new Date(dateValue);
  if (Number.isNaN(end.getTime())) return null;
  const now = new Date();
  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.ceil((startOfEnd - startOfNow) / (24 * 60 * 60 * 1000));
}

function computeStatusByDate(dateValue) {
  const days = daysUntilExpiration(dateValue);
  if (days == null) return "bun";
  if (days < 0) return "expirat";
  if (days <= EXPIRING_SOON_DAYS) return "aproape expirat";
  return "bun";
}

function isLowStock(ingredient) {
  const prag = asNumber(ingredient?.pragMinim, 0);
  const cantitate = asNumber(ingredient?.cantitate, 0);
  return prag > 0 && cantitate <= prag;
}

function normalizePayload(body = {}) {
  const payload = { ...body };
  if (payload.cantitate != null) payload.cantitate = asNumber(payload.cantitate, 0);
  if (payload.pragMinim != null) payload.pragMinim = asNumber(payload.pragMinim, 0);
  if (payload.costUnitate != null) payload.costUnitate = asNumber(payload.costUnitate, 0);
  if (payload.pretUnitate != null) payload.pretUnitate = asNumber(payload.pretUnitate, 0);
  if (payload.nume != null) payload.nume = String(payload.nume || "").trim();
  if (payload.tip != null) payload.tip = String(payload.tip || "").trim();
  if (payload.unitate != null) payload.unitate = String(payload.unitate || "").trim();
  if (payload.locatie != null) payload.locatie = String(payload.locatie || "").trim();
  if (payload.observatii != null) payload.observatii = String(payload.observatii || "").trim();
  return payload;
}

function canSendAlert(lastAlertAt, now = new Date()) {
  if (!lastAlertAt) return true;
  return now.getTime() - new Date(lastAlertAt).getTime() >= ALERT_INTERVAL_MS;
}

function enrichIngredient(ingredientDoc) {
  const ingredient = ingredientDoc.toObject ? ingredientDoc.toObject() : { ...ingredientDoc };
  const zilePanaLaExpirare = daysUntilExpiration(ingredient.dataExpirare);
  const stocScazut = isLowStock(ingredient);
  const valoareCost = asNumber(ingredient.cantitate, 0) * asNumber(ingredient.costUnitate, 0);
  const valoareVanzare = asNumber(ingredient.cantitate, 0) * asNumber(ingredient.pretUnitate, 0);
  return {
    ...ingredient,
    zilePanaLaExpirare,
    stocScazut,
    valoareCost,
    valoareVanzare,
  };
}

async function syncStatusAndAlerts(ingredient, { allowNotifications = true } = {}) {
  const now = new Date();
  let changed = false;
  let alertsSent = 0;
  const daysLeft = daysUntilExpiration(ingredient.dataExpirare);
  const computedStatus = computeStatusByDate(ingredient.dataExpirare);

  if (ingredient.status !== computedStatus) {
    ingredient.status = computedStatus;
    changed = true;
  }

  const lowStock = isLowStock(ingredient);
  if (lowStock && canSendAlert(ingredient.alertaStocLa, now)) {
    if (allowNotifications) {
      await notifyAdmins({
        titlu: "Stoc scazut in studio",
        mesaj: `${ingredient.nume} a ajuns la ${ingredient.cantitate} ${ingredient.unitate}. Prag minim: ${ingredient.pragMinim} ${ingredient.unitate}.`,
        tip: "warning",
        link: "/admin/contabilitate",
      });
    }
    ingredient.alertaStocLa = now;
    changed = true;
    alertsSent += 1;
  }
  if (!lowStock && ingredient.alertaStocLa) {
    ingredient.alertaStocLa = null;
    changed = true;
  }

  if (computedStatus === "aproape expirat" && canSendAlert(ingredient.alertaExpiraLa, now)) {
    if (allowNotifications) {
      await notifyAdmins({
        titlu: "Ingredient aproape expirat",
        mesaj: `${ingredient.nume} expira in ${Math.max(daysLeft || 0, 0)} zile.`,
        tip: "warning",
        link: "/admin/contabilitate",
      });
    }
    ingredient.alertaExpiraLa = now;
    changed = true;
    alertsSent += 1;
  }

  if (computedStatus === "expirat" && canSendAlert(ingredient.alertaExpiratLa, now)) {
    if (allowNotifications) {
      await notifyAdmins({
        titlu: "Ingredient expirat",
        mesaj: `${ingredient.nume} este expirat si trebuie eliminat sau inlocuit.`,
        tip: "error",
        link: "/admin/contabilitate",
      });
    }
    ingredient.alertaExpiratLa = now;
    changed = true;
    alertsSent += 1;
  }

  if (computedStatus === "bun") {
    if (ingredient.alertaExpiraLa) {
      ingredient.alertaExpiraLa = null;
      changed = true;
    }
    if (ingredient.alertaExpiratLa) {
      ingredient.alertaExpiratLa = null;
      changed = true;
    }
  }

  if (computedStatus === "aproape expirat" && ingredient.alertaExpiratLa) {
    ingredient.alertaExpiratLa = null;
    changed = true;
  }

  if (changed) {
    await ingredient.save();
  }

  return { alertsSent, changed };
}

exports.createIngredient = async (req, res) => {
  try {
    const payload = normalizePayload(req.body || {});
    payload.status = computeStatusByDate(payload.dataExpirare);
    const ingredient = await Ingredient.create(payload);
    await syncStatusAndAlerts(ingredient, { allowNotifications: true });
    res.status(201).json(enrichIngredient(ingredient));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getAllIngredients = async (req, res) => {
  try {
    const q = {};
    if (req.query.tip) q.tip = req.query.tip;
    if (req.query.status) q.status = req.query.status;
    if (req.query.search) {
      q.nume = { $regex: String(req.query.search).trim(), $options: "i" };
    }

    const ingredients = await Ingredient.find(q).sort({ dataExpirare: 1, nume: 1 });
    const enriched = ingredients.map(enrichIngredient);

    if (String(req.query.lowStock || "") === "1") {
      return res.json(enriched.filter((item) => item.stocScazut));
    }

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getInventoryDashboard = async (_req, res) => {
  try {
    const ingredients = await Ingredient.find({}).sort({ dataExpirare: 1, nume: 1 });
    const enriched = ingredients.map(enrichIngredient);

    const lowStock = enriched.filter((i) => i.stocScazut);
    const expiringSoon = enriched.filter((i) => i.status === "aproape expirat");
    const expired = enriched.filter((i) => i.status === "expirat");

    const totalCostValue = enriched.reduce((sum, i) => sum + asNumber(i.valoareCost, 0), 0);
    const totalSaleValue = enriched.reduce((sum, i) => sum + asNumber(i.valoareVanzare, 0), 0);

    res.json({
      summary: {
        totalItems: enriched.length,
        lowStockCount: lowStock.length,
        expiringSoonCount: expiringSoon.length,
        expiredCount: expired.length,
        totalCostValue,
        totalSaleValue,
      },
      alerts: {
        lowStock,
        expiringSoon,
        expired,
      },
      items: enriched,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.checkIngredientAlerts = async (_req, res) => {
  try {
    const ingredients = await Ingredient.find({});
    let alertsSent = 0;
    let changedItems = 0;

    for (const ingredient of ingredients) {
      const result = await syncStatusAndAlerts(ingredient, { allowNotifications: true });
      alertsSent += result.alertsSent;
      if (result.changed) changedItems += 1;
    }

    res.json({
      ok: true,
      checked: ingredients.length,
      changedItems,
      alertsSent,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateIngredient = async (req, res) => {
  try {
    const payload = normalizePayload(req.body || {});
    const ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) {
      return res.status(404).json({ error: "Ingredient inexistent" });
    }

    Object.assign(ingredient, payload);
    ingredient.status = computeStatusByDate(ingredient.dataExpirare);
    await ingredient.save();
    await syncStatusAndAlerts(ingredient, { allowNotifications: true });

    res.json(enrichIngredient(ingredient));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteIngredient = async (req, res) => {
  try {
    await Ingredient.findByIdAndDelete(req.params.id);
    res.json({ message: "Ingredient sters cu succes!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
