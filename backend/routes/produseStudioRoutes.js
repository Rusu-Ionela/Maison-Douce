const express = require('express');
const router = express.Router();
const { verificaExpirari } = require('../controllers/produseController');

router.get('/verifica-expirari', async (req, res) => {
    await verificaExpirari();
    res.json({ mesaj: 'Verificare expirări completată' });
});

module.exports = router;
