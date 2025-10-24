const express = require('express');
const router = express.Router();
const Tort = require('../models/Tort'); // sau Dulciuri, dacă ai model separat
const Comanda = require('../models/Comanda'); // pentru a salva comanda

// Generează o cutie lunară (alege 3-5 produse random)
router.post('/:clientId', async (req, res) => {
    try {
        const produse = await Tort.find(); // sau Dulciuri.find()
        const selectate = produse.sort(() => 0.5 - Math.random()).slice(0, 4); // alege 4 random

        const total = selectate.reduce((acc, p) => acc + p.pret, 0);

        const comandaNoua = new Comanda({
            clientId: req.params.clientId,
            produse: selectate.map(p => p._id),
            total,
            tip: 'cutie-lunara'
        });

        await comandaNoua.save();

        res.json({ mesaj: 'Cutie lunară comandată!', produse: selectate, total });
    } catch (err) {
        res.status(500).json({ mesaj: 'Eroare la generare cutie.' });
    }
});

module.exports = router;
