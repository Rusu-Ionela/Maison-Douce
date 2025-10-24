const express = require('express');
const Comanda = require('../models/Comanda');
const Tort = require('../models/Tort');
const router = express.Router();


// GET /api/recommendations?userId=... – returnează top torturi populare + preferințe user
router.get('/', async (req, res) => {
    const { userId, limit = 6 } = req.query;


    // popularitate globală (cele mai comandate)
    const top = await Comanda.aggregate([
        { $unwind: '$produse' },
        { $group: { _id: '$produse.tortId', count: { $sum: '$produse.cantitate' } } },
        { $sort: { count: -1 } },
        { $limit: Number(limit) },
    ]);


    const ids = top.map((t) => t._id).filter(Boolean);
    const torturi = await Tort.find({ _id: { $in: ids } });


    res.json({ recomandate: torturi });
});


module.exports = router;