import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { createDraftSchema, draftItemSchema } from '../schemas/procurement';
import {
  getDrafts,
  createDraft,
  updateDraft,
  submitDraft,
  addDraftItem,
  deleteDraftItem,
  updateDraftItem,
  getDraftsForReview,
  approveDraftItems,
  finalizeDraft,
  getDraftHistory,
  getReceiving,
  receiveItem,
  completeDraft,
  requestRevision,
} from '../controllers/procurementController';
import { generateBastPdf } from '../controllers/pdfController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Procurement
 *   description: Manajemen Alur Pengadaan Barang (Draf, Review, Persetujuan, dan Penerimaan)
 */

router.use(authenticate);

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
router.get('/drafts', authorize('kalab', 'staflab', 'kaprodi', 'admin'), getDrafts);

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
router.post('/drafts', authorize('kalab', 'staflab'), validate(createDraftSchema), createDraft);

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
router.put('/drafts/:id', authorize('kalab', 'staflab'), updateDraft);

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
router.post('/drafts/:id/submit', authorize('kalab', 'staflab'), submitDraft);

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
router.post(
  '/drafts/:id/items',
  authorize('kalab', 'staflab'),
  validate(draftItemSchema),
  addDraftItem
);

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
router.put(
  '/items/:itemId',
  authorize('kalab', 'staflab'),
  validate(draftItemSchema),
  updateDraftItem
);

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
router.delete('/items/:itemId', authorize('kalab', 'staflab'), deleteDraftItem);

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
router.get('/review', authorize('kaprodi'), getDraftsForReview);

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
router.post('/drafts/:id/approve', authorize('kaprodi'), approveDraftItems);

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
router.post('/drafts/:id/finalize', authorize('kaprodi'), finalizeDraft);

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
router.post('/drafts/:id/revision', authorize('kaprodi'), requestRevision);

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
router.get('/history', authorize('kaprodi'), getDraftHistory);

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
router.get('/receiving', authorize('admin'), getReceiving);

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
router.post('/receiving', authorize('admin'), receiveItem);

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
router.post('/drafts/:id/complete', authorize('admin'), completeDraft);

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
router.get('/drafts/:id/pdf', authorize('sysadmin', 'kalab', 'kaprodi', 'admin'), generateBastPdf);

export default router;
