const mongoose = require('mongoose');

const CalendarSlotEntrySchema = new mongoose.Schema({
    prestatorId: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    time: { type: String, required: true }, // HH:mm
    capacity: { type: Number, default: 1 },
    used: { type: Number, default: 0 },
}, { timestamps: true });

CalendarSlotEntrySchema.index({ prestatorId: 1, date: 1, time: 1 }, { unique: true });

module.exports = mongoose.models.CalendarSlotEntry || mongoose.model('CalendarSlotEntry', CalendarSlotEntrySchema);
