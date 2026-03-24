const MesajChat = require("../models/MesajChat");
const { canAccessConversationRoom, parseConversationRoom } = require("../utils/chatRooms");
const { normalizeUserRole, isStaffRole } = require("../utils/roles");
const { notifyProviderById, notifyUser } = require("../utils/notifications");

function getDisplayName(req) {
  return (
    [req.user?.nume, req.user?.prenume].filter(Boolean).join(" ").trim() ||
    req.user?.email ||
    "Utilizator"
  );
}

function buildMessagePayload(req, body = {}) {
  const room = String(body.room || "").trim();
  const details = parseConversationRoom(room);
  return {
    text: String(body.text || "").trim() || "Fisier atasat",
    data: new Date(),
    utilizator: getDisplayName(req),
    rol: normalizeUserRole(req.user?.rol || req.user?.role),
    authorId: String(req.user?._id || req.user?.id || ""),
    room,
    fileUrl: body.fileUrl ? String(body.fileUrl) : "",
    fileName: body.fileName ? String(body.fileName) : "",
    clientId: details.clientId || "",
    prestatorId: details.prestatorId || "",
    participantIds: [details.clientId, details.prestatorId].filter(Boolean),
  };
}

async function notifyConversationParticipants(message) {
  if (!message?.clientId || !message?.prestatorId) return;
  if (message.rol === "client") {
    await notifyProviderById(message.prestatorId, {
      titlu: "Mesaj nou de la client",
      mesaj: `${message.utilizator || "Client"} a trimis un mesaj nou.`,
      tip: "chat",
      link: "/chat/utilizatori",
      prestatorId: message.prestatorId,
      actorId: message.authorId,
      actorRole: message.rol,
      meta: { room: message.room },
    });
    return;
  }
  await notifyUser(message.clientId, {
    titlu: "Raspuns nou in chat",
    mesaj: `${message.utilizator || "Echipa"} a raspuns in conversatie.`,
    tip: "chat",
    link: "/chat",
    prestatorId: message.prestatorId,
    actorId: message.authorId,
    actorRole: message.rol,
    meta: { room: message.room },
  });
}

exports.sendMessage = async (req, res) => {
  try {
    const { text, room, fileUrl } = req.body || {};
    if (!text && !fileUrl) {
      return res.status(400).json({ message: "Text sau fisier este obligatoriu" });
    }
    if (!room) {
      return res.status(400).json({ message: "Room este obligatoriu." });
    }
    if (!canAccessConversationRoom(req.user, room)) {
      return res.status(403).json({ message: "Acces interzis" });
    }

    const payload = buildMessagePayload(req, req.body || {});
    const msg = await MesajChat.create(payload);

    try {
      const io = require("../socket").getIO();
      io.to(payload.room).emit("receiveMessage", msg.toObject());
    } catch {}

    if (!isStaffRole(payload.rol) || payload.prestatorId) {
      await notifyConversationParticipants(payload);
    }

    res.status(201).json(msg);
  } catch (e) {
    console.error("chat sendMessage error:", e);
    res.status(500).json({ message: "Eroare la salvarea mesajului" });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { room } = req.query || {};
    const role = normalizeUserRole(req.user?.rol || req.user?.role);
    const userId = String(req.user?._id || req.user?.id || "");
    if (room && !canAccessConversationRoom(req.user, room)) {
      return res.status(403).json({ message: "Acces interzis" });
    }
    if (!room && role !== "admin" && role !== "patiser") {
      return res.status(403).json({ message: "Acces interzis" });
    }

    const q = room
      ? { room: String(room) }
      : role === "admin"
      ? {}
      : {
          $or: [{ prestatorId: userId }, { participantIds: userId }],
        };
    const mesaje = await MesajChat.find(q).sort({ data: 1 }).lean();
    res.json(mesaje);
  } catch (e) {
    console.error("chat getMessages error:", e);
    res.status(500).json({ message: "Eroare la preluarea mesajelor" });
  }
};
