const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const Utilizator = require("../models/Utilizator");
const { withValidation } = require("../middleware/validate");
const { hasEmailConfig, sendEmail } = require("../utils/notifications");
const { generateResetToken } = require("../utils/resetTokens");
const { readEmail } = require("../utils/validation");

const BASE_CLIENT_URL = process.env.BASE_CLIENT_URL || "http://localhost:5173";
const RESET_TOKEN_TTL_MIN = Number(process.env.RESET_TOKEN_TTL_MIN || 60);
const GENERIC_RESET_MESSAGE =
  "Daca exista un cont pentru acest email, vei primi instructiuni de resetare.";
const resetEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
});

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

router.post(
  "/send-reset-email",
  resetEmailLimiter,
  withValidation((req) => ({
    email: readEmail(req.body?.email, {
      field: "email",
      required: true,
      max: 160,
    }),
  }), async (req, res) => {
    const email = normalizeEmail(req.validated.email);

    try {
      if (process.env.NODE_ENV === "production" && !hasEmailConfig()) {
        return res.status(503).json({
          message:
            "Resetarea parolei este indisponibila momentan. Contacteaza suportul.",
        });
      }

      const utilizator = await Utilizator.findOne({ email });
      if (!utilizator || utilizator.activ === false) {
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

      const sent = await sendEmail(
        email,
        "Resetare parola TortApp",
        `<p>Click aici pentru a reseta parola:</p><a href="${resetLink}">${resetLink}</a>`
      );
      if (!sent) {
        return res.status(503).json({
          message:
            "Nu am putut trimite emailul de resetare. Incearca din nou mai tarziu.",
        });
      }

      return res.json({ message: GENERIC_RESET_MESSAGE });
    } catch (err) {
      console.error("Eroare reset parola:", err);
      return res.status(503).json({
        message: "Nu am putut trimite emailul de resetare. Incearca din nou mai tarziu.",
      });
    }
  })
);

module.exports = router;
