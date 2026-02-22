const fs = require("fs");
const path = require("path");
const webPush = require("web-push");
const PushSubscription = require("../models/PushSubscription");

const ENV_VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const ENV_VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:contact@localhost";
const GENERATED_VAPID_FILE = path.join(__dirname, "..", ".generated-vapid.json");

function readGeneratedKeys() {
  try {
    if (!fs.existsSync(GENERATED_VAPID_FILE)) return null;
    const parsed = JSON.parse(fs.readFileSync(GENERATED_VAPID_FILE, "utf8"));
    if (parsed?.publicKey && parsed?.privateKey) {
      return {
        publicKey: parsed.publicKey,
        privateKey: parsed.privateKey,
        source: "generated_file",
      };
    }
  } catch (e) {
    console.warn("Failed to read generated VAPID keys:", e?.message || e);
  }
  return null;
}

function writeGeneratedKeys(keys) {
  try {
    fs.writeFileSync(GENERATED_VAPID_FILE, JSON.stringify(keys, null, 2), "utf8");
  } catch (e) {
    console.warn("Failed to persist generated VAPID keys:", e?.message || e);
  }
}

function resolveVapidKeys() {
  if (ENV_VAPID_PUBLIC_KEY && ENV_VAPID_PRIVATE_KEY) {
    return {
      publicKey: ENV_VAPID_PUBLIC_KEY,
      privateKey: ENV_VAPID_PRIVATE_KEY,
      source: "env",
    };
  }

  const fromFile = readGeneratedKeys();
  if (fromFile) return fromFile;

  try {
    const generated = webPush.generateVAPIDKeys();
    writeGeneratedKeys(generated);
    return {
      publicKey: generated.publicKey,
      privateKey: generated.privateKey,
      source: "generated_runtime",
    };
  } catch (e) {
    console.warn("Unable to generate VAPID keys:", e?.message || e);
    return { publicKey: "", privateKey: "", source: "missing" };
  }
}

const runtimeVapid = resolveVapidKeys();

if (runtimeVapid.publicKey && runtimeVapid.privateKey) {
  webPush.setVapidDetails(VAPID_SUBJECT, runtimeVapid.publicKey, runtimeVapid.privateKey);
}

function hasVapidConfig() {
  return Boolean(runtimeVapid.publicKey && runtimeVapid.privateKey);
}

function getPublicKey() {
  return runtimeVapid.publicKey || null;
}

function getVapidSource() {
  return runtimeVapid.source || "missing";
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
  getVapidSource,
  saveSubscription,
  removeSubscription,
  sendPushToUser,
};
