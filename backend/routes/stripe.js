// backend/routes/stripe.js
const router = require("express").Router();
const Stripe = require("stripe");
const Comanda = require("../models/Comanda");

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET || process.env.STRIPE_SK,
  { apiVersion: "2023-10-16" }
);

// POST /api/stripe/payment-intent  { amount, currency, orderId }
router.post("/payment-intent", async (req, res) => {
  const { amount, currency = "mdl", orderId } = req.body;
  if (!amount) return res.status(400).json({ message: "amount required" });

  const pi = await stripe.paymentIntents.create({
    amount: Math.round(Number(amount) * 100), // major units -> minor
    currency,
    metadata: { orderId: orderId || "" },
    automatic_payment_methods: { enabled: true },
  });
  res.json({ clientSecret: pi.client_secret });
});

// (opțional) Checkout Session
router.post("/checkout-session", async (req, res) => {
  const { orderId, items = [], successUrl, cancelUrl } = req.body;
  const line_items = (items || []).map((it) => ({
    quantity: it.qty || 1,
    price_data: {
      currency: "mdl",
      unit_amount: Math.round(Number(it.price || 0) * 100),
      product_data: { name: it.name || "Produs" },
    },
  }));
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items,
    client_reference_id: orderId || undefined,
    metadata: { orderId: orderId || "" },
    success_url: successUrl || "http://localhost:5173/success",
    cancel_url: cancelUrl || "http://localhost:5173/cancel",
  });
  res.json({ id: session.id, url: session.url });
});

module.exports = router;
