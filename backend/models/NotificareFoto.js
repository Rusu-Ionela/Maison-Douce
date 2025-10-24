const mongoose = require('mongoose');

const NotificareFotoSchema = new mongoose.Schema({
    utilizatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilizator', required: true },
    mesaj: { type: String, required: true },
    citit: { type: Boolean, default: false },
    data: { type: Date, default: Date.now }
});

module.exports = mongoose.model('NotificareFoto', NotificareFotoSchema);
