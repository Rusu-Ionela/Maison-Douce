// backend/routes/rezervari.js
const router = require("express").Router();
const { authRequired, roleCheck } = require("../middleware/auth");
const Rezervare = require("../models/Rezervare");

// GET /api/rezervari
router.get("/", authRequired, async (req, res) => {
  try {
    const role = req.user?.rol || req.user?.role;
    const q = {};
    if (req.query.status) q.status = req.query.status;

    if (role === "admin" || role === "patiser") {
      if (req.query.clientId) q.clientId = req.query.clientId;
    } else {
      q.clientId = req.user._id;
    }

    const list = await Rezervare.find(q).sort({ createdAt: -1 }).lean();
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: "Eroare la preluare rezervari" });
  }
});

// GET /api/rezervari/:id
router.get("/:id", authRequired, async (req, res) => {
  try {
    const role = req.user?.rol || req.user?.role;
    const q = { _id: req.params.id };
    if (role !== "admin" && role !== "patiser") {
      q.clientId = req.user._id;
    }
    const r = await Rezervare.findOne(q).lean();
    if (!r) return res.status(404).json({ message: "Rezervare inexistenta" });
    res.json(r);
  } catch (e) {
    res.status(500).json({ message: "Eroare la preluare rezervare" });
  }
});

// PATCH /api/rezervari/:id/status
router.patch("/:id/status", authRequired, roleCheck("admin", "patiser"), async (req, res) => {
  try {
    const { status } = req.body;
    const r = await Rezervare.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true });
    if (!r) return res.status(404).json({ message: "Rezervare inexistenta" });
    res.json(r);
  } catch (e) {
    res.status(500).json({ message: "Eroare la actualizare status" });
  }
});

module.exports = router;
