const mongoose = require("mongoose");

const PushSubscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "Utilizator", required: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, default: "" },
      auth: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

PushSubscriptionSchema.index({ userId: 1 });

module.exports =
  mongoose.models.PushSubscription ||
  mongoose.model("PushSubscription", PushSubscriptionSchema);
