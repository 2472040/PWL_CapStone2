import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  createInventorySchema,
  updateInventorySchema,
  updateLabelSchema,
} from '../schemas/inventory';
import {
  getInventory,
  getInventoryDetail,
  createInventory,
  updateInventory,
  updateLabel,
  getLabels,
  deleteInventory,
  restoreInventory,
} from '../controllers/inventoryController';

const router = Router();

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
router.get('/', authorize('staflab', 'kalab', 'admin', 'kaprodi'), getInventory);

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
router.get('/:id', authorize('staflab', 'kalab', 'admin', 'kaprodi'), getInventoryDetail);

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
router.post('/', authorize('admin', 'staflab'), validate(createInventorySchema), createInventory);

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
router.put('/:id', authorize('admin', 'staflab'), validate(updateInventorySchema), updateInventory);

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
router.put('/:id/label', authorize('admin'), validate(updateLabelSchema), updateLabel);

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
router.delete('/:id', authorize('sysadmin', 'admin'), deleteInventory);

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
router.post('/:id/restore', authorize('sysadmin'), restoreInventory);

export default router;
