require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Category = require("../models/Category");

(async () => {
    const uri =
        process.env.MONGODB_URI ||
        process.env.MONGO_URI ||
        "mongodb://localhost:27017/torturi";

    if (typeof uri !== "string" || !uri.length) {
        console.error("❌ MONGODB_URI/MONGO_URI lipsesc. Pune-l în .env.");
        process.exit(1);
    }

    await mongoose.connect(uri);

    await Category.deleteMany({});
    await Product.deleteMany({});

    await Category.insertMany([
        { name: "Macarons", slug: "macarons" },
        { name: "Torturi", slug: "torturi" },
    ]);

    await Product.insertMany([
        {
            title: "Macarons Rose",
            slug: "macarons-rose",
            price: 120,
            images: ["/uploads/macarons-rose.jpg"],
            categorySlug: "macarons",
            flavors: ["zmeură", "fistic"],
            sizes: [],
            isNew: true,
            shortDesc: "Delicate ca la Ladurée.",
        },
        {
            title: "Tort Medovik",
            slug: "tort-medovik",
            price: 450,
            images: ["/uploads/medovik.jpg"],
            categorySlug: "torturi",
            flavors: ["miere", "smântână"],
            sizes: ["1kg", "1.5kg", "2kg"],
            shortDesc: "Foietaj fin cu miere.",
        },
    ]);

    console.log("✅ Seed done.");
    process.exit(0);
})();
