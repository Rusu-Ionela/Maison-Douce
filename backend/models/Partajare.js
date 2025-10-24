const mongoose = require('mongoose');

const PartajareSchema = new mongoose.Schema({
    utilizatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilizator', required: true },
    fisiere: [String],
    linkUnic: { type: String, required: true },
    data: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Partajare', PartajareSchema);
