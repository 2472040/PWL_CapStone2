const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getInventory,
  getInventoryDetail,
  createInventory,
  updateInventory,
  updateLabel,
  getLabels,
} = require('../controllers/inventoryController');

/**
 * @swagger
 * tags:
 *   name: Inventory
 *   description: Manajemen Inventaris Aset Laboratorium
 */

router.use(authenticate);

/**
 * @swagger
 * /inventory:
 *   get:
 *     summary: Dapatkan daftar semua aset inventaris
 *     tags: [Inventory]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengambil daftar inventaris
 *       401:
 *         description: Tidak terautentikasi
 */
router.get('/', getInventory);

/**
 * @swagger
 * /inventory/{id}:
 *   get:
 *     summary: Dapatkan detail satu aset inventaris berdasarkan ID
 *     tags: [Inventory]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID Aset
 *     responses:
 *       200:
 *         description: Detail aset berhasil diambil
 *       404:
 *         description: Aset tidak ditemukan
 */
router.get('/:id', getInventoryDetail);

/**
 * @swagger
 * /inventory:
 *   post:
 *     summary: Buat aset inventaris baru
 *     tags: [Inventory]
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
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [alat, bahan, bhp]
 *     responses:
 *       201:
 *         description: Aset berhasil dibuat
 *       403:
 *         description: Hak akses ditolak (Hanya sysadmin, admin, staflab)
 */
router.post('/', authorize('sysadmin', 'admin', 'staflab'), createInventory);

/**
 * @swagger
 * /inventory/{id}:
 *   put:
 *     summary: Update data aset inventaris berdasarkan ID
 *     tags: [Inventory]
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
 *         description: Aset berhasil diperbarui
 *       403:
 *         description: Hak akses ditolak
 */
router.put('/:id', authorize('sysadmin', 'admin', 'staflab'), updateInventory);

/**
 * @swagger
 * /inventory/{id}/label:
 *   put:
 *     summary: Update atau buat QR label untuk suatu aset
 *     tags: [Inventory]
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
 *         description: Label berhasil diperbarui
 *       403:
 *         description: Hanya admin yang diizinkan
 */
router.put('/:id/label', authorize('admin'), updateLabel);

/**
 * @swagger
 * /inventory/manage/labels:
 *   get:
 *     summary: Dapatkan daftar seluruh label aset
 *     tags: [Inventory]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Daftar label berhasil diambil
 *       403:
 *         description: Hanya admin yang diizinkan
 */
router.get('/manage/labels', authorize('admin'), getLabels);

module.exports = router;
