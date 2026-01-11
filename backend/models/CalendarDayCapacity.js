const mongoose = require("mongoose");

const CalendarDayCapacitySchema = new mongoose.Schema(
  {
    prestatorId: { type: String, default: "default", index: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    capacity: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

CalendarDayCapacitySchema.index({ prestatorId: 1, date: 1 }, { unique: true });

module.exports =
  mongoose.models.CalendarDayCapacity ||
  mongoose.model("CalendarDayCapacity", CalendarDayCapacitySchema);
