// backend/models/CalendarPrestator.js
const mongoose = require("mongoose");

const SlotSchema = new mongoose.Schema(
    {
        date: { type: String, required: true },  // "YYYY-MM-DD"
        time: { type: String, required: true },  // "HH:mm"
        capacity: { type: Number, default: 1 },
        used: { type: Number, default: 0 },
    },
    { _id: false }
);

const CalendarPrestatorSchema = new mongoose.Schema(
    {
        prestatorId: { type: String, required: true }, // "default"
        slots: [SlotSchema],
    },
    { timestamps: true }
);

module.exports =
    mongoose.models.CalendarPrestator ||
    mongoose.model("CalendarPrestator", CalendarPrestatorSchema);
