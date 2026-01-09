const express = require('express');
const router = express.Router();
const Notificare = require('../models/Notificare');
const { authRequired, roleCheck } = require('../middleware/auth');

// GET /api/notificari?userId=...
router.get('/', authRequired, async (req, res) => {
    const requested = req.query.userId;
    const isAdmin = ["admin", "patiser"].includes(req.user?.rol || req.user?.role);
    const userId = isAdmin && requested ? requested : req.user.id;
    const notificari = await Notificare.find({ userId }).sort({ data: -1 });
    res.json(notificari);
});

// GET /api/notificari/me
router.get('/me', authRequired, async (req, res) => {
    const notificari = await Notificare.find({ userId: req.user.id }).sort({ data: -1 });
    res.json(notificari);
});

// POST /api/notificari (admin -> client)
router.post('/', authRequired, roleCheck("admin", "patiser"), async (req, res) => {
    const { userId, titlu, mesaj, tip = "info", link = "", canal = "inapp" } = req.body || {};
    if (!userId) return res.status(400).json({ message: "userId este obligatoriu" });

    const notif = await Notificare.create({
        userId,
        titlu: titlu || "",
        mesaj: mesaj || "",
        tip,
        link,
        canal,
    });
    res.status(201).json(notif);
});

// PUT /api/notificari/:id/citita
router.put('/:id/citita', authRequired, async (req, res) => {
    const notif = await Notificare.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.id },
        { $set: { citita: true } },
        { new: true }
    );
    if (!notif) return res.status(404).json({ message: "Notificare inexistenta" });
    res.json(notif);
});

// DELETE /api/notificari/:id
router.delete('/:id', authRequired, async (req, res) => {
    const isAdmin = ["admin", "patiser"].includes(req.user?.rol || req.user?.role);
    const q = isAdmin ? { _id: req.params.id } : { _id: req.params.id, userId: req.user.id };
    await Notificare.deleteOne(q);
    res.json({ ok: true });
});

module.exports = router;
