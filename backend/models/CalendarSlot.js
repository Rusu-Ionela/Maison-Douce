const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
    orderId: String,
    clientName: String,
    tortName: String,
    quantity: Number,
    deliveryMethod: {
        type: String,
        enum: ['pickup', 'delivery', 'courier'],
        default: 'pickup'
    },
    address: String,
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'ready', 'delivered'],
        default: 'pending'
    },
    notes: String
}, { _id: false });

const SlotSchema = new mongoose.Schema({
    date: { type: String, required: true },
    time: { type: String, required: true },
    capacity: { type: Number, default: 5 },
    booked: { type: Number, default: 0 },
    orders: [OrderItemSchema]
}, { _id: false });

const CalendarSlotSchema = new mongoose.Schema(
    {
        date: { type: String, required: true },
        slots: [SlotSchema],
        notes: String
    },
    { timestamps: true }
);

module.exports = mongoose.model('CalendarSlot', CalendarSlotSchema);