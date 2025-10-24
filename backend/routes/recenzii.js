const express = require('express');
const router = express.Router();
const { authRequired } = require('../utils/auth');
const Recenzie = require('../models/Recenzie');
const Comanda = require('../models/Comanda'); // după structura ta
// Presupunem că o recenzie e legată de o comandaId și productId

router.post('/', authRequired, async (req, res) => {
    const { comandaId, productId, rating, text } = req.body;

    const deja = await Recenzie.findOne({ comandaId, productId, clientId: req.user._id });
    if (deja) return res.status(400).json({ message: 'Ai lăsat deja o recenzie pentru această comandă/produs.' });

    const r = await Recenzie.create({ comandaId, productId, clientId: req.user._id, rating, text });
    res.json(r);
});

router.get('/product/:id/avg', async (req, res) => {
    const productId = req.params.id;
    const agg = await Recenzie.aggregate([
        { $match: { productId } },
        { $group: { _id: '$productId', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    res.json(agg[0] || { avg: 0, count: 0 });
});

module.exports = router;
