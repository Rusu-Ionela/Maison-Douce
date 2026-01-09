const mongoose = require('mongoose');

const PersonalizareSchema = new mongoose.Schema({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilizator', required: false },
    forma: { type: String },
    culori: [String],
    config: { type: Object }, // optional JSON config (elements, positions) for re-edit
    mesaj: { type: String },
    imageUrl: { type: String }, // path under /uploads
    note: { type: String },
    options: { type: Object, default: {} },
    pretEstimat: { type: Number, default: 0 },
    timpPreparareOre: { type: Number, default: 0 },
    status: { type: String, default: "draft" }, // draft | trimis
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Personalizare || mongoose.model('Personalizare', PersonalizareSchema);
