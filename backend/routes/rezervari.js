const express = require('express');
const Rezervare = require('../models/Rezervare');
const router = express.Router();


router.get('/', async (_req, res) => {
    const items = await Rezervare.find().sort({ createdAt: -1 });
    res.json(items);
});


router.get('/:id', async (req, res) => {
    const r = await Rezervare.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Nu există' });
    res.json(r);
});


router.post('/', async (req, res) => {
    try {
        const r = await Rezervare.create(req.body);
        res.status(201).json(r);
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
});


router.patch('/:id', async (req, res) => {
    const r = await Rezervare.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(r);
});


router.delete('/:id', async (req, res) => {
    await Rezervare.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
});


module.exports = router;