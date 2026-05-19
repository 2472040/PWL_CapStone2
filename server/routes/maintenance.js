const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getMaintenanceLogs, createMaintenance, getBhp, updateBhp, createBhp } = require('../controllers/maintenanceController');

router.use(authenticate);

// Maintenance — staf lab
router.get('/maintenance', authorize('staflab'), getMaintenanceLogs);
router.post('/maintenance', authorize('staflab'), createMaintenance);

// BHP — staf lab & kalab can view, staflab can modify
router.get('/bhp', authorize('staflab', 'kalab'), getBhp);
router.post('/bhp', authorize('staflab'), createBhp);
router.put('/bhp/:id', authorize('staflab'), updateBhp);

module.exports = router;
