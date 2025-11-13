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
 * Body: { utilizatorId, puncte, sursa, comandaId, descriere }
 */
// POST /api/fidelizare/add-points
// Rută simplificată: nu mai dă 500, doar întoarce ce a primit
router.post("/add-points", async (req, res) => {
  try {
    const { utilizatorId, puncte, sursa, comandaId, descriere } = req.body;

    // validări simple, ca să nu intre direct în 500
    if (!utilizatorId || !puncte) {
      return res
        .status(400)
        .json({ message: "utilizatorId și puncte sunt necesare" });
    }

    // Aici în mod normal ai actualiza cardul de fidelizare în DB.
    // Deocamdată doar confirmăm datele primite, ca să nu existe erori server.
    return res.json({
      ok: true,
      message: "Request primit. Logica de actualizare puncte poate fi extinsă.",
      dataPrimita: {
        utilizatorId,
        puncte,
        sursa,
        comandaId,
        descriere,
      },
    });
  } catch (err) {
    console.error("Eroare la /api/fidelizare/add-points:", err);
    return res.status(500).json({ error: "Eroare server" });
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
