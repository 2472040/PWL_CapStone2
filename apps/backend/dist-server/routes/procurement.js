"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const procurement_1 = require("../schemas/procurement");
const procurementController_1 = require("../controllers/procurementController");
const pdfController_1 = require("../controllers/pdfController");
const rateLimiter_1 = require("../middleware/rateLimiter");
const router = (0, express_1.Router)();
router.get('/verify-bast/:id/:hash', rateLimiter_1.publicVerifyRateLimiter, pdfController_1.verifyBastDocument);
/**
 * @swagger
 * tags:
 *   name: Procurement
 *   description: Manajemen Alur Pengadaan Barang (Draf, Review, Persetujuan, dan Penerimaan)
 */
router.use(auth_1.authenticate);
/**
 * @swagger
 * /procurement/drafts:
 *   get:
 *     summary: Dapatkan daftar draf pengadaan
 *     tags: [Procurement]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengambil daftar draf
 */
router.get('/drafts', (0, auth_1.authorize)('kalab', 'staflab', 'kaprodi', 'admin'), procurementController_1.getDrafts);
/**
 * @swagger
 * /procurement/drafts:
 *   post:
 *     summary: Buat draf pengadaan baru
 *     tags: [Procurement]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *     responses:
 *       201:
 *         description: Draf berhasil dibuat
 */
router.post('/drafts', (0, auth_1.authorize)('kalab', 'staflab'), (0, validation_1.validate)(procurement_1.createDraftSchema), procurementController_1.createDraft);
/**
 * @swagger
 * /procurement/drafts/{id}:
 *   put:
 *     summary: Perbarui draf pengadaan berdasarkan ID
 *     tags: [Procurement]
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
 *         description: Draf berhasil diperbarui
 */
router.put('/drafts/:id', (0, auth_1.authorize)('kalab', 'staflab'), procurementController_1.updateDraft);
/**
 * @swagger
 * /procurement/drafts/{id}/submit:
 *   post:
 *     summary: Ajukan draf pengadaan ke Kaprodi untuk di-review
 *     tags: [Procurement]
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
 *         description: Draf berhasil diajukan
 */
router.post('/drafts/:id/submit', (0, auth_1.authorize)('kalab', 'staflab'), procurementController_1.submitDraft);
/**
 * @swagger
 * /procurement/drafts/{id}/items:
 *   post:
 *     summary: Tambah item barang baru ke dalam draf pengadaan
 *     tags: [Procurement]
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
 *               - name
 *               - kind
 *               - qty
 *               - unit
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *               kind:
 *                 type: string
 *                 enum: [Inventaris, BHP]
 *               qty:
 *                 type: integer
 *               unit:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       201:
 *         description: Item berhasil ditambahkan ke draf
 */
router.post('/drafts/:id/items', (0, auth_1.authorize)('kalab', 'staflab'), (0, validation_1.validate)(procurement_1.draftItemSchema), procurementController_1.addDraftItem);
/**
 * @swagger
 * /procurement/items/{itemId}:
 *   put:
 *     summary: Perbarui item barang di dalam draf
 *     tags: [Procurement]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
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
 *         description: Item barang berhasil diperbarui
 */
router.put('/items/:itemId', (0, auth_1.authorize)('kalab', 'staflab'), (0, validation_1.validate)(procurement_1.draftItemSchema), procurementController_1.updateDraftItem);
/**
 * @swagger
 * /procurement/items/{itemId}:
 *   delete:
 *     summary: Hapus item barang dari draf
 *     tags: [Procurement]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Item berhasil dihapus
 */
router.delete('/items/:itemId', (0, auth_1.authorize)('kalab', 'staflab'), procurementController_1.deleteDraftItem);
// Kaprodi — review
/**
 * @swagger
 * /procurement/review:
 *   get:
 *     summary: Dapatkan daftar draf yang perlu di-review Kaprodi
 *     tags: [Procurement]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengambil daftar draf yang perlu di-review
 */
router.get('/review', (0, auth_1.authorize)('kaprodi'), procurementController_1.getDraftsForReview);
/**
 * @swagger
 * /procurement/drafts/{id}/approve:
 *   post:
 *     summary: Berikan keputusan persetujuan/penolakan untuk item-item draf
 *     tags: [Procurement]
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
 *             properties:
 *               decisions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     item_id:
 *                       type: integer
 *                     status:
 *                       type: string
 *                       enum: [approved, rejected]
 *                     notes:
 *                       type: string
 *     responses:
 *       200:
 *         description: Keputusan berhasil disimpan
 */
router.post('/drafts/:id/approve', (0, auth_1.authorize)('kaprodi'), procurementController_1.approveDraftItems);
/**
 * @swagger
 * /procurement/drafts/{id}/finalize:
 *   post:
 *     summary: Finalisasi draf pengadaan (Kaprodi menyetujui draf secara keseluruhan)
 *     tags: [Procurement]
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
 *         description: Draf berhasil di-finalisasi
 */
router.post('/drafts/:id/finalize', (0, auth_1.authorize)('kaprodi'), procurementController_1.finalizeDraft);
/**
 * @swagger
 * /procurement/drafts/{id}/revision:
 *   post:
 *     summary: Kaprodi meminta revisi draf pengadaan ke Kalab/Staf
 *     tags: [Procurement]
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
 *               - notes
 *             properties:
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Permintaan revisi berhasil diajukan
 */
router.post('/drafts/:id/revision', (0, auth_1.authorize)('kaprodi'), procurementController_1.requestRevision);
/**
 * @swagger
 * /procurement/history:
 *   get:
 *     summary: Dapatkan riwayat pengadaan yang telah selesai/di-approve
 *     tags: [Procurement]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengambil riwayat pengadaan
 */
router.get('/history', (0, auth_1.authorize)('kaprodi'), procurementController_1.getDraftHistory);
// Admin — receiving
/**
 * @swagger
 * /procurement/receiving:
 *   get:
 *     summary: Dapatkan daftar item yang siap diterima
 *     tags: [Procurement]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Daftar penerimaan berhasil diambil
 */
router.get('/receiving', (0, auth_1.authorize)('admin'), procurementController_1.getReceiving);
/**
 * @swagger
 * /procurement/receiving:
 *   post:
 *     summary: Catat penerimaan barang fisik di laboratorium
 *     tags: [Procurement]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - draft_item_id
 *               - qty_received
 *             properties:
 *               draft_item_id:
 *                 type: integer
 *               qty_received:
 *                 type: integer
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Penerimaan berhasil disimpan
 */
router.post('/receiving', (0, auth_1.authorize)('admin'), procurementController_1.receiveItem);
/**
 * @swagger
 * /procurement/drafts/{id}/complete:
 *   post:
 *     summary: Tandai pengadaan draf telah selesai seluruhnya
 *     tags: [Procurement]
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
 *         description: Pengadaan selesai
 */
router.post('/drafts/:id/complete', (0, auth_1.authorize)('admin'), procurementController_1.completeDraft);
/**
 * @swagger
 * /procurement/drafts/{id}/pdf:
 *   get:
 *     summary: Unduh dokumen resmi BAST PDF
 *     tags: [Procurement]
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
 *         description: Berhasil membuat dan mengirimkan berkas PDF
 *       404:
 *         description: Draf pengadaan tidak ditemukan
 */
router.get('/drafts/:id/pdf', (0, auth_1.authorize)('sysadmin', 'kalab', 'kaprodi', 'admin'), pdfController_1.generateBastPdf);
exports.default = router;
