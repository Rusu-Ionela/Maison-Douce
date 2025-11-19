// backend/routes/fidelizare.js
const express = require("express");
const router = express.Router();
const Fidelizare = require("../models/Fidelizare");
const { authRequired } = require("../middleware/auth");

/**
 * GET /api/fidelizare/client/:userId
 * Portofel de puncte pentru un utilizator
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
 * POST /api/fidelizare/add-points
// ...existing code...

/**
 * POST /api/fidelizare/add-points
 * ✅ ADAUGĂ PUNCTE ȘI SALVEAZĂ ÎN DB
 */
router.post("/add-points", async (req, res) => {
  try {
    const { utilizatorId, puncte, sursa = "comanda", comandaId } = req.body;

    if (!utilizatorId || !puncte || puncte <= 0) {
      return res.status(400).json({
        ok: false,
        message: "utilizatorId și puncte (> 0) sunt necesare"
      });
    }

    // ✅ Găsește sau crează cardul de fidelizare
    let fidelizare = await Fidelizare.findOne({ utilizatorId });
    if (!fidelizare) {
      fidelizare = new Fidelizare({
        utilizatorId,
        puncteCurent: 0,
        puncteTotal: 0,
        istoric: [],
        reduceriDisponibile: [],
        nivelLoyalitate: "bronze"
      });
    }

    // ✅ Adaugă puncte
    fidelizare.puncteCurent += puncte;
    fidelizare.puncteTotal += puncte;

    // ✅ Adaugă în istoric
    fidelizare.istoric.push({
      data: new Date(),
      tip: "earn",
      puncte,
      sursa,
      comandaId,
      descriere: `Puncte câștigate de la comanda ${comandaId || 'N/A'}`
    });

    // ✅ Determină nivel
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
        nivel: fidelizare.nivelLoyalitate
      }
    });
  } catch (err) {
    console.error("Eroare POST /add-points:", err.message);
    res.status(500).json({ ok: false, error: "Eroare server la adăugare puncte" });
  }
});

/**
 * POST /api/fidelizare/redeem
 * ✅ FOLOSIRE PUNCTE PENTRU REDUCERE
 */
router.post("/redeem", async (req, res) => {
  try {
    const { utilizatorId, puncteDeUtilizat } = req.body;

    if (!utilizatorId || !puncteDeUtilizat || puncteDeUtilizat <= 0) {
      return res.status(400).json({ ok: false, message: "Parametri obligatori lipsă" });
    }

    let fidelizare = await Fidelizare.findOne({ utilizatorId });
    if (!fidelizare || fidelizare.puncteCurent < puncteDeUtilizat) {
      return res.status(400).json({
        ok: false,
        message: "Puncte insuficiente"
      });
    }

    // ✅ Scade puncte
    fidelizare.puncteCurent -= puncteDeUtilizat;

    // ✅ Crează voucher (100 puncte = 50 MDL)
    const discountValue = Math.floor(puncteDeUtilizat / 2);
    const codigPromo = "PROMO-" + Date.now();

    fidelizare.reduceriDisponibile.push({
      procent: 0,
      valoareMinima: 0,
      valoareFixa: discountValue,
      codigPromo,
      dataExpirare: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      folosita: false
    });

    // ✅ Adaugă în istoric
    fidelizare.istoric.push({
      data: new Date(),
      tip: "redeem",
      puncte: puncteDeUtilizat,
      sursa: "manual",
      descriere: `Voucher ${codigPromo}: ${discountValue} MDL`
    });

    await fidelizare.save();

    return res.json({
      ok: true,
      message: "✅ Voucher generat",
      voucher: {
        cod: codigPromo,
        valoare: discountValue,
        expira: fidelizare.reduceriDisponibile[fidelizare.reduceriDisponibile.length - 1].dataExpirare
      },
      puncteCurent: fidelizare.puncteCurent
    });
  } catch (err) {
    console.error("Eroare POST /redeem:", err.message);
    res.status(500).json({ ok: false, error: "Eroare server" });
  }
});

/**
 * GET /api/fidelizare/:utilizatorId
 * ✅ PRELUARE PORTOFEL FIDELIZARE
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
        nivelLoyalitate: "bronze"
      });
      await fidelizare.save();
    }

    return res.json({
      ok: true,
      ...fidelizare.toObject()
    });
  } catch (err) {
    console.error("Eroare GET fidelizare:", err.message);
    res.status(500).json({ ok: false, error: "Eroare server" });
  }
});



/**
 * POST /api/fidelizare/redeem
 * Body: { utilizatorId, puncte, discount }
 */
router.post("/redeem", authRequired, async (req, res) => {
  try {
    const { utilizatorId, puncte, discount } = req.body;

    if (!utilizatorId || !puncte || !discount) {
      return res.status(400).json({
        error: "utilizatorId, puncte și discount sunt obligatorii",
      });
    }

    const fidelizare = await Fidelizare.findOne({ utilizatorId });

    if (!fidelizare || fidelizare.puncteCurent < puncte) {
      return res.status(400).json({ error: "Puncte insuficiente" });
    }

    fidelizare.puncteCurent -= puncte;
    fidelizare.istoric.push({
      tip: "redeem",
      puncte,
      sursa: "redeem",
      descriere: `Răscumpărare pentru ${discount}% discount`,
    });

    const reducere = {
      procent: discount,
      valoareMinima: 0,
      codigPromo: `LOYALTY-${Date.now()}`,
      dataExpirare: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 zile
      folosita: false,
    };

    fidelizare.reduceriDisponibile.push(reducere);

    await fidelizare.save();

    res.json({
      message: "Reducere creată",
      codig: reducere.codigPromo,
    });
  } catch (err) {
    console.error("Eroare POST /fidelizare/redeem:", err.message);
    res.status(500).json({ error: "Eroare server" });
  }
});

module.exports = router;
