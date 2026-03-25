const express = require("express");
const router = express.Router();
const NotificareFoto = require("../models/NotificareFoto");
const { authRequired, roleCheck } = require("../middleware/auth");

// Marcheaza toate notificarile foto ca citite
router.put("/citite/:utilizatorId", authRequired, async (req, res) => {
  try {
    const role = req.user?.rol || req.user?.role;
    const targetUserId = String(req.params.utilizatorId || "");

    if (
      role !== "admin" &&
      role !== "patiser" &&
      String(req.user._id) !== targetUserId
    ) {
      return res.status(403).json({ message: "Acces interzis" });
    }

    const result = await NotificareFoto.updateMany(
      { utilizatorId: targetUserId, citit: false },
      { $set: { citit: true } }
    );

    res.json({
      ok: true,
      updatedCount: Number(result?.modifiedCount || 0),
    });
  } catch (error) {
    console.error("PUT /api/notificari-foto/citite/:utilizatorId failed:", error);
    res.status(500).json({ message: "Nu am putut actualiza notificarile foto." });
  }
});

// Obtine notificarile unui utilizator
router.get("/:utilizatorId", authRequired, async (req, res) => {
  try {
    const role = req.user?.rol || req.user?.role;
    if (role !== "admin" && role !== "patiser" && String(req.user._id) !== String(req.params.utilizatorId)) {
      return res.status(403).json({ message: "Acces interzis" });
    }
    const limit = Math.min(Math.max(Number(req.query.limit || 0), 0), 100);
    let query = NotificareFoto.find({ utilizatorId: req.params.utilizatorId }).sort({ data: -1 });
    if (limit > 0) {
      query = query.limit(limit);
    }
    const notificari = await query;
    res.json(notificari);
  } catch (error) {
    console.error("GET /api/notificari-foto/:utilizatorId failed:", error);
    res.status(500).json({ message: "Nu am putut incarca notificarile foto." });
  }
});

// Marcheaza ca citita
router.put("/citeste/:id", authRequired, async (req, res) => {
  try {
    const notificare = await NotificareFoto.findById(req.params.id);
    if (!notificare) return res.status(404).json({ message: "Notificare inexistenta" });

    const role = req.user?.rol || req.user?.role;
    if (role !== "admin" && role !== "patiser" && String(notificare.utilizatorId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Acces interzis" });
    }

    notificare.citit = true;
    await notificare.save();
    res.json(notificare);
  } catch (error) {
    console.error("PUT /api/notificari-foto/citeste/:id failed:", error);
    res.status(500).json({ message: "Nu am putut actualiza notificarea foto." });
  }
});

// Creare notificare (admin/patiser)
router.post("/creare", authRequired, roleCheck("admin", "patiser"), async (req, res) => {
  try {
    const { utilizatorId, mesaj } = req.body;
    const notificare = new NotificareFoto({ utilizatorId, mesaj });
    await notificare.save();
    res.json(notificare);
  } catch (error) {
    console.error("POST /api/notificari-foto/creare failed:", error);
    res.status(500).json({ message: "Nu am putut crea notificarea foto." });
  }
});

module.exports = router;
