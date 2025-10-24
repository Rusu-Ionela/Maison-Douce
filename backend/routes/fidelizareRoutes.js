// backend/routes/fidelizareRoutes.js
const express = require('express');
const router = express.Router();
const Fidelizare = require('../models/Fidelizare');

/* MODELU’ RECOMANDAT:
   {
     userId: ObjectId,
     points: Number,
     history: [ { type, points, source, note, at } ]
   }

   Dacă schema ta are clientId/puncte/istoric, mapăm la răspuns.
*/

function normalize(doc) {
    if (!doc) return { points: 0, history: [] };
    const points = typeof doc.points === 'number' ? doc.points
        : typeof doc.puncte === 'number' ? doc.puncte : 0;

    const history = Array.isArray(doc.history) ? doc.history
        : Array.isArray(doc.istoric) ? doc.istoric : [];

    return { points, history };
}

// GET /api/fidelizare/:userId
router.get('/:userId', async (req, res) => {
    const id = req.params.userId;
    const doc = await Fidelizare.findOne({ $or: [{ userId: id }, { clientId: id }] }).lean();
    return res.json(normalize(doc));
});

// POST /api/fidelizare/:userId/add
router.post('/:userId/add', async (req, res) => {
    const id = req.params.userId;
    const incomingPoints = (typeof req.body.points === 'number' ? req.body.points : req.body.puncte) || 0;
    const note = req.body.note ?? req.body.descriere ?? '';
    const source = req.body.source ?? req.body.sursa ?? '';

    if (!incomingPoints || incomingPoints <= 0) {
        return res.status(400).json({ message: 'points/puncte trebuie să fie > 0.' });
    }

    let doc = await Fidelizare.findOne({ $or: [{ userId: id }, { clientId: id }] });

    if (!doc) {
        doc = new Fidelizare({
            userId: id,
            clientId: id,
            points: 0,
            puncte: 0,
            history: [],
            istoric: []
        });
    }

    doc.points = (doc.points || 0) + incomingPoints;
    doc.puncte = (doc.puncte || 0) + incomingPoints;

    const entry = {
        type: 'earn',
        points: incomingPoints,
        puncteModificare: incomingPoints,
        source,
        descriere: note,
        note,
        at: new Date()
    };

    if (Array.isArray(doc.history)) doc.history.push(entry);
    if (Array.isArray(doc.istoric)) doc.istoric.push(entry);
    if (!Array.isArray(doc.history) && !Array.isArray(doc.istoric)) doc.history = [entry];

    await doc.save();
    return res.json(normalize(doc.toObject()));
});

// POST /api/fidelizare/:userId/spend
router.post('/:userId/spend', async (req, res) => {
    const id = req.params.userId;
    const incomingPoints = (typeof req.body.points === 'number' ? req.body.points : req.body.puncte) || 0;
    const note = req.body.note ?? req.body.descriere ?? '';
    const source = req.body.source ?? req.body.sursa ?? '';

    if (!incomingPoints || incomingPoints <= 0) {
        return res.status(400).json({ message: 'points/puncte trebuie să fie > 0.' });
    }

    const doc = await Fidelizare.findOne({ $or: [{ userId: id }, { clientId: id }] });
    if (!doc) return res.status(404).json({ message: 'Fidelizare nu a fost găsit.' });

    const current = typeof doc.points === 'number' ? doc.points
        : typeof doc.puncte === 'number' ? doc.puncte : 0;

    if (current < incomingPoints) {
        return res.status(400).json({ message: 'Puncte insuficiente.' });
    }

    doc.points = current - incomingPoints;
    doc.puncte = (doc.puncte || current) - incomingPoints;

    const entry = {
        type: 'spend',
        points: -incomingPoints,
        puncteModificare: -incomingPoints,
        source,
        descriere: note,
        note,
        at: new Date()
    };

    if (Array.isArray(doc.history)) doc.history.push(entry);
    if (Array.isArray(doc.istoric)) doc.istoric.push(entry);
    if (!Array.isArray(doc.history) && !Array.isArray(doc.istoric)) doc.history = [entry];

    await doc.save();
    return res.json(normalize(doc.toObject()));
});

module.exports = router;
