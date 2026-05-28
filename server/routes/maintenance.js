const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getMaintenanceLogs, createMaintenance, getBhp, updateBhp, createBhp, getBhpPrediction, updateMaintenance } = require('../controllers/maintenanceController');

router.use(authenticate);

// Maintenance — staf lab
router.get('/maintenance', authorize('staflab'), getMaintenanceLogs);
router.post('/maintenance', authorize('staflab'), createMaintenance);
router.put('/maintenance/:id', authorize('staflab'), updateMaintenance);

// BHP — staf lab & kalab & admin & sysadmin can view, staflab & admin can modify
router.get('/bhp', authorize('staflab', 'kalab', 'admin', 'sysadmin'), getBhp);
router.get('/bhp/:id/predictive', authorize('staflab', 'kalab', 'admin', 'sysadmin'), getBhpPrediction);
router.post('/bhp', authorize('staflab', 'admin'), createBhp);
router.put('/bhp/:id', authorize('staflab', 'admin'), updateBhp);

module.exports = router;
