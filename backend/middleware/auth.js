// backend/middleware/auth.js
const jwt = require("jsonwebtoken");

function auth(req, res, next) {
  try {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Lipsă token" });

    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    // atașează user pe req pentru route-urile admin
    req.user = payload; // ex: { _id, email, role }
    next();
  } catch (e) {
    return res.status(401).json({ message: "Token invalid" });
  }
}

module.exports = auth;             // ⬅️ exportă direct funcția (nu { auth })
