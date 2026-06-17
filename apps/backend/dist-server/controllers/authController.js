"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refresh = exports.logout = exports.updateProfile = exports.me = exports.login = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const sequelize_1 = require("sequelize");
const models_1 = require("../models");
const audit_1 = require("../middleware/audit");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const cookies_1 = require("../utils/cookies");
const errors_1 = require("../utils/errors");
/**
 * POST /api/auth/login
 * Body: { email, password }
 */
exports.login = (0, asyncHandler_1.default)(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new errors_1.BadRequestError('Email dan password wajib diisi.');
    }
    const user = await models_1.User.findOne({ where: { email } });
    if (!user) {
        await (0, audit_1.logAudit)(null, 'auth.login_failed', `Email: ${email} (Pengguna tidak ditemukan)`, req.ip);
        throw new errors_1.UnauthorizedError('Email atau password salah.');
    }
    if (user.status !== 'active') {
        await (0, audit_1.logAudit)(user.id, 'auth.login_failed', `Email: ${email} (Akun dinonaktifkan)`, req.ip);
        throw new errors_1.ForbiddenError('Akun Anda telah dinonaktifkan.');
    }
    const isMatch = await bcryptjs_1.default.compare(password, user.password);
    if (!isMatch) {
        await (0, audit_1.logAudit)(user.id, 'auth.login_failed', `Email: ${email} (Password salah)`, req.ip);
        throw new errors_1.UnauthorizedError('Email atau password salah.');
    }
    // Update last login
    user.last_login = new Date();
    await user.save();
    // Generate Access Token (15m)
    const jti = crypto_1.default.randomUUID();
    const token = jsonwebtoken_1.default.sign({
        id: user.id,
        role: user.role,
        tokenVersion: user.token_version,
        jti,
    }, process.env.JWT_SECRET || 'secret', { expiresIn: '15m' });
    // Generate Refresh Token (7d) — signed with a separate secret for isolation
    const refreshJti = crypto_1.default.randomUUID();
    const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'secret';
    const refreshToken = jsonwebtoken_1.default.sign({
        id: user.id,
        jti: refreshJti,
        type: 'refresh',
    }, refreshSecret, { expiresIn: '7d' });
    // Hash and store the Refresh Token in the database
    const hashedRefreshToken = crypto_1.default.createHash('sha256').update(refreshToken).digest('hex');
    await models_1.RefreshToken.create({
        token: hashedRefreshToken,
        user_id: user.id,
        jti: refreshJti,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    // Set Access Token HttpOnly Cookie (15 minutes)
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000, // 15 minutes
    });
    // Set Refresh Token HttpOnly Cookie (7 days) - restricted to refresh path
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/api/v1/auth/refresh',
    });
    // Set CSRF Cookie (Double Submit Cookie Pattern - must be accessible via JS)
    const csrfToken = crypto_1.default.randomBytes(32).toString('hex');
    res.cookie('csrfToken', csrfToken, {
        httpOnly: false, // Read by frontend React
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // Match refresh token duration
    });
    (0, rateLimiter_1.clearLoginAttempts)(req.ip, email);
    await (0, audit_1.logAudit)(user.id, 'auth.login', user.email, req.ip);
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
});
/**
 * GET /api/auth/me
 * Returns current authenticated user info
 */
exports.me = (0, asyncHandler_1.default)(async (req, res) => {
    // Explicitly exclude sensitive fields — req.user is a Sequelize instance that includes password hash
    const { password, ...safeUser } = req.user.toJSON ? req.user.toJSON() : req.user;
    res.json({ data: safeUser });
});
exports.updateProfile = (0, asyncHandler_1.default)(async (req, res) => {
    const { name, email, password, currentPassword } = req.body;
    const userId = req.user.id;
    const user = await models_1.User.findByPk(userId);
    if (!user) {
        throw new errors_1.NotFoundError('Pengguna tidak ditemukan.');
    }
    // Require current password verification before allowing any sensitive profile changes
    if (password || (email && email !== user.email) || (name && name !== user.name)) {
        if (!currentPassword) {
            throw new errors_1.BadRequestError('Password saat ini wajib diisi untuk mengubah profil.');
        }
        const isCurrentPasswordValid = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            throw new errors_1.UnauthorizedError('Password saat ini tidak sesuai.');
        }
    }
    if (email && email !== user.email) {
        const existing = await models_1.User.findOne({ where: { email } });
        if (existing) {
            throw new errors_1.ConflictError('Email sudah digunakan oleh akun lain.');
        }
        user.email = email;
    }
    if (name) {
        user.name = name;
        // Re-generate initials
        user.initials = name
            .split(' ')
            .map((w) => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }
    if (password) {
        if (password.length < 8) {
            throw new errors_1.BadRequestError('Password baru minimal 8 karakter.');
        }
        user.password = await bcryptjs_1.default.hash(password, 10);
        user.token_version = (user.token_version || 0) + 1; // Invalidate active sessions on password change
    }
    await user.save();
    await (0, audit_1.logAudit)(userId, 'user.update_profile', `${user.name} (${user.role})`, req.ip);
    res.json({
        data: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            initials: user.initials,
        },
    });
});
/**
 * POST /api/auth/logout
 * Clear httpOnly cookies, blacklist JTI, and increment user tokenVersion
 */
exports.logout = (0, asyncHandler_1.default)(async (req, res) => {
    const userId = req.user.id;
    const authHeader = req.headers.authorization;
    let token = null;
    let refreshToken = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }
    if (req.headers.cookie) {
        const cookies = (0, cookies_1.parseCookies)(req.headers.cookie);
        if (!token)
            token = cookies.token;
        refreshToken = cookies.refreshToken;
    }
    // Blacklist JTI for Access Token
    if (token && token !== 'true') {
        try {
            const decoded = jsonwebtoken_1.default.decode(token);
            if (decoded && decoded.jti) {
                await auth_1.tokenBlacklist.add(decoded.jti, new Date(decoded.exp * 1000));
            }
        }
        catch (e) {
            console.error('[Logout Blacklist Decode Error]', e.message);
        }
    }
    // Delete Refresh Token from database
    if (refreshToken) {
        try {
            const hashedRefreshToken = crypto_1.default.createHash('sha256').update(refreshToken).digest('hex');
            await models_1.RefreshToken.destroy({ where: { token: hashedRefreshToken } });
        }
        catch (e) {
            console.error('[Logout Refresh Token Delete Error]', e.message);
        }
    }
    // Globally invalidate other active tokens for this user
    const user = await models_1.User.findByPk(userId);
    if (user) {
        user.token_version = (user.token_version || 0) + 1;
        await user.save();
    }
    // Clear HttpOnly Access Cookie
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
    });
    // Clear HttpOnly Refresh Cookie
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/v1/auth/refresh',
    });
    // Clear CSRF Cookie
    res.clearCookie('csrfToken', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
    });
    await (0, audit_1.logAudit)(userId, 'auth.logout', req.user.email, req.ip);
    res.json({ message: 'Logout berhasil, sesi dihentikan.' });
});
/**
 * POST /api/auth/refresh
 * Rotates the refresh token and issues a new access token
 */
exports.refresh = (0, asyncHandler_1.default)(async (req, res) => {
    let refreshToken = null;
    if (req.headers.cookie) {
        const cookies = (0, cookies_1.parseCookies)(req.headers.cookie);
        refreshToken = cookies.refreshToken;
    }
    if (!refreshToken) {
        throw new errors_1.UnauthorizedError('Refresh token tidak ditemukan. Silakan login kembali.');
    }
    // Verify Refresh Token JWT signature (uses dedicated refresh secret if configured)
    let decoded;
    try {
        const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'secret';
        decoded = jsonwebtoken_1.default.verify(refreshToken, refreshSecret);
    }
    catch (e) {
        throw new errors_1.UnauthorizedError('Refresh token tidak valid atau kadaluarsa.');
    }
    // Check if it is indeed a refresh token
    if (decoded.type !== 'refresh') {
        throw new errors_1.UnauthorizedError('Tipe token tidak valid.');
    }
    // Hash the token to look up in the database
    const hashedRefreshToken = crypto_1.default.createHash('sha256').update(refreshToken).digest('hex');
    const tokenRecord = await models_1.RefreshToken.findOne({ where: { token: hashedRefreshToken } });
    // Automatic Reuse Detection
    if (!tokenRecord) {
        // Re-use detected: Valid signature but token was deleted (already rotated)
        const user = await models_1.User.findByPk(decoded.id);
        if (user) {
            // Increment token_version to invalidate all active access tokens
            user.token_version = (user.token_version || 0) + 1;
            await user.save();
            // Delete all active refresh tokens for this user
            await models_1.RefreshToken.destroy({ where: { user_id: user.id } });
            await (0, audit_1.logAudit)(user.id, 'auth.security_violation', `Deteksi penggunaan ulang refresh token (kemungkinan serangan). Sesi di-invalidate.`, req.ip);
        }
        throw new errors_1.UnauthorizedError('Peringatan keamanan: Deteksi manipulasi sesi. Silakan login kembali.');
    }
    // Check if the token is expired in database
    if (new Date() > tokenRecord.expires_at) {
        await tokenRecord.destroy();
        throw new errors_1.UnauthorizedError('Sesi Anda telah berakhir. Silakan login kembali.');
    }
    const user = await models_1.User.findByPk(tokenRecord.user_id);
    if (!user || user.status !== 'active') {
        await tokenRecord.destroy();
        throw new errors_1.UnauthorizedError('Pengguna tidak aktif atau tidak ditemukan.');
    }
    // Delete the old refresh token (rotation)
    await tokenRecord.destroy();
    // Generate new Access Token (15m)
    const newJti = crypto_1.default.randomUUID();
    const newAccessToken = jsonwebtoken_1.default.sign({
        id: user.id,
        role: user.role,
        tokenVersion: user.token_version,
        jti: newJti,
    }, process.env.JWT_SECRET || 'secret', { expiresIn: '15m' });
    // Generate new Refresh Token (7d) — signed with dedicated refresh secret
    const newRefreshJti = crypto_1.default.randomUUID();
    const newRefreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'secret';
    const newRefreshToken = jsonwebtoken_1.default.sign({
        id: user.id,
        jti: newRefreshJti,
        type: 'refresh',
    }, newRefreshSecret, { expiresIn: '7d' });
    // Hash and store the new Refresh Token
    const hashedNewRefreshToken = crypto_1.default.createHash('sha256').update(newRefreshToken).digest('hex');
    await models_1.RefreshToken.create({
        token: hashedNewRefreshToken,
        user_id: user.id,
        jti: newRefreshJti,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    // Set new Access Token HttpOnly Cookie
    res.cookie('token', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000, // 15 minutes
    });
    // Set new Refresh Token HttpOnly Cookie
    res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/v1/auth/refresh',
    });
    // Rotate CSRF token on refresh to limit exposure window
    const newCsrfToken = crypto_1.default.randomBytes(32).toString('hex');
    res.cookie('csrfToken', newCsrfToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    // Optional: Clean up expired tokens for this user in background
    models_1.RefreshToken.destroy({
        where: {
            user_id: user.id,
            expires_at: { [sequelize_1.Op.lt]: new Date() },
        },
    }).catch((e) => console.error('[Expired Token Cleanup Error]', e.message));
    res.json({
        data: {
            token: newAccessToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                initials: user.initials,
            },
        },
    });
});
