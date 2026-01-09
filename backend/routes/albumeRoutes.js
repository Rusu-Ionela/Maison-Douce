// backend/routes/albumeRoutes.js
const router = require("express").Router();
const { authRequired } = require("../middleware/auth");
const Album = require("../models/Album");
const Notificare = require("../models/Notificare");
const NotificareFoto = require("../models/NotificareFoto");

router.get("/", authRequired, async (req, res) => {
  try {
    const role = req.user?.rol || req.user?.role;
    const userId = role === "admin" || role === "patiser" ? req.query.userId : req.user._id;
    if (!userId) return res.status(400).json({ message: "userId lipsa" });
    const list = await Album.find({ utilizatorId: userId }).sort({ data: -1 }).lean();
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: "Eroare la preluare albume" });
  }
});

router.post("/", authRequired, async (req, res) => {
  try {
    const role = req.user?.rol || req.user?.role;
    const { titlu, fisiere = [], utilizatorId } = req.body || {};
    const ownerId = role === "admin" || role === "patiser" ? (utilizatorId || req.user._id) : req.user._id;

    const alb = await Album.create({ titlu, fisiere, utilizatorId: ownerId });

    if (String(ownerId) !== String(req.user._id)) {
      try {
        await NotificareFoto.create({
          utilizatorId: ownerId,
          mesaj: `Album nou incarcat: ${titlu || "Album"}`,
        });
        await Notificare.create({
          userId: ownerId,
          titlu: "Album actualizat",
          mesaj: `Au fost incarcate poze noi in albumul ${titlu || "comenzii"}.`,
          tip: "album",
          link: "/albume",
        });
      } catch (e) {
        console.warn("Notificare album failed:", e?.message || e);
      }
    }

    res.status(201).json(alb);
  } catch (e) {
    res.status(500).json({ message: "Eroare la creare album" });
  }
});

router.get("/:id", authRequired, async (req, res) => {
  try {
    const role = req.user?.rol || req.user?.role;
    const q = { _id: req.params.id };
    if (role !== "admin" && role !== "patiser") {
      q.utilizatorId = req.user._id;
    }
    const a = await Album.findOne(q);
    if (!a) return res.status(404).json({ message: "Album inexistent" });
    res.json(a);
  } catch (e) {
    res.status(500).json({ message: "Eroare la preluare album" });
  }
});

router.delete("/:id", authRequired, async (req, res) => {
  try {
    const role = req.user?.rol || req.user?.role;
    const q = { _id: req.params.id };
    if (role !== "admin" && role !== "patiser") {
      q.utilizatorId = req.user._id;
    }
    await Album.deleteOne(q);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: "Eroare la stergere album" });
  }
});

module.exports = router;
