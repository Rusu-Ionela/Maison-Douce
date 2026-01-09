const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Tort = require('../models/Tort');
const { authRequired, roleCheck } = require("../middleware/auth");

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

function maybeUpload(req, res, next) {
    if (req.is("multipart/form-data")) {
        return upload.single("imagine")(req, res, next);
    }
    return next();
}

function parseArray(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val.filter(Boolean);
    if (typeof val === "string") {
        try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) return parsed.filter(Boolean);
        } catch { }
        return val.split(",").map((v) => v.trim()).filter(Boolean);
    }
    return [];
}

// GET /api/torturi - List all cakes
router.get('/', async (req, res) => {
    try {
        const {
            q = '',
            categorie,
            activ,
            page = 1,
            limit = 12,
            ocazie,
            stil,
            marime,
            pretMin,
            pretMax,
            portiiMin,
            portiiMax,
            ratingMin,
            promo,
            sort,
            excludeIngrediente,
            excludeAlergeni,
        } = req.query;
        
        const filter = {};
        if (categorie) filter.categorie = categorie;
        if (activ !== undefined) filter.activ = activ === 'true';
        if (stil) filter.stil = stil;
        if (marime) filter.marime = marime;
        if (promo !== undefined) filter.promo = promo === "true";
        if (ocazie) {
            const list = parseArray(ocazie);
            if (list.length) filter.ocazii = { $in: list };
        }
        if (pretMin || pretMax) {
            filter.pret = {};
            if (pretMin) filter.pret.$gte = Number(pretMin);
            if (pretMax) filter.pret.$lte = Number(pretMax);
        }
        if (portiiMin || portiiMax) {
            filter.portii = {};
            if (portiiMin) filter.portii.$gte = Number(portiiMin);
            if (portiiMax) filter.portii.$lte = Number(portiiMax);
        }
        if (ratingMin) filter.ratingAvg = { $gte: Number(ratingMin) };
        if (excludeIngrediente) {
            const list = parseArray(excludeIngrediente);
            if (list.length) filter.ingrediente = { $nin: list };
        }
        if (excludeAlergeni) {
            const list = parseArray(excludeAlergeni);
            if (list.length) filter.alergeniFolositi = { $nin: list };
        }
        if (q) {
            filter.$or = [
                { nume: { $regex: q, $options: 'i' } },
                { descriere: { $regex: q, $options: 'i' } }
            ];
        }

        let sortBy = { createdAt: -1 };
        if (sort === "price_asc") sortBy = { pret: 1 };
        if (sort === "price_desc") sortBy = { pret: -1 };
        if (sort === "rating") sortBy = { ratingAvg: -1, ratingCount: -1 };
        if (sort === "popular") sortBy = { ratingCount: -1, ratingAvg: -1 };

        const [items, total] = await Promise.all([
            Tort.find(filter)
                .sort(sortBy)
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
router.post("/", authRequired, roleCheck("admin", "patiser"), maybeUpload, async (req, res) => {
    try {
        const ingredienteList = parseArray(req.body.ingrediente);
        const galerieList = parseArray(req.body.galerie);
        const aromeList = parseArray(req.body.arome);
        const ocaziiList = parseArray(req.body.ocazii || req.body.ocazie);
        const alergeniList = parseArray(req.body.alergeniFolositi || req.body.alergeni);

        const data = {
            ...req.body,
            ingrediente: ingredienteList,
            galerie: galerieList,
            arome: aromeList,
            ocazii: ocaziiList,
            alergeniFolositi: alergeniList,
            imagine: req.file ? `/uploads/${req.file.filename}` : undefined,
            pret: Number(req.body.pret || 0),
            costEstim: Number(req.body.costEstim || 0),
            pretVechi: Number(req.body.pretVechi || 0),
            stoc: Number(req.body.stoc || 0),
            portii: Number(req.body.portii || 0),
            timpPreparareOre: Number(req.body.timpPreparareOre || 0),
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
router.put("/:id", authRequired, roleCheck("admin", "patiser"), maybeUpload, async (req, res) => {
    try {
        const ingredienteList = parseArray(req.body.ingrediente);
        const galerieList = parseArray(req.body.galerie);
        const aromeList = parseArray(req.body.arome);
        const ocaziiList = parseArray(req.body.ocazii || req.body.ocazie);
        const alergeniList = parseArray(req.body.alergeniFolositi || req.body.alergeni);

        const data = {
            ...req.body,
            ingrediente: ingredienteList.length ? ingredienteList : undefined,
            galerie: galerieList.length ? galerieList : undefined,
            arome: aromeList.length ? aromeList : undefined,
            ocazii: ocaziiList.length ? ocaziiList : undefined,
            alergeniFolositi: alergeniList.length ? alergeniList : undefined,
            pret: Number(req.body.pret || 0),
            costEstim: Number(req.body.costEstim || 0),
            pretVechi: Number(req.body.pretVechi || 0),
            stoc: Number(req.body.stoc || 0)
        };
        if (req.body.portii != null) data.portii = Number(req.body.portii || 0);
        if (req.body.timpPreparareOre != null) data.timpPreparareOre = Number(req.body.timpPreparareOre || 0);
        if (req.body.promo != null) data.promo = String(req.body.promo) === "true";
        if (req.body.stil != null) data.stil = req.body.stil;
        if (req.body.marime != null) data.marime = req.body.marime;
        
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
router.delete("/:id", authRequired, roleCheck("admin", "patiser"), async (req, res) => {
    try {
        const tort = await Tort.findByIdAndDelete(req.params.id);
        if (!tort) return res.status(404).json({ message: 'Tort negăsit' });
        res.json({ message: 'Tort șters cu succes' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
