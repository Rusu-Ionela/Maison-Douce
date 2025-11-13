// backend/routes/utilizatori.js
const router = require("express").Router();
const Utilizator = require("../models/Utilizator");
const { signUser } = require("../utils/auth");
const requireAuth = require("../middleware/requireAuth");

// POST /api/utilizatori/login
router.post("/login", async (req, res) => {
    const { email, parola } = req.body;
    if (!email || !parola) return res.status(400).json({ message: "Email și parolă sunt necesare" });

    const u = await Utilizator.findOne({ email }).select("+parolaHash +parola");
    if (!u) return res.status(401).json({ message: "Email sau parolă incorecte" });

    const ok = await u.comparePassword(parola);
    if (!ok) return res.status(401).json({ message: "Email sau parolă incorecte" });

    const token = signUser(u);
    res.json({ token, user: { _id: u._id, nume: u.nume, email: u.email, rol: u.rol } });
});

// GET /api/utilizatori/me
router.get("/me", requireAuth, async (req, res) => {
    const me = await Utilizator.findById(req.user.id).select("-parola -parolaHash");
    if (!me) return res.status(404).json({ message: "User inexistent" });
    res.json(me);
});

// DEV: set/reset parolă rapid
if (process.env.NODE_ENV !== "production") {
    router.post("/reset-dev-password", async (req, res) => {
        const { email, parola } = req.body;
        const u = await Utilizator.findOne({ email }).select("+parolaHash +parola");
        if (!u) return res.status(404).json({ message: "User inexistent" });
        await u.setPassword(parola);
        await u.save();
        res.json({ ok: true });
    });
}

module.exports = router;
