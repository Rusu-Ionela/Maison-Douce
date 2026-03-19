// backend/models/Rezervare.js
const mongoose = require("mongoose");

const RezervareSchema = new mongoose.Schema(
    {
        clientId: { type: String, required: true },
        prestatorId: { type: String, default: "" },

        // LEGĂTURĂ CU COMANDA (FK)
        comandaId: { type: mongoose.Schema.Types.ObjectId, ref: "Comanda" },

        // asociere optională cu un tort / comandă personalizată
        tortId: { type: String },
        customDetails: { type: Object },

        date: { type: String, required: true },      // "YYYY-MM-DD"
        timeSlot: { type: String, required: true },  // "HH:mm-HH:mm"

        handoffMethod: {
            type: String,
            enum: ["pickup", "delivery"],
            required: true,
        },
        deliveryFee: { type: Number, default: 0 },
        deliveryAddress: { type: String },
        deliveryInstructions: { type: String, default: "" },
        deliveryWindow: { type: String, default: "" },

        subtotal: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        notes: { type: String, default: "" },

        paymentStatus: {
            type: String,
            enum: ["unpaid", "paid", "refunded"],
            default: "unpaid",
        },
        status: {
            type: String,
            enum: ["pending", "confirmed", "completed", "canceled"],
            default: "pending",
        },
        handoffStatus: {
            type: String,
            enum: ["scheduled", "out_for_delivery", "delivered", "picked_up", "canceled"],
            default: "scheduled",
        },
    },
    { timestamps: true }
);

RezervareSchema.index({ clientId: 1, createdAt: -1 });
RezervareSchema.index({ prestatorId: 1, date: 1, timeSlot: 1 });
RezervareSchema.index({ prestatorId: 1, status: 1, createdAt: -1 });

module.exports =
    mongoose.models.Rezervare ||
    mongoose.model("Rezervare", RezervareSchema);
