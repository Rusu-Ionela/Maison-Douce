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

/* ==== REGISTER ==== */
// POST /api/utilizatori/register
router.post("/register", async (req, res) => {
    try {
        const {
            nume,
            prenume,
            email,
            parola,
            password,
            rol = "client",
            inviteCode,
            telefon,
            adresa,
        } = req.body || {};

        const plain = parola || password;
        if (!nume || !email || !plain) {
            return res
                .status(400)
                .json({ message: "Nume, email si parola sunt necesare." });
        }

        const requestedRole = rol === "prestator" ? "patiser" : rol;
        if (requestedRole === "patiser") {
            const requiredCode = process.env.PATISER_INVITE_CODE || "PATISER-INVITE";
            if (inviteCode !== requiredCode) {
                return res.status(403).json({ message: "Cod invitatie invalid." });
            }
        }

        const existing = await Utilizator.findOne({ email });
        if (existing) {
            return res.status(409).json({ message: "Exista deja un cont cu acest email." });
        }

        const user = new Utilizator({
            nume,
            prenume: prenume || "",
            email,
            rol: requestedRole,
            telefon: telefon || "",
            adresa: adresa || "",
        });
        await user.setPassword(plain);
        await user.save();

        const token = createToken(user);
        res.status(201).json({
            token,
            user: {
                id: user._id,
                nume: user.nume,
                prenume: user.prenume,
                email: user.email,
                rol: user.rol,
                telefon: user.telefon || "",
                adresa: user.adresa || "",
                preferinte: user.preferinte || {},
                adreseSalvate: user.adreseSalvate || [],
                setariNotificari: user.setariNotificari || {},
            },
        });
    } catch (e) {
        console.error("register error:", e.message);
        res.status(500).json({ message: "Eroare server la inregistrare." });
    }
});

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
                prenume: user.prenume || "",
                telefon: user.telefon || "",
                adresa: user.adresa || "",
                preferinte: user.preferinte || {},
                adreseSalvate: user.adreseSalvate || [],
                setariNotificari: user.setariNotificari || {},
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
            prenume: user.prenume || "",
            email: user.email,
            rol: user.rol,
            telefon: user.telefon || "",
            adresa: user.adresa || "",
            adreseSalvate: user.adreseSalvate || [],
            preferinte: user.preferinte || {},
            setariNotificari: user.setariNotificari || {},
        });
    } catch (e) {
        console.error("/me error:", e.message);
        res.status(500).json({ message: "Eroare server" });
    }
});

/* ==== UPDATE PROFIL ==== */
// PUT /api/utilizatori/me
router.put("/me", authRequired, async (req, res) => {
    try {
        const {
            nume,
            prenume,
            telefon,
            adresa,
            adreseSalvate,
            preferinte,
            setariNotificari,
        } = req.body || {};

        const update = {};
        if (typeof nume === "string") update.nume = nume;
        if (typeof prenume === "string") update.prenume = prenume;
        if (typeof telefon === "string") update.telefon = telefon;
        if (typeof adresa === "string") update.adresa = adresa;
        if (Array.isArray(adreseSalvate)) update.adreseSalvate = adreseSalvate;
        if (preferinte && typeof preferinte === "object") update.preferinte = preferinte;
        if (setariNotificari && typeof setariNotificari === "object") {
            update.setariNotificari = setariNotificari;
        }

        const user = await Utilizator.findByIdAndUpdate(req.user.id, update, {
            new: true,
            runValidators: true,
        });
        if (!user) return res.status(404).json({ message: "Utilizator inexistent" });

        res.json({
            ok: true,
            user: {
                id: user._id,
                nume: user.nume,
                prenume: user.prenume || "",
                email: user.email,
                rol: user.rol,
                telefon: user.telefon || "",
                adresa: user.adresa || "",
                adreseSalvate: user.adreseSalvate || [],
                preferinte: user.preferinte || {},
                setariNotificari: user.setariNotificari || {},
            },
        });
    } catch (e) {
        console.error("/me update error:", e.message);
        res.status(500).json({ message: "Eroare server la actualizare profil." });
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
