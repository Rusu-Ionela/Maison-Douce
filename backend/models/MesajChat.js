// backend/models/MesajChat.js
const mongoose = require('mongoose');

const MesajChatSchema = new mongoose.Schema({
    text: { type: String, required: true },
    data: { type: Date, default: Date.now },
    utilizator: { type: String, required: false }, // Nume sau email (opțional)
    authorId: { type: String }, // optional: user id or socket id
    room: { type: String, index: true }, // optional: room / conversation id
});

module.exports = mongoose.models.MesajChat || mongoose.model('MesajChat', MesajChatSchema);
