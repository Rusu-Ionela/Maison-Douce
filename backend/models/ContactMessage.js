const mongoose = require("mongoose");

const ContactMessageSchema = new mongoose.Schema(
  {
    nume: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    telefon: { type: String, default: "", trim: true, maxlength: 40 },
    subiect: { type: String, default: "", trim: true, maxlength: 160 },
    mesaj: { type: String, required: true, trim: true, maxlength: 4000 },
    status: {
      type: String,
      enum: ["nou", "in_proces", "rezolvat"],
      default: "nou",
    },
    sursa: { type: String, default: "", trim: true, maxlength: 255 },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "Utilizator", default: null },
    gestionatDe: { type: mongoose.Schema.Types.ObjectId, ref: "Utilizator", default: null },
    gestionatLa: { type: Date, default: null },
  },
  { timestamps: true }
);

ContactMessageSchema.index({ status: 1, createdAt: -1 });
ContactMessageSchema.index({ email: 1, createdAt: -1 });

module.exports =
  mongoose.models.ContactMessage ||
  mongoose.model("ContactMessage", ContactMessageSchema);
