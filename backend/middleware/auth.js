// backend/middleware/auth.js
const jwt = require("jsonwebtoken");
const Utilizator = require("../models/Utilizator");
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-123";

/**
 * Middleware: verifică dacă utilizatorul este autentificat (Bearer <token>)
 */
async function authRequired(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token lipsă sau invalid" });
    }

    const token = authHeader.split(" ")[1];

    // Verificăm și decodăm token-ul
    const payload = jwt.verify(token, JWT_SECRET);

    // payload poate avea id sau _id
    const userId = payload.id || payload._id;

    const user = await Utilizator.findById(userId).select("-parola");
    if (!user) {
      return res.status(401).json({ message: "Utilizator inexistent" });
    }

    // atașăm userul la request pentru rutele următoare
    req.user = user;
    next();
  } catch (err) {
    console.error("Eroare authRequired:", err.message);
    return res.status(401).json({ message: "Autentificare eșuată" });
  }
}

/**
 * Middleware: verifică rolul utilizatorului.
 * Ex: roleCheck("admin"), roleCheck("admin", "manager")
 */
function roleCheck(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Neautentificat" });
    }

    // adaptează aici dacă în model ai alt nume pentru rol
    const userRole =
      req.user.rol || req.user.role || req.user.tip || req.user.tipUtilizator;

    if (!userRole) {
      return res.status(403).json({ message: "Rol utilizator neconfigurat" });
    }

    if (roles.length > 0 && !roles.includes(userRole)) {
      return res.status(403).json({ message: "Acces interzis" });
    }

    next();
  };
}

module.exports = {
  authRequired,
  roleCheck,
};
