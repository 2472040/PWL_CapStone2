// @ts-check
const jwt = require('jsonwebtoken');
const { User, RevokedToken } = require('../models');
const { parseCookies } = require('../utils/cookies');

// Persistent blacklist for JTI values in MySQL
const tokenBlacklist = {
  /**
   * @param {string} jti
   * @returns {Promise<boolean>}
   */
  has: async (jti) => {
    try {
      const found = await RevokedToken.findOne({ where: { jti } });
      return !!found;
    } catch (e) {
      console.error(
        '[Blacklist Has Error] Database error - treating as revoked (fail-closed):',
        // @ts-ignore
        e.message
      );
      return true; // Fail-closed: block access if JTI check fails
    }
  },
  /**
   * @param {string} jti
   * @param {number|Date} [expiresAt]
   * @returns {Promise<void>}
   */
  add: async (jti, expiresAt) => {
    try {
      let expiry = expiresAt;
      if (typeof expiresAt === 'number') {
        expiry = new Date(expiresAt * 1000);
      } else if (!expiresAt) {
        expiry = new Date(Date.now() + 30 * 60 * 1000); // Default 30 minutes
      }
      await RevokedToken.create({
        jti,
        expires_at: expiry,
      });
    } catch (e) {
      // @ts-ignore
      if (e.name !== 'SequelizeUniqueConstraintError') {
        // @ts-ignore
        console.error('[Blacklist Add Error]', e.message);
      }
    }
  },
  /**
   * @returns {Promise<void>}
   */
  cleanup: async () => {
    try {
      const { Op } = require('sequelize');
      const deletedCount = await RevokedToken.destroy({
        where: {
          expires_at: {
            [Op.lt]: new Date(),
          },
        },
      });
      if (deletedCount > 0) {
        console.log(`🧹 [Blacklist Cleanup] Berhasil menghapus ${deletedCount} token kedaluwarsa.`);
      }
    } catch (e) {
      // @ts-ignore
      console.error('[Blacklist Cleanup Error]', e.message);
    }
  },
};

/**
 * JWT Authentication middleware
 * Verifies the Bearer token from cookies or Authorization header
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // 1. Prioritize HttpOnly cookie
    if (req.headers.cookie) {
      const cookies = parseCookies(req.headers.cookie);
      token = cookies.token || null;
    }

    // 2. Fallback to Bearer Authorization header
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const bearerToken = authHeader.split(' ')[1];
        // Ignore placeholder values from frontend
        if (bearerToken && bearerToken !== 'true') {
          token = bearerToken;
        }
      }
    }

    if (!token) {
      return res.status(401).json({ error: 'Token tidak ditemukan. Silakan login.' });
    }

    // @ts-ignore
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Validate blacklist (JTI revocation)
    if (decoded.jti && (await tokenBlacklist.has(decoded.jti))) {
      return res.status(401).json({ error: 'Sesi Anda telah berakhir. Silakan login kembali.' });
    }

    const user = /** @type {any} */ (await User.findByPk(decoded.id));

    if (!user) {
      return res.status(401).json({ error: 'User tidak ditemukan.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Akun Anda telah dinonaktifkan.' });
    }

    // Validate token version (revokes token on password change, role update, or deactivation)
    if (decoded.tokenVersion === undefined || decoded.tokenVersion !== user.token_version) {
      return res.status(401).json({
        error:
          'Sesi Anda tidak valid (sandi/peran berubah atau telah keluar). Silakan login ulang.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    // @ts-ignore
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token kadaluarsa. Silakan login ulang.' });
    }
    return res.status(401).json({ error: 'Token tidak valid.' });
  }
};

/**
 * Role-based access control middleware
 * Usage: authorize('sysadmin', 'kalab')
 * @param {...string} roles
 * @returns {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => void}
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Tidak terautentikasi.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Akses ditolak. Role "${req.user.role}" tidak memiliki izin untuk aksi ini.`,
      });
    }
    next();
  };
};

module.exports = { authenticate, authorize, tokenBlacklist };
