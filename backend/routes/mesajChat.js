// backend/routes/mesajeChat.js
const express = require("express");
const router = express.Router();
const MesajChat = require("../models/MesajChat");

// GET /api/mesaje-chat – toate mesajele (istoric chat)
router.get("/", async (_req, res) => {
    try {
        const mesaje = await MesajChat.find().sort({ data: 1 }).lean();
        res.json(mesaje);
    } catch (e) {
        console.error("GET /mesaje-chat error:", e);
        res.status(500).json({ message: "Eroare la preluarea mesajelor" });
    }
});

// POST /api/mesaje-chat – salvează un mesaj
router.post("/", async (req, res) => {
    try {
        const { autor, text } = req.body;

        if (!text) {
            return res
                .status(400)
                .json({ message: "Câmpul 'text' este obligatoriu" });
        }

        const msg = await MesajChat.create({
            autor: autor || "client",
            text,
            data: new Date(),
        });

        res.status(201).json(msg);
    } catch (e) {
        console.error("POST /mesaje-chat error:", e);
        res.status(500).json({ message: "Eroare la salvarea mesajului" });
    }
});

module.exports = router;
