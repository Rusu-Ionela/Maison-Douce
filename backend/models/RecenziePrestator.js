const mongoose = require('mongoose');

const RecenziePrestatorSchema = new mongoose.Schema({
    prestatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilizator', required: true, index: true },
    utilizator: { type: String, required: true, trim: true },
    stele: { type: Number, required: true, min: 1, max: 5 },
    comentariu: { type: String, trim: true, default: "" },
    foto: { type: String, default: "" },
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
    data: { type: Date, default: Date.now }
});

RecenziePrestatorSchema.index({ prestatorId: 1, utilizator: 1 });
RecenziePrestatorSchema.index({ prestatorId: 1, moderationStatus: 1, data: -1 });
RecenziePrestatorSchema.index({ reportCount: -1, data: -1 });

module.exports = mongoose.model('RecenziePrestator', RecenziePrestatorSchema);
