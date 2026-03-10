const router = require("express").Router();
const Stripe = require("stripe");
const Comanda = require("../models/Comanda");
const { authRequired } = require("../middleware/auth");
const { activateCutieFromComanda } = require("../utils/subscriptions");

const STRIPE_KEY =
  process.env.STRIPE_SECRET_KEY ||
  process.env.STRIPE_SECRET ||
  process.env.STRIPE_SK;
const STRIPE_MODE = STRIPE_KEY?.startsWith("sk_live") ? "live" : "test";
const stripe = STRIPE_KEY
  ? new Stripe(STRIPE_KEY, { apiVersion: "2023-10-16" })
  : null;
const stripeEnabled = Boolean(stripe);
const fallbackAllowed = process.env.NODE_ENV !== "production" && !stripeEnabled;

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

function canAccessOrder(req, comanda) {
  const role = req.user?.rol || req.user?.role;
  if (isStaffRole(role)) return true;
  return String(comanda?.clientId || "") === getAuthUserId(req);
}

async function findAuthorizedOrder(req, res, orderId) {
  const normalizedId = String(orderId || "").trim();
  if (!normalizedId) {
    res.status(400).json({ message: "comandaId missing" });
    return null;
  }

  const comanda = await Comanda.findById(normalizedId);
  if (!comanda) {
    res.status(404).json({ message: "Comanda inexistenta" });
    return null;
  }

  if (!canAccessOrder(req, comanda)) {
    res.status(403).json({ message: "Acces interzis la aceasta comanda." });
    return null;
  }

  return comanda;
}

function ensureStripeConfigured(res) {
  if (stripeEnabled) return true;
  res.status(503).json({
    message: "Stripe not configured.",
    code: "stripe_not_configured",
  });
  return false;
}

async function markOrderPaid(comanda, note) {
  if (!comanda) return null;
  const alreadyPaid =
    comanda.paymentStatus === "paid" || comanda.statusPlata === "paid";
  if (alreadyPaid) return comanda;

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

function buildCheckoutSessionFromOrder(comanda, currency, successUrl, cancelUrl) {
  const total = getOrderTotal(comanda);
  return stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: Math.round(total * 100),
          product_data: {
            name: `Comanda ${comanda.numeroComanda || comanda._id}`,
          },
        },
      },
    ],
    client_reference_id: String(comanda._id),
    metadata: { orderId: String(comanda._id) },
    success_url:
      successUrl ||
      `${BASE_CLIENT_URL}/plata/succes?comandaId=${encodeURIComponent(
        comanda._id
      )}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:
      cancelUrl ||
      `${BASE_CLIENT_URL}/plata/eroare?c=${encodeURIComponent(comanda._id)}`,
  });
}

router.post("/payment-intent", authRequired, async (req, res) => {
  try {
    if (!ensureStripeConfigured(res)) return;

    const { currency = "mdl", orderId, comandaId } = req.body || {};
    const comanda = await findAuthorizedOrder(req, res, orderId || comandaId);
    if (!comanda) return;

    const amount = getOrderTotal(comanda);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Total invalid pentru comanda" });
    }

    const cur = normalizeCurrency(currency);
    if (!cur) {
      return res
        .status(400)
        .json({ message: `currency not allowed (${ALLOWED_CURRENCIES.join(",")})` });
    }

    const pi = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: cur,
      metadata: { orderId: String(comanda._id) },
      automatic_payment_methods: { enabled: true },
    });

    res.json({ clientSecret: pi.client_secret, mode: STRIPE_MODE });
  } catch (e) {
    console.error("payment-intent error:", e.message);
    res.status(500).json({ message: e.message || "Stripe error" });
  }
});

router.post("/create-payment-intent", authRequired, async (req, res) => {
  try {
    if (!ensureStripeConfigured(res)) return;

    const { currency = "mdl", comandaId, orderId } = req.body || {};
    const comanda = await findAuthorizedOrder(req, res, comandaId || orderId);
    if (!comanda) return;

    const cur = normalizeCurrency(currency);
    if (!cur) {
      return res
        .status(400)
        .json({ message: `currency not allowed (${ALLOWED_CURRENCIES.join(",")})` });
    }

    const total = getOrderTotal(comanda);
    const cents = Math.round(total * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      return res.status(400).json({ message: "Total invalid pentru comanda" });
    }

    const pi = await stripe.paymentIntents.create({
      amount: Math.max(50, cents),
      currency: cur,
      metadata: { orderId: String(comanda._id) },
      automatic_payment_methods: { enabled: true },
    });

    res.json({ clientSecret: pi.client_secret, mode: STRIPE_MODE });
  } catch (e) {
    console.error("create-payment-intent error:", e.message);
    res.status(500).json({ message: e.message || "Stripe error" });
  }
});

router.post("/checkout-session", authRequired, async (req, res) => {
  try {
    if (!ensureStripeConfigured(res)) return;

    const { orderId, comandaId, successUrl, cancelUrl, currency = "mdl" } =
      req.body || {};
    const comanda = await findAuthorizedOrder(req, res, orderId || comandaId);
    if (!comanda) return;

    const cur = normalizeCurrency(currency);
    if (!cur) {
      return res
        .status(400)
        .json({ message: `currency not allowed (${ALLOWED_CURRENCIES.join(",")})` });
    }

    const total = getOrderTotal(comanda);
    if (total <= 0) {
      return res.status(400).json({ message: "Total invalid pentru comanda" });
    }

    const session = await buildCheckoutSessionFromOrder(
      comanda,
      cur,
      successUrl,
      cancelUrl
    );

    res.json({ id: session.id, url: session.url, mode: STRIPE_MODE });
  } catch (e) {
    console.error("checkout-session error:", e.message);
    res.status(500).json({ message: e.message || "Stripe error" });
  }
});

router.post("/create-checkout-session/:comandaId", authRequired, async (req, res) => {
  try {
    if (!ensureStripeConfigured(res)) return;

    const { comandaId } = req.params;
    const { currency = "mdl", successUrl, cancelUrl } = req.body || {};
    const comanda = await findAuthorizedOrder(req, res, comandaId);
    if (!comanda) return;

    const cur = normalizeCurrency(currency);
    if (!cur) {
      return res
        .status(400)
        .json({ message: `currency not allowed (${ALLOWED_CURRENCIES.join(",")})` });
    }

    const total = getOrderTotal(comanda);
    if (total <= 0) {
      return res.status(400).json({ message: "Total invalid pentru comanda" });
    }

    const session = await buildCheckoutSessionFromOrder(
      comanda,
      cur,
      successUrl,
      cancelUrl
    );

    res.json({ id: session.id, url: session.url, mode: STRIPE_MODE });
  } catch (e) {
    console.error("create-checkout-session error:", e.message);
    res.status(500).json({ message: e.message || "Stripe error" });
  }
});

router.post("/confirm-payment", authRequired, async (req, res) => {
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

    const orderId = pi.metadata?.orderId || pi.metadata?.order_id || null;
    if (!orderId) {
      return res.status(400).json({ message: "orderId missing in payment metadata" });
    }
    if (comandaId && String(comandaId) !== String(orderId)) {
      return res.status(409).json({ message: "Payment confirmation does not match the requested order." });
    }

    const comanda = await findAuthorizedOrder(req, res, orderId);
    if (!comanda) return;

    await markOrderPaid(comanda, "Stripe payment confirmed (manual)");
    res.json({ ok: true, orderId: comanda._id, status: comanda.status });
  } catch (e) {
    console.error("confirm-payment error:", e.message);
    res.status(500).json({ message: e.message || "Stripe error" });
  }
});

router.post("/confirm-session", authRequired, async (req, res) => {
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
      session.metadata?.orderId || session.client_reference_id || null;
    if (!orderId) {
      return res.status(400).json({ message: "orderId missing in session metadata" });
    }
    if (comandaId && String(comandaId) !== String(orderId)) {
      return res.status(409).json({ message: "Session confirmation does not match the requested order." });
    }

    const comanda = await findAuthorizedOrder(req, res, orderId);
    if (!comanda) return;

    await markOrderPaid(comanda, "Stripe session confirmed (manual)");
    res.json({ ok: true, orderId: comanda._id, status: comanda.status });
  } catch (e) {
    console.error("confirm-session error:", e.message);
    res.status(500).json({ message: e.message || "Stripe error" });
  }
});

router.post("/fallback-confirm", authRequired, async (req, res) => {
  try {
    if (!fallbackAllowed) {
      return res.status(403).json({
        message: "Fallback payment confirmation is disabled.",
      });
    }

    const comanda = await findAuthorizedOrder(req, res, req.body?.comandaId);
    if (!comanda) return;

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

router.get("/webhook-test", (_req, res) => {
  const hasSecret = !!process.env.STRIPE_WEBHOOK_SECRET;
  res.json({
    status: hasSecret && stripeEnabled ? "configured" : "missing config",
    webhook_secret: hasSecret ? "set" : "missing",
    stripe_key: stripeEnabled ? "set" : "missing",
    mode: STRIPE_MODE || "unknown",
    fallbackAvailable: fallbackAllowed,
    instructions: [
      "1. Ensure .env has STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET",
      "2. Run: stripe listen --forward-to localhost:5000/api/stripe/webhook",
      "3. Trigger test event: stripe trigger checkout.session.completed",
      "4. Check backend logs for [stripe webhook] messages",
    ],
  });
});

router.get("/config", (_req, res) => {
  res.json({
    mode: STRIPE_MODE || "unknown",
    enabled: stripeEnabled,
    fallbackAvailable: fallbackAllowed,
    webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
    publishable: process.env.STRIPE_PUBLISHABLE_KEY ? "present" : "missing",
    rotateHint:
      "Stripe Dashboard -> Developers -> API Keys -> New Secret Key -> seteaza STRIPE_SECRET_KEY -> redeploy -> dezactiveaza cheia veche.",
  });
});

router.get("/status", (_req, res) => {
  res.json({
    mode: STRIPE_MODE || "unknown",
    enabled: stripeEnabled,
    fallbackAvailable: fallbackAllowed,
    webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
    publishable: process.env.STRIPE_PUBLISHABLE_KEY ? "present" : "missing",
  });
});

module.exports = router;
