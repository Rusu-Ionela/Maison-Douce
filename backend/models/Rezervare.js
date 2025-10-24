// backend/models/Rezervare.js
const mongoose = require("mongoose");

const RezervareSchema = new mongoose.Schema({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Utilizator", required: true },
    prestatorId: { type: String, default: "default" },
    tortId: { type: mongoose.Schema.Types.ObjectId, ref: "Tort" },
    customDetails: mongoose.Schema.Types.Mixed,

    date: { type: String, required: true },      // "YYYY-MM-DD"
    timeSlot: { type: String, required: true },  // "HH:mm-HH:mm"

    handoffMethod: { type: String, enum: ["pickup", "delivery"], default: "pickup" },
    deliveryFee: { type: Number, default: 0 },
    deliveryAddress: String,

    subtotal: { type: Number, default: 0 },
    total: { type: Number, default: 0 },

    stripePaymentIntentId: String,
    paymentStatus: { type: String, enum: ["unpaid", "paid", "canceled"], default: "unpaid" },

    status: { type: String, enum: ["pending", "confirmed", "in-progress", "done", "canceled"], default: "pending" },
    handoffStatus: { type: String, enum: ["scheduled", "handed_to_courier", "picked_by_client", "delivered", "canceled"], default: "scheduled" },
}, { timestamps: true });

module.exports =
    mongoose.models.Rezervare || mongoose.model("Rezervare", RezervareSchema);
