const express = require('express');
const router = express.Router();
const Fidelizare = require('../models/Fidelizare');
const { authRequired } = require('../middleware/auth');

// GET - Portofel puncte client
router.get('/client/:userId', authRequired, async (req, res) => {
    try {
        const fidelizare = await Fidelizare.findOne({ utilizatorId: req.params.userId });

        if (!fidelizare) {
            const newFidelizare = new Fidelizare({ utilizatorId: req.params.userId });
            await newFidelizare.save();
            return res.json({
                puncteCurent: 0,
                puncteTotal: 0,
                nivel: 'bronze',
                reduceriDisponibile: [],
                istoric: []
            });
        }

        res.json({
            puncteCurent: fidelizare.puncteCurent,
            puncteTotal: fidelizare.puncteTotal,
            nivel: fidelizare.nivelLoyalitate,
            reduceriDisponibile: fidelizare.reduceriDisponibile.filter(r => !r.folosita),
            istoric: fidelizare.istoric.slice(-10)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST - Adaugă puncte
router.post('/add-points', async (req, res) => {
    try {
        const { utilizatorId, puncte, sursa, comandaId, descriere } = req.body;

        let fidelizare = await Fidelizare.findOne({ utilizatorId });

        if (!fidelizare) {
            fidelizare = new Fidelizare({ utilizatorId });
        }

        fidelizare.puncteCurent += puncte;
        fidelizare.puncteTotal += puncte;

        fidelizare.istoric.push({
            tip: 'earn',
            puncte,
            sursa,
            comandaId,
            descriere
        });

        // Actualizare nivel
        if (fidelizare.puncteTotal >= 500) fidelizare.nivelLoyalitate = 'platinum';
        else if (fidelizare.puncteTotal >= 300) fidelizare.nivelLoyalitate = 'gold';
        else if (fidelizare.puncteTotal >= 100) fidelizare.nivelLoyalitate = 'silver';

        await fidelizare.save();

        res.json({ message: 'Puncte adăugate', fidelizare });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST - Răscumpără puncte
router.post('/redeem', authRequired, async (req, res) => {
    try {
        const { utilizatorId, puncte, discount } = req.body;

        const fidelizare = await Fidelizare.findOne({ utilizatorId });

        if (!fidelizare || fidelizare.puncteCurent < puncte) {
            return res.status(400).json({ error: 'Puncte insuficiente' });
        }

        fidelizare.puncteCurent -= puncte;
        fidelizare.istoric.push({
            tip: 'redeem',
            puncte,
            sursa: 'redeem',
            descriere: `Răscumpărare pentru ${discount}% discount`
        });

        fidelizare.reduceriDisponibile.push({
            procent: discount,
            valoareMinima: 0,
            codigPromo: `LOYALTY-${Date.now()}`,
            dataExpirare: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            folosita: false
        });

        await fidelizare.save();

        res.json({
            message: 'Reducere creată',
            codig: fidelizare.reduceriDisponibile[fidelizare.reduceriDisponibile.length - 1].codigPromo
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;