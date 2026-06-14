const router = require('express').Router();
const { login, me, updateProfile, logout, refresh } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { loginRateLimiter } = require('../middleware/rateLimiter');

router.post('/login', loginRateLimiter, login);
router.post('/logout', authenticate, logout);
router.post('/refresh', refresh);
router.get('/me', authenticate, me);
router.put('/profile', authenticate, updateProfile);

module.exports = router;

