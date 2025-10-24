const router = require('express').Router();
const { login, me } = require('../controllers/authController');
const requireAuth = require('../middleware/requireAuth');

router.post('/login', login);
router.get('/me', requireAuth, me);

module.exports = router;
