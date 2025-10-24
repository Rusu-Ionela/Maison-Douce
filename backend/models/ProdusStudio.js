const mongoose = require('mongoose');

const produsStudioSchema = new mongoose.Schema({
    nume: String,
    cantitate: Number,
    dataExpirare: Date
});

module.exports = mongoose.model('ProdusStudio', produsStudioSchema);
