const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getDashboardStats } = require('../controllers/dashboardController');

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Rangkuman Statistik Panel Informasi (Dashboard)
 */

router.use(authenticate);

/**
 * @swagger
 * /dashboard/stats:
 *   get:
 *     summary: Ambil ringkasan metrik statistik untuk panel dashboard
 *     tags: [Dashboard]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengambil data statistik dashboard
 */
router.get('/stats', getDashboardStats);

module.exports = router;
