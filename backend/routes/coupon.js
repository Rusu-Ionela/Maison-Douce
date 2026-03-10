const express = require("express");
const router = express.Router();
const Coupon = require("../models/Coupon");
const Comanda = require("../models/Comanda");
const { authRequired, roleCheck } = require("../middleware/auth");
const { withValidation } = require("../middleware/validate");
const { readMongoId, readNumber, readString } = require("../utils/validation");

function isStaffRole(role) {
  return ["admin", "patiser", "prestator"].includes(String(role || ""));
}

function getAuthUserId(req) {
  return String(req.user?.id || req.user?._id || "");
}

// Creare cupon (admin)
router.post(
  "/create",
  authRequired,
  roleCheck("admin"),
  withValidation((req) => ({
    cod: readString(req.body?.cod, {
      field: "cod",
      required: true,
      min: 3,
      max: 64,
      trim: true,
      pattern: /^[A-Za-z0-9_-]+$/,
    }).toUpperCase(),
    procentReducere: readNumber(req.body?.procentReducere, {
      field: "procentReducere",
      required: true,
      min: 1,
      max: 100,
    }),
  }), async (req, res) => {
    try {
      const cuponNou = new Coupon(req.validated);
      await cuponNou.save();

      res.json({ message: "Cupon creat cu succes!", cuponNou });
    } catch (err) {
      console.error("Eroare la creare cupon:", err);
      res.status(500).json({ message: "Eroare server." });
    }
  })
);

// Aplicare cupon pe o comanda (client sau staff)
router.post(
  "/apply",
  authRequired,
  withValidation((req) => ({
    cod: readString(req.body?.cod, {
      field: "cod",
      required: true,
      min: 3,
      max: 64,
      trim: true,
      pattern: /^[A-Za-z0-9_-]+$/,
    }).toUpperCase(),
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
      if (
        comanda.paymentStatus === "paid" ||
        comanda.statusPlata === "paid"
      ) {
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

      const coupon = await Coupon.findOne({
        cod: req.validated.cod,
        activ: true,
      });
      if (!coupon) {
        return res.status(404).json({ message: "Cupon invalid sau inactiv." });
      }

      const baseTotal = Number(comanda.total || 0);
      const discount = Math.min(
        baseTotal,
        Math.round((baseTotal * Number(coupon.procentReducere || 0)) / 100)
      );
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
        procentReducere: coupon.procentReducere,
        discount,
        newTotal: comanda.totalFinal,
      });
    } catch (err) {
      console.error("Eroare la aplicare cupon:", err);
      res.status(500).json({ message: "Eroare server." });
    }
  })
);

// Verificare cupon (client)
router.get("/verify/:cod", async (req, res) => {
  try {
    const coupon = await Coupon.findOne({
      cod: String(req.params.cod || "").trim().toUpperCase(),
      activ: true,
    });
    if (!coupon) {
      return res.status(404).json({ message: "Cupon invalid sau inactiv." });
    }
    res.json({ valid: true, procentReducere: coupon.procentReducere });
  } catch (err) {
    res.status(500).json({ message: "Eroare server." });
  }
});

module.exports = router;
