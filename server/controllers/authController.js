const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User } = require('../models');
const { logAudit } = require('../middleware/audit');
const { tokenBlacklist } = require('../middleware/auth');
const { clearLoginAttempts } = require('../middleware/rateLimiter');

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
      await logAudit(null, 'auth.login_failed', `Email: ${email} (Pengguna tidak ditemukan)`, req.ip);
      return res.status(401).json({ error: 'Email atau password salah.' });
    }

    if (user.status !== 'active') {
      await logAudit(user.id, 'auth.login_failed', `Email: ${email} (Akun dinonaktifkan)`, req.ip);
      return res.status(403).json({ error: 'Akun Anda telah dinonaktifkan.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await logAudit(user.id, 'auth.login_failed', `Email: ${email} (Password salah)`, req.ip);
      return res.status(401).json({ error: 'Email atau password salah.' });
    }

    // Update last login
    user.last_login = new Date();
    await user.save();

    // Generate JWT with jti and tokenVersion
    const jti = crypto.randomUUID();
    const expiresIn = process.env.JWT_EXPIRES_IN || '30m';
    const token = jwt.sign(
      { 
        id: user.id, 
        role: user.role,
        tokenVersion: user.token_version,
        jti
      },
      process.env.JWT_SECRET,
      { expiresIn }
    );

    // Set HttpOnly Cookie for production grade security
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 60 * 1000 // 30 minutes
    });

    clearLoginAttempts(req.ip, email);
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

const updateProfile = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const userId = req.user.id;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }

    if (email && email !== user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(409).json({ error: 'Email sudah digunakan oleh akun lain.' });
      }
      user.email = email;
    }

    if (name) {
      user.name = name;
      // Re-generate initials
      user.initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    }

    if (password) {
      user.password = await bcrypt.hash(password, 10);
      user.token_version = (user.token_version || 0) + 1; // Invalidate active sessions on password change
    }

    await user.save();
    await logAudit(userId, 'user.update_profile', `${user.name} (${user.role})`, req.ip);

    res.json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        initials: user.initials,
      }
    });
  } catch (err) {
    console.error('[Update Profile Error]', err);
    res.status(500).json({ error: 'Gagal memperbarui profil.' });
  }
};

/**
 * POST /api/auth/logout
 * Clear httpOnly cookies, blacklist JTI, and increment user tokenVersion
 */
const logout = async (req, res) => {
  try {
    const userId = req.user.id;
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.headers.cookie) {
      const cookies = {};
      req.headers.cookie.split(';').forEach(c => {
        const parts = c.split('=');
        cookies[parts.shift().trim()] = decodeURI(parts.join('='));
      });
      token = cookies.token;
    }

    // Blacklist JTI
    if (token && token !== 'true') {
      try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.jti) {
          tokenBlacklist.add(decoded.jti);
        }
      } catch (e) {
        console.error('[Logout Blacklist Decode Error]', e.message);
      }
    }

    // Globally invalidate other active tokens for this user
    const user = await User.findByPk(userId);
    if (user) {
      user.token_version = (user.token_version || 0) + 1;
      await user.save();
    }

    // Clear HttpOnly Cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    await logAudit(userId, 'auth.logout', req.user.email, req.ip);

    res.json({ message: 'Logout berhasil, sesi dihentikan.' });
  } catch (err) {
    console.error('[Logout Error]', err);
    res.status(500).json({ error: 'Terjadi kesalahan saat logout.' });
  }
};

module.exports = { login, me, updateProfile, logout };

