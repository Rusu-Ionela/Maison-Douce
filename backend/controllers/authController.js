const jwt = require('jsonwebtoken');
const Utilizator = require('../models/Utilizator');

function signToken(user) {
    return jwt.sign(
        { id: user._id, role: user.rol, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES || '7d' }
    );
}

exports.login = async (req, res) => {
    const { email, parola } = req.body;
    if (!email || !parola) return res.status(400).json({ message: 'Email și parola obligatorii' });

    const user = await Utilizator.findOne({ email }).select('+parola');
    if (!user) return res.status(401).json({ message: 'Credențiale invalide' });

    const ok = await user.comparePassword(parola);
    if (!ok) return res.status(401).json({ message: 'Credențiale invalide' });

    const token = signToken(user);
    const { parola: _, ...safe } = user.toObject();
    res.json({ token, user: safe });
};

exports.me = async (req, res) => {
    const user = await Utilizator.findById(req.user.id).select('-parola');
    if (!user) return res.status(404).json({ message: 'User inexistent' });
    res.json(user);
};
