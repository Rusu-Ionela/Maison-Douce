const express = require('express');
const router = express.Router();
const Notificare = require('../models/Notificare');
const { authRequired, roleCheck } = require('../middleware/auth');

// GET /api/notificari?userId=...
router.get('/', authRequired, async (req, res) => {
    try {
        const requested = req.query.userId;
        const isAdmin = ["admin", "patiser"].includes(req.user?.rol || req.user?.role);
        const userId = isAdmin && requested ? requested : req.user.id;
        const limit = Math.min(Math.max(Number(req.query.limit || 0), 0), 100);

        let query = Notificare.find({ userId }).sort({ data: -1 });
        if (limit > 0) {
            query = query.limit(limit);
        }

        const notificari = await query;
        res.json(notificari);
    } catch (error) {
        console.error("GET /api/notificari failed:", error);
        res.status(500).json({ message: "Nu am putut incarca notificarile." });
    }
});

// GET /api/notificari/me
router.get('/me', authRequired, async (req, res) => {
    try {
        const limit = Math.min(Math.max(Number(req.query.limit || 0), 0), 100);
        let query = Notificare.find({ userId: req.user.id }).sort({ data: -1 });
        if (limit > 0) {
            query = query.limit(limit);
        }

        const notificari = await query;
        res.json(notificari);
    } catch (error) {
        console.error("GET /api/notificari/me failed:", error);
        res.status(500).json({ message: "Nu am putut incarca notificarile tale." });
    }
});

// POST /api/notificari (admin -> client)
router.post('/', authRequired, roleCheck("admin", "patiser"), async (req, res) => {
    try {
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
    } catch (error) {
        console.error("POST /api/notificari failed:", error);
        res.status(500).json({ message: "Nu am putut trimite notificarea." });
    }
});

// PUT /api/notificari/citite
router.put('/citite', authRequired, async (req, res) => {
    try {
        const result = await Notificare.updateMany(
            { userId: req.user.id, citita: false },
            { $set: { citita: true } }
        );
        res.json({
            ok: true,
            updatedCount: Number(result?.modifiedCount || 0),
        });
    } catch (error) {
        console.error("PUT /api/notificari/citite failed:", error);
        res.status(500).json({ message: "Nu am putut marca notificarile ca citite." });
    }
});

// PUT /api/notificari/:id/citita
router.put('/:id/citita', authRequired, async (req, res) => {
    try {
        const notif = await Notificare.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { $set: { citita: true } },
            { new: true }
        );
        if (!notif) return res.status(404).json({ message: "Notificare inexistenta" });
        res.json(notif);
    } catch (error) {
        console.error("PUT /api/notificari/:id/citita failed:", error);
        res.status(500).json({ message: "Nu am putut marca notificarea." });
    }
});

// DELETE /api/notificari/:id
router.delete('/:id', authRequired, async (req, res) => {
    try {
        const isAdmin = ["admin", "patiser"].includes(req.user?.rol || req.user?.role);
        const q = isAdmin ? { _id: req.params.id } : { _id: req.params.id, userId: req.user.id };
        await Notificare.deleteOne(q);
        res.json({ ok: true });
    } catch (error) {
        console.error("DELETE /api/notificari/:id failed:", error);
        res.status(500).json({ message: "Nu am putut sterge notificarea." });
    }
});

module.exports = router;
