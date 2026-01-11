import api from "/src/lib/api.js";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function getRegistration() {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register("/sw.js");
}

export async function getPushSubscription() {
  const reg = await getRegistration();
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

export async function subscribePush() {
  const reg = await getRegistration();
  if (!reg) return { ok: false, reason: "no-sw" };

  const res = await api.get("/push/public-key").catch(() => null);
  const publicKey = res?.data?.publicKey;
  if (!publicKey) return { ok: false, reason: "no-vapid" };

  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  await api.post("/push/subscribe", subscription);
  return { ok: true, subscription };
}

export async function unsubscribePush() {
  const sub = await getPushSubscription();
  if (!sub) return { ok: true };
  await api.post("/push/unsubscribe", { endpoint: sub.endpoint });
  await sub.unsubscribe();
  return { ok: true };
}
