const express = require("express");
const router = express.Router();
const MesajChat = require("../models/MesajChat");
const { authRequired, roleCheck } = require("../middleware/auth");
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
  const text = String(body.text || "").trim() || "Fisier atasat";
  const room = String(body.room || "").trim();
  const details = parseConversationRoom(room);
  const authorId = String(req.user?._id || req.user?.id || "");
  const role = normalizeUserRole(req.user?.rol || req.user?.role);

  return {
    text,
    data: new Date(),
    utilizator: getDisplayName(req),
    rol: role,
    room,
    authorId,
    fileUrl: body.fileUrl ? String(body.fileUrl) : "",
    fileName: body.fileName ? String(body.fileName) : "",
    clientId: details.clientId || "",
    prestatorId: details.prestatorId || "",
    participantIds: [details.clientId, details.prestatorId].filter(Boolean),
  };
}

async function notifyConversationParticipants(message) {
  if (!message?.room) return;
  const role = normalizeUserRole(message.rol);
  if (!message.clientId || !message.prestatorId) return;

  if (role === "client") {
    await notifyProviderById(message.prestatorId, {
      titlu: "Mesaj nou de la client",
      mesaj: `${message.utilizator || "Client"} a trimis un mesaj nou.`,
      tip: "chat",
      link: "/chat/utilizatori",
      prestatorId: message.prestatorId,
      actorId: message.authorId,
      actorRole: role,
      meta: {
        room: message.room,
        clientId: message.clientId,
      },
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
    actorRole: role,
    meta: {
      room: message.room,
      clientId: message.clientId,
    },
  });
}

router.get("/", authRequired, roleCheck("admin", "patiser"), async (req, res) => {
  try {
    const role = normalizeUserRole(req.user?.rol || req.user?.role);
    const userId = String(req.user?._id || req.user?.id || "");
    const filter =
      role === "admin"
        ? {}
        : {
            $or: [{ prestatorId: userId }, { participantIds: userId }],
          };

    const mesaje = await MesajChat.find(filter).sort({ data: 1 }).lean();
    res.json(mesaje);
  } catch (e) {
    console.error("GET /mesaje-chat error:", e);
    res.status(500).json({ message: "Eroare la preluarea mesajelor" });
  }
});

router.get("/room/:room", authRequired, async (req, res) => {
  try {
    const { room } = req.params;
    if (!room) return res.json([]);
    if (!canAccessConversationRoom(req.user, room)) {
      return res.status(403).json({ message: "Acces interzis" });
    }

    const mesaje = await MesajChat.find({ room: String(room) }).sort({ data: 1 }).lean();
    res.json(mesaje);
  } catch (e) {
    console.error("GET /mesaje-chat/room error:", e);
    res.status(500).json({ message: "Eroare la preluarea mesajelor pentru room" });
  }
});

router.post("/", authRequired, async (req, res) => {
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
      io.to(String(room)).emit("receiveMessage", msg.toObject());
    } catch {}

    if (!isStaffRole(payload.rol) || payload.prestatorId) {
      await notifyConversationParticipants(payload);
    }

    res.status(201).json(msg);
  } catch (e) {
    console.error("POST /mesaje-chat error:", e);
    res.status(500).json({ message: "Eroare la salvarea mesajului" });
  }
});

module.exports = router;
