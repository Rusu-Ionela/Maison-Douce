// controllers/chatController.js
const MesajChat = require("../models/MesajChat");

function isAdmin(req) {
  const role = req.user?.rol || req.user?.role;
  return role === "admin" || role === "patiser";
}

function assertRoomAccess(req, room) {
  if (!room) return true;
  if (isAdmin(req)) return true;
  const userId = String(req.user?._id || req.user?.id || "");
  const expected = `user-${userId}`;
  return room === expected;
}

exports.sendMessage = async (req, res) => {
  try {
    const { text, room, fileUrl, fileName, utilizator, rol } = req.body || {};
    if (!text && !fileUrl) {
      return res.status(400).json({ message: "Text sau fisier este obligatoriu" });
    }

    if (!assertRoomAccess(req, room)) {
      return res.status(403).json({ message: "Acces interzis" });
    }

    const payload = {
      text: String(text || "").trim() || "Fisier atasat",
      data: new Date(),
      utilizator: utilizator || req.user?.nume || req.user?.name || "client",
      rol: req.user?.rol || req.user?.role || rol || "",
      authorId: String(req.user?._id || req.user?.id || ""),
    };
    if (room) payload.room = String(room);
    if (fileUrl) payload.fileUrl = fileUrl;
    if (fileName) payload.fileName = fileName;

    const msg = await MesajChat.create(payload);

    try {
      const io = require("../socket").getIO();
      if (payload.room) {
        io.to(payload.room).emit("receiveMessage", payload);
      } else {
        io.emit("receiveMessage", payload);
      }
    } catch {}

    res.status(201).json(msg);
  } catch (e) {
    console.error("chat sendMessage error:", e);
    res.status(500).json({ message: "Eroare la salvarea mesajului" });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { room } = req.query || {};
    if (room && !assertRoomAccess(req, room)) {
      return res.status(403).json({ message: "Acces interzis" });
    }
    if (!room && !isAdmin(req)) {
      return res.status(403).json({ message: "Acces interzis" });
    }

    const q = room ? { room: String(room) } : {};
    const mesaje = await MesajChat.find(q).sort({ data: 1 }).lean();
    res.json(mesaje);
  } catch (e) {
    console.error("chat getMessages error:", e);
    res.status(500).json({ message: "Eroare la preluarea mesajelor" });
  }
};
