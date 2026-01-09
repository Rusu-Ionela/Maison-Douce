const mongoose = require("mongoose");

const ingredientSchema = new mongoose.Schema(
  {
    nume: { type: String, required: true, trim: true },
    tip: {
      type: String,
      enum: ["blat", "crema", "umplutura", "decor", "topping", "culoare", "aroma", "ingredient"],
      default: "ingredient",
    },
    cantitate: { type: Number, required: true },
    unitate: {
      type: String,
      enum: ["g", "kg", "ml", "l", "buc"],
      required: true,
    },
    costUnitate: { type: Number, default: 0 },
    pretUnitate: { type: Number, default: 0 },
    dataExpirare: { type: Date, required: true },
    status: {
      type: String,
      enum: ["bun", "aproape expirat", "expirat"],
      default: "bun",
    },
    creatLa: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ingredient", ingredientSchema);
