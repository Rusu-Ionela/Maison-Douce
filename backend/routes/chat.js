// backend/routes/chat.js
const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");

// POST /api/chat/messages – trimite un mesaj (websocket + fallback HTTP)
router.post("/messages", chatController.sendMessage);

// GET /api/chat/messages – ia toate mesajele
router.get("/messages", chatController.getMessages);

module.exports = router;
