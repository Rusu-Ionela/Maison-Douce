// backend/routes/fidelizare.js
const express = require("express");
const router = express.Router();
const Fidelizare = require("../models/Fidelizare");
const FidelizareConfig = require("../models/FidelizareConfig");
const Comanda = require("../models/Comanda");
const { authRequired, roleCheck } = require("../middleware/auth");

async function ensureConfig() {
  let config = await FidelizareConfig.findOne().lean();
  if (!config) {
    const created = await FidelizareConfig.create({});
    config = created.toObject();
  }
  return config;
}

/**
 * GET /api/fidelizare/client/:userId
 * Portofel de puncte pentru un utilizator (folosit în profil client)
 */
router.get("/client/:userId", authRequired, async (req, res) => {
  try {
    const userId = req.params.userId;

    let fidelizare = await Fidelizare.findOne({ utilizatorId: userId });

    // dacă nu există card de fidelizare, îl creăm cu valori default
    if (!fidelizare) {
      fidelizare = new Fidelizare({
        utilizatorId: userId,
        puncteCurent: 0,
        puncteTotal: 0,
        nivelLoyalitate: "bronze",
        reduceriDisponibile: [],
        istoric: [],
      });

      await fidelizare.save();
    }

    return res.json({
      puncteCurent: fidelizare.puncteCurent,
      puncteTotal: fidelizare.puncteTotal,
      nivel: fidelizare.nivelLoyalitate,
      reduceriDisponibile: fidelizare.reduceriDisponibile.filter(
        (r) => !r.folosita
      ),
      istoric: fidelizare.istoric.slice(-10),
    });
  } catch (err) {
    console.error("Eroare GET /fidelizare/client:", err.message);
    res.status(500).json({ error: "Eroare server" });
  }
});

/**
 * GET /api/fidelizare/admin/config
 * Configuratie fidelizare (admin)
 */
router.get(
  "/admin/config",
  authRequired,
  roleCheck("admin", "patiser"),
  async (_req, res) => {
    try {
      const cfg = await ensureConfig();
      res.json(cfg);
    } catch (e) {
      res.status(500).json({ message: "Eroare la incarcare config." });
    }
  }
);

/**
 * PUT /api/fidelizare/admin/config
 * Body: { pointsPer10, pointsPerOrder, minTotal }
 */
router.put(
  "/admin/config",
  authRequired,
  roleCheck("admin", "patiser"),
  async (req, res) => {
    try {
      const update = {};
      if (req.body.pointsPer10 != null) update.pointsPer10 = Number(req.body.pointsPer10 || 0);
      if (req.body.pointsPerOrder != null) update.pointsPerOrder = Number(req.body.pointsPerOrder || 0);
      if (req.body.minTotal != null) update.minTotal = Number(req.body.minTotal || 0);

      const cfg = await FidelizareConfig.findOneAndUpdate(
        {},
        { $set: update },
        { new: true, upsert: true }
      );
      res.json({ ok: true, config: cfg });
    } catch (e) {
      res.status(500).json({ message: "Eroare la salvare config." });
    }
  }
);

/**
 * GET /api/fidelizare/admin/user/:userId
 * Portofel complet pentru un client (admin view)
 */
router.get(
  "/admin/user/:userId",
  authRequired,
  roleCheck("admin", "patiser"),
  async (req, res) => {
    try {
      const { userId } = req.params;
      let fidelizare = await Fidelizare.findOne({ utilizatorId: userId });
      if (!fidelizare) {
        fidelizare = await Fidelizare.create({
          utilizatorId: userId,
          puncteCurent: 0,
          puncteTotal: 0,
          nivelLoyalitate: "bronze",
          reduceriDisponibile: [],
          istoric: [],
        });
      }
      res.json({ ok: true, fidelizare });
    } catch (e) {
      res.status(500).json({ message: "Eroare la incarcare portofel." });
    }
  }
);

/**
 * POST /api/fidelizare/admin/voucher
 * Body: { utilizatorId, cod?, procent?, valoareFixa?, valoareMinima?, dataExpirare? }
 */
router.post(
  "/admin/voucher",
  authRequired,
  roleCheck("admin", "patiser"),
  async (req, res) => {
    try {
      const {
        utilizatorId,
        cod,
        procent = 0,
        valoareFixa = 0,
        valoareMinima = 0,
        dataExpirare,
      } = req.body || {};

      if (!utilizatorId) {
        return res.status(400).json({ message: "utilizatorId este obligatoriu" });
      }
      const hasDiscount = Number(procent || 0) > 0 || Number(valoareFixa || 0) > 0;
      if (!hasDiscount) {
        return res.status(400).json({ message: "procent sau valoareFixa sunt necesare" });
      }

      let fidelizare = await Fidelizare.findOne({ utilizatorId });
      if (!fidelizare) {
        fidelizare = await Fidelizare.create({
          utilizatorId,
          puncteCurent: 0,
          puncteTotal: 0,
          nivelLoyalitate: "bronze",
          reduceriDisponibile: [],
          istoric: [],
        });
      }

      const code = cod || `PROMO-${Date.now()}`;
      const voucher = {
        procent: Number(procent || 0),
        valoareMinima: Number(valoareMinima || 0),
        valoareFixa: Number(valoareFixa || 0),
        codigPromo: code,
        dataExpirare: dataExpirare ? new Date(dataExpirare) : undefined,
        folosita: false,
      };
      fidelizare.reduceriDisponibile.push(voucher);
      fidelizare.istoric.push({
        data: new Date(),
        tip: "earn",
        puncte: 0,
        sursa: "voucher-admin",
        descriere: `Voucher creat: ${code}`,
      });
      await fidelizare.save();

      res.json({ ok: true, voucher });
    } catch (e) {
      res.status(500).json({ message: "Eroare la creare voucher." });
    }
  }
);

/**
 * POST /api/fidelizare/add-points
 * Adaugă puncte după o comandă (folosit de backend sau Stripe webhook)
 */
router.post("/add-points", async (req, res) => {
  try {
    const { utilizatorId, puncte, sursa = "comanda", comandaId } = req.body;

    if (!utilizatorId || !puncte || puncte <= 0) {
      return res.status(400).json({
        ok: false,
        message: "utilizatorId și puncte (> 0) sunt necesare",
      });
    }

    let fidelizare = await Fidelizare.findOne({ utilizatorId });
    if (!fidelizare) {
      fidelizare = new Fidelizare({
        utilizatorId,
        puncteCurent: 0,
        puncteTotal: 0,
        istoric: [],
        reduceriDisponibile: [],
        nivelLoyalitate: "bronze",
      });
    }

    fidelizare.puncteCurent += puncte;
    fidelizare.puncteTotal += puncte;

    fidelizare.istoric.push({
      data: new Date(),
      tip: "earn",
      puncte,
      sursa,
      comandaId,
      descriere: `Puncte câștigate de la comanda ${comandaId || "N/A"}`,
    });

    // nivel în funcție de totalul de puncte
    if (fidelizare.puncteTotal >= 500) {
      fidelizare.nivelLoyalitate = "gold";
    } else if (fidelizare.puncteTotal >= 200) {
      fidelizare.nivelLoyalitate = "silver";
    } else {
      fidelizare.nivelLoyalitate = "bronze";
    }

    await fidelizare.save();

    return res.json({
      ok: true,
      message: "✅ Puncte adăugate cu succes",
      fidelizare: {
        puncteCurent: fidelizare.puncteCurent,
        puncteTotal: fidelizare.puncteTotal,
        nivel: fidelizare.nivelLoyalitate,
      },
    });
  } catch (err) {
    console.error("Eroare POST /add-points:", err.message);
    res
      .status(500)
      .json({ ok: false, error: "Eroare server la adăugare puncte" });
  }
});

/**
 * POST /api/fidelizare/redeem
 * Folosire puncte pentru voucher fix (ex: 100p = 50 MDL)
 * Folosit de componenta FidelizarePortofel.jsx
 */
router.post("/redeem", authRequired, async (req, res) => {
  try {
    const { utilizatorId, puncteDeUtilizat } = req.body;

    if (!utilizatorId || !puncteDeUtilizat || puncteDeUtilizat <= 0) {
      return res
        .status(400)
        .json({ ok: false, message: "Parametri obligatori lipsă" });
    }

    let fidelizare = await Fidelizare.findOne({ utilizatorId });
    if (!fidelizare || fidelizare.puncteCurent < puncteDeUtilizat) {
      return res.status(400).json({
        ok: false,
        message: "Puncte insuficiente",
      });
    }

    fidelizare.puncteCurent -= puncteDeUtilizat;

    // 100 puncte = 50 MDL (poți ajusta formula)
    const discountValue = Math.floor(puncteDeUtilizat / 2);
    const codigPromo = "PROMO-" + Date.now();

    fidelizare.reduceriDisponibile.push({
      procent: 0,
      valoareMinima: 0,
      valoareFixa: discountValue,
      codigPromo,
      dataExpirare: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      folosita: false,
    });

    fidelizare.istoric.push({
      data: new Date(),
      tip: "redeem",
      puncte: puncteDeUtilizat,
      sursa: "manual",
      descriere: `Voucher ${codigPromo}: ${discountValue} MDL`,
    });

    await fidelizare.save();

    return res.json({
      ok: true,
      message: "✅ Voucher generat",
      voucher: {
        cod: codigPromo,
        valoare: discountValue,
        expira:
          fidelizare.reduceriDisponibile[
            fidelizare.reduceriDisponibile.length - 1
          ].dataExpirare,
      },
      puncteCurent: fidelizare.puncteCurent,
    });
  } catch (err) {
    console.error("Eroare POST /redeem:", err.message);
    res.status(500).json({ ok: false, error: "Eroare server" });
  }
});
/**
 * POST /api/fidelizare/apply-voucher
 * Body: { utilizatorId, cod, comandaId }
 */
router.post("/apply-voucher", authRequired, async (req, res) => {
  try {
    const { utilizatorId, cod, comandaId } = req.body;
    const role = req.user?.rol || req.user?.role;
    if (!utilizatorId || !cod || !comandaId) {
      return res.status(400).json({ ok: false, message: "utilizatorId, cod si comandaId sunt necesare" });
    }
    if (role !== "admin" && role !== "patiser" && String(req.user?._id) !== String(utilizatorId)) {
      return res.status(403).json({ ok: false, message: "Acces interzis" });
    }

    const comanda = await Comanda.findById(comandaId);
    if (!comanda) return res.status(404).json({ ok: false, message: "Comanda inexistenta" });
    if (String(comanda.clientId) !== String(utilizatorId)) {
      return res.status(403).json({ ok: false, message: "Comanda nu apartine utilizatorului" });
    }
    if (comanda.discountFidelizare > 0 || comanda.voucherCode || comanda.pointsUsed > 0) {
      return res.status(409).json({ ok: false, message: "Discount fidelizare deja aplicat" });
    }

    const fidelizare = await Fidelizare.findOne({ utilizatorId });
    if (!fidelizare) {
      return res.status(404).json({ ok: false, message: "Portofel inexistent" });
    }

    const now = Date.now();
    const baseTotal = Number(comanda.total || 0);
    const voucher = (fidelizare.reduceriDisponibile || []).find(
      (v) =>
        v.codigPromo === cod &&
        !v.folosita &&
        (!v.dataExpirare || new Date(v.dataExpirare).getTime() > now) &&
        (v.valoareMinima || 0) <= baseTotal
    );

    if (!voucher) {
      return res.status(400).json({ ok: false, message: "Voucher invalid sau expirat" });
    }

    const discountPerc = Number(voucher.procent || 0);
    const discountFix = Number(voucher.valoareFixa || 0);
    let discount = discountFix;
    if (discountPerc > 0) {
      discount = Math.round((baseTotal * discountPerc) / 100);
    }
    if (discount > baseTotal) discount = baseTotal;

    voucher.folosita = true;
    fidelizare.istoric.push({
      data: new Date(),
      tip: "redeem",
      puncte: 0,
      sursa: "voucher",
      comandaId,
      descriere: `Voucher ${voucher.codigPromo} aplicat (-${discount} MDL)`,
    });
    await fidelizare.save();

    comanda.discountFidelizare = discount;
    comanda.discountTotal = discount;
    comanda.voucherCode = voucher.codigPromo;
    comanda.totalFinal = Math.max(0, baseTotal - discount);
    await comanda.save();

    return res.json({
      ok: true,
      discount,
      newTotal: comanda.totalFinal,
      cod: voucher.codigPromo,
    });
  } catch (err) {
    console.error("Eroare POST /apply-voucher:", err.message);
    res.status(500).json({ ok: false, error: "Eroare server" });
  }
});
/**
 * POST /api/fidelizare/apply-points
 * Body: { utilizatorId, puncte, comandaId }
 */
router.post("/apply-points", authRequired, async (req, res) => {
  try {
    const { utilizatorId, puncte, comandaId } = req.body;
    const role = req.user?.rol || req.user?.role;
    if (!utilizatorId || !puncte || puncte <= 0 || !comandaId) {
      return res.status(400).json({ ok: false, message: "utilizatorId, puncte (>0) si comandaId sunt necesare" });
    }
    if (role !== "admin" && role !== "patiser" && String(req.user?._id) !== String(utilizatorId)) {
      return res.status(403).json({ ok: false, message: "Acces interzis" });
    }

    const comanda = await Comanda.findById(comandaId);
    if (!comanda) return res.status(404).json({ ok: false, message: "Comanda inexistenta" });
    if (String(comanda.clientId) !== String(utilizatorId)) {
      return res.status(403).json({ ok: false, message: "Comanda nu apartine utilizatorului" });
    }
    if (comanda.discountFidelizare > 0 || comanda.voucherCode || comanda.pointsUsed > 0) {
      return res.status(409).json({ ok: false, message: "Discount fidelizare deja aplicat" });
    }

    const fidelizare = await Fidelizare.findOne({ utilizatorId });
    if (!fidelizare || fidelizare.puncteCurent < puncte) {
      return res.status(400).json({ ok: false, message: "Puncte insuficiente" });
    }

    const baseTotal = Number(comanda.total || 0);
    const discount = Math.floor(Number(puncte) / 2);
    const appliedDiscount = Math.min(discount, baseTotal);

    fidelizare.puncteCurent -= Number(puncte);
    fidelizare.istoric.push({
      data: new Date(),
      tip: "redeem",
      puncte: Number(puncte),
      sursa: "checkout",
      comandaId,
      descriere: `Discount ${appliedDiscount} MDL din puncte (${puncte}p)`,
    });
    await fidelizare.save();

    comanda.discountFidelizare = appliedDiscount;
    comanda.discountTotal = appliedDiscount;
    comanda.pointsUsed = Number(puncte);
    comanda.totalFinal = Math.max(0, baseTotal - appliedDiscount);
    await comanda.save();

    return res.json({
      ok: true,
      discount: appliedDiscount,
      newTotal: comanda.totalFinal,
      puncteRamase: fidelizare.puncteCurent,
    });
  } catch (err) {
    console.error("Eroare POST /apply-points:", err.message);
    res.status(500).json({ ok: false, error: "Eroare server" });
  }
});

/**
 * GET /api/fidelizare/:utilizatorId
 * Preluare portofel complet (admin sau pentru debug)
 */
router.get("/:utilizatorId", async (req, res) => {
  try {
    const { utilizatorId } = req.params;
    let fidelizare = await Fidelizare.findOne({ utilizatorId });

    if (!fidelizare) {
      fidelizare = new Fidelizare({
        utilizatorId,
        puncteCurent: 0,
        puncteTotal: 0,
        istoric: [],
        reduceriDisponibile: [],
        nivelLoyalitate: "bronze",
      });
      await fidelizare.save();
    }

    return res.json({
      ok: true,
      ...fidelizare.toObject(),
    });
  } catch (err) {
    console.error("Eroare GET fidelizare:", err.message);
    res.status(500).json({ ok: false, error: "Eroare server" });
  }
});

module.exports = router;
