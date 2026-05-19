const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * JWT Authentication middleware
 * Verifies the Bearer token from Authorization header
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token tidak ditemukan. Silakan login.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      return res.status(401).json({ error: 'User tidak ditemukan.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Akun Anda telah dinonaktifkan.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token kadaluarsa. Silakan login ulang.' });
    }
    return res.status(401).json({ error: 'Token tidak valid.' });
  }
};

/**
 * Role-based access control middleware
 * Usage: authorize('sysadmin', 'kalab')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Tidak terautentikasi.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Akses ditolak. Role "${req.user.role}" tidak memiliki izin untuk aksi ini.` 
      });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
