const webPush = require("web-push");
const PushSubscription = require("../models/PushSubscription");

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:contact@localhost";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

function hasVapidConfig() {
  return Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

function getPublicKey() {
  return VAPID_PUBLIC_KEY || null;
}

async function saveSubscription(userId, sub) {
  if (!sub?.endpoint) return null;
  const payload = {
    userId,
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.keys?.p256dh || "",
      auth: sub.keys?.auth || "",
    },
  };

  return PushSubscription.findOneAndUpdate(
    { endpoint: sub.endpoint },
    { $set: payload },
    { new: true, upsert: true }
  );
}

async function removeSubscription(userId, endpoint) {
  if (!endpoint) return null;
  return PushSubscription.deleteOne({ userId, endpoint });
}

async function sendPushToUser(userId, payload) {
  if (!hasVapidConfig()) return false;
  const subs = await PushSubscription.find({ userId }).lean();
  if (!subs.length) return false;

  const data = JSON.stringify(payload || {});
  let sent = false;

  for (const sub of subs) {
    try {
      await webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys?.p256dh,
            auth: sub.keys?.auth,
          },
        },
        data
      );
      sent = true;
    } catch (e) {
      const code = e?.statusCode;
      if (code === 404 || code === 410) {
        await PushSubscription.deleteOne({ endpoint: sub.endpoint });
      }
    }
  }
  return sent;
}

module.exports = {
  hasVapidConfig,
  getPublicKey,
  saveSubscription,
  removeSubscription,
  sendPushToUser,
};
