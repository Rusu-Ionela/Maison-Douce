const mongoose = require("mongoose");

const ContactConversationSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Utilizator", default: null },
    clientName: { type: String, required: true, trim: true, maxlength: 160 },
    clientEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    clientPhone: { type: String, default: "", trim: true, maxlength: 40 },
    subject: { type: String, default: "", trim: true, maxlength: 160 },
    status: {
      type: String,
      enum: ["noua", "in_progres", "finalizata"],
      default: "noua",
    },
    source: { type: String, default: "", trim: true, maxlength: 255 },
    lastMessageAt: { type: Date, default: Date.now },
    lastMessagePreview: { type: String, default: "", trim: true, maxlength: 400 },
    lastSenderRole: { type: String, default: "", trim: true, maxlength: 32 },
    messageCount: { type: Number, default: 0, min: 0 },
    legacyContactMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ContactMessage",
      default: null,
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Utilizator", default: null },
    assignedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ContactConversationSchema.index({ status: 1, lastMessageAt: -1 });
ContactConversationSchema.index({ clientId: 1, lastMessageAt: -1 });
ContactConversationSchema.index({ clientEmail: 1, lastMessageAt: -1 });
ContactConversationSchema.index({ legacyContactMessageId: 1 }, { sparse: true });

module.exports =
  mongoose.models.ContactConversation ||
  mongoose.model("ContactConversation", ContactConversationSchema);
