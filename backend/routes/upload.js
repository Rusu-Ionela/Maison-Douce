const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { authRequired, role } = require('../utils/auth');
const upload = require('../utils/multer'); // config existent

router.post('/', authRequired, upload.single('file'), (req, res) => {
    res.json({ filename: req.file.filename, url: `/uploads/${req.file.filename}` });
});

router.get('/', authRequired, role('admin'), (req, res) => {
    const dir = path.join(__dirname, '..', 'uploads');
    const files = fs.readdirSync(dir).map(f => ({ name: f, url: `/uploads/${f}` }));
    res.json(files);
});

router.delete('/', authRequired, role('admin'), (req, res) => {
    const { name } = req.body;
    if (!/^[\w\-.]+$/.test(name)) return res.status(400).json({ message: 'Nume invalid' });
    const filePath = path.join(__dirname, '..', 'uploads', name);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ ok: true });
});

module.exports = router;
