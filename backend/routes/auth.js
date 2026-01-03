const router = require('express').Router();
const { login, me } = require('../controllers/authController');
const requireAuth = require('../middleware/requireAuth');
const Utilizator = require('../models/Utilizator');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-123";

router.post('/login', login);
router.get('/me', requireAuth, me);

/**
 * POST /api/auth/seed-test-user
 * Only for testing (dev/test env). Creates or gets a test user and returns token.
 * Body: { email?, password? }
 */
router.post('/seed-test-user', async (req, res) => {
    try {
        // Only allow in dev/test env
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({ error: 'Not allowed in production' });
        }

        const testEmail = req.body?.email || 'test@example.com';
        const testPassword = req.body?.password || 'testpass123';
        const desiredRole = req.body?.rol || req.body?.role || 'admin';

        // Try to find user
        let user = await Utilizator.findOne({ email: testEmail });

        if (!user) {
            // Create test user as admin for E2E (can manage calendar)
            user = new Utilizator({
                email: testEmail,
                nume: 'Test',
                prenume: 'User',
                telefon: '0123456789',
                rol: desiredRole,
            });
            if (user.setPassword) {
                await user.setPassword(testPassword);
            } else {
                user.parola = testPassword;
            }
            await user.save();
            console.log('[seed-test-user] Created new test user:', testEmail);
        } else {
            console.log('[seed-test-user] Found existing test user:', testEmail);
        }

        if (user.rol !== desiredRole) {
            user.rol = desiredRole;
            await user.save();
        }

        // Generate token
        const token = jwt.sign(
            { id: user._id, userId: user._id, email: user.email, rol: user.rol },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            ok: true,
            user: {
                _id: user._id,
                email: user.email,
                nume: user.nume,
                prenume: user.prenume,
                rol: user.rol,
            },
            token,
        });
    } catch (e) {
        console.error('[seed-test-user] Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
