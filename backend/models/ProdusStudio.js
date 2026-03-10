const mongoose = require("mongoose");

const produsStudioSchema = new mongoose.Schema(
  {
    nume: { type: String, required: true, trim: true },
    descriere: { type: String, default: "", trim: true },
    pret: { type: Number, default: 0, min: 0 },
    cantitate: { type: Number, default: 0, min: 0 },
    unitate: { type: String, default: "buc", trim: true },
    dataExpirare: { type: Date, default: null },
  },
  { timestamps: true }
);

produsStudioSchema.index({ nume: 1 });
produsStudioSchema.index({ dataExpirare: 1 });

module.exports =
  mongoose.models.ProdusStudio || mongoose.model("ProdusStudio", produsStudioSchema);
