const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const EntrySchema = new Schema({
    type: { type: String, enum: ['earn', 'spend', 'adjust'], default: 'earn' },
    points: { type: Number, default: 0 },
    source: { type: String },        // ex: 'order:<comandaId>'
    note: { type: String },
    at: { type: Date, default: Date.now }
}, { _id: false });

const FidelizareSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'Utilizator', unique: true, index: true },
    points: { type: Number, default: 0 },
    history: { type: [EntrySchema], default: [] },
}, { timestamps: true });

FidelizareSchema.statics.addPoints = async function (userId, pts, source, note = '') {
    const doc = await this.findOneAndUpdate(
        { userId },
        {
            $inc: { points: pts },
            $push: { history: { type: 'earn', points: pts, source, note } }
        },
        { upsert: true, new: true }
    );
    return doc;
};

module.exports = mongoose.models.Fidelizare || model('Fidelizare', FidelizareSchema);
