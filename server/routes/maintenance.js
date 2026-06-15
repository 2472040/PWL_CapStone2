const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getMaintenanceLogs,
  createMaintenance,
  getBhp,
  updateBhp,
  createBhp,
  getBhpPrediction,
  updateMaintenance,
} = require('../controllers/maintenanceController');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Maintenance
 *   description: Manajemen Pemeliharaan Aset & Barang Habis Pakai (BHP)
 */

/**
 * @swagger
 * /maintenance:
 *   get:
 *     summary: Dapatkan daftar riwayat pemeliharaan aset
 *     tags: [Maintenance]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Daftar pemeliharaan berhasil diambil
 */
router.get('/maintenance', authorize('staflab'), getMaintenanceLogs);

/**
 * @swagger
 * /maintenance:
 *   post:
 *     summary: Buat entri log pemeliharaan aset baru
 *     tags: [Maintenance]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - inventory_id
 *               - type
 *               - description
 *             properties:
 *               inventory_id:
 *                 type: integer
 *               type:
 *                 type: string
 *                 enum: [rutin, perbaikan, kalibrasi]
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Entri pemeliharaan berhasil dibuat
 */
router.post('/maintenance', authorize('staflab'), createMaintenance);

/**
 * @swagger
 * /maintenance/{id}:
 *   put:
 *     summary: Perbarui status pemeliharaan aset (misalnya selesai)
 *     tags: [Maintenance]
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
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, selesai]
 *     responses:
 *       200:
 *         description: Status pemeliharaan berhasil diperbarui
 */
router.put('/maintenance/:id', authorize('staflab'), updateMaintenance);

// BHP — staf lab & kalab & admin & sysadmin can view, staflab & admin can modify
/**
 * @swagger
 * /bhp:
 *   get:
 *     summary: Dapatkan daftar semua stok Bahan Habis Pakai (BHP)
 *     tags: [Maintenance]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengambil daftar stok BHP
 */
router.get('/bhp', authorize('staflab', 'kalab', 'admin', 'sysadmin'), getBhp);

/**
 * @swagger
 * /bhp/{id}/predictive:
 *   get:
 *     summary: Hitung perkiraan tanggal habis stok BHP (predictive forecasting)
 *     tags: [Maintenance]
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
 *         description: Estimasi tanggal habis stok berhasil dihitung
 */
router.get(
  '/bhp/:id/predictive',
  authorize('staflab', 'kalab', 'admin', 'sysadmin'),
  getBhpPrediction
);

/**
 * @swagger
 * /bhp:
 *   post:
 *     summary: Tambah stok BHP baru ke inventaris
 *     tags: [Maintenance]
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
 *               - qty
 *               - unit
 *             properties:
 *               name:
 *                 type: string
 *               qty:
 *                 type: integer
 *               unit:
 *                 type: string
 *     responses:
 *       201:
 *         description: Stok BHP berhasil ditambahkan
 */
router.post('/bhp', authorize('staflab', 'admin'), createBhp);

/**
 * @swagger
 * /bhp/{id}:
 *   put:
 *     summary: Perbarui rincian stok BHP
 *     tags: [Maintenance]
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
 *         description: Data BHP berhasil diperbarui
 */
router.put('/bhp/:id', authorize('staflab', 'admin'), updateBhp);

module.exports = router;
