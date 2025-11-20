// backend/routes/devPayments.js
const express = require('express');
const router = express.Router();
const Comanda = require('../models/Comanda');
const Fidelizare = require('../models/Fidelizare'); // dacă ai model separat; altfel ajustează

// POST /api/dev-payments/pay
// Body: { comandaId, punctePer10 = 1 } -> la fiecare 10 MDL -> 1 punct (exemplu)
router.post('/pay', async (req, res) => {
    try {
        const { comandaId, punctePer10 = 1 } = req.body;
        if (!comandaId) return res.status(400).json({ error: 'comandaId required' });

        const c = await Comanda.findById(comandaId);
        if (!c) return res.status(404).json({ error: 'Comanda nu există' });

        // marchează „platită”
        c.status = 'platita';
        await c.save();

        // puncte (ex: 1 punct / 10 MDL din total)
        const total = Number(c.total || 0);
        const points = Math.floor(total / 10) * Number(punctePer10);

        // dacă ai sistemul Fidelizare separat:
        let card = await Fidelizare.findOne({ clientId: c.clientId });
        if (!card) {
            card = await Fidelizare.create({ clientId: c.clientId, points: 0, history: [] });
        }
        if (points > 0) {
            card.points += points;
            card.history.push({
                type: 'earn',
                points,
                source: 'dev_payment_mock',
                comandaId: c._id,
                at: new Date(),
            });
            await card.save();
        }

        res.json({ ok: true, comandaId: c._id, status: c.status, pointsAdded: points });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Dev route: simulate Stripe webhook for a comanda (dev only)
// POST /api/dev-payments/simulate-stripe
// Body: { comandaId }
router.post('/simulate-stripe', async (req, res) => {
    try {
        const { comandaId } = req.body;
        if (!comandaId) return res.status(400).json({ error: 'comandaId required' });

        const c = await Comanda.findById(comandaId);
        if (!c) return res.status(404).json({ error: 'Comanda nu exista' });

        c.paymentStatus = 'paid';
        c.status = 'confirmata';
        await c.save();

        // award points (10% of total as integer)
        const earned = Math.floor((Number(c.total) || 0) * 0.1);
        let card = await Fidelizare.findOne({ clientId: c.clientId });
        if (!card) {
            card = await Fidelizare.create({ clientId: c.clientId, puncteCurent: 0, puncteTotal: 0, istoric: [] });
        }
        if (earned > 0) {
            card.puncteCurent = (card.puncteCurent || 0) + earned;
            card.puncteTotal = (card.puncteTotal || 0) + earned;
            card.istoric = Array.isArray(card.istoric) ? [...card.istoric, { data: new Date(), tip: 'earn', puncte: earned, sursa: 'dev_simulate_stripe', comandaId: c._id }] : [{ data: new Date(), tip: 'earn', puncte: earned }];
            await card.save();
        }

        res.json({ ok: true, comandaId: c._id, earned });
    } catch (e) {
        console.error('simulate-stripe error', e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
