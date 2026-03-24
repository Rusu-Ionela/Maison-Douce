const mongoose = require("mongoose");

const BreakSchema = new mongoose.Schema(
  {
    start: { type: String, required: true, trim: true },
    end: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const ProviderAvailabilitySchema = new mongoose.Schema(
  {
    prestatorId: { type: String, required: true, trim: true, unique: true },
    workingDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5, 6],
    },
    workingHours: {
      start: { type: String, default: "09:00", trim: true },
      end: { type: String, default: "18:00", trim: true },
    },
    slotDurationMinutes: { type: Number, default: 60 },
    breaks: {
      type: [BreakSchema],
      default: [{ start: "13:00", end: "14:00" }],
    },
    maxOrdersPerSlot: { type: Number, default: 1 },
    timezone: { type: String, default: "Europe/Chisinau", trim: true },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.ProviderAvailability ||
  mongoose.model("ProviderAvailability", ProviderAvailabilitySchema);
