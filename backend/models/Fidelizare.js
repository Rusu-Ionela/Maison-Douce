const mongoose = require('mongoose');

const FidelizareSchema = new mongoose.Schema(
    {
        utilizatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilizator' },
        puncteCurent: { type: Number, default: 0 },
        puncteTotal: { type: Number, default: 0 },
        istoric: [{
            data: { type: Date, default: Date.now },
            tip: { type: String, enum: ['earn', 'redeem'], default: 'earn' },
            puncte: Number,
            sursa: String,
            comandaId: mongoose.Schema.Types.ObjectId,
            descriere: String
        }],
        reduceriDisponibile: [{
            procent: Number,
            valoareMinima: Number,
            codigPromo: String,
            dataExpirare: Date,
            folosita: { type: Boolean, default: false }
        }],
        nivelLoyalitate: {
            type: String,
            enum: ['bronze', 'silver', 'gold', 'platinum'],
            default: 'bronze'
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Fidelizare', FidelizareSchema);