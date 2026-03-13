const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.Mixed, default: "" },
    actorEmail: { type: String, default: "" },
    actorRole: { type: String, default: "" },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: mongoose.Schema.Types.Mixed, default: "" },
    summary: { type: String, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    requestId: { type: String, default: "" },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });

module.exports =
  mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);
