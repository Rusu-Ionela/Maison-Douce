const express = require('express');
const router = express.Router();
const Notificare = require('../models/Notificare');

router.get('/', async (req, res) => {
    const notificari = await Notificare.find().sort({ data: -1 });
    res.json(notificari);
});

router.put('/:id/citita', async (req, res) => {
    await Notificare.findByIdAndUpdate(req.params.id, { citita: true });
    res.sendStatus(200);
});

module.exports = router;
