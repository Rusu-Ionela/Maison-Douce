const express = require('express');
const router = express.Router();
const CalendarPrestator = require('../models/CalendarPrestator');
const Comanda = require('../models/Comanda'); // pt. endpoint admin


// GET /api/calendar/availability/:prestatorId?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/availability/:prestatorId', async (req, res) => {
    try {
        const { prestatorId } = req.params;
        const { from, to } = req.query;


        const cal = await CalendarPrestator.findOne({ prestatorId });
        if (!cal) return res.json({ slots: [] });


        const slots = cal.slots.filter(s => (!from || s.date >= from) && (!to || s.date <= to));
        res.json({ slots });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});


// POST /api/calendar/availability/:prestatorId
// Body: { slots: [{date, startTime, endTime, capacity}] }
router.post('/availability/:prestatorId', async (req, res) => {
    try {
        const { prestatorId } = req.params;
        const { slots = [] } = req.body;


        const cal = await CalendarPrestator.findOneAndUpdate(
            { prestatorId },
            { $set: { slots: slots.map(s => ({ ...s, booked: s.booked ?? 0 })) } },
            { upsert: true, new: true }
        );
        res.json(cal);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});


// GET /api/calendar/admin?date=YYYY-MM-DD
// Agenda zilei cu comenzi (metoda livrare/ridicare, adresa, status)
router.get('/admin', async (req, res) => {
    try {
        const { date } = req.query; // oblig.
        if (!date) return res.status(400).json({ message: 'Parametrul date este obligatoriu (YYYY-MM-DD).' });


        // grupare comenzi pe interval orar
        const comenzi = await Comanda.find({ dataLivrare: date }).lean();
        const byHour = {};
        for (const c of comenzi) {
            const key = c.oraLivrare || '00:00';
            (byHour[key] ||= []).push(c);
        }
        const agenda = Object.keys(byHour)
            .sort()
            .map(h => ({ hour: h, orders: byHour[h] }));


        res.json({ date, agenda });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});


module.exports = router;