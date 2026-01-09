const express = require('express');
const router = express.Router();
const nodemailer = require("nodemailer");
const Utilizator = require("../models/Utilizator");

const BASE_CLIENT_URL = process.env.BASE_CLIENT_URL || "http://localhost:5173";
const SMTP_USER = process.env.SMTP_USER || process.env.EMAIL_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || process.env.EMAIL_PASS || "";

function getTransport() {
  if (!SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

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

    const transport = getTransport();
    if (!transport) {
      return res.status(500).json({
        message: "SMTP nu este configurat. Seteaza SMTP_USER si SMTP_PASS.",
      });
    }

    // In mod real foloseste token + link securizat; aici folosim email query simplu
    const resetLink = `${BASE_CLIENT_URL.replace(/\/$/, "")}/reset-parola?email=${encodeURIComponent(
      email
    )}`;

    await transport.sendMail({
      from: `TortApp <${SMTP_USER}>`,
      to: email,
      subject: "Resetare parola TortApp",
      html: `<p>Click aici pentru a reseta parola:</p><a href="${resetLink}">${resetLink}</a>`,
    });

    res.json({ message: "Email de resetare trimis." });
  } catch (err) {
    console.error("Eroare reset parola:", err);
    res.status(500).json({ message: "Eroare la trimitere email." });
  }
});

module.exports = router;
