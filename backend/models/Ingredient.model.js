const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
    nume: {
        type: String,
        required: true,
        trim: true
    },
    cantitate: {
        type: Number,
        required: true
    },
    unitate: {
        type: String,
        enum: ['g', 'kg', 'ml', 'l', 'buc'], // poți adăuga și altele
        required: true
    },
    dataExpirare: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['bun', 'aproape expirat', 'expirat'],
        default: 'bun'
    },
    creatLa: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Ingredient', ingredientSchema);
