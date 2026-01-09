const mongoose = require('mongoose');

const notificareSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilizator', required: true },
    titlu: { type: String, default: "" },
    mesaj: { type: String, default: "" },
    tip: { type: String, default: "info" },
    link: { type: String, default: "" },
    canal: { type: String, enum: ["inapp", "email"], default: "inapp" },
    data: { type: Date, default: Date.now },
    citita: { type: Boolean, default: false }
});

module.exports = mongoose.model('Notificare', notificareSchema);
