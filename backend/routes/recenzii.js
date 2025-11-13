// backend/routes/recenzii.js
const router = require("express").Router();
const { authRequired } = require("../utils/auth");
const Recenzie = require("../models/Recenzie");
const RecenzieComanda = require("../models/RecenzieComanda");
const RecenziePrestator = require("../models/RecenziePrestator");

// Produs
router.post("/produs", authRequired, async (req, res) => {
    const { tortId, utilizator, stele, comentariu } = req.body;
    const r = await Recenzie.create({ tortId, utilizator: utilizator || req.user.id, stele, comentariu });
    res.json(r);
});
router.get("/produs/:tortId", async (req, res) => {
    const list = await Recenzie.find({ tortId: req.params.tortId }).sort({ data: -1 });
    res.json(list);
});

// Comandă
router.post("/comanda", authRequired, async (req, res) => {
    const { comandaId, nota, comentariu } = req.body;
    const r = await RecenzieComanda.create({ comandaId, clientId: req.user.id, nota, comentariu });
    res.json(r);
});
router.get("/comanda/:comandaId", async (req, res) => {
    const r = await RecenzieComanda.findOne({ comandaId: req.params.comandaId });
    res.json(r);
});

// Prestator
router.post("/prestator", authRequired, async (req, res) => {
    const { prestatorId, stele, comentariu } = req.body;
    const r = await RecenziePrestator.create({ prestatorId, utilizator: req.user.id, stele, comentariu });
    res.json(r);
});
router.get("/prestator/:prestatorId", async (req, res) => {
    const list = await RecenziePrestator.find({ prestatorId: req.params.prestatorId }).sort({ data: -1 });
    res.json(list);
});

module.exports = router;
