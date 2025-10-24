const express = require('express');
const router = express.Router();
const MesajChat = require('../models/MesajChat');

// Obține toate mesajele
router.get('/', async (req, res) => {
    const mesaje = await MesajChat.find().sort({ data: 1 });
    res.json(mesaje);
});

module.exports = router;
