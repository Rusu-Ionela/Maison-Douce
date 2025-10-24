const mongoose = require('mongoose');

const ComandaPersonalizataSchema = new mongoose.Schema({
    numeClient: {
        type: String,
        required: true
    },
    preferinte: {
        type: String,
        required: true
    },
    imagine: {
        type: String,
        required: true // URL-ul imaginii generate
    },
    data: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('ComandaPersonalizata', ComandaPersonalizataSchema);
