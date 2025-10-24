const express = require('express');
const router = express.Router();
const RecenziePrestator = require('../models/RecenziePrestator');

// Obține recenziile unui prestator
router.get('/:prestatorId', async (req, res) => {
    const recenzii = await RecenziePrestator.find({ prestatorId: req.params.prestatorId }).sort({ data: -1 });
    res.json(recenzii);
});

// Adaugă o recenzie
router.post('/', async (req, res) => {
    const { prestatorId, utilizator, stele, comentariu } = req.body;
    const recenzie = new RecenziePrestator({ prestatorId, utilizator, stele, comentariu });
    await recenzie.save();
    res.json(recenzie);
});

module.exports = router;
