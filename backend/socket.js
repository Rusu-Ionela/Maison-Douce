let io;
const MesajChat = require("./models/MesajChat");
const Utilizator = require("./models/Utilizator");
const { notifyProviderById, notifyUser } = require("./utils/notifications");
const { verifyAuthToken } = require("./utils/jwt");
const { createLogger, serializeError } = require("./utils/log");
const { getAllowedClientOrigins } = require("./utils/runtime");
const { canAccessConversationRoom, parseConversationRoom } = require("./utils/chatRooms");
const { isStaffRole, normalizeUserRole } = require("./utils/roles");

const socketLog = createLogger("socket");

function getSocketUserId(user) {
  return String(user?._id || user?.id || "");
}

function getSocketDisplayName(user) {
  const fullName = [user?.nume, user?.prenume].filter(Boolean).join(" ").trim();
  return fullName || user?.email || "Utilizator";
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

function init(server) {
  const { Server } = require("socket.io");
  const allowedOrigins = getAllowedClientOrigins();
  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ["GET", "POST"],
    },
    path: "/socket.io",
    transports: ["websocket", "polling"],
  });

  io.use(async (socket, next) => {
    try {
      const token = String(socket.handshake.auth?.token || "").trim();
      if (!token) {
        return next(new Error("Authentication required"));
      }

      const payload = verifyAuthToken(token);
      const userId = payload.id || payload.userId || payload._id;
      const user = await Utilizator.findById(userId).select("-parola -parolaHash").lean();
      if (!user || user.activ === false) {
        return next(new Error("Authentication required"));
      }

      user.rol = normalizeUserRole(user.rol || user.role);
      socket.user = user;
      socket.auth = payload;
      return next();
    } catch (err) {
      socketLog.warn("socket_auth_failed", {
        socketId: socket.id,
        error: serializeError(err),
      });
      return next(new Error("Authentication required"));
    }
  });

  io.on("connection", (socket) => {
    socketLog.info("client_connected", {
      socketId: socket.id,
      userId: getSocketUserId(socket.user),
    });

    socket.on("joinRoom", (room) => {
      if (!canAccessConversationRoom(socket.user, room)) {
        socketLog.warn("room_join_denied", {
          socketId: socket.id,
          userId: getSocketUserId(socket.user),
          room: String(room || ""),
        });
        return;
      }

      socket.join(String(room));
      socketLog.info("room_joined", {
        socketId: socket.id,
        room: String(room),
      });
    });

    socket.on("leaveRoom", (room) => {
      if (!canAccessConversationRoom(socket.user, room)) return;
      socket.leave(String(room));
    });

    socket.on("ping", () => socket.emit("pong"));

    socket.on("sendMessage", async (data) => {
      try {
        const text = String(data?.text || "").trim();
        const fileUrl = data?.fileUrl ? String(data.fileUrl) : "";
        const fileName = data?.fileName ? String(data.fileName) : "";
        const room = data?.room ? String(data.room) : "";
        if (!text && !fileUrl) return;
        if (!room || !canAccessConversationRoom(socket.user, room)) {
          socketLog.warn("chat_room_denied", {
            socketId: socket.id,
            userId: getSocketUserId(socket.user),
            room,
          });
          return;
        }

        const details = parseConversationRoom(room);
        const payload = {
          text: text || (fileUrl ? "Fisier atasat" : ""),
          utilizator: getSocketDisplayName(socket.user),
          rol: normalizeUserRole(socket.user?.rol || socket.user?.role || ""),
          at: Date.now(),
          data: new Date(),
          room,
          authorId: getSocketUserId(socket.user),
          fileUrl,
          fileName,
          clientId: details.clientId || "",
          prestatorId: details.prestatorId || "",
          participantIds: [details.clientId, details.prestatorId].filter(Boolean),
        };

        try {
          const saved = await MesajChat.create(payload);
          io.to(room).emit("receiveMessage", saved.toObject());
        } catch (dbErr) {
          socketLog.warn("chat_persist_failed", {
            socketId: socket.id,
            room,
            error: serializeError(dbErr),
          });
          io.to(room).emit("receiveMessage", payload);
        }

        if (!isStaffRole(payload.rol) || payload.prestatorId) {
          await notifyConversationParticipants(payload);
        }
      } catch (err) {
        socketLog.error("chat_send_failed", {
          socketId: socket.id,
          error: serializeError(err),
        });
      }
    });

    socket.on("disconnect", (reason) => {
      socketLog.info("client_disconnected", {
        socketId: socket.id,
        userId: getSocketUserId(socket.user),
        reason,
      });
    });
  });
}

function getIO() {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

module.exports = { init, getIO };
