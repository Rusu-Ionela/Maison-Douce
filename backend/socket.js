// backend/socket.js
let io;
const MesajChat = require('./models/MesajChat');

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
        console.log("socket connected:", socket.id);

        // join a room (optional)
        socket.on("joinRoom", (room) => {
            if (!room) return;
            socket.join(String(room));
            console.log(`socket ${socket.id} joined room ${room}`);
        });

        socket.on("leaveRoom", (room) => {
            if (!room) return;
            socket.leave(String(room));
            console.log(`socket ${socket.id} left room ${room}`);
        });

        socket.on("ping", () => socket.emit("pong"));

        socket.on("sendMessage", async (data) => {
            try {
                const text = String(data?.text || "").trim();
                if (!text) return;
                const utilizator = data?.utilizator ? String(data.utilizator) : "Anonim";
                const room = data?.room ? String(data.room) : null;
                const authorId = data?.authorId ? String(data.authorId) : socket.id;

                // persist message (non-blocking but awaited for reliability)
                try {
                    await MesajChat.create({ text, utilizator, room, authorId, data: new Date() });
                } catch (dbErr) {
                    console.warn("Failed to persist chat message:", dbErr?.message || dbErr);
                }

                const payload = { text, utilizator, at: Date.now(), room, authorId };

                if (room) {
                    io.to(room).emit("receiveMessage", payload);
                } else {
                    io.emit("receiveMessage", payload);
                }
            } catch (err) {
                console.error("sendMessage handler error:", err);
            }
        });

        socket.on("disconnect", (reason) => {
            console.log("socket disconnected:", socket.id, reason);
        });
    });
}

function getIO() {
    if (!io) throw new Error("Socket.io not initialized");
    return io;
}

module.exports = { init, getIO };
