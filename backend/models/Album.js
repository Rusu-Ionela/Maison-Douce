const mongoose = require('mongoose');

const AlbumSchema = new mongoose.Schema({
    titlu: { type: String, required: true },
    fisiere: [String], // URL-uri către fișierele încărcate
    utilizatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilizator', required: true },
    data: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Album', AlbumSchema);
