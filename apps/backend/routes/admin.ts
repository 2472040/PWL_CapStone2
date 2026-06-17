import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  createUserSchema,
  updateUserSchema,
  createRoomSchema,
  updateRoomSchema,
} from '../schemas/admin';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  getAuditLogs,
  verifyAuditChain,
} from '../controllers/adminController';
import { exportBackup, restoreBackup } from '../controllers/backupController';
import { uploadImage, validateMagicBytes } from '../middleware/upload';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Manajemen Pengguna, Ruangan, Audit Log, Backup, dan Validasi Berkas
 */

// All admin routes require authentication
router.use(authenticate);

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
router.get('/users', authorize('sysadmin'), getUsers);

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
router.post('/users', authorize('sysadmin'), validate(createUserSchema), createUser);

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
router.put('/users/:id', authorize('sysadmin'), validate(updateUserSchema), updateUser);

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
router.delete('/users/:id', authorize('sysadmin'), deleteUser);

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
router.get('/rooms', authorize('sysadmin', 'admin', 'staflab', 'kalab'), getRooms);

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
router.post('/rooms', authorize('sysadmin'), validate(createRoomSchema), createRoom);

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
router.put('/rooms/:id', authorize('sysadmin'), validate(updateRoomSchema), updateRoom);

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
router.delete('/rooms/:id', authorize('sysadmin'), deleteRoom);

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
router.get('/audit-logs/verify', authorize('sysadmin'), verifyAuditChain);

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
router.get('/audit-logs', authorize('sysadmin'), getAuditLogs);

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
router.get('/backup/export', authorize('sysadmin'), exportBackup);

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
router.post('/backup/restore', authorize('sysadmin'), restoreBackup);

// Secure File Upload Validation API
router.post(
  '/validate-qr-file',
  authorize('sysadmin', 'admin', 'staflab'),
  (req, res, next) => {
    uploadImage(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  validateMagicBytes,
  (req, res) => {
    res.json({
      message:
        'File valid: Lolos verifikasi ukuran, tipe MIME, ekstensi, dan kecocokan Magic Bytes!',
      file: {
        name: req.file.originalname,
        size: req.file.size,
        path: req.file.path,
      },
    });
  }
);

export default router;
