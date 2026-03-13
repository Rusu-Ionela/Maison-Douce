const express = require("express");
const router = express.Router();
const Coupon = require("../models/Coupon");
const Comanda = require("../models/Comanda");
const { authRequired, roleCheck } = require("../middleware/auth");
const { adminMutationLimiter, adminReadLimiter } = require("../middleware/rateLimiters");
const { withValidation } = require("../middleware/validate");
const { recordAuditLog } = require("../utils/audit");
const { createLogger, serializeError } = require("../utils/log");
const {
  fail,
  readBoolean,
  readEnum,
  readMongoId,
  readNumber,
  readString,
} = require("../utils/validation");

const couponLog = createLogger("coupon");
const COUPON_TYPES = ["percent", "fixed"];
const COUPON_USAGE_BLOCKED_STATUSES = ["anulata", "refuzata"];

function isStaffRole(role) {
  return ["admin", "patiser", "prestator"].includes(String(role || ""));
}

function getAuthUserId(req) {
  return String(req.user?.id || req.user?._id || "");
}

function hasField(body, field) {
  return Boolean(body) && Object.prototype.hasOwnProperty.call(body, field);
}

function readCouponCode(value, { required = false } = {}) {
  return readString(value, {
    field: "cod",
    required,
    min: 3,
    max: 64,
    trim: true,
    pattern: /^[A-Za-z0-9_-]+$/,
    defaultValue: "",
  }).toUpperCase();
}

function readOptionalDate(value, field) {
  const raw = readString(value, {
    field,
    defaultValue: "",
    trim: true,
    max: 64,
  });

  if (!raw) return null;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    fail(`${field} is invalid`, field);
  }
  parsed.setHours(23, 59, 59, 999);
  return parsed;
}

function ensureCouponDiscountConfig({ tipReducere, procentReducere, valoareFixa }) {
  if (!COUPON_TYPES.includes(String(tipReducere || ""))) {
    fail("tipReducere is invalid", "tipReducere");
  }

  const percent = Number(procentReducere || 0);
  const fixed = Number(valoareFixa || 0);

  if (tipReducere === "percent") {
    if (!(percent > 0 && percent <= 100)) {
      fail("procentReducere must be between 1 and 100", "procentReducere");
    }
    if (fixed !== 0) {
      fail("valoareFixa must be 0 for percentage coupons", "valoareFixa");
    }
    return;
  }

  if (!(fixed > 0)) {
    fail("valoareFixa must be greater than 0", "valoareFixa");
  }
  if (percent !== 0) {
    fail("procentReducere must be 0 for fixed coupons", "procentReducere");
  }
}

function normalizeDiscountType({ tipReducere, procentReducere, valoareFixa }) {
  if (tipReducere) return tipReducere;
  if (Number(valoareFixa || 0) > 0 && Number(procentReducere || 0) === 0) {
    return "fixed";
  }
  return "percent";
}

function extractCouponPayload(source, { partial = false } = {}) {
  const payload = {};

  if (!partial || hasField(source, "cod")) {
    payload.cod = readCouponCode(source?.cod, { required: !partial });
  }
  if (!partial || hasField(source, "descriere")) {
    payload.descriere = readString(source?.descriere, {
      field: "descriere",
      max: 240,
      defaultValue: "",
    });
  }
  if (!partial || hasField(source, "notesAdmin")) {
    payload.notesAdmin = readString(source?.notesAdmin, {
      field: "notesAdmin",
      max: 500,
      defaultValue: "",
    });
  }
  if (!partial || hasField(source, "tipReducere")) {
    payload.tipReducere = readEnum(source?.tipReducere || "percent", COUPON_TYPES, {
      field: "tipReducere",
      defaultValue: "percent",
    });
  }
  if (!partial || hasField(source, "procentReducere")) {
    payload.procentReducere = readNumber(source?.procentReducere, {
      field: "procentReducere",
      min: 0,
      max: 100,
      defaultValue: 0,
    });
  }
  if (!partial || hasField(source, "valoareFixa")) {
    payload.valoareFixa = readNumber(source?.valoareFixa, {
      field: "valoareFixa",
      min: 0,
      defaultValue: 0,
    });
  }
  if (!partial || hasField(source, "valoareMinima")) {
    payload.valoareMinima = readNumber(source?.valoareMinima, {
      field: "valoareMinima",
      min: 0,
      defaultValue: 0,
    });
  }
  if (!partial || hasField(source, "usageLimit")) {
    payload.usageLimit = readNumber(source?.usageLimit, {
      field: "usageLimit",
      min: 0,
      integer: true,
      defaultValue: 0,
    });
  }
  if (!partial || hasField(source, "perUserLimit")) {
    payload.perUserLimit = readNumber(source?.perUserLimit, {
      field: "perUserLimit",
      min: 0,
      integer: true,
      defaultValue: 0,
    });
  }
  if (!partial || hasField(source, "activ")) {
    payload.activ = readBoolean(source?.activ, {
      field: "activ",
      defaultValue: true,
    });
  }
  if (!partial || hasField(source, "allowedUserId")) {
    payload.allowedUserId =
      readMongoId(source?.allowedUserId, {
        field: "allowedUserId",
        defaultValue: "",
      }) || null;
  }
  if (!partial || hasField(source, "dataExpirare")) {
    payload.dataExpirare = readOptionalDate(source?.dataExpirare, "dataExpirare");
  }

  return payload;
}

function mergeCouponPayload(coupon, payload) {
  const current = coupon.toObject ? coupon.toObject() : coupon;
  const merged = {
    cod: payload.cod ?? current.cod,
    descriere: payload.descriere ?? current.descriere,
    notesAdmin: payload.notesAdmin ?? current.notesAdmin,
    tipReducere: payload.tipReducere ?? current.tipReducere,
    procentReducere:
      payload.procentReducere ?? Number(current.procentReducere || 0),
    valoareFixa: payload.valoareFixa ?? Number(current.valoareFixa || 0),
    valoareMinima: payload.valoareMinima ?? Number(current.valoareMinima || 0),
    usageLimit: payload.usageLimit ?? Number(current.usageLimit || 0),
    perUserLimit: payload.perUserLimit ?? Number(current.perUserLimit || 0),
    activ: payload.activ ?? Boolean(current.activ),
    allowedUserId:
      payload.allowedUserId !== undefined
        ? payload.allowedUserId
        : current.allowedUserId || null,
    dataExpirare:
      payload.dataExpirare !== undefined
        ? payload.dataExpirare
        : current.dataExpirare || null,
  };

  merged.tipReducere = normalizeDiscountType(merged);
  ensureCouponDiscountConfig(merged);
  return merged;
}

function isCouponExpired(coupon, now = new Date()) {
  if (!coupon?.dataExpirare) return false;
  return new Date(coupon.dataExpirare).getTime() < now.getTime();
}

function calculateCouponDiscount(coupon, baseTotal) {
  const total = Number(baseTotal || 0);
  if (total <= 0) return 0;

  if (coupon.tipReducere === "fixed") {
    return Math.min(total, Math.round(Number(coupon.valoareFixa || 0)));
  }

  return Math.min(
    total,
    Math.round((total * Number(coupon.procentReducere || 0)) / 100)
  );
}

function buildCouponResponse(coupon, usageSummary = {}) {
  const discountPreview =
    coupon.tipReducere === "fixed"
      ? Number(coupon.valoareFixa || 0)
      : Number(coupon.procentReducere || 0);

  return {
    _id: coupon._id,
    cod: coupon.cod,
    descriere: coupon.descriere || "",
    tipReducere: coupon.tipReducere || "percent",
    procentReducere: Number(coupon.procentReducere || 0),
    valoareFixa: Number(coupon.valoareFixa || 0),
    valoareMinima: Number(coupon.valoareMinima || 0),
    activ: Boolean(coupon.activ),
    dataCreare: coupon.dataCreare,
    dataExpirare: coupon.dataExpirare,
    usageLimit: Number(coupon.usageLimit || 0),
    perUserLimit: Number(coupon.perUserLimit || 0),
    allowedUserId: coupon.allowedUserId || null,
    notesAdmin: coupon.notesAdmin || "",
    createdBy: coupon.createdBy || null,
    updatedBy: coupon.updatedBy || null,
    isExpired: isCouponExpired(coupon),
    discountPreview,
    usedCount: Number(usageSummary.usedCount || 0),
    lastUsedAt: usageSummary.lastUsedAt || null,
  };
}

async function getUsageSummaryForCodes(codes) {
  if (!Array.isArray(codes) || codes.length === 0) {
    return new Map();
  }

  const orders = await Comanda.find({
    voucherCode: { $in: codes },
    status: { $nin: COUPON_USAGE_BLOCKED_STATUSES },
  })
    .select("voucherCode clientId createdAt")
    .lean();

  const map = new Map();
  for (const code of codes) {
    map.set(code, {
      usedCount: 0,
      userCounts: Object.create(null),
      lastUsedAt: null,
    });
  }

  for (const order of orders) {
    const code = String(order.voucherCode || "").trim().toUpperCase();
    if (!code) continue;
    const summary = map.get(code) || {
      usedCount: 0,
      userCounts: Object.create(null),
      lastUsedAt: null,
    };

    summary.usedCount += 1;
    const clientId = String(order.clientId || "");
    if (clientId) {
      summary.userCounts[clientId] = Number(summary.userCounts[clientId] || 0) + 1;
    }

    const createdAt = order.createdAt ? new Date(order.createdAt) : null;
    if (createdAt && !Number.isNaN(createdAt.getTime())) {
      if (!summary.lastUsedAt || createdAt > new Date(summary.lastUsedAt)) {
        summary.lastUsedAt = createdAt.toISOString();
      }
    }

    map.set(code, summary);
  }

  return map;
}

async function getSingleCouponUsageSummary(code) {
  const map = await getUsageSummaryForCodes([String(code || "").trim().toUpperCase()]);
  return (
    map.get(String(code || "").trim().toUpperCase()) || {
      usedCount: 0,
      userCounts: Object.create(null),
      lastUsedAt: null,
    }
  );
}

async function loadCouponOrFail(code) {
  return Coupon.findOne({
    cod: String(code || "").trim().toUpperCase(),
  });
}

function validateCouponForApply({ coupon, comanda, authUserId, usageSummary }) {
  if (!coupon || !coupon.activ || isCouponExpired(coupon)) {
    return "Cupon invalid, inactiv sau expirat.";
  }

  if (
    coupon.allowedUserId &&
    String(coupon.allowedUserId) !== String(authUserId || "")
  ) {
    return "Acest cupon este rezervat altui utilizator.";
  }

  const baseTotal = Number(comanda.total || 0);
  if (baseTotal < Number(coupon.valoareMinima || 0)) {
    return `Comanda trebuie sa aiba minim ${Number(
      coupon.valoareMinima || 0
    )} MDL pentru acest cupon.`;
  }

  if (
    Number(coupon.usageLimit || 0) > 0 &&
    Number(usageSummary.usedCount || 0) >= Number(coupon.usageLimit || 0)
  ) {
    return "Cuponul si-a atins limita totala de utilizari.";
  }

  const userUsageCount = Number(
    usageSummary.userCounts?.[String(authUserId || "")] || 0
  );
  if (
    Number(coupon.perUserLimit || 0) > 0 &&
    userUsageCount >= Number(coupon.perUserLimit || 0)
  ) {
    return "Ai atins limita de utilizari pentru acest cupon.";
  }

  return "";
}

// Create coupon (admin) - legacy alias kept for compatibility.
router.post(
  ["/create", "/admin"],
  authRequired,
  roleCheck("admin"),
  adminMutationLimiter,
  withValidation((req) => extractCouponPayload(req.body, { partial: false }), async (req, res) => {
    try {
      const mergedPayload = mergeCouponPayload({}, req.validated);
      const coupon = new Coupon({
        ...mergedPayload,
        createdBy: req.user?._id || null,
        updatedBy: req.user?._id || null,
      });
      await coupon.save();

      await recordAuditLog(req, {
        action: "coupon.created",
        entityType: "coupon",
        entityId: coupon._id,
        summary: `Cuponul ${coupon.cod} a fost creat.`,
        metadata: buildCouponResponse(coupon),
      });

      const responseCoupon = buildCouponResponse(coupon);
      const statusCode = req.path === "/create" ? 200 : 201;
      res.status(statusCode).json({
        ok: true,
        message: "Cupon creat cu succes!",
        coupon: responseCoupon,
        cuponNou: responseCoupon,
      });
    } catch (err) {
      couponLog.error("create_failed", {
        requestId: req.id,
        error: serializeError(err),
      });
      const duplicate = err?.code === 11000;
      res.status(duplicate ? 409 : 500).json({
        message: duplicate ? "Codul de cupon exista deja." : "Eroare server.",
      });
    }
  })
);

router.get(
  "/admin",
  authRequired,
  roleCheck("admin"),
  adminReadLimiter,
  async (req, res) => {
    try {
      const search = String(req.query?.search || "").trim();
      const status = String(req.query?.status || "").trim().toLowerCase();
      const query = {};

      if (search) {
        query.$or = [
          { cod: new RegExp(search, "i") },
          { descriere: new RegExp(search, "i") },
        ];
      }

      if (status === "active") {
        query.activ = true;
      } else if (status === "inactive") {
        query.activ = false;
      }

      const coupons = await Coupon.find(query)
        .populate("allowedUserId", "nume email")
        .populate("createdBy", "nume email")
        .populate("updatedBy", "nume email")
        .sort({ updatedAt: -1, dataCreare: -1 })
        .lean();

      const usageMap = await getUsageSummaryForCodes(coupons.map((coupon) => coupon.cod));
      let items = coupons.map((coupon) =>
        buildCouponResponse(coupon, usageMap.get(coupon.cod))
      );

      if (status === "expired") {
        items = items.filter((coupon) => coupon.isExpired);
      }

      res.json({ items });
    } catch (err) {
      couponLog.error("list_failed", {
        requestId: req.id,
        error: serializeError(err),
      });
      res.status(500).json({ message: "Eroare server." });
    }
  }
);

router.patch(
  "/admin/:id",
  authRequired,
  roleCheck("admin"),
  adminMutationLimiter,
  withValidation((req) => ({
    id: readMongoId(req.params?.id, { field: "id", required: true }),
    ...extractCouponPayload(req.body, { partial: true }),
  }), async (req, res) => {
    try {
      const coupon = await Coupon.findById(req.validated.id);
      if (!coupon) {
        return res.status(404).json({ message: "Cupon inexistent." });
      }

      const { id, ...changes } = req.validated;
      const hasChanges = Object.values(changes).some((value) => value !== undefined);
      if (!hasChanges) {
        return res.status(400).json({ message: "Nu exista campuri de actualizat." });
      }

      const nextState = mergeCouponPayload(coupon, changes);
      Object.assign(coupon, nextState, {
        updatedBy: req.user?._id || null,
      });
      await coupon.save();

      await recordAuditLog(req, {
        action: "coupon.updated",
        entityType: "coupon",
        entityId: coupon._id,
        summary: `Cuponul ${coupon.cod} a fost actualizat.`,
        metadata: buildCouponResponse(coupon),
      });

      res.json({
        ok: true,
        coupon: buildCouponResponse(coupon, await getSingleCouponUsageSummary(coupon.cod)),
      });
    } catch (err) {
      couponLog.error("update_failed", {
        requestId: req.id,
        error: serializeError(err),
      });
      const duplicate = err?.code === 11000;
      res.status(duplicate ? 409 : 500).json({
        message: duplicate ? "Codul de cupon exista deja." : "Eroare server.",
      });
    }
  })
);

// Apply coupon on an order (client or staff)
router.post(
  "/apply",
  authRequired,
  withValidation((req) => ({
    cod: readCouponCode(req.body?.cod, { required: true }),
    comandaId: readMongoId(req.body?.comandaId, {
      field: "comandaId",
      required: true,
    }),
  }), async (req, res) => {
    try {
      const role = req.user?.rol || req.user?.role;
      const isStaff = isStaffRole(role);
      const authUserId = getAuthUserId(req);

      const comanda = await Comanda.findById(req.validated.comandaId);
      if (!comanda) {
        return res.status(404).json({ message: "Comanda inexistenta." });
      }
      if (!isStaff && String(comanda.clientId || "") !== authUserId) {
        return res.status(403).json({ message: "Acces interzis la aceasta comanda." });
      }
      if (comanda.paymentStatus === "paid" || comanda.statusPlata === "paid") {
        return res.status(409).json({ message: "Cuponul nu mai poate fi aplicat dupa plata." });
      }
      if (
        Number(comanda.discountTotal || 0) > 0 ||
        Number(comanda.discountFidelizare || 0) > 0 ||
        Number(comanda.pointsUsed || 0) > 0 ||
        comanda.voucherCode
      ) {
        return res.status(409).json({
          message: "Comanda are deja un discount aplicat.",
        });
      }

      const coupon = await loadCouponOrFail(req.validated.cod);
      if (!coupon) {
        return res.status(404).json({ message: "Cupon invalid, inactiv sau expirat." });
      }
      const usageSummary = await getSingleCouponUsageSummary(req.validated.cod);
      const validationMessage = validateCouponForApply({
        coupon,
        comanda,
        authUserId,
        usageSummary,
      });
      if (validationMessage) {
        const statusCode = validationMessage.includes("invalid") ? 404 : 409;
        return res.status(statusCode).json({ message: validationMessage });
      }

      const baseTotal = Number(comanda.total || 0);
      const discount = calculateCouponDiscount(coupon, baseTotal);
      if (discount <= 0) {
        return res.status(400).json({ message: "Cuponul nu poate fi aplicat pe aceasta comanda." });
      }

      comanda.discountTotal = discount;
      comanda.voucherCode = coupon.cod;
      comanda.totalFinal = Math.max(0, baseTotal - discount);
      comanda.statusHistory = Array.isArray(comanda.statusHistory)
        ? [
            ...comanda.statusHistory,
            {
              status: "discount_aplicat",
              note: `Cupon ${coupon.cod} (-${discount} MDL)`,
            },
          ]
        : [
            {
              status: "discount_aplicat",
              note: `Cupon ${coupon.cod} (-${discount} MDL)`,
            },
          ];
      await comanda.save();

      res.json({
        ok: true,
        cod: coupon.cod,
        tipReducere: coupon.tipReducere,
        procentReducere: Number(coupon.procentReducere || 0),
        valoareFixa: Number(coupon.valoareFixa || 0),
        discount,
        newTotal: comanda.totalFinal,
      });
    } catch (err) {
      couponLog.error("apply_failed", {
        requestId: req.id,
        error: serializeError(err),
      });
      res.status(500).json({ message: "Eroare server." });
    }
  })
);

// Verify coupon
router.get("/verify/:cod", async (req, res) => {
  try {
    const coupon = await loadCouponOrFail(req.params.cod);
    if (!coupon || !coupon.activ || isCouponExpired(coupon)) {
      return res.status(404).json({ message: "Cupon invalid, inactiv sau expirat." });
    }

    res.json({
      valid: true,
      coupon: buildCouponResponse(coupon, await getSingleCouponUsageSummary(coupon.cod)),
      procentReducere: Number(coupon.procentReducere || 0),
      tipReducere: coupon.tipReducere,
      valoareFixa: Number(coupon.valoareFixa || 0),
    });
  } catch (err) {
    couponLog.error("verify_failed", {
      requestId: req.id,
      error: serializeError(err),
    });
    res.status(500).json({ message: "Eroare server." });
  }
});

module.exports = router;
