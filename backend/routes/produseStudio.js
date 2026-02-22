const express = require("express");
const router = express.Router();
const ProdusStudio = require("../models/ProdusStudio");
const Tort = require("../models/Tort");
const { authRequired, roleCheck } = require("../middleware/auth");
const { verificaExpirari } = require("../controllers/produseController");

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toDateOrNull(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function mapRecipeIngredients(tort) {
  if (Array.isArray(tort?.reteta) && tort.reteta.length > 0) {
    return tort.reteta
      .map((row) => {
        const ing = String(row?.ingredient || "").trim();
        if (!ing) return "";
        const qty = Number(row?.qty || 0);
        const unit = String(row?.unit || "").trim();
        if (qty > 0 && unit) return `${ing} - ${qty} ${unit}`;
        if (qty > 0) return `${ing} - ${qty}`;
        return ing;
      })
      .filter(Boolean);
  }

  if (Array.isArray(tort?.ingrediente) && tort.ingrediente.length > 0) {
    return tort.ingrediente.map((it) => String(it).trim()).filter(Boolean);
  }

  return [];
}

// GET /api/produse-studio
router.get("/", async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(500, toNumber(req.query.limit, 200)));
    const items = await ProdusStudio.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: "Eroare la preluare produse studio." });
  }
});

// GET /api/produse-studio/retete-publice
router.get("/retete-publice", async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(100, toNumber(req.query.limit, 24)));
    const torturi = await Tort.find({ activ: { $ne: false } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const items = torturi
      .map((tort) => ({
        _id: tort._id,
        title: tort.nume || tort.title || "Reteta",
        description: tort.descriere || tort.description || "",
        ingredients: mapRecipeIngredients(tort),
      }))
      .filter((item) => item.ingredients.length > 0);

    res.json(items);
  } catch (e) {
    res.status(500).json({ message: "Eroare la preluare retete publice." });
  }
});

// GET /api/produse-studio/verifica-expirari
router.get(
  "/verifica-expirari",
  authRequired,
  roleCheck("admin", "patiser"),
  async (_req, res) => {
    try {
      const summary = await verificaExpirari();
      res.json({ mesaj: "Verificare expirari completata", summary });
    } catch (e) {
      res.status(500).json({ message: "Eroare la verificare expirari." });
    }
  }
);

// GET /api/produse-studio/:id
router.get("/:id", authRequired, roleCheck("admin", "patiser"), async (req, res) => {
  try {
    const doc = await ProdusStudio.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: "Produs studio inexistent." });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ message: "ID invalid pentru produs studio." });
  }
});

// POST /api/produse-studio
router.post("/", authRequired, roleCheck("admin", "patiser"), async (req, res) => {
  try {
    const { nume, descriere, pret, cantitate, unitate, dataExpirare } = req.body || {};
    if (!String(nume || "").trim()) {
      return res.status(400).json({ message: "Numele este obligatoriu." });
    }

    const doc = await ProdusStudio.create({
      nume: String(nume).trim(),
      descriere: String(descriere || "").trim(),
      pret: toNumber(pret, 0),
      cantitate: toNumber(cantitate, 0),
      unitate: String(unitate || "buc").trim() || "buc",
      dataExpirare: toDateOrNull(dataExpirare),
    });

    res.status(201).json(doc);
  } catch (e) {
    res.status(500).json({ message: "Eroare la creare produs studio." });
  }
});

// PUT /api/produse-studio/:id
router.put("/:id", authRequired, roleCheck("admin", "patiser"), async (req, res) => {
  try {
    const { nume, descriere, pret, cantitate, unitate, dataExpirare } = req.body || {};

    const update = {};
    if (typeof nume === "string") update.nume = nume.trim();
    if (typeof descriere === "string") update.descriere = descriere.trim();
    if (pret != null) update.pret = toNumber(pret, 0);
    if (cantitate != null) update.cantitate = toNumber(cantitate, 0);
    if (unitate != null) update.unitate = String(unitate || "").trim() || "buc";
    if (dataExpirare !== undefined) update.dataExpirare = toDateOrNull(dataExpirare);

    const doc = await ProdusStudio.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    }).lean();

    if (!doc) return res.status(404).json({ message: "Produs studio inexistent." });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ message: "Eroare la actualizare produs studio." });
  }
});

// DELETE /api/produse-studio/:id
router.delete(
  "/:id",
  authRequired,
  roleCheck("admin", "patiser"),
  async (req, res) => {
    try {
      const doc = await ProdusStudio.findByIdAndDelete(req.params.id).lean();
      if (!doc) return res.status(404).json({ message: "Produs studio inexistent." });
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ message: "ID invalid pentru produs studio." });
    }
  }
);

module.exports = router;
