const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getDashboardStats } = require('../controllers/dashboardController');

router.use(authenticate);
router.get('/stats', getDashboardStats);

module.exports = router;
