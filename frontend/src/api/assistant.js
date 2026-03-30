import api from "/src/lib/api.js";

export function requestAssistantReply(payload) {
  return api.post("/assistant/reply", payload).then((response) => response.data);
}
