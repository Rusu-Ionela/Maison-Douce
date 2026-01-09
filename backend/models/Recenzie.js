const mongoose = require('mongoose');

const RecenzieSchema = new mongoose.Schema({
    tortId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tort', required: true },
    utilizator: { type: String, required: true },
    stele: { type: Number, required: true },
    comentariu: { type: String },
    foto: { type: String, default: "" },
    data: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Recenzie', RecenzieSchema);
