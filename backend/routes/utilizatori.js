// backend/routes/utilizatori.js
const router = require("express").Router();
const Utilizator = require("../models/Utilizator");
const { signUser } = require("../utils/auth");
const requireAuth = require("../middleware/requireAuth");

/* ================== LOGIN ================== */
// POST /api/utilizatori/login
router.post("/login", async (req, res) => {
    const { email, parola } = req.body;
    if (!email || !parola) {
        return res.status(400).json({ message: "Email și parolă sunt necesare" });
    }

    const u = await Utilizator.findOne({ email }).select("+parolaHash +parola");
    if (!u) {
        return res.status(401).json({ message: "Email sau parolă incorecte" });
    }

    const ok = await u.comparePassword(parola);
    if (!ok) {
        return res.status(401).json({ message: "Email sau parolă incorecte" });
    }

    const token = signUser(u);
    res.json({
        token,
        user: {
            _id: u._id,
            nume: u.nume,
            email: u.email,
            rol: u.rol,
        },
    });
});

/* ================== ME ================== */
// GET /api/utilizatori/me
router.get("/me", requireAuth, async (req, res) => {
    const me = await Utilizator.findById(req.user.id).select("-parola -parolaHash");
    if (!me) {
        return res.status(404).json({ message: "User inexistent" });
    }
    res.json(me);
});

/* ================== DEV UTILS ================== */
// Rute disponibile DOAR când NU suntem în production
if (process.env.NODE_ENV !== "production") {
    // POST /api/utilizatori/reset-dev-password
    router.post("/reset-dev-password", async (req, res) => {
        const { email, parola } = req.body;
        const u = await Utilizator.findOne({ email }).select("+parolaHash +parola");
        if (!u) return res.status(404).json({ message: "User inexistent" });
        await u.setPassword(parola);
        await u.save();
        res.json({ ok: true });
    });

    // ✅ POST /api/utilizatori/dev-create-admin
    router.post("/dev-create-admin", async (req, res) => {
        const { email, parola, nume } = req.body;

        if (!email || !parola) {
            return res.status(400).json({ message: "Email și parolă sunt necesare" });
        }

        let u = await Utilizator.findOne({ email }).select("+parolaHash +parola");
        if (!u) {
            u = new Utilizator({
                email,
                nume: nume || "Admin Maison Douce",
                rol: "admin",
            });
        }

        u.rol = "admin";
        await u.setPassword(parola);
        await u.save();

        res.json({
            ok: true,
            id: u._id,
            email: u.email,
            rol: u.rol,
        });
    });
}

module.exports = router;
