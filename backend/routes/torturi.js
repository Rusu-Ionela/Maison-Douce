const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Tort = require('../models/Tort');
const { authRequired, role } = require('../utils/auth');

// Storage config
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, 'uploads/'),
    filename: (_req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        cb(null, `${uniqueName}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const isValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        cb(null, isValid);
    }
});

// GET /api/torturi - List all cakes
router.get('/', async (req, res) => {
    try {
        const { q = '', categorie, activ, page = 1, limit = 12 } = req.query;
        
        const filter = {};
        if (categorie) filter.categorie = categorie;
        if (activ !== undefined) filter.activ = activ === 'true';
        if (q) {
            filter.$or = [
                { nume: { $regex: q, $options: 'i' } },
                { descriere: { $regex: q, $options: 'i' } }
            ];
        }

        const [items, total] = await Promise.all([
            Tort.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Tort.countDocuments(filter)
        ]);

        res.json({
            items,
            total,
            page: Number(page),
            pages: Math.ceil(total / limit)
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/torturi - Create new cake
router.post('/', authRequired, role('admin'), upload.single('imagine'), async (req, res) => {
    try {
        const data = {
            ...req.body,
            ingrediente: req.body.ingrediente?.split(',').map(i => i.trim()),
            imagine: req.file ? `/uploads/${req.file.filename}` : undefined,
            pret: Number(req.body.pret || 0),
            stoc: Number(req.body.stoc || 0),
            activ: req.body.activ !== 'false'
        };

        const tort = await Tort.create(data);
        res.status(201).json(tort);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// GET /api/torturi/:id - Get single cake
router.get('/:id', async (req, res) => {
    try {
        const tort = await Tort.findById(req.params.id);
        if (!tort) return res.status(404).json({ message: 'Tort negăsit' });
        res.json(tort);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /api/torturi/:id - Update cake
router.put('/:id', authRequired, role('admin'), upload.single('imagine'), async (req, res) => {
    try {
        const data = {
            ...req.body,
            ingrediente: req.body.ingrediente?.split(',').map(i => i.trim()),
            pret: Number(req.body.pret || 0),
            stoc: Number(req.body.stoc || 0)
        };
        
        if (req.file) {
            data.imagine = `/uploads/${req.file.filename}`;
        }

        const tort = await Tort.findByIdAndUpdate(
            req.params.id,
            data,
            { new: true, runValidators: true }
        );

        if (!tort) return res.status(404).json({ message: 'Tort negăsit' });
        res.json(tort);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE /api/torturi/:id - Delete cake
router.delete('/:id', authRequired, role('admin'), async (req, res) => {
    try {
        const tort = await Tort.findByIdAndDelete(req.params.id);
        if (!tort) return res.status(404).json({ message: 'Tort negăsit' });
        res.json({ message: 'Tort șters cu succes' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;