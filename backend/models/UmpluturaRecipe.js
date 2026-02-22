const mongoose = require("mongoose");

const ingredientRowSchema = new mongoose.Schema(
  {
    ingredient: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, min: 0 },
    unit: { type: String, default: "g", trim: true },
    note: { type: String, default: "" },
  },
  { _id: false }
);

const umpluturaRecipeSchema = new mongoose.Schema(
  {
    nume: { type: String, required: true, trim: true },
    descriere: { type: String, default: "" },
    bazaDiametruCm: { type: Number, default: 20, min: 1 },
    bazaKg: { type: Number, default: 1, min: 0.1 },
    ingrediente: { type: [ingredientRowSchema], default: [] },
    activ: { type: Boolean, default: true },
    creatDe: { type: mongoose.Schema.Types.ObjectId, ref: "Utilizator" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UmpluturaRecipe", umpluturaRecipeSchema);
