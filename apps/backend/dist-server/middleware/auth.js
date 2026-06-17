"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = exports.tokenBlacklist = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const models_1 = require("../models");
const cookies_1 = require("../utils/cookies");
const redis_1 = __importDefault(require("../utils/redis"));
const sequelize_1 = require("sequelize");
// Persistent blacklist for JTI values with Redis caching and MySQL fallback
exports.tokenBlacklist = {
    /**
     * @param jti
     * @returns
     */
    has: async (jti) => {
        // 1. Try Redis first
        const isRedisReady = redis_1.default && redis_1.default.status === 'ready';
        if (isRedisReady) {
            try {
                const cached = await redis_1.default.get(`blacklist:${jti}`);
                if (cached !== null) {
                    return cached === '1';
                }
                // If Redis is active and JTI is not in cache, it's not blacklisted (no need to query DB)
                return false;
            }
            catch (err) {
                console.warn('[Blacklist Cache Error] Redis get failed, falling back to DB:', err.message);
            }
        }
        // 2. Fallback to MySQL if Redis is down or key not found
        try {
            const found = await models_1.RevokedToken.findOne({ where: { jti } });
            return !!found;
        }
        catch (e) {
            console.error('[Blacklist Has Error] Database error - treating as revoked (fail-closed):', e.message);
            return true; // Fail-closed: block access if JTI check fails
        }
    },
    /**
     * @param jti
     * @param expiresAt
     * @returns
     */
    add: async (jti, expiresAt) => {
        let expiry;
        if (typeof expiresAt === 'number') {
            expiry = new Date(expiresAt * 1000);
        }
        else if (!expiresAt) {
            expiry = new Date(Date.now() + 30 * 60 * 1000); // Default 30 minutes
        }
        else {
            expiry = new Date(expiresAt);
        }
        // 1. Save to database (MySQL persistence)
        try {
            await models_1.RevokedToken.create({
                jti,
                expires_at: expiry,
            });
        }
        catch (e) {
            if (e.name !== 'SequelizeUniqueConstraintError') {
                console.error('[Blacklist Add DB Error]', e.message);
            }
        }
        // 2. Save to Redis with TTL
        const isRedisReady = redis_1.default && redis_1.default.status === 'ready';
        if (isRedisReady) {
            try {
                const expiryMs = expiry.getTime();
                const ttlSeconds = Math.max(0, Math.ceil((expiryMs - Date.now()) / 1000));
                if (ttlSeconds > 0) {
                    await redis_1.default.set(`blacklist:${jti}`, '1', 'EX', ttlSeconds);
                }
            }
            catch (err) {
                console.warn('[Blacklist Cache Error] Failed to write to Redis:', err.message);
            }
        }
    },
    /**
     * @returns
     */
    cleanup: async () => {
        try {
            const deletedCount = await models_1.RevokedToken.destroy({
                where: {
                    expires_at: {
                        [sequelize_1.Op.lt]: new Date(),
                    },
                },
            });
            if (deletedCount > 0) {
                console.log(`🧹 [Blacklist Cleanup] Berhasil menghapus ${deletedCount} token kedaluwarsa.`);
            }
        }
        catch (e) {
            console.error('[Blacklist Cleanup Error]', e.message);
        }
    },
};
/**
 * JWT Authentication middleware
 * Verifies the Bearer token from cookies or Authorization header
 */
const authenticate = async (req, res, next) => {
    try {
        let token = null;
        // 1. Prioritize HttpOnly cookie
        if (req.headers.cookie) {
            const cookies = (0, cookies_1.parseCookies)(req.headers.cookie);
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
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        // Validate blacklist (JTI revocation)
        if (decoded.jti && (await exports.tokenBlacklist.has(decoded.jti))) {
            return res.status(401).json({ error: 'Sesi Anda telah berakhir. Silakan login kembali.' });
        }
        const user = await models_1.User.findByPk(decoded.id);
        if (!user) {
            return res.status(401).json({ error: 'User tidak ditemukan.' });
        }
        if (user.status !== 'active') {
            return res.status(403).json({ error: 'Akun Anda telah dinonaktifkan.' });
        }
        // Validate token version (revokes token on password change, role update, or deactivation)
        if (decoded.tokenVersion === undefined || decoded.tokenVersion !== user.token_version) {
            return res.status(401).json({
                error: 'Sesi Anda tidak valid (sandi/peran berubah atau telah keluar). Silakan login ulang.',
            });
        }
        req.user = user;
        next();
    }
    catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token kadaluarsa. Silakan login ulang.' });
        }
        return res.status(401).json({ error: 'Token tidak valid.' });
    }
};
exports.authenticate = authenticate;
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
                error: `Akses ditolak. Role "${req.user.role}" tidak memiliki izin untuk aksi ini.`,
            });
        }
        next();
    };
};
exports.authorize = authorize;
