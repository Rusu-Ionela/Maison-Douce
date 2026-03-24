const express = require("express");
const router = express.Router();
const ComandaPersonalizata = require("../models/ComandaPersonalizata");
const Comanda = require("../models/Comanda");
const { authRequired, roleCheck } = require("../middleware/auth");
const { resolveProviderForRequest } = require("../utils/providerDirectory");

// POST - Salvare comanda personalizata (client)
router.post("/", authRequired, async (req, res) => {
  try {
    const {
      clientId,
      numeClient,
      preferinte,
      imagine,
      imagineGenerata,
      designId,
      options,
      pretEstimat,
      timpPreparareOre,
      data,
      prestatorId: rawPrestatorId,
      comandaId,
    } = req.body || {};

    const ownerId = clientId || req.user._id;
    if (String(ownerId) !== String(req.user._id)) {
      return res.status(403).json({ mesaj: "clientId invalid" });
    }
    const prestatorId = await resolveProviderForRequest(req, rawPrestatorId || "");

    const comanda = new ComandaPersonalizata({
      clientId: ownerId,
      prestatorId,
      comandaId: comandaId || undefined,
      numeClient: numeClient || req.user.nume || "Client",
      preferinte: preferinte || "",
      imagine: imagine || imagineGenerata || "",
      designId,
      options: options || {},
      pretEstimat: Number(pretEstimat || 0),
      timpPreparareOre: Number(timpPreparareOre || 0),
      data: data || new Date(),
    });

    await comanda.save();
    res.status(201).json({ mesaj: "Comanda salvata cu succes", comanda });
  } catch (err) {
    console.error("Eroare la salvarea comenzii:", err);
    res.status(500).json({ mesaj: "Eroare la salvarea comenzii" });
  }
});

// GET - Afisare comenzi personalizate
router.get("/", authRequired, async (req, res) => {
  try {
    const role = req.user?.rol || req.user?.role;
    const q = {};
    if (req.query.status) q.status = req.query.status;
    if (req.query.prestatorId) q.prestatorId = req.query.prestatorId;
    if (role === "admin" || role === "patiser") {
      if (req.query.clientId) q.clientId = req.query.clientId;
      if (role === "patiser") q.prestatorId = String(req.user._id);
    } else {
      q.clientId = req.user._id;
    }
    const comenzi = await ComandaPersonalizata.find(q).sort({ data: -1 });
    res.json(comenzi);
  } catch (err) {
    console.error("Eroare la obtinerea comenzilor:", err);
    res.status(500).json({ mesaj: "Eroare la obtinerea comenzilor" });
  }
});

// PATCH - Actualizare status/pret (admin/patiser)
router.patch("/:id/status", authRequired, roleCheck("admin", "patiser"), async (req, res) => {
  try {
    const { status, pretEstimat } = req.body || {};
    const update = {};
    if (status) update.status = status;
    if (pretEstimat != null) update.pretEstimat = Number(pretEstimat || 0);

    const doc = await ComandaPersonalizata.findById(req.params.id);
    if (!doc) return res.status(404).json({ mesaj: "Comanda inexistenta" });
    if (String(req.user?.rol || req.user?.role || "") === "patiser" && String(doc.prestatorId || "") !== String(req.user._id)) {
      return res.status(403).json({ mesaj: "Acces interzis" });
    }
    Object.assign(doc, update);
    await doc.save();
    res.json(doc);
  } catch (err) {
    console.error("Eroare la actualizarea comenzii:", err);
    res.status(500).json({ mesaj: "Eroare la actualizarea comenzii" });
  }
});

// Rapoarte pentru client - numar comenzi (statistica profil client)
router.get("/count/:userId", authRequired, async (req, res) => {
  try {
    const role = req.user?.rol || req.user?.role;
    if (role !== "admin" && role !== "patiser" && String(req.user._id) !== String(req.params.userId)) {
      return res.status(403).json({ message: "Acces interzis" });
    }
    const count = await Comanda.countDocuments({ clientId: req.params.userId });
    res.json({ count });
  } catch (err) {
    console.error("Eroare la numarare comenzi:", err);
    res.status(500).send("Eroare la numarare comenzi");
  }
});

module.exports = router;
