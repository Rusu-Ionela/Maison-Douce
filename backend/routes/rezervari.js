// backend/routes/rezervari.js
const router = require("express").Router();
const { authRequired } = require("../utils/auth");
const Rezervare = require("../models/Rezervare");

// GET /api/rezervari (admin poate filtra)
router.get("/", async (req, res) => {
  const q = {};
  if (req.query.clientId) q.clientId = req.query.clientId;
  if (req.query.status) q.status = req.query.status;
  const list = await Rezervare.find(q).sort({ createdAt: -1 }).lean();
  res.json(list);
});

// GET /api/rezervari/:id
router.get("/:id", async (req, res) => {
  const r = await Rezervare.findById(req.params.id).lean();
  if (!r) return res.status(404).json({ message: "Rezervare inexistentă" });
  res.json(r);
});

// PATCH /api/rezervari/:id/status
router.patch("/:id/status", authRequired, async (req, res) => {
  const { status } = req.body;
  const r = await Rezervare.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true });
  if (!r) return res.status(404).json({ message: "Rezervare inexistentă" });
  res.json(r);
});

module.exports = router;
