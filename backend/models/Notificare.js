const mongoose = require('mongoose');

const notificareSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilizator', required: true },
    prestatorId: { type: String, default: "" },
    actorId: { type: String, default: "" },
    actorRole: { type: String, default: "" },
    titlu: { type: String, default: "" },
    mesaj: { type: String, default: "" },
    tip: { type: String, default: "info" },
    link: { type: String, default: "" },
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
    canal: { type: String, enum: ["inapp", "email"], default: "inapp" },
    data: { type: Date, default: Date.now },
    citita: { type: Boolean, default: false }
});

module.exports = mongoose.model('Notificare', notificareSchema);
