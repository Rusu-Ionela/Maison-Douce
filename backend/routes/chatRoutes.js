const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.post('/messages', chatController.sendMessage);      // POST - trimite mesaj
router.get('/messages', chatController.getMessages);       // GET - primește toate mesajele

module.exports = router;
