const mongoose = require('mongoose');

const recenzieComandaSchema = new mongoose.Schema({
    comandaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comanda',
        required: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Utilizator',
        required: true
    },
    nota: {
        type: Number,
        required: true
    },
    comentariu: {
        type: String,
        required: true
    },
    data: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('RecenzieComanda', recenzieComandaSchema);
