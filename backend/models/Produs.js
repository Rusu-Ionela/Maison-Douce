const mongoose = require('mongoose');

const produsSchema = new mongoose.Schema({
    nume: {
        type: String,
        required: true
    },
    cantitate: {
        type: Number,
        required: true
    },
    dataExpirare: {
        type: Date,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Produs', produsSchema);
