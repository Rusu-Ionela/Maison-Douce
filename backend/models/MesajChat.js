// backend/models/MesajChat.js
const mongoose = require('mongoose');

const MesajChatSchema = new mongoose.Schema({
    text: { type: String, required: true },
    data: { type: Date, default: Date.now },
    utilizator: { type: String, required: true }, // Nume sau email
});

module.exports = mongoose.model('MesajChat', MesajChatSchema);
