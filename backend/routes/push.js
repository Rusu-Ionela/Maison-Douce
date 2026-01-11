const express = require("express");
const router = express.Router();
const { authRequired } = require("../middleware/auth");
const Utilizator = require("../models/Utilizator");
const {
  getPublicKey,
  hasVapidConfig,
  saveSubscription,
  removeSubscription,
  sendPushToUser,
} = require("../utils/push");

// GET /api/push/public-key
router.get("/public-key", (_req, res) => {
  const key = getPublicKey();
  if (!key) return res.status(404).json({ message: "VAPID not configured" });
  res.json({ publicKey: key });
});

// GET /api/push/status
router.get("/status", (_req, res) => {
  res.json({ configured: hasVapidConfig(), publicKey: !!getPublicKey() });
});

// POST /api/push/subscribe
router.post("/subscribe", authRequired, async (req, res) => {
  try {
    const sub = req.body;
    if (!sub?.endpoint) {
      return res.status(400).json({ message: "Subscription invalid" });
    }
    const doc = await saveSubscription(req.user._id, sub);
    await Utilizator.findByIdAndUpdate(req.user._id, {
      $set: { "setariNotificari.push": true },
    });
    res.json({ ok: true, subscriptionId: doc?._id });
  } catch (e) {
    res.status(500).json({ message: "Eroare la abonare push." });
  }
});

// POST /api/push/unsubscribe
router.post("/unsubscribe", authRequired, async (req, res) => {
  try {
    const endpoint = req.body?.endpoint;
    if (!endpoint) return res.status(400).json({ message: "endpoint missing" });
    await removeSubscription(req.user._id, endpoint);
    await Utilizator.findByIdAndUpdate(req.user._id, {
      $set: { "setariNotificari.push": false },
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: "Eroare la dezabonare push." });
  }
});

// POST /api/push/test
router.post("/test", authRequired, async (req, res) => {
  try {
    const sent = await sendPushToUser(req.user._id, {
      title: "Notificare test",
      body: "Push-ul functioneaza.",
      url: "/profil",
    });
    res.json({ ok: true, sent });
  } catch (e) {
    res.status(500).json({ message: "Eroare la trimitere push." });
  }
});

module.exports = router;
