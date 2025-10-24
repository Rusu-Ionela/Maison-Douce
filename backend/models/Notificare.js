const mongoose = require('mongoose');

const notificareSchema = new mongoose.Schema({
    mesaj: String,
    data: { type: Date, default: Date.now },
    citita: { type: Boolean, default: false }
});

module.exports = mongoose.model('Notificare', notificareSchema);
