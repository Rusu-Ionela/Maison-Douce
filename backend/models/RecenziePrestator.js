const mongoose = require('mongoose');

const RecenziePrestatorSchema = new mongoose.Schema({
    prestatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilizator', required: true },
    utilizator: { type: String, required: true },
    stele: { type: Number, required: true },
    comentariu: { type: String },
    data: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RecenziePrestator', RecenziePrestatorSchema);
