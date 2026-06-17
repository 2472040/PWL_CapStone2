"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const inventory_1 = require("../schemas/inventory");
const inventoryController_1 = require("../controllers/inventoryController");
const router = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: Inventory
 *   description: Manajemen Inventaris Aset Laboratorium
 */
router.use(auth_1.authenticate);
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
router.get('/', (0, auth_1.authorize)('staflab', 'kalab', 'admin', 'kaprodi'), inventoryController_1.getInventory);
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
router.get('/manage/labels', (0, auth_1.authorize)('admin'), inventoryController_1.getLabels);
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
router.get('/:id', (0, auth_1.authorize)('staflab', 'kalab', 'admin', 'kaprodi'), inventoryController_1.getInventoryDetail);
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
 *         description: Hak akses ditolak (Hanya admin, staflab)
 */
router.post('/', (0, auth_1.authorize)('admin', 'staflab'), (0, validation_1.validate)(inventory_1.createInventorySchema), inventoryController_1.createInventory);
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
router.put('/:id', (0, auth_1.authorize)('admin', 'staflab'), (0, validation_1.validate)(inventory_1.updateInventorySchema), inventoryController_1.updateInventory);
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
router.put('/:id/label', (0, auth_1.authorize)('admin'), (0, validation_1.validate)(inventory_1.updateLabelSchema), inventoryController_1.updateLabel);
/**
 * @swagger
 * /inventory/{id}:
 *   delete:
 *     summary: Hapus aset inventaris (soft delete)
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
 *         description: Aset berhasil dihapus (soft delete)
 *       404:
 *         description: Aset tidak ditemukan
 */
router.delete('/:id', (0, auth_1.authorize)('sysadmin', 'admin'), inventoryController_1.deleteInventory);
/**
 * @swagger
 * /inventory/{id}/restore:
 *   post:
 *     summary: Pulihkan aset inventaris yang telah dihapus (soft delete)
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
 *         description: Aset berhasil dipulihkan
 *       404:
 *         description: Aset tidak ditemukan
 */
router.post('/:id/restore', (0, auth_1.authorize)('sysadmin'), inventoryController_1.restoreInventory);
exports.default = router;
