const router = require("express").Router();
const { login, me } = require("../controllers/authController");
const { authRequired } = require("../middleware/auth");
const Utilizator = require("../models/Utilizator");
const { signAuthToken } = require("../utils/jwt");

router.post("/login", login);
router.get("/me", authRequired, me);

router.post("/seed-test-user", async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "Not allowed in production" });
    }

    const testEmail = req.body?.email || "test@example.com";
    const testPassword = req.body?.password || "testpass123";
    const desiredRole = req.body?.rol || req.body?.role || "admin";

    let user = await Utilizator.findOne({ email: testEmail });

    if (!user) {
      user = new Utilizator({
        email: testEmail,
        nume: "Test",
        prenume: "User",
        telefon: "0123456789",
        rol: desiredRole,
      });

      await user.setPassword(testPassword);
      await user.save();
      console.log("[seed-test-user] Created new test user:", testEmail);
    } else {
      console.log("[seed-test-user] Found existing test user:", testEmail);
    }

    if (user.rol !== desiredRole) {
      user.rol = desiredRole;
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
});

module.exports = router;
