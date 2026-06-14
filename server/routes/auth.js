const router = require('express').Router();
const { login, me, updateProfile, logout, refresh } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { loginRateLimiter } = require('../middleware/rateLimiter');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Autentikasi dan Manajemen Sesi Pengguna
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login pengguna ke sistem LokaLab
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: staflab
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login berhasil, token JWT diset di HttpOnly Cookie (token)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Login berhasil
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     username:
 *                       type: string
 *                       example: staflab
 *                     role:
 *                       type: string
 *                       example: staflab
 *       400:
 *         description: Username atau password salah
 *       429:
 *         description: Terlalu banyak percobaan login (Rate limit)
 */
router.post('/login', loginRateLimiter, login);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout pengguna dan hapus cookie sesi
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logout berhasil
 *       401:
 *         description: Tidak terautentikasi (Token tidak valid/tidak ada)
 */
router.post('/logout', authenticate, logout);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Rotasi token penyegar sesi (RTR)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Rotasi token berhasil
 *       401:
 *         description: Token kadaluarsa atau tidak sah
 */
router.post('/refresh', refresh);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Dapatkan profil pengguna saat ini
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Profil berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     username:
 *                       type: string
 *                     role:
 *                       type: string
 *       401:
 *         description: Tidak terautentikasi
 */
router.get('/me', authenticate, me);

/**
 * @swagger
 * /auth/profile:
 *   put:
 *     summary: Update profil/password pengguna saat ini
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profil berhasil diperbarui
 *       400:
 *         description: Validasi gagal atau password lama tidak cocok
 *       401:
 *         description: Tidak terautentikasi
 */
router.put('/profile', authenticate, updateProfile);

module.exports = router;

