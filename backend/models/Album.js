const mongoose = require("mongoose");

const AlbumSchema = new mongoose.Schema({
  titlu: { type: String, required: true },
  fisiere: [String],
  utilizatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Utilizator",
    required: true,
  },
  comandaId: { type: mongoose.Schema.Types.ObjectId, ref: "Comanda" },
  data: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Album || mongoose.model("Album", AlbumSchema);
