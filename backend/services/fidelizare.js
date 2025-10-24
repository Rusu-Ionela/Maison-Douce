const Utilizator = require('../models/Utilizator');
const Coupon = require('../models/Coupon');
exports.applyCouponIfValid = async (subtotal, code) => {
    if (!code) return { total: subtotal, coupon: null };
    const c = await Coupon.findOne({ code, active: true });
    if (!c) return { total: subtotal, coupon: null };
    let discount = 0;
    if (c.type === 'percent') discount = subtotal * (c.value / 100);
    if (c.type === 'fixed') discount = c.value;
    const total = Math.max(0, subtotal - discount);
    return { total, coupon: { code: c.code, discountValue: Math.round(discount) } };
};

exports.computePoints = async (clientId, total) => {
    const user = await Utilizator.findById(clientId);
    const available = user?.points || 0;
    const used = Math.min(available, Math.floor(total)); // 1 punct = 1 unitate (simplu)
    const totalAfterPoints = total - used;
    user.points = available - used;
    await user.save();
    return { totalAfterPoints, used };
};

exports.grantPoints = async (clientId, totalPaid) => {
    const toEarn = Math.floor(totalPaid * 0.05); // 5% din valoare în puncte
    const user = await Utilizator.findById(clientId);
    user.points = (user.points || 0) + toEarn;
    await user.save();
    return toEarn;
};
