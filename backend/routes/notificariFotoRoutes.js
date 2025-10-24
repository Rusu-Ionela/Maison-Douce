const express = require('express');
const router = express.Router();
const NotificareFoto = require('../models/NotificareFoto');

// Obține notificările unui utilizator
router.get('/:utilizatorId', async (req, res) => {
    const notificari = await NotificareFoto.find({ utilizatorId: req.params.utilizatorId }).sort({ data: -1 });
    res.json(notificari);
});

// Marchează ca citită
router.put('/citeste/:id', async (req, res) => {
    const notificare = await NotificareFoto.findById(req.params.id);
    if (notificare) {
        notificare.citit = true;
        await notificare.save();
        res.json(notificare);
    } else {
        res.status(404).json({ message: 'Notificare inexistentă' });
    }
});

// Creare notificare
router.post('/creare', async (req, res) => {
    const { utilizatorId, mesaj } = req.body;
    const notificare = new NotificareFoto({ utilizatorId, mesaj });
    await notificare.save();
    res.json(notificare);
});

module.exports = router;
