const mongoose = require('mongoose');

const recenzieComandaSchema = new mongoose.Schema({
    comandaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comanda',
        required: true,
        index: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Utilizator',
        required: true
    },
    nota: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comentariu: {
        type: String,
        required: true,
        trim: true
    },
    foto: {
        type: String,
        default: ""
    },
    moderationStatus: {
        type: String,
        enum: ["pending", "approved", "hidden"],
        default: "pending",
    },
    moderationNote: { type: String, default: "" },
    moderatedAt: { type: Date, default: null },
    moderatedBy: { type: String, default: "" },
    moderatedByEmail: { type: String, default: "" },
    reportCount: { type: Number, default: 0, min: 0 },
    reportedAt: { type: Date, default: null },
    lastReportReason: { type: String, default: "" },
    lastReportBy: { type: String, default: "" },
    reporterIds: { type: [String], default: [] },
    data: {
        type: Date,
        default: Date.now
    }
});

recenzieComandaSchema.index({ comandaId: 1, clientId: 1 });
recenzieComandaSchema.index({ moderationStatus: 1, data: -1 });
recenzieComandaSchema.index({ reportCount: -1, data: -1 });

module.exports = mongoose.model('RecenzieComanda', recenzieComandaSchema);
