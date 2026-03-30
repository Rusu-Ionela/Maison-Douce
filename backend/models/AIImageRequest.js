const mongoose = require("mongoose");

const AIImageRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "Utilizator" },
    prestatorId: { type: String, default: "" },
    prompt: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: "" },
    source: { type: String, default: "local" },
    variantIndex: { type: Number, default: 0 },
    referenceCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["success", "fallback", "error"],
      default: "success",
    },
    errorMessage: { type: String, default: "" },
  },
  { timestamps: true }
);

AIImageRequestSchema.index({ userId: 1, createdAt: -1 });
AIImageRequestSchema.index({ prestatorId: 1, createdAt: -1 });

module.exports =
  mongoose.models.AIImageRequest ||
  mongoose.model("AIImageRequest", AIImageRequestSchema);
