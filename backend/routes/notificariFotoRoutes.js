const express = require("express");
const router = express.Router();
const NotificareFoto = require("../models/NotificareFoto");
const { authRequired, roleCheck } = require("../middleware/auth");

// Obtine notificarile unui utilizator
router.get("/:utilizatorId", authRequired, async (req, res) => {
  const role = req.user?.rol || req.user?.role;
  if (role !== "admin" && role !== "patiser" && String(req.user._id) !== String(req.params.utilizatorId)) {
    return res.status(403).json({ message: "Acces interzis" });
  }
  const notificari = await NotificareFoto.find({ utilizatorId: req.params.utilizatorId }).sort({ data: -1 });
  res.json(notificari);
});

// Marcheaza ca citita
router.put("/citeste/:id", authRequired, async (req, res) => {
  const notificare = await NotificareFoto.findById(req.params.id);
  if (!notificare) return res.status(404).json({ message: "Notificare inexistenta" });

  const role = req.user?.rol || req.user?.role;
  if (role !== "admin" && role !== "patiser" && String(notificare.utilizatorId) !== String(req.user._id)) {
    return res.status(403).json({ message: "Acces interzis" });
  }

  notificare.citit = true;
  await notificare.save();
  res.json(notificare);
});

// Creare notificare (admin/patiser)
router.post("/creare", authRequired, roleCheck("admin", "patiser"), async (req, res) => {
  const { utilizatorId, mesaj } = req.body;
  const notificare = new NotificareFoto({ utilizatorId, mesaj });
  await notificare.save();
  res.json(notificare);
});

module.exports = router;
