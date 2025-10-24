const jwt = require('jsonwebtoken');

module.exports = function requireAuth(req, res, next) {
    const hdr = req.headers.authorization || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Lipsă token' });

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: payload.id, role: payload.role, email: payload.email };
        next();
    } catch {
        return res.status(401).json({ message: 'Token invalid sau expirat' });
    }
};
