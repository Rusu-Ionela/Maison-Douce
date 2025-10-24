const { Schema, model } = require("mongoose");

const ProductSchema = new Schema(
    {
        title: { type: String, required: true },
        slug: { type: String, index: true, unique: true },
        price: { type: Number, required: true },
        oldPrice: { type: Number },
        images: [{ type: String }],
        categorySlug: { type: String, index: true },
        flavors: [{ type: String }],
        sizes: [{ type: String }],
        isNew: { type: Boolean, default: false }, // păstrăm numele, doar suprimăm warning-ul
        discount: { type: Number, default: 0 },
        shortDesc: String,
        description: String,
    },
    {
        timestamps: true,
        suppressReservedKeysWarning: true, // <-- asta oprește warning-ul
    }
);

module.exports = model("Product", ProductSchema);
