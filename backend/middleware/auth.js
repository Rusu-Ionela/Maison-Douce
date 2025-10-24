// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
    try {
        // Acceptă: Header Authorization: "Bearer <token>"
        const hdr = req.headers.authorization || '';
        const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;

        if (!token) {
            return res.status(401).json({ message: 'Lipsește token-ul (Authorization: Bearer ...)' });
        }

        const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
        const payload = jwt.verify(token, secret);

        // atașează user-ul la request pentru rutele protejate
        req.user = { id: payload.id, role: payload.role };
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Token invalid sau expirat', error: err.message });
    }
};
