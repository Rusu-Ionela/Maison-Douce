const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const { login, me } = require("../controllers/authController");
const { authRequired } = require("../middleware/auth");
const { withValidation } = require("../middleware/validate");
const Utilizator = require("../models/Utilizator");
const { signAuthToken } = require("../utils/jwt");
const { readEmail, readEnum, readString } = require("../utils/validation");
const isTestEnv = process.env.NODE_ENV === "test";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTestEnv ? 5000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  "/login",
  authLimiter,
  withValidation((req) => ({
    email: readEmail(req.body?.email, {
      field: "email",
      required: true,
      max: 160,
    }),
    parola: readString(req.body?.parola, {
      field: "parola",
      required: true,
      min: 1,
      max: 200,
    }),
  }), async (req, res) => {
    req.body = {
      ...(req.body || {}),
      email: req.validated.email,
      parola: req.validated.parola,
    };
    return login(req, res);
  })
);
router.get("/me", authRequired, me);

if (process.env.NODE_ENV !== "production") {
  router.post(
    "/seed-test-user",
    withValidation((req) => ({
      email: readEmail(req.body?.email || "test@example.com", {
        field: "email",
        max: 160,
      }),
      password: readString(req.body?.password || "testpass123", {
        field: "password",
        min: 8,
        max: 200,
      }),
      rol: readEnum(req.body?.rol || req.body?.role || "admin", [
        "client",
        "admin",
        "patiser",
        "prestator",
      ], {
        field: "rol",
        defaultValue: "admin",
      }),
    }), async (req, res) => {
      try {
        const desiredRole =
          req.validated.rol === "prestator" ? "patiser" : req.validated.rol;
        let user = await Utilizator.findOne({ email: req.validated.email });

        if (!user) {
          user = new Utilizator({
            email: req.validated.email,
            nume: "Test",
            prenume: "User",
            telefon: "0123456789",
            rol: desiredRole,
          });

          await user.setPassword(req.validated.password);
          await user.save();
          console.log("[seed-test-user] Created new test user:", req.validated.email);
        } else {
          console.log("[seed-test-user] Found existing test user:", req.validated.email);
        }

        if (user.rol !== desiredRole) {
          user.rol = desiredRole;
        }
        if (user.activ === false) {
          user.activ = true;
          user.deactivatedAt = null;
        }
        if (user.isModified()) {
          await user.save();
        }

        const token = signAuthToken(user);

        res.json({
          ok: true,
          user: {
            _id: user._id,
            email: user.email,
            nume: user.nume,
            prenume: user.prenume,
            rol: user.rol,
          },
          token,
        });
      } catch (e) {
        console.error("[seed-test-user] Error:", e.message);
        res.status(500).json({ error: e.message });
      }
    })
  );
}

module.exports = router;
