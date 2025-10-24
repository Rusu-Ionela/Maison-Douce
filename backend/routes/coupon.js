const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');

// Creare cupon (admin)
router.post('/create', async (req, res) => {
    const { cod, procentReducere } = req.body;

    try {
        const cuponNou = new Coupon({ cod, procentReducere });
        await cuponNou.save();

        res.json({ message: 'Cupon creat cu succes!', cuponNou });
    } catch (err) {
        console.error('Eroare la creare cupon:', err);
        res.status(500).json({ message: 'Eroare server.' });
    }
});

// Verificare cupon (client)
router.get('/verify/:cod', async (req, res) => {
    try {
        const coupon = await Coupon.findOne({ cod: req.params.cod, activ: true });
        if (!coupon) {
            return res.status(404).json({ message: 'Cupon invalid sau inactiv.' });
        }
        res.json({ valid: true, procentReducere: coupon.procentReducere });
    } catch (err) {
        res.status(500).json({ message: 'Eroare server.' });
    }
});

module.exports = router;
