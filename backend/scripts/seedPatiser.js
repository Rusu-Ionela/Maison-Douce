require("dotenv").config();
const mongoose = require("mongoose");
const Utilizator = require("../models/Utilizator");

(async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const exists = await Utilizator.findOne({ email: "patiser@maison.douce" });
    if (!exists) {
        await Utilizator.create({
            name: "Patiser Șef",
            email: "patiser@maison.douce",
            password: "secret123",
            role: "patiser",
        });
        console.log("Patiser creat.");
    } else {
        console.log("Patiser există deja.");
    }
    await mongoose.disconnect();
})();
