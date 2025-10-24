const express = require('express');
const router = express.Router();
const Partajare = require('../models/Partajare');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');

// Configurare Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Creare partajare fișiere
router.post('/creare', upload.array('fisiere', 10), async (req, res) => {
    const { utilizatorId } = req.body;
    const fisiere = req.files.map(f => `/uploads/${f.filename}`);
    const linkUnic = uuidv4();

    const partajare = new Partajare({ utilizatorId, fisiere, linkUnic });
    await partajare.save();

    res.json({ link: `http://localhost:3000/partajare/${linkUnic}` });
});

// Obține partajarea după link
router.get('/:linkUnic', async (req, res) => {
    const partajare = await Partajare.findOne({ linkUnic: req.params.linkUnic });
    if (partajare) {
        res.json(partajare);
    } else {
        res.status(404).json({ message: 'Link invalid' });
    }
});

module.exports = router;
