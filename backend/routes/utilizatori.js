// backend/routes/utilizatori.js
const { Router } = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const requireAuth = require("../middleware/requireAuth");
const Utilizator = require("../models/Utilizator");

const router = Router();

/** POST /api/utilizatori/login  -> { token, user } */
router.post("/login", async (req, res) => {
    try {
        const { email, parola } = req.body;
        if (!email || !parola) {
            return res.status(400).json({ message: "Email și parolă sunt necesare" });
        }

        // cere ambele câmpuri posibile (în caz că unele înregistrări vechi au "parola")
        const u = await Utilizator.findOne({ email }).select("+parolaHash +parola");
        if (!u) return res.status(401).json({ message: "Email sau parolă incorecte" });

        const storedHash = u.parolaHash || u.parola; // suportă ambele
        if (!storedHash) {
            // utilizator fără parolă setată
            return res.status(500).json({ message: "Contul nu are o parolă setată. Resetează parola (DEV) sau recreează utilizatorul." });
        }

        const ok = await bcrypt.compare(parola, storedHash);
        if (!ok) return res.status(401).json({ message: "Email sau parolă incorecte" });

        const token = jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

        res.json({
            token,
            user: { _id: u._id, nume: u.nume, email: u.email, rol: u.rol },
        });
    } catch (e) {
        console.error("[/login]", e);
        res.status(500).json({ message: e.message || "Eroare server" });
    }
});


/** GET /api/utilizatori/me -> user (fără parola) */
router.get("/me", requireAuth, async (req, res) => {
    try {
        const me = await Utilizator.findById(req.userId).select("-parolaHash");
        if (!me) return res.status(404).json({ message: "User inexistent" });
        res.json(me);
    } catch (e) {
        console.error("[/me]", e);
        res.status(500).json({ message: e.message || "Eroare server" });
    }
});

/** (DEV) creează rapid un user pentru test, DOAR în dev */
if (process.env.NODE_ENV !== "production") {
    router.post("/reset-dev-password", async (req, res) => {
        try {
            const { email, parola } = req.body;
            if (!email || !parola) return res.status(400).json({ message: "Email & parola necesare" });

            const u = await Utilizator.findOne({ email });
            if (!u) return res.status(404).json({ message: "User inexistent" });

            const hash = await bcrypt.hash(parola, 10);
            u.parolaHash = hash;          // scriem în câmpul corect
            u.parola = undefined;         // curățăm orice câmp vechi, dacă exista
            await u.save();

            res.json({ ok: true });
        } catch (e) {
            console.error("[/reset-dev-password]", e);
            res.status(500).json({ message: e.message || "Eroare server" });
        }
    });
}


/** (opțional) logout – la Bearer e pur client-side */
router.post("/logout", (_req, res) => res.json({ ok: true }));

module.exports = router;
