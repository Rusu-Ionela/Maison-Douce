// backend/routes/stripe.js
const router = require("express").Router();
const Stripe = require("stripe");
const Comanda = require("../models/Comanda");

const STRIPE_KEY =
  process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET || process.env.STRIPE_SK;
const STRIPE_MODE = STRIPE_KEY?.startsWith("sk_live") ? "live" : "test";
const stripe = STRIPE_KEY
  ? new Stripe(STRIPE_KEY, { apiVersion: "2023-10-16" })
  : null;

// POST /api/stripe/payment-intent  { amount, currency, orderId }
router.post("/payment-intent", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ message: "Stripe key missing" });
    }
    const { amount, currency = "mdl", orderId } = req.body;
    const numAmount = Number(amount);
    const allowedCurrencies = ["mdl", "usd", "eur"];
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: "amount must be > 0" });
    }
    const cur = String(currency || "").toLowerCase();
    if (!allowedCurrencies.includes(cur)) {
      return res
        .status(400)
        .json({ message: `currency not allowed (${allowedCurrencies.join(",")})` });
    }

    const pi = await stripe.paymentIntents.create({
      amount: Math.round(numAmount * 100), // major units -> minor
      currency: cur,
      metadata: { orderId: orderId || "" },
      automatic_payment_methods: { enabled: true },
    });
    res.json({ clientSecret: pi.client_secret, mode: STRIPE_MODE });
  } catch (e) {
    console.error("payment-intent error:", e.message);
    res.status(500).json({ message: e.message || "Stripe error" });
  }
});

// (opE>ional) Checkout Session
router.post("/checkout-session", async (req, res) => {
  if (!stripe) {
    return res.status(500).json({ message: "Stripe key missing" });
  }
  const { orderId, items = [], successUrl, cancelUrl, currency = "mdl" } = req.body;
  const cur = String(currency || "").toLowerCase();
  const line_items = (items || []).map((it) => ({
    quantity: it.qty || 1,
    price_data: {
      currency: cur,
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
  res.json({ id: session.id, url: session.url, mode: STRIPE_MODE });
});

/**
 * DEBUG ROUTE: GET /api/stripe/webhook-test
 * Only for local testing with Stripe CLI.
 * Shows webhook config status.
 */
router.get("/webhook-test", (req, res) => {
  const hasSecret = !!process.env.STRIPE_WEBHOOK_SECRET;
  const hasKey = !!STRIPE_KEY;
  res.json({
    status: hasSecret && hasKey ? "configured" : "missing config",
    webhook_secret: hasSecret ? "set" : "missing",
    stripe_key: hasKey ? "set" : "missing",
    mode: STRIPE_MODE || "unknown",
    instructions: [
      "1. Ensure .env has STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET",
      "2. Run: stripe listen --forward-to localhost:5000/api/stripe/webhook",
      "3. Trigger test event: stripe trigger checkout.session.completed",
      "4. Check backend logs for [stripe webhook] messages",
    ],
  });
});

// GET /api/stripe/config -> info (live/test) pentru sanity check si rotaE>ie
router.get("/config", (_req, res) => {
  res.json({
    mode: STRIPE_MODE || "unknown",
    webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
    publishable: process.env.STRIPE_PUBLISHABLE_KEY ? "present" : "missing",
    rotateHint:
      "Stripe Dashboard -> Developers -> API Keys -> New Secret Key -> seteazŽŸ STRIPE_SECRET_KEY -> redeploy -> dezactiveazŽŸ cheia veche.",
  });
});

module.exports = router;
