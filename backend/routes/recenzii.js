// backend/routes/recenzii.js
const router = require("express").Router();
const { authRequired } = require("../middleware/auth");
const Recenzie = require("../models/Recenzie");
const RecenzieComanda = require("../models/RecenzieComanda");
const RecenziePrestator = require("../models/RecenziePrestator");

// Recent reviews for homepage
router.get("/recent", async (req, res) => {
    const limit = Number(req.query.limit || 6);
    const list = await Recenzie.find().sort({ data: -1 }).limit(limit).lean();
    res.json(list);
});

// Produs
router.post("/produs", authRequired, async (req, res) => {
    const { tortId, utilizator, stele, comentariu, foto } = req.body;
    const r = await Recenzie.create({ tortId, utilizator: utilizator || req.user.id, stele, comentariu, foto });

    try {
        const Tort = require("../models/Tort");
        const agg = await Recenzie.aggregate([
            { $match: { tortId: r.tortId } },
            { $group: { _id: "$tortId", avg: { $avg: "$stele" }, count: { $sum: 1 } } }
        ]);
        if (agg[0]) {
            await Tort.findByIdAndUpdate(r.tortId, {
                ratingAvg: Number(agg[0].avg || 0),
                ratingCount: Number(agg[0].count || 0),
            });
        }
    } catch (e) {
        console.warn("Rating update failed:", e.message);
    }

    res.json(r);
});
router.get("/produs/:tortId", async (req, res) => {
    const list = await Recenzie.find({ tortId: req.params.tortId }).sort({ data: -1 });
    res.json(list);
});

// Comandă
router.post("/comanda", authRequired, async (req, res) => {
    const { comandaId, nota, comentariu, foto } = req.body;
    const r = await RecenzieComanda.create({ comandaId, clientId: req.user.id, nota, comentariu, foto });
    res.json(r);
});
router.get("/comanda/:comandaId", async (req, res) => {
    const r = await RecenzieComanda.findOne({ comandaId: req.params.comandaId });
    res.json(r);
});

// Prestator
router.post("/prestator", authRequired, async (req, res) => {
    const { prestatorId, stele, comentariu, foto } = req.body;
    const r = await RecenziePrestator.create({ prestatorId, utilizator: req.user.id, stele, comentariu, foto });
    res.json(r);
});
router.get("/prestator/:prestatorId", async (req, res) => {
    const list = await RecenziePrestator.find({ prestatorId: req.params.prestatorId }).sort({ data: -1 });
    res.json(list);
});

module.exports = router;
