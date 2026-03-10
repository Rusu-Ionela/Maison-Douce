const express = require("express");
const router = express.Router();
const Utilizator = require("../models/Utilizator");
const { sendEmail } = require("../utils/notifications");
const { generateResetToken } = require("../utils/resetTokens");

const BASE_CLIENT_URL = process.env.BASE_CLIENT_URL || "http://localhost:5173";
const RESET_TOKEN_TTL_MIN = Number(process.env.RESET_TOKEN_TTL_MIN || 60);
const GENERIC_RESET_MESSAGE =
  "Daca exista un cont pentru acest email, vei primi instructiuni de resetare.";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

router.post("/send-reset-email", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!email) {
    return res.status(400).json({ message: "Email este obligatoriu." });
  }

  try {
    const utilizator = await Utilizator.findOne({ email });
    if (!utilizator) {
      return res.json({ message: GENERIC_RESET_MESSAGE });
    }

    const { rawToken, hashedToken } = generateResetToken();
    utilizator.resetToken = hashedToken;
    utilizator.resetTokenExp = new Date(
      Date.now() + RESET_TOKEN_TTL_MIN * 60 * 1000
    );
    await utilizator.save();

    const resetLink = `${BASE_CLIENT_URL.replace(/\/$/, "")}/reset-parola?token=${encodeURIComponent(
      rawToken
    )}`;

    await sendEmail(
      email,
      "Resetare parola TortApp",
      `<p>Click aici pentru a reseta parola:</p><a href="${resetLink}">${resetLink}</a>`
    );

    return res.json({ message: GENERIC_RESET_MESSAGE });
  } catch (err) {
    console.error("Eroare reset parola:", err);
    return res.status(500).json({ message: "Eroare la trimitere email." });
  }
});

module.exports = router;
