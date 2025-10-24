const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Tort = require('../models/Tort');
const auth = require('../middleware/auth');

// --- Mini middleware admin ---
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acces interzis (admin).' });
    }
    next();
}

// --- Multer upload (salvează în /uploads) ---
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, 'uploads/'),
    filename: (_req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// ========== PUBLIC ==========

// GET /api/torturi  (search, categorie, paginare)
router.get('/', async (req, res) => {
    try {
        const {
            q = '',                  // search text in nume/descriere
            categorie,               // ex: cakes
            page = 1,
            limit = 20,
            activ = 'true',
        } = req.query;

        const filter = {};
        if (activ !== undefined) filter.activ = String(activ) === 'true';
        if (categorie) filter.categorie = categorie;

        if (q) {
            filter.$or = [
                { nume: { $regex: q, $options: 'i' } },
                { descriere: { $regex: q, $options: 'i' } },
            ];
        }

        const pg = Math.max(1, parseInt(page));
        const lm = Math.min(100, Math.max(1, parseInt(limit)));

        const [items, total] = await Promise.all([
            Tort.find(filter).sort({ createdAt: -1 }).skip((pg - 1) * lm).limit(lm).lean(),
            Tort.countDocuments(filter),
        ]);

        res.json({ items, total, page: pg, pages: Math.ceil(total / lm) });
    } catch (err) {
        res.status(500).json({ message: err.message || 'Eroare listare torturi' });
    }
});

// GET /api/torturi/:id
router.get('/:id', async (req, res) => {
    try {
        const t = await Tort.findById(req.params.id).lean();
        if (!t) return res.status(404).json({ message: 'Tort inexistent' });
        res.json(t);
    } catch (err) {
        res.status(500).json({ message: err.message || 'Eroare citire tort' });
    }
});

// ========== ADMIN (protejate) ==========

// POST /api/torturi  (create cu upload imagine)
router.post('/', auth, requireAdmin, upload.single('imagine'), async (req, res) => {
    try {
        const { nume, descriere, ingrediente = "", pret = 0, stoc = 0, categorie = "cakes", activ = true } = req.body;

        if (!nume) return res.status(400).json({ message: 'nume este obligatoriu' });

        const imaginePath = req.file ? `/uploads/${req.file.filename}` : '';

        const tort = await Tort.create({
            nume,
            descriere,
            ingrediente: Array.isArray(ingrediente) ? ingrediente : String(ingrediente).split(',').map(s => s.trim()).filter(Boolean),
            imagine: imaginePath,
            pret: Number(pret || 0),
            stoc: Number(stoc || 0),
            categorie,
            activ: String(activ) !== 'false',
        });

        res.status(201).json(tort);
    } catch (err) {
        res.status(500).json({ message: 'Eroare la salvare tort', err: err.message });
    }
});

// PUT /api/torturi/:id  (update; imagine opțional)
router.put('/:id', auth, requireAdmin, upload.single('imagine'), async (req, res) => {
    try {
        const data = { ...req.body };

        if ('ingrediente' in data && !Array.isArray(data.ingrediente)) {
            data.ingrediente = String(data.ingrediente).split(',').map(s => s.trim()).filter(Boolean);
        }
        if ('pret' in data) data.pret = Number(data.pret || 0);
        if ('stoc' in data) data.stoc = Number(data.stoc || 0);
        if ('activ' in data) data.activ = String(data.activ) !== 'false';

        if (req.file) {
            data.imagine = `/uploads/${req.file.filename}`;
        }

        const updated = await Tort.findByIdAndUpdate(req.params.id, { $set: data }, { new: true });
        if (!updated) return res.status(404).json({ message: 'Tort inexistent' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: 'Eroare la actualizare tort', err: err.message });
    }
});

// DELETE /api/torturi/:id
router.delete('/:id', auth, requireAdmin, async (req, res) => {
    try {
        const doc = await Tort.findByIdAndDelete(req.params.id);
        if (!doc) return res.status(404).json({ message: 'Tortul nu a fost găsit' });

        // opțional: șterge fișierul
        if (doc.imagine && doc.imagine.startsWith('/uploads/')) {
            const filePath = path.join(__dirname, '..', doc.imagine);
            fs.unlink(filePath, () => { });
        }

        res.json({ ok: true, message: 'Tort șters cu succes' });
    } catch (err) {
        res.status(500).json({ message: 'Eroare la ștergere', err: err.message });
    }
});

module.exports = router;
