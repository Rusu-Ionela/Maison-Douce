const mongoose = require("mongoose");

const CouponSchema = new mongoose.Schema({
  cod: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },
  descriere: { type: String, default: "" },
  tipReducere: {
    type: String,
    enum: ["percent", "fixed"],
    default: "percent",
  },
  procentReducere: { type: Number, default: 0 },
  valoareFixa: { type: Number, default: 0 },
  valoareMinima: { type: Number, default: 0 },
  activ: { type: Boolean, default: true },
  usageLimit: { type: Number, default: 0 },
  perUserLimit: { type: Number, default: 0 },
  allowedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Utilizator",
    default: null,
  },
  dataExpirare: { type: Date, default: null },
  notesAdmin: { type: String, default: "" },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Utilizator",
    default: null,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Utilizator",
    default: null,
  },
  dataCreare: { type: Date, default: Date.now },
}, { timestamps: true });

CouponSchema.index({ cod: 1 }, { unique: true });
CouponSchema.index({ activ: 1, dataExpirare: 1 });

module.exports = mongoose.models.Coupon || mongoose.model("Coupon", CouponSchema);
