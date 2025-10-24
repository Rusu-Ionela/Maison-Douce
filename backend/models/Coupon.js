const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema({
    cod: { type: String, required: true, unique: true },
    procentReducere: { type: Number, required: true }, // ex: 10 pentru 10%
    activ: { type: Boolean, default: true },
    dataCreare: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Coupon', CouponSchema);
