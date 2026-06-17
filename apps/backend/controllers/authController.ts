import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Op } from 'sequelize';
import { User, RefreshToken } from '../models';
import { logAudit } from '../middleware/audit';
import { tokenBlacklist } from '../middleware/auth';
import { clearLoginAttempts } from '../middleware/rateLimiter';
import asyncHandler from '../utils/asyncHandler';
import { parseCookies } from '../utils/cookies';
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from '../utils/errors';

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
export const login = asyncHandler(async (req: any, res: any) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new BadRequestError('Email dan password wajib diisi.');
  }

  const user = await User.findOne({ where: { email } });
  if (!user) {
    await logAudit(null, 'auth.login_failed', `Email: ${email} (Pengguna tidak ditemukan)`, req.ip);
    throw new UnauthorizedError('Email atau password salah.');
  }

  if (user.status !== 'active') {
    await logAudit(user.id, 'auth.login_failed', `Email: ${email} (Akun dinonaktifkan)`, req.ip);
    throw new ForbiddenError('Akun Anda telah dinonaktifkan.');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    await logAudit(user.id, 'auth.login_failed', `Email: ${email} (Password salah)`, req.ip);
    throw new UnauthorizedError('Email atau password salah.');
  }

  // Update last login
  user.last_login = new Date();
  await user.save();

  // Generate Access Token (15m)
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      tokenVersion: user.token_version,
      jti,
    },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '15m' }
  );

  // Generate Refresh Token (7d) — signed with a separate secret for isolation
  const refreshJti = crypto.randomUUID();
  const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'secret';
  const refreshToken = jwt.sign(
    {
      id: user.id,
      jti: refreshJti,
      type: 'refresh',
    },
    refreshSecret,
    { expiresIn: '7d' }
  );

  // Hash and store the Refresh Token in the database
  const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await RefreshToken.create({
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
  const csrfToken = crypto.randomBytes(32).toString('hex');
  res.cookie('csrfToken', csrfToken, {
    httpOnly: false, // Read by frontend React
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // Match refresh token duration
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
});

/**
 * GET /api/auth/me
 * Returns current authenticated user info
 */
export const me = asyncHandler(async (req: any, res: any) => {
  // Explicitly exclude sensitive fields — req.user is a Sequelize instance that includes password hash
  const { password, ...safeUser } = req.user.toJSON ? req.user.toJSON() : req.user;
  res.json({ data: safeUser });
});

export const updateProfile = asyncHandler(async (req: any, res: any) => {
  const { name, email, password, currentPassword } = req.body;
  const userId = req.user.id;

  const user = await User.findByPk(userId);
  if (!user) {
    throw new NotFoundError('Pengguna tidak ditemukan.');
  }

  // Require current password verification before allowing any sensitive profile changes
  if (password || (email && email !== user.email) || (name && name !== user.name)) {
    if (!currentPassword) {
      throw new BadRequestError('Password saat ini wajib diisi untuk mengubah profil.');
    }
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedError('Password saat ini tidak sesuai.');
    }
  }

  if (email && email !== user.email) {
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      throw new ConflictError('Email sudah digunakan oleh akun lain.');
    }
    user.email = email;
  }

  if (name) {
    user.name = name;
    // Re-generate initials
    user.initials = name
      .split(' ')
      .map((w: string) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  if (password) {
    if (password.length < 8) {
      throw new BadRequestError('Password baru minimal 8 karakter.');
    }
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
    },
  });
});

/**
 * POST /api/auth/logout
 * Clear httpOnly cookies, blacklist JTI, and increment user tokenVersion
 */
export const logout = asyncHandler(async (req: any, res: any) => {
  const userId = req.user.id;
  const authHeader = req.headers.authorization;
  let token = null;
  let refreshToken = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (req.headers.cookie) {
    const cookies = parseCookies(req.headers.cookie);
    if (!token) token = cookies.token;
    refreshToken = cookies.refreshToken;
  }

  // Blacklist JTI for Access Token
  if (token && token !== 'true') {
    try {
      const decoded: any = jwt.decode(token);
      if (decoded && decoded.jti) {
        await tokenBlacklist.add(decoded.jti, new Date(decoded.exp * 1000));
      }
    } catch (e: any) {
      console.error('[Logout Blacklist Decode Error]', e.message);
    }
  }

  // Delete Refresh Token from database
  if (refreshToken) {
    try {
      const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await RefreshToken.destroy({ where: { token: hashedRefreshToken } });
    } catch (e: any) {
      console.error('[Logout Refresh Token Delete Error]', e.message);
    }
  }

  // Globally invalidate other active tokens for this user
  const user = await User.findByPk(userId);
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

  await logAudit(userId, 'auth.logout', req.user.email, req.ip);

  res.json({ message: 'Logout berhasil, sesi dihentikan.' });
});

/**
 * POST /api/auth/refresh
 * Rotates the refresh token and issues a new access token
 */
export const refresh = asyncHandler(async (req: any, res: any) => {
  let refreshToken = null;

  if (req.headers.cookie) {
    const cookies = parseCookies(req.headers.cookie);
    refreshToken = cookies.refreshToken;
  }

  if (!refreshToken) {
    throw new UnauthorizedError('Refresh token tidak ditemukan. Silakan login kembali.');
  }

  // Verify Refresh Token JWT signature (uses dedicated refresh secret if configured)
  let decoded: any;
  try {
    const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'secret';
    decoded = jwt.verify(refreshToken, refreshSecret);
  } catch (e) {
    throw new UnauthorizedError('Refresh token tidak valid atau kadaluarsa.');
  }

  // Check if it is indeed a refresh token
  if (decoded.type !== 'refresh') {
    throw new UnauthorizedError('Tipe token tidak valid.');
  }

  // Hash the token to look up in the database
  const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const tokenRecord = await RefreshToken.findOne({ where: { token: hashedRefreshToken } });

  // Automatic Reuse Detection
  if (!tokenRecord) {
    // Re-use detected: Valid signature but token was deleted (already rotated)
    const user = await User.findByPk(decoded.id);
    if (user) {
      // Increment token_version to invalidate all active access tokens
      user.token_version = (user.token_version || 0) + 1;
      await user.save();
      // Delete all active refresh tokens for this user
      await RefreshToken.destroy({ where: { user_id: user.id } });
      await logAudit(
        user.id,
        'auth.security_violation',
        `Deteksi penggunaan ulang refresh token (kemungkinan serangan). Sesi di-invalidate.`,
        req.ip
      );
    }
    throw new UnauthorizedError(
      'Peringatan keamanan: Deteksi manipulasi sesi. Silakan login kembali.'
    );
  }

  // Check if the token is expired in database
  if (new Date() > tokenRecord.expires_at) {
    await tokenRecord.destroy();
    throw new UnauthorizedError('Sesi Anda telah berakhir. Silakan login kembali.');
  }

  const user = await User.findByPk(tokenRecord.user_id);
  if (!user || user.status !== 'active') {
    await tokenRecord.destroy();
    throw new UnauthorizedError('Pengguna tidak aktif atau tidak ditemukan.');
  }

  // Delete the old refresh token (rotation)
  await tokenRecord.destroy();

  // Generate new Access Token (15m)
  const newJti = crypto.randomUUID();
  const newAccessToken = jwt.sign(
    {
      id: user.id,
      role: user.role,
      tokenVersion: user.token_version,
      jti: newJti,
    },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '15m' }
  );

  // Generate new Refresh Token (7d) — signed with dedicated refresh secret
  const newRefreshJti = crypto.randomUUID();
  const newRefreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'secret';
  const newRefreshToken = jwt.sign(
    {
      id: user.id,
      jti: newRefreshJti,
      type: 'refresh',
    },
    newRefreshSecret,
    { expiresIn: '7d' }
  );

  // Hash and store the new Refresh Token
  const hashedNewRefreshToken = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
  await RefreshToken.create({
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
  const newCsrfToken = crypto.randomBytes(32).toString('hex');
  res.cookie('csrfToken', newCsrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // Optional: Clean up expired tokens for this user in background
  RefreshToken.destroy({
    where: {
      user_id: user.id,
      expires_at: { [Op.lt]: new Date() },
    },
  }).catch((e: any) => console.error('[Expired Token Cleanup Error]', e.message));

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
