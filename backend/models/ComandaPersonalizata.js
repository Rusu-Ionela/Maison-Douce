const mongoose = require('mongoose');

const ComandaPersonalizataSchema = new mongoose.Schema({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Utilizator" },
    prestatorId: { type: String, default: "" },
    numeClient: { type: String, required: true },
    preferinte: { type: String, default: "" },
    imagine: { type: String, default: "" }, // URL-ul imaginii generate
    designId: { type: mongoose.Schema.Types.ObjectId, ref: "Personalizare" },
    comandaId: { type: mongoose.Schema.Types.ObjectId, ref: "Comanda" },
    options: { type: Object, default: {} },
    pretEstimat: { type: Number, default: 0 },
    timpPreparareOre: { type: Number, default: 0 },
    status: { type: String, default: "noua" },
    data: { type: Date, default: Date.now }
});

ComandaPersonalizataSchema.index({ prestatorId: 1, data: -1 });

module.exports = mongoose.model('ComandaPersonalizata', ComandaPersonalizataSchema);
