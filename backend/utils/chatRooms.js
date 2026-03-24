const { isAdminRole, isProviderRole, normalizeUserRole } = require("./roles");

function normalizeId(value) {
  return String(value || "").trim();
}

function buildConversationRoom({ clientId, prestatorId }) {
  const normalizedClientId = normalizeId(clientId);
  const normalizedPrestatorId = normalizeId(prestatorId);
  if (!normalizedClientId || !normalizedPrestatorId) {
    return "";
  }
  return `provider:${normalizedPrestatorId}::client:${normalizedClientId}`;
}

function parseConversationRoom(room) {
  const normalizedRoom = normalizeId(room);
  if (!normalizedRoom) {
    return { room: "", type: "unknown", clientId: "", prestatorId: "" };
  }

  if (normalizedRoom.startsWith("user-")) {
    return {
      room: normalizedRoom,
      type: "legacy-client",
      clientId: normalizedRoom.slice(5),
      prestatorId: "",
    };
  }

  const match = normalizedRoom.match(/^provider:([^:]+)::client:([^:]+)$/);
  if (!match) {
    return {
      room: normalizedRoom,
      type: "unknown",
      clientId: "",
      prestatorId: "",
    };
  }

  return {
    room: normalizedRoom,
    type: "provider-client",
    prestatorId: normalizeId(match[1]),
    clientId: normalizeId(match[2]),
  };
}

function canAccessConversationRoom(user, room) {
  const details = parseConversationRoom(room);
  const userId = normalizeId(user?._id || user?.id);
  const role = normalizeUserRole(user?.rol || user?.role);

  if (!details.room || !userId) return false;
  if (isAdminRole(role)) return true;
  if (isProviderRole(role)) {
    return details.type === "provider-client" && details.prestatorId === userId;
  }
  if (details.type === "provider-client") {
    return details.clientId === userId;
  }
  if (details.type === "legacy-client") {
    return details.clientId === userId;
  }
  return false;
}

module.exports = {
  buildConversationRoom,
  canAccessConversationRoom,
  parseConversationRoom,
};
