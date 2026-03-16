const Utilizator = require("../models/Utilizator");
const { verifyAuthToken } = require("../utils/jwt");
const { createLogger, serializeError } = require("../utils/log");

const authLog = createLogger("auth");

async function authRequired(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token lipsa sau invalid" });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return res.status(401).json({ message: "Token lipsa sau invalid" });
    }

    const payload = verifyAuthToken(token);
    const userId = payload.id || payload.userId || payload._id;
    const user = await Utilizator.findById(userId).select("-parola -parolaHash");

    if (!user) {
      return res.status(401).json({ message: "Utilizator inexistent" });
    }
    if (user.activ === false) {
      return res.status(401).json({ message: "Contul este dezactivat." });
    }

    req.user = user;
    req.auth = payload;
    next();
  } catch (err) {
    authLog.error("auth_required_failed", {
      error: serializeError(err),
    });
    if (err.message === "JWT_SECRET is not configured.") {
      return res.status(500).json({ message: "Configuratia de autentificare lipseste." });
    }
    return res.status(401).json({ message: "Autentificare esuata" });
  }
}

async function authOptional(req, _res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return next();
    }

    const payload = verifyAuthToken(token);
    const userId = payload.id || payload.userId || payload._id;
    const user = await Utilizator.findById(userId).select("-parola -parolaHash");

    if (!user || user.activ === false) {
      return next();
    }

    req.user = user;
    req.auth = payload;
    return next();
  } catch {
    return next();
  }
}

function roleCheck(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Neautentificat" });
    }

    const rawRole =
      req.user.rol || req.user.role || req.user.tip || req.user.tipUtilizator;
    const userRole = rawRole === "prestator" ? "patiser" : rawRole;

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
  authOptional,
  authRequired,
  roleCheck,
};
