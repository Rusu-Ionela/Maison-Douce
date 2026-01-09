// backend/routes/mesajeChat.js
const express = require("express");
const router = express.Router();
const MesajChat = require("../models/MesajChat");
const { authRequired, roleCheck } = require("../middleware/auth");

function isAdmin(req) {
  const role = req.user?.rol || req.user?.role;
  return role === "admin" || role === "patiser";
}

// GET /api/mesaje-chat - toate mesajele (admin)
router.get("/", authRequired, roleCheck("admin", "patiser"), async (_req, res) => {
  try {
    const mesaje = await MesajChat.find().sort({ data: 1 }).lean();
    res.json(mesaje);
  } catch (e) {
    console.error("GET /mesaje-chat error:", e);
    res.status(500).json({ message: "Eroare la preluarea mesajelor" });
  }
});

// GET /api/mesaje-chat/room/:room - mesaje pentru un room
router.get("/room/:room", authRequired, async (req, res) => {
  try {
    const { room } = req.params;
    if (!room) return res.json([]);

    if (!isAdmin(req)) {
      const userId = String(req.user._id || req.user.id || "");
      const expected = `user-${userId}`;
      if (room !== expected) {
        return res.status(403).json({ message: "Acces interzis" });
      }
    }

    const mesaje = await MesajChat.find({ room: String(room) }).sort({ data: 1 }).lean();
    res.json(mesaje);
  } catch (e) {
    console.error("GET /mesaje-chat/room error:", e);
    res.status(500).json({ message: "Eroare la preluarea mesajelor pentru room" });
  }
});

// POST /api/mesaje-chat - salveaza un mesaj
router.post("/", authRequired, async (req, res) => {
  try {
    const { autor, utilizator, text, room, authorId, fileUrl, fileName } = req.body;
    if (!text && !fileUrl) {
      return res.status(400).json({ message: "Campul 'text' este obligatoriu" });
    }

    if (room && !isAdmin(req)) {
      const userId = String(req.user._id || req.user.id || "");
      const expected = `user-${userId}`;
      if (room !== expected) {
        return res.status(403).json({ message: "Acces interzis" });
      }
    }

    const payload = {
      text: String(text || "").trim() || "Fisier atasat",
      data: new Date(),
      utilizator: utilizator || autor || "client",
    };
    if (room) payload.room = String(room);
    if (authorId) payload.authorId = String(authorId);
    if (fileUrl) payload.fileUrl = fileUrl;
    if (fileName) payload.fileName = fileName;

    const msg = await MesajChat.create(payload);
    res.status(201).json(msg);
  } catch (e) {
    console.error("POST /mesaje-chat error:", e);
    res.status(500).json({ message: "Eroare la salvarea mesajului" });
  }
});

module.exports = router;
