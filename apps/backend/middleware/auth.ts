import jwt from 'jsonwebtoken';
import { User, RevokedToken } from '../models';
import { parseCookies } from '../utils/cookies';
import redisClient from '../utils/redis';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { Op } from 'sequelize';

// Persistent blacklist for JTI values with Redis caching and MySQL fallback
export const tokenBlacklist = {
  /**
   * @param jti
   * @returns
   */
  has: async (jti: string): Promise<boolean> => {
    // 1. Try Redis first
    const isRedisReady = redisClient && redisClient.status === 'ready';
    if (isRedisReady) {
      try {
        const cached = await redisClient.get(`blacklist:${jti}`);
        if (cached !== null) {
          return cached === '1';
        }
        // If Redis is active and JTI is not in cache, it's not blacklisted (no need to query DB)
        return false;
      } catch (err: any) {
        console.warn('[Blacklist Cache Error] Redis get failed, falling back to DB:', err.message);
      }
    }

    // 2. Fallback to MySQL if Redis is down or key not found
    try {
      const found = await RevokedToken.findOne({ where: { jti } });
      return !!found;
    } catch (e: any) {
      console.error(
        '[Blacklist Has Error] Database error - treating as revoked (fail-closed):',
        e.message
      );
      return true; // Fail-closed: block access if JTI check fails
    }
  },
  /**
   * @param jti
   * @param expiresAt
   * @returns
   */
  add: async (jti: string, expiresAt?: number | Date): Promise<void> => {
    let expiry: Date;
    if (typeof expiresAt === 'number') {
      expiry = new Date(expiresAt * 1000);
    } else if (!expiresAt) {
      expiry = new Date(Date.now() + 30 * 60 * 1000); // Default 30 minutes
    } else {
      expiry = new Date(expiresAt);
    }

    // 1. Save to database (MySQL persistence)
    try {
      await RevokedToken.create({
        jti,
        expires_at: expiry,
      });
    } catch (e: any) {
      if (e.name !== 'SequelizeUniqueConstraintError') {
        console.error('[Blacklist Add DB Error]', e.message);
      }
    }

    // 2. Save to Redis with TTL
    const isRedisReady = redisClient && redisClient.status === 'ready';
    if (isRedisReady) {
      try {
        const expiryMs = expiry.getTime();
        const ttlSeconds = Math.max(0, Math.ceil((expiryMs - Date.now()) / 1000));
        if (ttlSeconds > 0) {
          await redisClient.set(`blacklist:${jti}`, '1', 'EX', ttlSeconds);
        }
      } catch (err: any) {
        console.warn('[Blacklist Cache Error] Failed to write to Redis:', err.message);
      }
    }
  },
  /**
   * @returns
   */
  cleanup: async (): Promise<void> => {
    try {
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
    } catch (e: any) {
      console.error('[Blacklist Cleanup Error]', e.message);
    }
  },
};

/**
 * JWT Authentication middleware
 * Verifies the Bearer token from cookies or Authorization header
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token: string | null = null;

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

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured.');
    }

    const decoded = jwt.verify(token, jwtSecret) as any;

    // Validate blacklist (JTI revocation)
    if (decoded.jti && (await tokenBlacklist.has(decoded.jti))) {
      return res.status(401).json({ error: 'Sesi Anda telah berakhir. Silakan login kembali.' });
    }

    const user = await User.findByPk(decoded.id);

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
  } catch (err: any) {
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
export const authorize = (...roles: string[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
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
