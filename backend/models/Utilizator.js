// backend/models/Utilizator.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const PointsTxnSchema = new mongoose.Schema({
    type: { type: String, enum: ["earn", "spend", "adjust"], required: true },
    points: { type: Number, required: true },
    reason: String,
    refId: String,
    at: { type: Date, default: Date.now },
}, { _id: false });

const UtilizatorSchema = new mongoose.Schema({
    nume: String,
    email: { type: String, unique: true, lowercase: true, trim: true, required: true },
    rol: { type: String, enum: ["client", "admin", "prestator"], default: "client" },

    // folosim doar parolaHash; ținem compat cu 'parola' dacă există deja
    parolaHash: { type: String, select: false },
    parola: { type: String, select: false }, // DOAR pt compat (va fi ștearsă la next-save)

    pointsBalance: { type: Number, default: 0 },
    pointsHistory: [PointsTxnSchema],
}, { timestamps: true });

UtilizatorSchema.methods.setPassword = async function setPassword(plain) {
    const salt = await bcrypt.genSalt(10);
    this.parolaHash = await bcrypt.hash(plain, salt);
    this.parola = undefined;
};

UtilizatorSchema.methods.comparePassword = async function comparePassword(plain) {
    const hash = this.parolaHash || this.parola;
    if (!hash) return false;
    return bcrypt.compare(plain, hash);
};

module.exports = mongoose.models.Utilizator || mongoose.model("Utilizator", UtilizatorSchema);
