"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const maintenance_1 = require("../schemas/maintenance");
const maintenanceController_1 = require("../controllers/maintenanceController");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
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
router.get('/maintenance', (0, auth_1.authorize)('staflab'), maintenanceController_1.getMaintenanceLogs);
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
router.post('/maintenance', (0, auth_1.authorize)('staflab'), (0, validation_1.validate)(maintenance_1.createMaintenanceSchema), maintenanceController_1.createMaintenance);
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
router.put('/maintenance/:id', (0, auth_1.authorize)('staflab'), (0, validation_1.validate)(maintenance_1.updateMaintenanceSchema), maintenanceController_1.updateMaintenance);
// BHP — staf lab & kalab & admin & kaprodi can view, staflab can modify (sysadmin excluded, admin cannot modify directly)
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
router.get('/bhp', (0, auth_1.authorize)('staflab', 'kalab', 'admin', 'kaprodi'), maintenanceController_1.getBhp);
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
router.get('/bhp/:id/predictive', (0, auth_1.authorize)('staflab', 'kalab', 'admin', 'kaprodi'), maintenanceController_1.getBhpPrediction);
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
router.post('/bhp', (0, auth_1.authorize)('staflab'), (0, validation_1.validate)(maintenance_1.createBhpSchema), maintenanceController_1.createBhp);
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
router.put('/bhp/:id', (0, auth_1.authorize)('staflab'), (0, validation_1.validate)(maintenance_1.updateBhpSchema), maintenanceController_1.updateBhp);
exports.default = router;
