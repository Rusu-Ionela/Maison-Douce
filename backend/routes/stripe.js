// backend/routes/stripe.js
const express = require("express");
const router = express.Router();

const Stripe = require("stripe");
const stripeKey =
  process.env.STRIPE_SECRET_KEY ||
  process.env.STRIPE_SECRET ||
  process.env.STRIPE_SK ||
  "";
const hasStripe = !!stripeKey;
const stripe = hasStripe ? new Stripe(stripeKey, { apiVersion: "2023-10-16" }) : null;

const DEFAULT_CURRENCY =
  process.env.STRIPE_CURRENCY && process.env.STRIPE_CURRENCY.trim()
    ? process.env.STRIPE_CURRENCY.trim().toLowerCase()
    : "usd"; // MDL nu e suportat de Stripe; pentru test folosește "usd" sau "eur"

router.get("/status", (_req, res) => {
  if (!hasStripe) return res.status(503).json({ ok: false, error: "Stripe not configured" });
  res.json({ ok: true, currency: DEFAULT_CURRENCY });
});

// POST /api/stripe/create-checkout-session/:comandaId
router.post("/create-checkout-session/:comandaId", async (req, res) => {
  try {
    if (!hasStripe) return res.status(400).json({ message: "Stripe nu e configurat." });

    const Comanda = require("../models/Comanda");
    const comanda = await Comanda.findById(req.params.comandaId);
    if (!comanda) return res.status(404).json({ message: "Comandă inexistentă" });

    const currency = DEFAULT_CURRENCY;

    const line_items = (comanda.items || []).map((it) => ({
      price_data: {
        currency,
        product_data: { name: it.name || it.nume || "Produs" },
        unit_amount: Math.round(Number(it.price || it.pret || 0) * 100),
      },
      quantity: Number(it.qty || it.cantitate || 1),
    }));

    if (Number(comanda.taxaLivrare || 0) > 0) {
      line_items.push({
        price_data: {
          currency,
          product_data: { name: "Taxă livrare" },
          unit_amount: Math.round(Number(comanda.taxaLivrare) * 100),
        },
        quantity: 1,
      });
    }

    const baseClient = process.env.BASE_CLIENT_URL || "http://localhost:5173";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: `${baseClient}/plata/succes?c=${comanda._id}`,
      cancel_url: `${baseClient}/plata/eroare?c=${comanda._id}`,
      metadata: { orderId: comanda._id.toString() },
    });

    res.json({ id: session.id, url: session.url });
  } catch (e) {
    console.error("stripe create-checkout-session error:", e);
    res.status(500).json({ message: e.message });
  }
});

// POST /api/stripe/create-payment-intent
// Acceptă fie { comandaId }, fie { amount, currency }
router.post("/create-payment-intent", async (req, res) => {
  try {
    if (!hasStripe) return res.status(400).json({ message: "Stripe nu e configurat." });

    const { comandaId, amount, currency } = req.body;
    let totalCents = 0;
    let usedCurrency = (currency || DEFAULT_CURRENCY).toLowerCase();

    if (comandaId) {
      const Comanda = require("../models/Comanda");
      const comanda = await Comanda.findById(comandaId);
      if (!comanda) return res.status(404).json({ message: "Comandă inexistentă" });

      const itemsTotal =
        (comanda.items || []).reduce((s, it) => s + Number(it.price || it.pret || 0) * Number(it.qty || it.cantitate || 1), 0) || 0;
      const livrare = Number(comanda.taxaLivrare || 0);
      const total = Number(comanda.total || itemsTotal + livrare); // preferă total dacă e setat
      totalCents = Math.max(0, Math.round(total * 100));
    } else {
      // Fallback: acceptă amount din client (doar DEV)
      const amt = Number(amount || 0);
      if (!amt || amt <= 0) return res.status(400).json({ message: "Amount invalid." });
      totalCents = Math.round(amt);
      if (totalCents < 50) totalCents = 50; // stripe min pe tranzacție
    }

    const intent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: usedCurrency,
      automatic_payment_methods: { enabled: true },
      metadata: comandaId ? { orderId: comandaId } : {},
    });

    res.json({ clientSecret: intent.client_secret });
  } catch (e) {
    console.error("stripe create-payment-intent error:", e);
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
