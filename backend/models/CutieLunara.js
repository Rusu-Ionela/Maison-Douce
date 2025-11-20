// backend/models/CutieLunara.js
const mongoose = require("mongoose");

const CutieLunaraSchema = new mongoose.Schema(
    {
        clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Utilizator", required: true },
        plan: {
            type: String,
            enum: ["basic", "premium", "deluxe"],
            default: "basic",
        },
        preferinte: { type: String, default: "" },
        activ: { type: Boolean, default: true },
        pretLunar: { type: Number, default: 0 },
    },
    { timestamps: true }
);

module.exports = mongoose.model("CutieLunara", CutieLunaraSchema);
