// backend/routes/albumeRoutes.js
const router = require("express").Router();
const { authRequired } = require("../utils/auth");
const Album = require("../models/Album");

router.get("/", authRequired, async (req, res) => {
    const list = await Album.find({ utilizatorId: req.user.id }).sort({ data: -1 }).lean();
    res.json(list);
});

router.post("/", authRequired, async (req, res) => {
    const { titlu, fisiere = [] } = req.body;
    const alb = await Album.create({ titlu, fisiere, utilizatorId: req.user.id });
    res.status(201).json(alb);
});

router.get("/:id", authRequired, async (req, res) => {
    const a = await Album.findOne({ _id: req.params.id, utilizatorId: req.user.id });
    if (!a) return res.status(404).json({ message: "Album inexistent" });
    res.json(a);
});

router.delete("/:id", authRequired, async (req, res) => {
    await Album.deleteOne({ _id: req.params.id, utilizatorId: req.user.id });
    res.json({ ok: true });
});

module.exports = router;
