// backend/routes/chat.js
const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const { authRequired } = require("../middleware/auth");

// POST /api/chat/messages - trimite un mesaj (websocket + fallback HTTP)
router.post("/messages", authRequired, chatController.sendMessage);

// GET /api/chat/messages - ia toate mesajele
router.get("/messages", authRequired, chatController.getMessages);

module.exports = router;
