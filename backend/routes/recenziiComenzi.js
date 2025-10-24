const express = require('express');
const router = express.Router();
const RecenzieComanda = require('../models/RecenzieComanda');

// Creează recenzie
router.post('/', async (req, res) => {
    try {
        const { comandaId, clientId, nota, comentariu } = req.body;

        // verificăm dacă deja există o recenzie pt comanda respectivă
        const existenta = await RecenzieComanda.findOne({ comandaId, clientId });
        if (existenta) {
            return res.status(400).json({ message: 'Ai lăsat deja o recenzie pentru această comandă.' });
        }

        const recenzieNoua = new RecenzieComanda({
            comandaId,
            clientId,
            nota,
            comentariu
        });

        await recenzieNoua.save();

        res.status(201).json({ message: 'Recenzie salvată cu succes!' });
    } catch (err) {
        console.error('Eroare la salvarea recenziei:', err);
        res.status(500).json({ message: 'Eroare server.' });
    }
});

// Obține recenzie pt o comandă
router.get('/:comandaId', async (req, res) => {
    try {
        const recenzie = await RecenzieComanda.findOne({ comandaId: req.params.comandaId });
        res.json(recenzie);
    } catch (err) {
        console.error('Eroare la preluarea recenziei:', err);
        res.status(500).json({ message: 'Eroare server.' });
    }
});

module.exports = router;
