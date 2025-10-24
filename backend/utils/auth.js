const jwt = require("jsonwebtoken");

// extrage/normalizează payload din token (acceptă varianta cu id/rol sau _id/role)
function normalizePayload(p) {
    const id = p.id || p._id;
    const role = p.rol || p.role;
    return { id, role };
}

function signUser(user) {
    const payload = { id: user._id.toString(), rol: user.rol }; // păstrăm "rol" în payload
    const secret = process.env.JWT_SECRET || "dev_secret_change_me";
    return jwt.sign(payload, secret, { expiresIn: "7d" });
}

function authRequired(req, res, next) {
    try {
        const hdr = req.headers.authorization || "";
        const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
        if (!token) return res.status(401).json({ message: "Lipsește token (Authorization: Bearer …)" });

        const secret = process.env.JWT_SECRET || "dev_secret_change_me";
        const payloadRaw = jwt.verify(token, secret);
        const { id, role } = normalizePayload(payloadRaw);
        if (!id) return res.status(401).json({ message: "Token invalid." });

        req.user = { _id: id, id, rol: role, role };
        next();
    } catch (e) {
        return res.status(401).json({ message: "Token invalid sau expirat", error: e.message });
    }
}

function role(required) {
    return function (req, res, next) {
        const r = req.user?.rol || req.user?.role;
        if (r !== required) return res.status(403).json({ message: "Acces interzis." });
        next();
    };
}

module.exports = { authRequired, role, signUser };
