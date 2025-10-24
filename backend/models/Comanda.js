// backend/models/Comanda.js
const mongoose = require("mongoose");

const ItemSchema = new mongoose.Schema(
    {
        productId: { type: mongoose.Schema.Types.Mixed }, // ObjectId sau string
        name: { type: String, required: true },
        qty: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 }, // preț unitar
        lineTotal: { type: Number, default: 0 },         // se poate recalcula
    },
    { _id: false }
);

const ComandaSchema = new mongoose.Schema(
    {
        clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Utilizator", required: true },

        // Poziții
        items: { type: [ItemSchema], default: [] },

        // Sume
        subtotal: { type: Number, default: 0 },
        taxaLivrare: { type: Number, default: 0 },
        total: { type: Number, default: 0 },

        // Livrare / ridicare
        metodaLivrare: { type: String, enum: ["ridicare", "livrare"], default: "ridicare" },
        adresaLivrare: { type: String },

        // Calendar
        dataLivrare: { type: String },   // "YYYY-MM-DD"
        oraLivrare: { type: String },    // "HH:mm"
        prestatorId: { type: String, default: "default" },

        // Diverse
        status: {
            type: String,
            enum: [
                "plasata",
                "in_asteptare",
                "platita",
                "predat_curierului",
                "ridicat_client",
                "livrata",
                "anulata",
            ],
            default: "plasata",
        },
        note: String,
        preferinte: String,
        imagineGenerata: String,
    },
    { timestamps: true }
);

// recalcul automat lineTotal + subtotal înainte de save
ComandaSchema.pre("save", function (next) {
    if (Array.isArray(this.items)) {
        this.items = this.items.map((it) => ({
            ...it.toObject?.() ?? it,
            lineTotal: Number(it.price || 0) * Number(it.qty || 0),
        }));
    }
    this.subtotal = (this.items || []).reduce((s, it) => s + Number(it.lineTotal || 0), 0);
    this.total = Number(this.subtotal || 0) + Number(this.taxaLivrare || 0);
    next();
});

module.exports = mongoose.model("Comanda", ComandaSchema);
