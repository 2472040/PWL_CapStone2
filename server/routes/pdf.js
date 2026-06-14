const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { generateBastPdf } = require('../controllers/pdfController');

/**
 * @swagger
 * tags:
 *   name: Document
 *   description: Pembuatan dan Pencetakan Dokumen Resmi (PDF)
 */

/**
 * @swagger
 * /procurement/drafts/{id}/pdf:
 *   get:
 *     summary: Unduh dokumen resmi Berita Acara Serah Terima (BAST) PDF
 *     tags: [Document]
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
router.get(
  '/drafts/:id/pdf',
  authenticate,
  authorize('sysadmin', 'kalab', 'kaprodi', 'admin'),
  generateBastPdf
);

module.exports = router;
