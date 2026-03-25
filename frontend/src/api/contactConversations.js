import api from "/src/lib/api.js";

export async function createContactConversation(payload) {
  const response = await api.post("/contact", payload);
  return response.data;
}

export async function listAdminContactConversations(params = {}) {
  const response = await api.get("/contact", { params });
  return response.data;
}

export async function listMyContactConversations(params = {}) {
  const response = await api.get("/contact/mine", { params });
  return response.data;
}

export async function getContactConversation(conversationId) {
  const response = await api.get(`/contact/${encodeURIComponent(conversationId)}`);
  return response.data;
}

export async function getContactConversationMessages(conversationId) {
  const response = await api.get(`/contact/${encodeURIComponent(conversationId)}/messages`);
  return response.data;
}

export async function sendContactConversationMessage(conversationId, mesaj) {
  const response = await api.post(`/contact/${encodeURIComponent(conversationId)}/messages`, {
    mesaj,
  });
  return response.data;
}

export async function updateContactConversationStatus(conversationId, status) {
  const response = await api.patch(`/contact/${encodeURIComponent(conversationId)}/status`, {
    status,
  });
  return response.data;
}
