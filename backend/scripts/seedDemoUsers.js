require("dotenv").config();
const mongoose = require("mongoose");
const Utilizator = require("../models/Utilizator");

const MONGO_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/torturi?directConnection=true&family=4";

const DEMO_USERS = [
  {
    email: "admin.demo@maison-douce.local",
    password: "AdminMaison2026!",
    rol: "admin",
    nume: "Admin",
    prenume: "Demo",
    telefon: "+37360000001",
    adresa: "Maison-Douce HQ",
  },
  {
    email: "patiser.demo@maison-douce.local",
    password: "PatiserMaison2026!",
    rol: "patiser",
    nume: "Patiser",
    prenume: "Demo",
    telefon: "+37360000002",
    adresa: "Laborator Maison-Douce",
    providerProfile: {
      displayName: "Atelier Demo Maison-Douce",
      slug: "atelier-demo-maison-douce",
      bio: "Cont demo pentru fluxurile interne de productie si review.",
    },
  },
  {
    email: "client.demo@maison-douce.local",
    password: "ClientMaison2026!",
    rol: "client",
    nume: "Client",
    prenume: "Demo",
    telefon: "+37360000003",
    adresa: "Strada Demo 10, Chisinau",
  },
];

async function upsertDemoUser(config) {
  const existingDefaultProvider = await Utilizator.exists({
    email: { $ne: config.email },
    rol: { $in: ["patiser", "prestator"] },
    "providerProfile.isDefaultProvider": true,
    activ: { $ne: false },
  });

  let user = await Utilizator.findOne({ email: config.email }).select("+parolaHash +parola");
  const created = !user;

  if (!user) {
    user = new Utilizator({ email: config.email });
  }

  user.nume = config.nume;
  user.prenume = config.prenume;
  user.telefon = config.telefon;
  user.adresa = config.adresa;
  user.rol = config.rol;
  user.activ = true;
  user.deactivatedAt = null;

  if (config.rol === "patiser") {
    user.providerProfile = {
      displayName: config.providerProfile.displayName,
      slug: config.providerProfile.slug,
      bio: config.providerProfile.bio,
      isPublic: true,
      acceptsOrders: true,
      isDefaultProvider: !existingDefaultProvider,
    };
  } else {
    user.providerProfile = {
      displayName: "",
      slug: "",
      bio: "",
      isPublic: true,
      acceptsOrders: true,
      isDefaultProvider: false,
    };
  }

  await user.setPassword(config.password);
  await user.save();

  return {
    email: config.email,
    rol: config.rol,
    password: config.password,
    status: created ? "created" : "updated",
  };
}

async function main() {
  if (!MONGO_URI) {
    throw new Error("MONGODB_URI sau MONGO_URI lipseste.");
  }

  await mongoose.connect(MONGO_URI);

  try {
    const results = [];
    for (const config of DEMO_USERS) {
      results.push(await upsertDemoUser(config));
    }

    console.log("[seed-demo-users] Demo accounts ready:");
    console.table(results);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error("[seed-demo-users] Failed:", error?.message || error);
  process.exit(1);
});
