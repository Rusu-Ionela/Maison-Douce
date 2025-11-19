// backend/routes/utilizatori.js
const express = require("express");
const jwt = require("jsonwebtoken");
const Utilizator = require("../models/Utilizator");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-123";

/* ==== helperi ==== */
function createToken(user) {
    return jwt.sign(
        {
            id: user._id,
            email: user.email,
            rol: user.rol,
            nume: user.nume,
        },
        JWT_SECRET,
        { expiresIn: "7d" }
    );
}

function authRequired(req, res, next) {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ")
        ? auth.slice(7)
        : null;

    if (!token) {
        return res.status(401).json({ message: "Lipsă token" });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    } catch (e) {
        return res.status(401).json({ message: "Token invalid sau expirat" });
    }
}

/* ==== LOGIN ==== */
// POST /api/utilizatori/login
router.post("/login", async (req, res) => {
    try {
        const { email, parola, password } = req.body;
        const plain = parola || password;

        if (!email || !plain) {
            return res
                .status(400)
                .json({ message: "Email și parolă sunt necesare" });
        }

        const user = await Utilizator.findOne({ email }).select(
            "+parolaHash +parola"
        );
        if (!user) {
            return res
                .status(401)
                .json({ message: "Email sau parolă greșite" });
        }

        const ok = await user.comparePassword(plain);
        if (!ok) {
            return res
                .status(401)
                .json({ message: "Email sau parolă greșite" });
        }

        const token = createToken(user);

        res.json({
            token,
            user: {
                id: user._id,
                nume: user.nume,
                email: user.email,
                rol: user.rol,
            },
        });
    } catch (e) {
        console.error("login error:", e.message);
        res
            .status(500)
            .json({ message: "Eroare server la login" });
    }
});

/* ==== /me ==== */
// GET /api/utilizatori/me
router.get("/me", authRequired, async (req, res) => {
    try {
        const user = await Utilizator.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "Utilizator inexistent" });
        }

        res.json({
            id: user._id,
            nume: user.nume,
            email: user.email,
            rol: user.rol,
        });
    } catch (e) {
        console.error("/me error:", e.message);
        res.status(500).json({ message: "Eroare server" });
    }
});

/* ==== RESET PAROLĂ ==== */
// POST /api/utilizatori/reset-password
// Body: { email, newPassword }
router.post("/reset-password", async (req, res) => {
    try {
        const { email, newPassword } = req.body;

        if (!email || !newPassword) {
            return res.status(400).json({
                message: "Email și parolă nouă sunt necesare",
            });
        }

        const user = await Utilizator.findOne({ email }).select(
            "+parolaHash +parola"
        );
        if (!user) {
            return res.status(404).json({
                message: "Nu există utilizator cu acest email",
            });
        }

        await user.setPassword(newPassword);
        await user.save();

        res.json({
            ok: true,
            message: "Parola a fost resetată cu succes",
        });
    } catch (e) {
        console.error("reset-password error:", e.message);
        res
            .status(500)
            .json({ message: "Eroare server la resetare parolă" });
    }
});

/* ==== LOGOUT – opțional ==== */
// POST /api/utilizatori/logout
router.post("/logout", (req, res) => {
    // doar pentru simetrie; frontend șterge token-ul
    res.json({ ok: true });
});

module.exports = router;
