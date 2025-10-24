// backend/socket.js
let io;

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

        socket.on("ping", () => socket.emit("pong"));

        socket.on("sendMessage", (data) => {
            // poți valida aici: { text, utilizator }
            io.emit("receiveMessage", {
                text: String(data?.text || ""),
                utilizator: String(data?.utilizator || "Anonim"),
                at: Date.now(),
            });
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
