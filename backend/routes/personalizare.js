const express = require("express");
const fs = require('fs');
const path = require('path');
const router = express.Router();
const Personalizare = require('../models/Personalizare');

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// POST /api/personalizare
// Body: { clientId?, forma, culori:[], mesaj?, imageData (dataURL) }
router.post("/", async (req, res) => {
    try {
        const { clientId, forma, culori, mesaj, imageData, note } = req.body;

        let imageUrl = null;
        if (imageData && typeof imageData === 'string' && imageData.startsWith('data:')) {
            // decode data url
            const matches = imageData.match(/^data:(image\/\w+);base64,(.+)$/);
            if (matches) {
                const mime = matches[1];
                const ext = mime.split('/')[1] || 'png';
                const b64 = matches[2];
                const buffer = Buffer.from(b64, 'base64');

                const uploadsDir = path.join(__dirname, '..', 'uploads', 'personalizari');
                ensureDir(uploadsDir);
                const fileName = `design_${Date.now()}.${ext}`;
                const filePath = path.join(uploadsDir, fileName);
                fs.writeFileSync(filePath, buffer);
                imageUrl = `/uploads/personalizari/${fileName}`;
            }
        }

        const doc = await Personalizare.create({
            clientId: clientId || undefined,
            forma: forma || 'rotund',
            culori: Array.isArray(culori) ? culori : [],
            config: req.body.config || undefined,
            mesaj: mesaj || undefined,
            imageUrl,
            note: note || undefined,
        });

        res.status(201).json({ ok: true, id: doc._id, imageUrl });
    } catch (e) {
        console.error('POST /personalizare error:', e);
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/personalizare/client/:clientId
router.get('/client/:clientId', async (req, res) => {
    try {
        const { clientId } = req.params;
        if (!clientId) return res.status(400).json({ error: 'clientId required' });
        const list = await Personalizare.find({ clientId }).sort({ createdAt: -1 }).lean();
        res.json(list);
    } catch (e) {
        console.error('GET /personalizare/client error:', e);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/personalizare/:id
router.get('/:id', async (req, res) => {
    try {
        const doc = await Personalizare.findById(req.params.id).lean();
        if (!doc) return res.status(404).json({ error: 'Not found' });
        res.json(doc);
    } catch (e) {
        console.error('GET /personalizare/:id error:', e);
        res.status(500).json({ error: e.message });
    }
});

// PUT /api/personalizare/:id  -> update existing design (metadata + optional new imageData)
router.put('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const { forma, culori, mesaj, config, note, imageData } = req.body;

        const doc = await Personalizare.findById(id);
        if (!doc) return res.status(404).json({ error: 'Not found' });

        // If new imageData provided, decode and replace image
        let imageUrl = doc.imageUrl;
        if (imageData && typeof imageData === 'string' && imageData.startsWith('data:')) {
            const matches = imageData.match(/^data:(image\/\w+);base64,(.+)$/);
            if (matches) {
                const mime = matches[1];
                const ext = mime.split('/')[1] || 'png';
                const b64 = matches[2];
                const buffer = Buffer.from(b64, 'base64');

                const uploadsDir = path.join(__dirname, '..', 'uploads', 'personalizari');
                ensureDir(uploadsDir);
                const fileName = `design_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
                const filePath = path.join(uploadsDir, fileName);
                fs.writeFileSync(filePath, buffer);
                imageUrl = `/uploads/personalizari/${fileName}`;

                // Optional: delete old file (best-effort)
                try {
                    if (doc.imageUrl && doc.imageUrl.startsWith('/uploads/')) {
                        const oldPath = path.join(__dirname, '..', doc.imageUrl.replace('/uploads/', 'uploads/'));
                        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                    }
                } catch (e) {
                    console.warn('Could not remove old design image:', e.message || e);
                }
            }
        }

        // update fields
        if (typeof forma !== 'undefined') doc.forma = forma;
        if (Array.isArray(culori)) doc.culori = culori;
        if (typeof mesaj !== 'undefined') doc.mesaj = mesaj;
        if (typeof config !== 'undefined') doc.config = config;
        if (typeof note !== 'undefined') doc.note = note;
        if (imageUrl) doc.imageUrl = imageUrl;

        await doc.save();
        res.json({ ok: true, id: doc._id, imageUrl: doc.imageUrl });
    } catch (e) {
        console.error('PUT /personalizare/:id error:', e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
