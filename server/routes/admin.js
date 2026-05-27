const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getUsers, createUser, updateUser, deleteUser,
  getRooms, createRoom, updateRoom, deleteRoom,
  getAuditLogs, verifyAuditChain,
} = require('../controllers/adminController');

// All admin routes require authentication
router.use(authenticate);

// Users — sysadmin only
router.get('/users', authorize('sysadmin'), getUsers);
router.post('/users', authorize('sysadmin'), createUser);
router.put('/users/:id', authorize('sysadmin'), updateUser);
router.delete('/users/:id', authorize('sysadmin'), deleteUser);

// Rooms — sysadmin only
router.get('/rooms', authorize('sysadmin'), getRooms);
router.post('/rooms', authorize('sysadmin'), createRoom);
router.put('/rooms/:id', authorize('sysadmin'), updateRoom);
router.delete('/rooms/:id', authorize('sysadmin'), deleteRoom);

// Audit logs — sysadmin only
router.get('/audit-logs/verify', authorize('sysadmin'), verifyAuditChain);
router.get('/audit-logs', authorize('sysadmin'), getAuditLogs);

// Database Backup & Restore — sysadmin only
const { exportBackup, restoreBackup } = require('../controllers/backupController');
router.get('/backup/export', authorize('sysadmin'), exportBackup);
router.post('/backup/restore', authorize('sysadmin'), restoreBackup);

module.exports = router;

