import api from "/src/lib/api.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export async function listMyNotifications(limit = 8) {
  const { data } = await api.get("/notificari/me", {
    params: limit ? { limit } : undefined,
  });
  return asArray(data);
}

export async function listMyPhotoNotifications(userId, limit = 8) {
  const { data } = await api.get(`/notificari-foto/${userId}`, {
    params: limit ? { limit } : undefined,
  });
  return asArray(data);
}

export async function markNotificationRead(notificationId) {
  const { data } = await api.put(`/notificari/${notificationId}/citita`);
  return data;
}

export async function markPhotoNotificationRead(notificationId) {
  const { data } = await api.put(`/notificari-foto/citeste/${notificationId}`);
  return data;
}

export async function markAllNotificationsRead() {
  const { data } = await api.put("/notificari/citite");
  return data;
}

export async function markAllPhotoNotificationsRead(userId) {
  const { data } = await api.put(`/notificari-foto/citite/${userId}`);
  return data;
}
