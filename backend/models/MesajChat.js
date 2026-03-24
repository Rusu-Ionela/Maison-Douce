const mongoose = require("mongoose");

const MesajChatSchema = new mongoose.Schema({
  text: { type: String, required: true },
  data: { type: Date, default: Date.now },
  utilizator: { type: String, default: "" },
  rol: { type: String, default: "" },
  authorId: { type: String },
  room: { type: String, index: true },
  clientId: { type: String, default: "", index: true },
  prestatorId: { type: String, default: "", index: true },
  participantIds: { type: [String], default: [] },
  fileUrl: { type: String, default: "" },
  fileName: { type: String, default: "" },
});

MesajChatSchema.index({ prestatorId: 1, clientId: 1, data: 1 });

module.exports =
  mongoose.models.MesajChat || mongoose.model("MesajChat", MesajChatSchema);
