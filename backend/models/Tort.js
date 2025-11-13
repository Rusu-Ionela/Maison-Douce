const mongoose = require("mongoose");

const TortSchema = new mongoose.Schema(
    {
        nume: { type: String, required: true, trim: true },
        descriere: { type: String, default: "" },
        ingrediente: { type: [String], default: [] },
        imagine: { type: String, default: "" },
        pret: { type: Number, default: 0, min: 0 },
        stoc: { type: Number, default: 0, min: 0 },
        categorie: { type: String, default: "torturi", enum: ["torturi", "prajituri"] },
        activ: { type: Boolean, default: true },
        niveluri: { type: Number, default: 1, min: 1, max: 5 },
        alergeniFolositi: { type: [String], default: [] }
    },
    { 
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

module.exports = mongoose.model("Tort", TortSchema);