const mongoose = require("mongoose");

const ContactConversationMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ContactConversation",
      required: true,
      index: true,
    },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "Utilizator", default: null },
    authorRole: { type: String, required: true, trim: true, maxlength: 32 },
    authorName: { type: String, required: true, trim: true, maxlength: 160 },
    authorEmail: { type: String, default: "", trim: true, lowercase: true, maxlength: 160 },
    text: { type: String, required: true, trim: true, maxlength: 4000 },
    source: { type: String, default: "contact_chat", trim: true, maxlength: 64 },
    isLegacySeed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ContactConversationMessageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports =
  mongoose.models.ContactConversationMessage ||
  mongoose.model("ContactConversationMessage", ContactConversationMessageSchema);
