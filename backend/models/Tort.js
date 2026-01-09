const mongoose = require("mongoose");

const TortSchema = new mongoose.Schema(
    {
        nume: { type: String, required: true, trim: true },
        descriere: { type: String, default: "" },
        ingrediente: { type: [String], default: [] },
        arome: { type: [String], default: [] },
        imagine: { type: String, default: "" },
        galerie: { type: [String], default: [] },
        pret: { type: Number, default: 0, min: 0 },
        costEstim: { type: Number, default: 0, min: 0 },
        pretVechi: { type: Number, default: 0, min: 0 },
        stoc: { type: Number, default: 0, min: 0 },
        categorie: { type: String, default: "torturi", enum: ["torturi", "prajituri"] },
        ocazii: { type: [String], default: [] },
        stil: { type: String, default: "" },
        marime: { type: String, default: "" },
        portii: { type: Number, default: 0, min: 0 },
        timpPreparareOre: { type: Number, default: 0, min: 0 },
        activ: { type: Boolean, default: true },
        niveluri: { type: Number, default: 1, min: 1, max: 5 },
        alergeniFolositi: { type: [String], default: [] },
        ratingAvg: { type: Number, default: 0 },
        ratingCount: { type: Number, default: 0 },
        promo: { type: Boolean, default: false },
        retetaBaseKg: { type: Number, default: 1 },
        reteta: [
            {
                ingredient: { type: String, required: true },
                qty: { type: Number, required: true, min: 0 },
                unit: { type: String, default: "g" },
                note: { type: String, default: "" },
            },
        ],
    },
    { 
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

module.exports = mongoose.model("Tort", TortSchema);
