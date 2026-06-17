"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const admin_1 = require("../schemas/admin");
const adminController_1 = require("../controllers/adminController");
const backupController_1 = require("../controllers/backupController");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Manajemen Pengguna, Ruangan, Audit Log, Backup, dan Validasi Berkas
 */
// All admin routes require authentication
router.use(auth_1.authenticate);
/**
 * @swagger
 * /users:
 *   get:
 *     summary: Dapatkan daftar semua pengguna
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengambil daftar pengguna
 *       403:
 *         description: Akses ditolak (Hanya sysadmin)
 */
router.get('/users', (0, auth_1.authorize)('sysadmin'), adminController_1.getUsers);
/**
 * @swagger
 * /users:
 *   post:
 *     summary: Buat pengguna baru
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - role
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [sysadmin, admin, staflab, kalab, kaprodi]
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Pengguna berhasil dibuat
 *       403:
 *         description: Akses ditolak
 */
router.post('/users', (0, auth_1.authorize)('sysadmin'), (0, validation_1.validate)(admin_1.createUserSchema), adminController_1.createUser);
/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Perbarui data pengguna
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Pengguna berhasil diperbarui
 *       403:
 *         description: Akses ditolak
 */
router.put('/users/:id', (0, auth_1.authorize)('sysadmin'), (0, validation_1.validate)(admin_1.updateUserSchema), adminController_1.updateUser);
/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Hapus pengguna
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Pengguna berhasil dihapus
 *       403:
 *         description: Akses ditolak
 */
router.delete('/users/:id', (0, auth_1.authorize)('sysadmin'), adminController_1.deleteUser);
/**
 * @swagger
 * /rooms:
 *   get:
 *     summary: Dapatkan daftar semua laboratorium/ruangan
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengambil daftar ruangan
 */
router.get('/rooms', (0, auth_1.authorize)('sysadmin', 'admin', 'staflab', 'kalab'), adminController_1.getRooms);
/**
 * @swagger
 * /rooms:
 *   post:
 *     summary: Buat ruangan baru
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - code
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               pic_user_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Ruangan berhasil dibuat
 *       403:
 *         description: Akses ditolak
 */
router.post('/rooms', (0, auth_1.authorize)('sysadmin'), (0, validation_1.validate)(admin_1.createRoomSchema), adminController_1.createRoom);
/**
 * @swagger
 * /rooms/{id}:
 *   put:
 *     summary: Perbarui data ruangan
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Ruangan berhasil diperbarui
 *       403:
 *         description: Akses ditolak
 */
router.put('/rooms/:id', (0, auth_1.authorize)('sysadmin'), (0, validation_1.validate)(admin_1.updateRoomSchema), adminController_1.updateRoom);
/**
 * @swagger
 * /rooms/{id}:
 *   delete:
 *     summary: Hapus ruangan
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ruangan berhasil dihapus
 *       403:
 *         description: Akses ditolak
 */
router.delete('/rooms/:id', (0, auth_1.authorize)('sysadmin'), adminController_1.deleteRoom);
/**
 * @swagger
 * /audit-logs/verify:
 *   get:
 *     summary: Verifikasi integritas rantai hash audit log (anti-tamper)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Integritas rantai log terverifikasi dengan sukses
 *       400:
 *         description: Rantai log terdeteksi telah dimodifikasi (tampered)
 *       403:
 *         description: Akses ditolak
 */
router.get('/audit-logs/verify', (0, auth_1.authorize)('sysadmin'), adminController_1.verifyAuditChain);
/**
 * @swagger
 * /audit-logs:
 *   get:
 *     summary: Ambil daftar audit log
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengambil daftar audit log
 *       403:
 *         description: Akses ditolak
 */
router.get('/audit-logs', (0, auth_1.authorize)('sysadmin'), adminController_1.getAuditLogs);
/**
 * @swagger
 * /backup/export:
 *   get:
 *     summary: Ekspor backup database terenkripsi AES-256-GCM
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengunduh berkas backup terenkripsi
 *       403:
 *         description: Akses ditolak
 */
router.get('/backup/export', (0, auth_1.authorize)('sysadmin'), backupController_1.exportBackup);
/**
 * @swagger
 * /backup/restore:
 *   post:
 *     summary: Restorasi database dari berkas backup terenkripsi
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Database berhasil di-restore
 *       400:
 *         description: Berkas backup rusak atau kunci dekripsi salah
 *       403:
 *         description: Akses ditolak
 */
router.post('/backup/restore', (0, auth_1.authorize)('sysadmin'), backupController_1.restoreBackup);
// Secure File Upload Validation API
router.post('/validate-qr-file', (0, auth_1.authorize)('sysadmin', 'admin', 'staflab'), (req, res, next) => {
    (0, upload_1.uploadImage)(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, upload_1.validateMagicBytes, (req, res) => {
    res.json({
        message: 'File valid: Lolos verifikasi ukuran, tipe MIME, ekstensi, dan kecocokan Magic Bytes!',
        file: {
            name: req.file.originalname,
            size: req.file.size,
            path: req.file.path,
        },
    });
});
exports.default = router;
