const mongoose = require("mongoose");

const MesajChatSchema = new mongoose.Schema({
  text: { type: String, required: true },
  data: { type: Date, default: Date.now },
  utilizator: { type: String, default: "" },
  rol: { type: String, default: "" },
  authorId: { type: String },
  room: { type: String, index: true },
  fileUrl: { type: String, default: "" },
  fileName: { type: String, default: "" },
});

module.exports =
  mongoose.models.MesajChat || mongoose.model("MesajChat", MesajChatSchema);
