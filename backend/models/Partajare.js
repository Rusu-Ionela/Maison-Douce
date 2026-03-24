const mongoose = require('mongoose');

const PartajareSchema = new mongoose.Schema({
    utilizatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilizator', required: true },
    prestatorId: { type: String, default: "" },
    fisiere: [String],
    linkUnic: { type: String, required: true },
    data: { type: Date, default: Date.now }
});

PartajareSchema.index({ utilizatorId: 1, prestatorId: 1, data: -1 });

module.exports = mongoose.model('Partajare', PartajareSchema);
