const router = require("express").Router();
const Stripe = require("stripe");
const Comanda = require("../models/Comanda");
const { authRequired } = require("../middleware/auth");
const { activateCutieFromComanda } = require("../utils/subscriptions");

const STRIPE_KEY =
  process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET || process.env.STRIPE_SK;
const STRIPE_MODE = STRIPE_KEY?.startsWith("sk_live") ? "live" : "test";
const stripe = STRIPE_KEY
  ? new Stripe(STRIPE_KEY, { apiVersion: "2023-10-16" })
  : null;
const stripeEnabled = Boolean(stripe);

const BASE_CLIENT_URL = process.env.BASE_CLIENT_URL || "http://localhost:5173";
const ALLOWED_CURRENCIES = ["mdl", "usd", "eur"];

function normalizeCurrency(currency) {
  const cur = String(currency || "").toLowerCase();
  return ALLOWED_CURRENCIES.includes(cur) ? cur : null;
}

function getOrderTotal(comanda) {
  if (!comanda) return 0;
  const totalFinal = Number(comanda.totalFinal || 0);
  if (totalFinal > 0) return totalFinal;
  return Number(comanda.total || 0);
}

function isStaffRole(role) {
  return ["admin", "patiser", "prestator"].includes(String(role || ""));
}

function getAuthUserId(req) {
  return String(req.user?.id || req.user?._id || "");
}

function ensureStripeConfigured(res) {
  if (stripeEnabled) return true;
  res.status(503).json({
    message: "Stripe not configured. Use fallback payment confirmation.",
    code: "stripe_not_configured",
  });
  return false;
}

async function markOrderPaid(comanda, note) {
  if (!comanda) return null;
  comanda.paymentStatus = "paid";
  comanda.statusPlata = "paid";
  if (["plasata", "in_asteptare", "inregistrata"].includes(comanda.status)) {
    comanda.status = "confirmata";
  }
  comanda.statusHistory = Array.isArray(comanda.statusHistory)
    ? [...comanda.statusHistory, { status: "paid", note }]
    : [{ status: "paid", note }];
  await comanda.save();
  await activateCutieFromComanda(comanda);
  return comanda;
}

// POST /api/stripe/payment-intent  { amount, currency, orderId }
router.post("/payment-intent", async (req, res) => {
  try {
    if (!ensureStripeConfigured(res)) return;

    const { amount, currency = "mdl", orderId } = req.body;
    let numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      if (orderId) {
        const comanda = await Comanda.findById(orderId).lean();
        numAmount = getOrderTotal(comanda);
      }
    }
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: "amount must be > 0" });
    }

    const cur = normalizeCurrency(currency);
    if (!cur) {
      return res
        .status(400)
        .json({ message: `currency not allowed (${ALLOWED_CURRENCIES.join(",")})` });
    }

    const pi = await stripe.paymentIntents.create({
      amount: Math.round(numAmount * 100),
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

// POST /api/stripe/create-payment-intent  { amount (cents), currency, comandaId }
router.post("/create-payment-intent", async (req, res) => {
  try {
    if (!ensureStripeConfigured(res)) return;

    const { amount, amountCents, currency = "mdl", comandaId, orderId } = req.body || {};
    const cur = normalizeCurrency(currency);
    if (!cur) {
      return res
        .status(400)
        .json({ message: `currency not allowed (${ALLOWED_CURRENCIES.join(",")})` });
    }

    let cents = Number(amountCents ?? amount);
    if (!Number.isFinite(cents) || cents <= 0) {
      const id = comandaId || orderId;
      if (id) {
        const comanda = await Comanda.findById(id).lean();
        const total = getOrderTotal(comanda);
        cents = Math.round(total * 100);
      }
    }
    if (!Number.isFinite(cents) || cents <= 0) {
      return res.status(400).json({ message: "amount must be > 0" });
    }

    const pi = await stripe.paymentIntents.create({
      amount: Math.max(50, Math.round(cents)),
      currency: cur,
      metadata: { orderId: comandaId || orderId || "" },
      automatic_payment_methods: { enabled: true },
    });

    res.json({ clientSecret: pi.client_secret, mode: STRIPE_MODE });
  } catch (e) {
    console.error("create-payment-intent error:", e.message);
    res.status(500).json({ message: e.message || "Stripe error" });
  }
});

// POST /api/stripe/checkout-session
router.post("/checkout-session", async (req, res) => {
  if (!ensureStripeConfigured(res)) return;

  const { orderId, items = [], successUrl, cancelUrl, currency = "mdl" } = req.body;
  const cur = normalizeCurrency(currency);
  if (!cur) {
    return res
      .status(400)
      .json({ message: `currency not allowed (${ALLOWED_CURRENCIES.join(",")})` });
  }

  const lineItems = (items || []).map((it) => ({
    quantity: it.qty || 1,
    price_data: {
      currency: cur,
      unit_amount: Math.round(Number(it.price || 0) * 100),
      product_data: { name: it.name || "Produs" },
    },
  }));

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    client_reference_id: orderId || undefined,
    metadata: { orderId: orderId || "" },
    success_url:
      successUrl ||
      `${BASE_CLIENT_URL}/plata/succes?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl || `${BASE_CLIENT_URL}/plata/eroare`,
  });

  res.json({ id: session.id, url: session.url, mode: STRIPE_MODE });
});

// POST /api/stripe/create-checkout-session/:comandaId
router.post("/create-checkout-session/:comandaId", async (req, res) => {
  try {
    if (!ensureStripeConfigured(res)) return;

    const { comandaId } = req.params;
    const { currency = "mdl", successUrl, cancelUrl } = req.body || {};
    const cur = normalizeCurrency(currency);
    if (!cur) {
      return res
        .status(400)
        .json({ message: `currency not allowed (${ALLOWED_CURRENCIES.join(",")})` });
    }

    const comanda = await Comanda.findById(comandaId).lean();
    if (!comanda) return res.status(404).json({ message: "Comanda inexistenta" });

    const total = getOrderTotal(comanda);
    if (total <= 0) {
      return res.status(400).json({ message: "Total invalid pentru comanda" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: cur,
            unit_amount: Math.round(total * 100),
            product_data: {
              name: `Comanda ${comanda.numeroComanda || comanda._id}`,
            },
          },
        },
      ],
      client_reference_id: comandaId,
      metadata: { orderId: comandaId },
      success_url:
        successUrl ||
        `${BASE_CLIENT_URL}/plata/succes?comandaId=${encodeURIComponent(comandaId)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:
        cancelUrl ||
        `${BASE_CLIENT_URL}/plata/eroare?c=${encodeURIComponent(comandaId)}`,
    });

    res.json({ id: session.id, url: session.url, mode: STRIPE_MODE });
  } catch (e) {
    console.error("create-checkout-session error:", e.message);
    res.status(500).json({ message: e.message || "Stripe error" });
  }
});

// POST /api/stripe/confirm-payment
// Body: { paymentIntentId, comandaId? }
router.post("/confirm-payment", async (req, res) => {
  try {
    if (!ensureStripeConfigured(res)) return;

    const { paymentIntentId, comandaId } = req.body || {};
    if (!paymentIntentId) {
      return res.status(400).json({ message: "paymentIntentId missing" });
    }

    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (!pi || pi.status !== "succeeded") {
      return res.status(409).json({ message: "Payment not confirmed" });
    }

    const orderId =
      comandaId || pi.metadata?.orderId || pi.metadata?.order_id || null;
    if (!orderId) {
      return res.status(400).json({ message: "orderId missing" });
    }

    const comanda = await Comanda.findById(orderId);
    if (!comanda) return res.status(404).json({ message: "Comanda inexistenta" });

    await markOrderPaid(comanda, "Stripe payment confirmed (manual)");
    res.json({ ok: true, orderId, status: comanda.status });
  } catch (e) {
    console.error("confirm-payment error:", e.message);
    res.status(500).json({ message: e.message || "Stripe error" });
  }
});

// POST /api/stripe/confirm-session
// Body: { sessionId, comandaId? }
router.post("/confirm-session", async (req, res) => {
  try {
    if (!ensureStripeConfigured(res)) return;

    const { sessionId, comandaId } = req.body || {};
    if (!sessionId) {
      return res.status(400).json({ message: "sessionId missing" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session || session.payment_status !== "paid") {
      return res.status(409).json({ message: "Payment not confirmed" });
    }

    const orderId =
      comandaId || session.metadata?.orderId || session.client_reference_id || null;
    if (!orderId) {
      return res.status(400).json({ message: "orderId missing" });
    }

    const comanda = await Comanda.findById(orderId);
    if (!comanda) return res.status(404).json({ message: "Comanda inexistenta" });

    await markOrderPaid(comanda, "Stripe session confirmed (manual)");
    res.json({ ok: true, orderId, status: comanda.status });
  } catch (e) {
    console.error("confirm-session error:", e.message);
    res.status(500).json({ message: e.message || "Stripe error" });
  }
});

// POST /api/stripe/fallback-confirm
// Body: { comandaId }
router.post("/fallback-confirm", authRequired, async (req, res) => {
  try {
    const comandaId = String(req.body?.comandaId || "").trim();
    if (!comandaId) {
      return res.status(400).json({ message: "comandaId missing" });
    }

    const comanda = await Comanda.findById(comandaId);
    if (!comanda) return res.status(404).json({ message: "Comanda inexistenta" });

    const role = req.user?.rol || req.user?.role;
    const staff = isStaffRole(role);
    const authUserId = getAuthUserId(req);
    if (!staff && String(comanda.clientId || "") !== authUserId) {
      return res.status(403).json({ message: "Acces interzis la aceasta comanda." });
    }

    await markOrderPaid(comanda, "Fallback payment confirmed");
    res.json({
      ok: true,
      fallback: true,
      orderId: comanda._id,
      status: comanda.status,
      paymentStatus: comanda.paymentStatus,
    });
  } catch (e) {
    console.error("fallback-confirm error:", e.message);
    res.status(500).json({ message: e.message || "Payment fallback error" });
  }
});

// DEBUG ROUTE: GET /api/stripe/webhook-test
router.get("/webhook-test", (_req, res) => {
  const hasSecret = !!process.env.STRIPE_WEBHOOK_SECRET;
  res.json({
    status: hasSecret && stripeEnabled ? "configured" : "missing config",
    webhook_secret: hasSecret ? "set" : "missing",
    stripe_key: stripeEnabled ? "set" : "missing",
    mode: STRIPE_MODE || "unknown",
    fallbackAvailable: true,
    instructions: [
      "1. Ensure .env has STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET",
      "2. Run: stripe listen --forward-to localhost:5000/api/stripe/webhook",
      "3. Trigger test event: stripe trigger checkout.session.completed",
      "4. Check backend logs for [stripe webhook] messages",
    ],
  });
});

// GET /api/stripe/config
router.get("/config", (_req, res) => {
  res.json({
    mode: STRIPE_MODE || "unknown",
    enabled: stripeEnabled,
    fallbackAvailable: true,
    webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
    publishable: process.env.STRIPE_PUBLISHABLE_KEY ? "present" : "missing",
    rotateHint:
      "Stripe Dashboard -> Developers -> API Keys -> New Secret Key -> seteaza STRIPE_SECRET_KEY -> redeploy -> dezactiveaza cheia veche.",
  });
});

// GET /api/stripe/status
router.get("/status", (_req, res) => {
  res.json({
    mode: STRIPE_MODE || "unknown",
    enabled: stripeEnabled,
    fallbackAvailable: true,
    webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
    publishable: process.env.STRIPE_PUBLISHABLE_KEY ? "present" : "missing",
  });
});

module.exports = router;
