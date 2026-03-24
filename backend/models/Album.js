const mongoose = require("mongoose");

const AlbumSchema = new mongoose.Schema({
  titlu: { type: String, required: true },
  fisiere: [String],
  utilizatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Utilizator",
    required: true,
  },
  prestatorId: { type: String, default: "" },
  comandaId: { type: mongoose.Schema.Types.ObjectId, ref: "Comanda" },
  data: { type: Date, default: Date.now },
});

AlbumSchema.index({ utilizatorId: 1, prestatorId: 1, data: -1 });

module.exports = mongoose.models.Album || mongoose.model("Album", AlbumSchema);
