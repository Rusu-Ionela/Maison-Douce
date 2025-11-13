const mongoose = require('mongoose');

const ComandaSchema = new mongoose.Schema(
    {
        numeroComanda: { type: String, unique: true, required: true },
        utilizatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilizator', required: true },
        items: [{
            tortId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tort' },
            numeCustom: String,
            cantitate: Number,
            pret: Number,
            personalizari: {
                blat: String,
                crema: String,
                decor: String,
                mesaj: String
            }
        }],
        calendarSlot: {
            date: String,
            time: String
        },
        detaliiLivrare: {
            metoda: {
                type: String,
                enum: ['pickup', 'delivery', 'courier'],
                default: 'pickup'
            },
            adresa: String,
            taxa: { type: Number, default: 0 },
            status: {
                type: String,
                enum: ['pending', 'in_progress', 'ready', 'in_delivery', 'delivered'],
                default: 'pending'
            }
        },
        statusComanda: {
            type: String,
            enum: ['pending', 'confirmed', 'in_progress', 'ready', 'completed', 'cancelled'],
            default: 'pending'
        },
        totalPret: { type: Number, required: true },
        punteFidelizare: { type: Number, default: 0 },
        metodaPlata: {
            type: String,
            enum: ['card', 'cash', 'transfer'],
            default: 'card'
        },
        stripePaymentId: String,
        notesClient: String,
        notesAdmin: String
    },
    { timestamps: true }
);

module.exports = mongoose.model('Comanda', ComandaSchema);