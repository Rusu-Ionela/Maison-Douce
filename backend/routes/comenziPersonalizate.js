const express = require('express');
const router = express.Router();
const ComandaPersonalizata = require('../models/ComandaPersonalizata');
const Comanda = require('../models/Comanda'); // ✅ adaugă această linie pentru corectitudine

// POST – Salvare comanda personalizată
router.post('/', async (req, res) => {
    try {
        const { numeClient, preferinte, imagineGenerata, data } = req.body;

        const comanda = new ComandaPersonalizata({
            numeClient,
            preferinte,
            imagineGenerata,
            data: data || new Date()
        });

        await comanda.save();
        res.status(201).json({ mesaj: 'Comanda salvată cu succes' });
    } catch (err) {
        console.error('Eroare la salvarea comenzii:', err);
        res.status(500).json({ mesaj: 'Eroare la salvarea comenzii' });
    }
});

// GET – Afișare comenzi personalizate
router.get('/', async (req, res) => {
    try {
        const comenzi = await ComandaPersonalizata.find().sort({ data: -1 });
        res.json(comenzi);
    } catch (err) {
        console.error('Eroare la obținerea comenzilor:', err);
        res.status(500).json({ mesaj: 'Eroare la obținerea comenzilor' });
    }
});

// Rapoarte pentru client - număr comenzi (pentru statistica din profil client)
router.get('/count/:userId', async (req, res) => {
    try {
        const count = await Comanda.countDocuments({ clientId: req.params.userId });
        res.json({ count });
    } catch (err) {
        console.error('Eroare la numărare comenzi:', err);
        res.status(500).send('Eroare la numărare comenzi');
    }
});

module.exports = router;
