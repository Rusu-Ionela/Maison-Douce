let io;
const MesajChat = require("./models/MesajChat");
const Utilizator = require("./models/Utilizator");
const { notifyAdmins } = require("./utils/notifications");
const { verifyAuthToken } = require("./utils/jwt");
const { createLogger, serializeError } = require("./utils/log");
const { getAllowedClientOrigins } = require("./utils/runtime");

const socketLog = createLogger("socket");

function isStaffUser(user) {
  const role = user?.rol || user?.role;
  return ["admin", "patiser", "prestator"].includes(String(role || ""));
}

function getSocketUserId(user) {
  return String(user?._id || user?.id || "");
}

function getSocketDisplayName(user) {
  const fullName = [user?.nume, user?.prenume].filter(Boolean).join(" ").trim();
  return fullName || user?.email || "Utilizator";
}

function canAccessRoom(user, room) {
  if (!room) return false;
  if (isStaffUser(user)) return true;
  return String(room) === `user-${getSocketUserId(user)}`;
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
      if (!canAccessRoom(socket.user, room)) {
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
      if (!canAccessRoom(socket.user, room)) return;
      socket.leave(String(room));
      socketLog.info("room_left", {
        socketId: socket.id,
        room: String(room),
      });
    });

    socket.on("ping", () => socket.emit("pong"));

    socket.on("sendMessage", async (data) => {
      try {
        const text = String(data?.text || "").trim();
        const fileUrl = data?.fileUrl ? String(data.fileUrl) : "";
        const fileName = data?.fileName ? String(data.fileName) : "";
        const room = data?.room ? String(data.room) : "";
        if (!text && !fileUrl) return;
        if (!room || !canAccessRoom(socket.user, room)) {
          socketLog.warn("chat_room_denied", {
            socketId: socket.id,
            userId: getSocketUserId(socket.user),
            room,
          });
          return;
        }

        const utilizator = getSocketDisplayName(socket.user);
        const authorId = getSocketUserId(socket.user);
        const senderRole = socket.user?.rol || socket.user?.role || "";

        try {
          await MesajChat.create({
            text,
            utilizator,
            room,
            authorId,
            rol: senderRole,
            fileUrl,
            fileName,
            data: new Date(),
          });
        } catch (dbErr) {
          socketLog.warn("chat_persist_failed", {
            socketId: socket.id,
            room,
            error: serializeError(dbErr),
          });
        }

        const payload = {
          text,
          utilizator,
          rol: senderRole,
          at: Date.now(),
          room,
          authorId,
          fileUrl,
          fileName,
        };

        io.to(room).emit("receiveMessage", payload);

        if (!["admin", "patiser"].includes(String(senderRole || ""))) {
          await notifyAdmins({
            titlu: "Mesaj nou",
            mesaj: `Mesaj nou de la ${utilizator}.`,
            tip: "chat",
            link: "/chat/utilizatori",
          });
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
