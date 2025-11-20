// backend/routes/mesajeChat.js
const express = require("express");
const router = express.Router();
const MesajChat = require("../models/MesajChat");

// GET /api/mesaje-chat – toate mesajele (pt istoric)
router.get("/", async (_req, res) => {
    try {
        const mesaje = await MesajChat.find().sort({ data: 1 }).lean();
        res.json(mesaje);
    } catch (e) {
        console.error("GET /mesaje-chat error:", e);
        res.status(500).json({ message: "Eroare la preluarea mesajelor" });
    }
});

// GET /api/mesaje-chat/room/:room – mesaje pentru un anumit room/conversație
router.get("/room/:room", async (req, res) => {
    try {
        const { room } = req.params;
        const mesaje = await MesajChat.find({ room: String(room) }).sort({ data: 1 }).lean();
        res.json(mesaje);
    } catch (e) {
        console.error("GET /mesaje-chat/room error:", e);
        res.status(500).json({ message: "Eroare la preluarea mesajelor pentru room" });
    }
});

// POST /api/mesaje-chat – salvează un mesaj simplu
router.post("/", async (req, res) => {
    try {
        const { autor, utilizator, text, room, authorId } = req.body;
        if (!text) {
            return res
                .status(400)
                .json({ message: "Câmpul 'text' este obligatoriu" });
        }

        const payload = {
            text,
            data: new Date(),
            utilizator: utilizator || autor || "client",
        };
        if (room) payload.room = String(room);
        if (authorId) payload.authorId = String(authorId);

        const msg = await MesajChat.create(payload);

        res.status(201).json(msg);
    } catch (e) {
        console.error("POST /mesaje-chat error:", e);
        res.status(500).json({ message: "Eroare la salvarea mesajului" });
    }
});

module.exports = router;
