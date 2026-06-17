"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const dashboardController_1 = require("../controllers/dashboardController");
const router = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Rangkuman Statistik Panel Informasi (Dashboard)
 */
router.use(auth_1.authenticate);
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
router.get('/stats', dashboardController_1.getDashboardStats);
exports.default = router;
