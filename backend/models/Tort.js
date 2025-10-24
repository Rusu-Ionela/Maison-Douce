const mongoose = require('mongoose');

const rezervareSchema = new mongoose.Schema({
    clientId: { type: String, required: true },
    prestatorId: { type: String, required: true },
    intervalId: { type: String, required: true },
    serviciu: { type: String, required: true },
    locatie: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});



const TortSchema = new mongoose.Schema({
    nume: { type: String, required: true, trim: true },
    descriere: { type: String, default: "" },
    ingrediente: { type: [String], default: [] },
    imagine: { type: String, default: "" }, // /uploads/...
    pret: { type: Number, default: 0, min: 0 },
    stoc: { type: Number, default: 0, min: 0 }, // opțional
    categorie: { type: String, default: "cakes", index: true }, // ex: cakes/macarons/chocolate
    activ: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Tort', TortSchema);
