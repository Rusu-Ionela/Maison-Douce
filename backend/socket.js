let io;
const MesajChat = require("./models/MesajChat");
const Utilizator = require("./models/Utilizator");
const { notifyAdmins } = require("./utils/notifications");
const { createLogger, serializeError } = require("./utils/log");

const socketLog = createLogger("socket");

function init(server) {
  const { Server } = require("socket.io");
  io = new Server(server, {
    cors: {
      origin: ["http://localhost:5173", "http://localhost:3000"],
      credentials: true,
      methods: ["GET", "POST"],
    },
    path: "/socket.io",
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    socketLog.info("client_connected", {
      socketId: socket.id,
    });

    socket.on("joinRoom", (room) => {
      if (!room) return;
      socket.join(String(room));
      socketLog.info("room_joined", {
        socketId: socket.id,
        room: String(room),
      });
    });

    socket.on("leaveRoom", (room) => {
      if (!room) return;
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
        if (!text && !fileUrl) return;

        const utilizator = data?.utilizator ? String(data.utilizator) : "Anonim";
        const room = data?.room ? String(data.room) : null;
        const authorId = data?.authorId ? String(data.authorId) : socket.id;
        const rol = data?.rol || data?.role || "";

        let senderRole = rol;
        if (!senderRole && authorId && authorId.length >= 12) {
          try {
            const user = await Utilizator.findById(authorId).lean();
            senderRole = user?.rol || user?.role || "";
          } catch {
            // Ignore role lookup errors for chat metadata.
          }
        }

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

        if (room) {
          io.to(room).emit("receiveMessage", payload);
        } else {
          io.emit("receiveMessage", payload);
        }

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
