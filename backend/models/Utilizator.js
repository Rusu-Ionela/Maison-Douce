const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PointsTxnSchema = new mongoose.Schema({
    type: { type: String, enum: ['earn', 'spend', 'adjust'], required: true },
    points: { type: Number, required: true },
    reason: String,
    refId: String,
    at: { type: Date, default: Date.now },
}, { _id: false });

const UtilizatorSchema = new mongoose.Schema({
    nume: { type: String },
    email: { type: String, unique: true, lowercase: true, trim: true, required: true },
    rol: { type: String, enum: ['client', 'admin', 'prestator'], default: 'client' },
    parola: { type: String, required: true, select: false },
    pointsBalance: { type: Number, default: 0 },
    pointsHistory: [PointsTxnSchema],
}, { timestamps: true });

UtilizatorSchema.pre('save', async function (next) {
    if (!this.isModified('parola')) return next();
    const salt = await bcrypt.genSalt(10);
    this.parola = await bcrypt.hash(this.parola, salt);
    next();
});

UtilizatorSchema.methods.comparePassword = function (plain) {
    return bcrypt.compare(plain, this.parola);
};

module.exports = mongoose.models.Utilizator || mongoose.model('Utilizator', UtilizatorSchema);
