const mongoose = require("mongoose");

const ClientErrorEventSchema = new mongoose.Schema(
  {
    kind: { type: String, required: true },
    message: { type: String, required: true },
    stack: { type: String, default: "" },
    componentStack: { type: String, default: "" },
    url: { type: String, default: "" },
    userId: { type: String, default: "" },
    userEmail: { type: String, default: "" },
    userRole: { type: String, default: "" },
    release: { type: String, default: "" },
    clientRequestId: { type: String, default: "" },
    requestId: { type: String, default: "" },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

ClientErrorEventSchema.index({ createdAt: -1 });
ClientErrorEventSchema.index({ kind: 1, createdAt: -1 });
ClientErrorEventSchema.index({ userEmail: 1, createdAt: -1 });

module.exports =
  mongoose.models.ClientErrorEvent ||
  mongoose.model("ClientErrorEvent", ClientErrorEventSchema);
