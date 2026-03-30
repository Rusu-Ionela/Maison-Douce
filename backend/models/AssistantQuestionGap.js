const mongoose = require("mongoose");

const ASSISTANT_QUESTION_STATUSES = ["noua", "in_revizie", "rezolvata", "ignorata"];

const AssistantQuestionGapSchema = new mongoose.Schema(
  {
    query: { type: String, required: true, trim: true, maxlength: 400 },
    normalizedQuery: {
      type: String,
      required: true,
      trim: true,
      maxlength: 400,
      unique: true,
    },
    sampleQueries: [{ type: String, trim: true, maxlength: 400 }],
    pathnames: [{ type: String, trim: true, maxlength: 200 }],
    status: {
      type: String,
      enum: ASSISTANT_QUESTION_STATUSES,
      default: "noua",
    },
    hitCount: { type: Number, default: 1, min: 1 },
    lastAskedAt: { type: Date, default: Date.now },
    lastPathname: { type: String, default: "/", trim: true, maxlength: 200 },
    lastIntentId: { type: String, default: "navigation", trim: true, maxlength: 120 },
    lastSource: {
      type: String,
      default: "assistant_knowledge_base",
      trim: true,
      maxlength: 120,
    },
    lastUserRole: { type: String, default: "guest", trim: true, maxlength: 40 },
    lastUserId: { type: String, default: "", trim: true, maxlength: 120 },
    notes: { type: String, default: "", trim: true, maxlength: 2000 },
    linkedKnowledgeEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AssistantKnowledgeEntry",
      default: null,
    },
    resolvedAt: { type: Date, default: null },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Utilizator",
      default: null,
    },
  },
  { timestamps: true }
);

AssistantQuestionGapSchema.index({ status: 1, lastAskedAt: -1 });
AssistantQuestionGapSchema.index({ hitCount: -1, lastAskedAt: -1 });
AssistantQuestionGapSchema.index({ linkedKnowledgeEntryId: 1, status: 1 });

module.exports =
  mongoose.models.AssistantQuestionGap ||
  mongoose.model("AssistantQuestionGap", AssistantQuestionGapSchema);
