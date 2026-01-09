const mongoose = require("mongoose");

const FidelizareConfigSchema = new mongoose.Schema(
  {
    pointsPer10: { type: Number, default: 1 },
    pointsPerOrder: { type: Number, default: 0 },
    minTotal: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.FidelizareConfig ||
  mongoose.model("FidelizareConfig", FidelizareConfigSchema);
