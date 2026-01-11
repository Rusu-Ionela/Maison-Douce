const express = require('express');
const router = express.Router();
const Utilizator = require("../models/Utilizator");
const crypto = require("crypto");
const { sendEmail } = require("../utils/notifications");

const BASE_CLIENT_URL = process.env.BASE_CLIENT_URL || "http://localhost:5173";
const RESET_TOKEN_TTL_MIN = Number(process.env.RESET_TOKEN_TTL_MIN || 60);

// Endpoint pentru trimitere email reset
router.post("/send-reset-email", async (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ message: "Email este obligatoriu." });
  }

  try {
    const utilizator = await Utilizator.findOne({ email });
    if (!utilizator) {
      return res.status(404).json({ message: "Utilizatorul nu a fost gasit." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    utilizator.resetToken = token;
    utilizator.resetTokenExp = new Date(Date.now() + RESET_TOKEN_TTL_MIN * 60 * 1000);
    await utilizator.save();

    const resetLink = `${BASE_CLIENT_URL.replace(/\/$/, "")}/reset-parola?token=${encodeURIComponent(
      token
    )}&email=${encodeURIComponent(email)}`;

    const sent = await sendEmail(
      email,
      "Resetare parola TortApp",
      `<p>Click aici pentru a reseta parola:</p><a href="${resetLink}">${resetLink}</a>`
    );
    if (!sent) {
      return res.json({
        message: "Link de resetare generat. Foloseste linkul pentru a continua.",
        link: resetLink,
      });
    }

    res.json({ message: "Email de resetare trimis.", link: resetLink });
  } catch (err) {
    console.error("Eroare reset parola:", err);
    res.status(500).json({ message: "Eroare la trimitere email." });
  }
});

module.exports = router;
