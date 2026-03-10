const express = require("express");
const Utilizator = require("../models/Utilizator");
const { authRequired } = require("../middleware/auth");
const { signAuthToken } = require("../utils/jwt");
const { hashResetToken } = require("../utils/resetTokens");

const router = express.Router();

function createToken(user) {
  return signAuthToken(user);
}

function serializeUser(user) {
  return {
    id: user._id,
    nume: user.nume,
    prenume: user.prenume || "",
    email: user.email,
    rol: user.rol,
    telefon: user.telefon || "",
    adresa: user.adresa || "",
    preferinte: user.preferinte || {},
    adreseSalvate: user.adreseSalvate || [],
    setariNotificari: user.setariNotificari || {},
  };
}

router.post("/register", async (req, res) => {
  try {
    const {
      nume,
      prenume,
      email,
      parola,
      password,
      rol = "client",
      inviteCode,
      telefon,
      adresa,
    } = req.body || {};

    const normalizedEmail = String(email || "").trim().toLowerCase();
    const plain = parola || password;
    if (!nume || !normalizedEmail || !plain) {
      return res
        .status(400)
        .json({ message: "Nume, email si parola sunt necesare." });
    }

    const requestedRole = rol === "prestator" ? "patiser" : rol;
    if (requestedRole === "patiser") {
      const requiredCode = process.env.PATISER_INVITE_CODE || "PATISER-INVITE";
      if (inviteCode !== requiredCode) {
        return res.status(403).json({ message: "Cod invitatie invalid." });
      }
    }

    const existing = await Utilizator.findOne({ email: normalizedEmail });
    if (existing) {
      return res
        .status(409)
        .json({ message: "Exista deja un cont cu acest email." });
    }

    const user = new Utilizator({
      nume,
      prenume: prenume || "",
      email: normalizedEmail,
      rol: requestedRole,
      telefon: telefon || "",
      adresa: adresa || "",
    });
    await user.setPassword(plain);
    await user.save();

    const token = createToken(user);
    res.status(201).json({
      token,
      user: serializeUser(user),
    });
  } catch (e) {
    console.error("register error:", e.message);
    res.status(500).json({ message: "Eroare server la inregistrare." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, parola, password } = req.body || {};
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const plain = parola || password;

    if (!normalizedEmail || !plain) {
      return res
        .status(400)
        .json({ message: "Email si parola sunt necesare" });
    }

    const user = await Utilizator.findOne({ email: normalizedEmail }).select("+parolaHash +parola");
    if (!user) {
      return res.status(401).json({ message: "Email sau parola gresite" });
    }

    const ok = await user.comparePassword(plain);
    if (!ok) {
      return res.status(401).json({ message: "Email sau parola gresite" });
    }

    const token = createToken(user);
    res.json({
      token,
      user: serializeUser(user),
    });
  } catch (e) {
    console.error("login error:", e.message);
    res.status(500).json({ message: "Eroare server la login" });
  }
});

router.get("/me", authRequired, async (req, res) => {
  try {
    const user = await Utilizator.findById(req.user.id || req.user._id);
    if (!user) {
      return res.status(404).json({ message: "Utilizator inexistent" });
    }

    res.json(serializeUser(user));
  } catch (e) {
    console.error("/me error:", e.message);
    res.status(500).json({ message: "Eroare server" });
  }
});

router.put("/me", authRequired, async (req, res) => {
  try {
    const {
      nume,
      prenume,
      telefon,
      adresa,
      adreseSalvate,
      preferinte,
      setariNotificari,
    } = req.body || {};

    const update = {};
    if (typeof nume === "string") update.nume = nume;
    if (typeof prenume === "string") update.prenume = prenume;
    if (typeof telefon === "string") update.telefon = telefon;
    if (typeof adresa === "string") update.adresa = adresa;
    if (Array.isArray(adreseSalvate)) update.adreseSalvate = adreseSalvate;
    if (preferinte && typeof preferinte === "object") update.preferinte = preferinte;
    if (setariNotificari && typeof setariNotificari === "object") {
      update.setariNotificari = setariNotificari;
    }

    const user = await Utilizator.findByIdAndUpdate(req.user.id || req.user._id, update, {
      new: true,
      runValidators: true,
    });
    if (!user) {
      return res.status(404).json({ message: "Utilizator inexistent" });
    }

    res.json({
      ok: true,
      user: serializeUser(user),
    });
  } catch (e) {
    console.error("/me update error:", e.message);
    res.status(500).json({ message: "Eroare server la actualizare profil." });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { newPassword, token } = req.body || {};

    if (!token || !newPassword) {
      return res.status(400).json({
        message: "Tokenul si parola noua sunt necesare.",
      });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({
        message: "Parola noua trebuie sa aiba minimum 8 caractere.",
      });
    }

    const hashedToken = hashResetToken(token);
    const user = await Utilizator.findOne({
      resetToken: hashedToken,
      resetTokenExp: { $gt: new Date() },
    }).select("+parolaHash +parola");

    if (!user) {
      return res
        .status(400)
        .json({ message: "Linkul de resetare este invalid sau expirat." });
    }

    await user.setPassword(newPassword);
    user.resetToken = "";
    user.resetTokenExp = undefined;
    await user.save();

    res.json({
      ok: true,
      message: "Parola a fost resetata cu succes.",
    });
  } catch (e) {
    console.error("reset-password error:", e.message);
    res.status(500).json({ message: "Eroare server la resetare parola" });
  }
});

router.post("/logout", (_req, res) => {
  res.json({ ok: true });
});

module.exports = router;
