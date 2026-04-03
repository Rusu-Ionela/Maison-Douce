require("dotenv").config();
const mongoose = require("mongoose");
const Utilizator = require("../models/Utilizator");

const MONGO_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/torturi?directConnection=true&family=4";

async function main() {
  await mongoose.connect(MONGO_URI);

  try {
    const existingDefaultProvider = await Utilizator.exists({
      email: { $ne: "patiser.demo@maison-douce.local" },
      rol: { $in: ["patiser", "prestator"] },
      "providerProfile.isDefaultProvider": true,
      activ: { $ne: false },
    });
    let user = await Utilizator.findOne({
      email: "patiser.demo@maison-douce.local",
    }).select("+parolaHash +parola");
    const created = !user;

    if (!user) {
      user = new Utilizator({
        email: "patiser.demo@maison-douce.local",
      });
    }

    user.nume = "Patiser";
    user.prenume = "Demo";
    user.telefon = "+37360000002";
    user.adresa = "Laborator Maison-Douce";
    user.rol = "patiser";
    user.activ = true;
    user.deactivatedAt = null;
    user.providerProfile = {
      displayName: "Atelier Demo Maison-Douce",
      slug: "atelier-demo-maison-douce",
      bio: "Cont demo pentru fluxurile interne de productie si review.",
      isPublic: true,
      acceptsOrders: true,
      isDefaultProvider: !existingDefaultProvider,
    };

    await user.setPassword("PatiserMaison2026!");
    await user.save();

    console.log(
      `[seed-patiser] ${created ? "Created" : "Updated"} patiser.demo@maison-douce.local`
    );
    console.log("[seed-patiser] Password: PatiserMaison2026!");
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error("[seed-patiser] Failed:", error?.message || error);
  process.exit(1);
});
