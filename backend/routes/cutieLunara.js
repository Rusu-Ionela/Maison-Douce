// backend/routes/cutieLunara.js
const express = require("express");
const router = express.Router();
const { authRequired, roleCheck } = require("../middleware/auth"); // dacă ai roleCheck, altfel scoate
const CutieLunara = require("../models/CutieLunara");

/**
 * POST /api/cutie-lunara
 * Creează/actualizează abonamentul lunar al clientului curent
 * Body: { plan, preferinte }
 */
router.post("/", authRequired, async (req, res) => {
  try {
    const { plan = "basic", preferinte = "" } = req.body;
    const clientId = req.user.id;

    let abon = await CutieLunara.findOne({ clientId });
    if (!abon) {
      abon = await CutieLunara.create({
        clientId,
        plan,
        preferinte,
        activ: true,
        pretLunar: plan === "premium" ? 600 : plan === "deluxe" ? 900 : 400,
      });
    } else {
      abon.plan = plan;
      abon.preferinte = preferinte;
      abon.activ = true;
      abon.pretLunar =
        plan === "premium" ? 600 : plan === "deluxe" ? 900 : 400;
      await abon.save();
    }

    res.json({ ok: true, abonament: abon });
  } catch (e) {
    console.error("cutie-lunara POST error:", e);
    res.status(500).json({ ok: false, message: e.message });
  }
});

/**
 * GET /api/cutie-lunara/me
 * Abonamentul curent al clientului logat
 */
router.get("/me", authRequired, async (req, res) => {
  try {
    const abon = await CutieLunara.findOne({ clientId: req.user.id }).lean();
    res.json({ abonament: abon || null });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

/**
 * GET /api/cutie-lunara
 * Listă abonamente (admin)
 */
router.get("/", authRequired, roleCheck("admin"), async (_req, res) => {
  try {
    const list = await CutieLunara.find().populate("clientId", "nume email").lean();
    res.json(list);
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

/**
 * PATCH /api/cutie-lunara/:id/stop
 * Dezactivează un abonament
 */
router.patch("/:id/stop", authRequired, async (req, res) => {
  try {
    const abon = await CutieLunara.findById(req.params.id);
    if (!abon) return res.status(404).json({ message: "Abonament inexistent" });

    // clientul își poate opri DOAR abonamentul propriu; admin poate opri oricare
    if (String(abon.clientId) !== String(req.user.id) && req.user.rol !== "admin") {
      return res.status(403).json({ message: "Nu ai dreptul să modifici acest abonament" });
    }

    abon.activ = false;
    await abon.save();
    res.json({ ok: true, abonament: abon });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;

