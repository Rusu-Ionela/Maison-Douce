// backend/models/Rezervare.js
const mongoose = require("mongoose");

const RezervareSchema = new mongoose.Schema({
    clientId: { type: String, required: true },
    prestatorId: { type: String, default: "default" },

    // asociere optională cu un tort / comandă personalizată
    tortId: { type: String },
    customDetails: { type: Object },

    date: { type: String, required: true },      // "YYYY-MM-DD"
    timeSlot: { type: String, required: true },  // "HH:mm-HH:mm"

    handoffMethod: { type: String, enum: ["pickup", "delivery"], required: true },
    deliveryFee: { type: Number, default: 0 },
    deliveryAddress: { type: String },

    subtotal: { type: Number, default: 0 },
    total: { type: Number, default: 0 },

    paymentStatus: { type: String, enum: ["unpaid", "paid", "refunded"], default: "unpaid" },
    status: { type: String, enum: ["pending", "confirmed", "completed", "canceled"], default: "pending" },
    handoffStatus: { type: String, enum: ["scheduled", "out_for_delivery", "delivered", "picked_up", "canceled"], default: "scheduled" },
}, { timestamps: true });

module.exports =
    mongoose.models.Rezervare ||
    mongoose.model("Rezervare", RezervareSchema);
