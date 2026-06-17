"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const validation_1 = require("../middleware/validation");
const auth_2 = require("../schemas/auth");
const router = (0, express_1.Router)();
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
 *             schema:
 *               type: object
 *               required:
 *                 - email
 *                 - password
 *               properties:
 *                 email:
 *                   type: string
 *                   example: maharani@kampus.id
 *                 password:
 *                   type: string
 *                   example: password123
 *     responses:
 *       200:
 *         description: Login berhasil, token JWT diset di HttpOnly Cookie (token)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         name:
 *                           type: string
 *                           example: Maharani Larasati
 *                         email:
 *                           type: string
 *                           example: maharani@kampus.id
 *                         role:
 *                           type: string
 *                           example: staflab
 *                         initials:
 *                           type: string
 *                           example: ML
 *       400:
 *         description: Username atau password salah
 *       429:
 *         description: Terlalu banyak percobaan login (Rate limit)
 */
router.post('/login', rateLimiter_1.loginRateLimiter, (0, validation_1.validate)(auth_2.loginSchema), authController_1.login);
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
router.post('/logout', auth_1.authenticate, authController_1.logout);
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
router.post('/refresh', authController_1.refresh);
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: Maharani Larasati
 *                     email:
 *                       type: string
 *                       example: maharani@kampus.id
 *                     role:
 *                       type: string
 *                       example: staflab
 *                     initials:
 *                       type: string
 *                       example: ML
 *                     status:
 *                       type: string
 *                       example: active
 *       401:
 *         description: Tidak terautentikasi
 */
router.get('/me', auth_1.authenticate, authController_1.me);
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
router.put('/profile', auth_1.authenticate, (0, validation_1.validate)(auth_2.updateProfileSchema), authController_1.updateProfile);
exports.default = router;
