// backend/routes/devPayments.js
const express = require("express");
const router = express.Router();
const Comanda = require("../models/Comanda");
const Fidelizare = require("../models/Fidelizare");
const { activateCutieFromComanda } = require("../utils/subscriptions");

// POST /api/dev-payments/pay
// Body: { comandaId, punctePer10 = 1 }
router.post("/pay", async (req, res) => {
  try {
    const { comandaId, punctePer10 = 1 } = req.body;
    if (!comandaId) return res.status(400).json({ error: "comandaId required" });

    const c = await Comanda.findById(comandaId);
    if (!c) return res.status(404).json({ error: "Comanda nu exista" });

    c.status = "platita";
    c.paymentStatus = "paid";
    c.statusPlata = "paid";
    await c.save();
    await activateCutieFromComanda(c);

    const total = Number(c.total || 0);
    const points = Math.floor(total / 10) * Number(punctePer10);

    let card = await Fidelizare.findOne({ utilizatorId: c.clientId });
    if (!card) {
      card = await Fidelizare.create({
        utilizatorId: c.clientId,
        puncteCurent: 0,
        puncteTotal: 0,
        nivelLoyalitate: "bronze",
        reduceriDisponibile: [],
        istoric: [],
      });
    }
    if (points > 0) {
      card.puncteCurent = Number(card.puncteCurent || 0) + points;
      card.puncteTotal = Number(card.puncteTotal || 0) + points;
      card.istoric.push({
        data: new Date(),
        tip: "earn",
        puncte: points,
        sursa: "dev_payment_mock",
        comandaId: c._id,
        descriere: "Dev payment mock",
      });
      await card.save();
    }

    res.json({ ok: true, comandaId: c._id, status: c.status, pointsAdded: points });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/dev-payments/simulate-stripe
// Body: { comandaId }
router.post("/simulate-stripe", async (req, res) => {
  try {
    const { comandaId } = req.body;
    if (!comandaId) return res.status(400).json({ error: "comandaId required" });

    const c = await Comanda.findById(comandaId);
    if (!c) return res.status(404).json({ error: "Comanda nu exista" });

    c.paymentStatus = "paid";
    c.statusPlata = "paid";
    c.status = "confirmata";
    await c.save();
    await activateCutieFromComanda(c);

    const earned = Math.floor((Number(c.total) || 0) * 0.1);
    let card = await Fidelizare.findOne({ utilizatorId: c.clientId });
    if (!card) {
      card = await Fidelizare.create({
        utilizatorId: c.clientId,
        puncteCurent: 0,
        puncteTotal: 0,
        nivelLoyalitate: "bronze",
        reduceriDisponibile: [],
        istoric: [],
      });
    }
    if (earned > 0) {
      card.puncteCurent = (card.puncteCurent || 0) + earned;
      card.puncteTotal = (card.puncteTotal || 0) + earned;
      card.istoric = Array.isArray(card.istoric)
        ? [...card.istoric, { data: new Date(), tip: "earn", puncte: earned, sursa: "dev_simulate_stripe", comandaId: c._id }]
        : [{ data: new Date(), tip: "earn", puncte: earned }];
      await card.save();
    }

    res.json({ ok: true, comandaId: c._id, earned });
  } catch (e) {
    console.error("simulate-stripe error", e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
