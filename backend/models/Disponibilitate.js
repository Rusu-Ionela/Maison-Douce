// backend/models/Disponibilitate.js
const mongoose = require('mongoose');

const disponibilitateSchema = new mongoose.Schema({
    date: {
        type: [Date], // listă de date
        required: true
    }
});

module.exports = mongoose.model('Disponibilitate', disponibilitateSchema);
