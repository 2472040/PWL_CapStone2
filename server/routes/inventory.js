const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getInventory, getInventoryDetail, createInventory, updateInventory,
  updateLabel, getLabels, importInventory,
} = require('../controllers/inventoryController');

router.use(authenticate);

// All roles can view inventory
router.get('/', getInventory);
router.get('/:id', getInventoryDetail);

// Admin & sysadmin can create/update/import inventory
router.post('/', authorize('sysadmin', 'admin'), createInventory);
router.post('/import', authorize('sysadmin', 'admin'), importInventory);
router.put('/:id', authorize('sysadmin', 'admin', 'staflab'), updateInventory);

// Admin: label management
router.put('/:id/label', authorize('admin'), updateLabel);
router.get('/manage/labels', authorize('admin'), getLabels);

module.exports = router;
