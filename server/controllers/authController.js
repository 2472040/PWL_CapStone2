const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { logAudit } = require('../middleware/audit');

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password wajib diisi.' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Email atau password salah.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Akun Anda telah dinonaktifkan.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email atau password salah.' });
    }

    // Update last login
    user.last_login = new Date();
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    await logAudit(user.id, 'auth.login', user.email, req.ip);

    res.json({
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          initials: user.initials,
        },
      },
    });
  } catch (err) {
    console.error('[Login Error]', err);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
};

/**
 * GET /api/auth/me
 * Returns current authenticated user info
 */
const me = async (req, res) => {
  res.json({ data: req.user });
};

module.exports = { login, me };
