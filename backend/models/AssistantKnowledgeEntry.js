const mongoose = require("mongoose");

const AssistantKnowledgeActionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["route", "href"],
      default: "route",
    },
    label: { type: String, required: true, trim: true, maxlength: 120 },
    to: { type: String, default: "", trim: true, maxlength: 255 },
    href: { type: String, default: "", trim: true, maxlength: 2048 },
  },
  { _id: false }
);

const AssistantKnowledgeEntrySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    answer: { type: String, required: true, trim: true, maxlength: 4000 },
    keywords: [{ type: String, trim: true, maxlength: 80 }],
    actions: { type: [AssistantKnowledgeActionSchema], default: [] },
    priority: { type: Number, default: 100, min: 0, max: 1000 },
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Utilizator", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Utilizator", default: null },
  },
  { timestamps: true }
);

AssistantKnowledgeEntrySchema.index({ active: 1, priority: 1, updatedAt: -1 });
AssistantKnowledgeEntrySchema.index({ title: "text", keywords: "text", answer: "text" });

module.exports =
  mongoose.models.AssistantKnowledgeEntry ||
  mongoose.model("AssistantKnowledgeEntry", AssistantKnowledgeEntrySchema);
