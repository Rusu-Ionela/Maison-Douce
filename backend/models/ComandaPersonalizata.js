const mongoose = require('mongoose');

const ComandaPersonalizataSchema = new mongoose.Schema({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Utilizator" },
    numeClient: { type: String, required: true },
    preferinte: { type: String, default: "" },
    imagine: { type: String, default: "" }, // URL-ul imaginii generate
    designId: { type: mongoose.Schema.Types.ObjectId, ref: "Personalizare" },
    options: { type: Object, default: {} },
    pretEstimat: { type: Number, default: 0 },
    timpPreparareOre: { type: Number, default: 0 },
    status: { type: String, default: "noua" },
    data: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ComandaPersonalizata', ComandaPersonalizataSchema);
