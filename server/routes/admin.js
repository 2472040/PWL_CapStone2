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

// Rooms — sysadmin can modify, other roles can view
router.get('/rooms', authorize('sysadmin', 'admin', 'staflab', 'kalab'), getRooms);
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

// Secure File Upload Validation API
const { uploadImage, validateMagicBytes } = require('../middleware/upload');
router.post('/validate-qr-file', authorize('sysadmin', 'admin', 'staflab'), (req, res, next) => {
  uploadImage(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, validateMagicBytes, (req, res) => {
  res.json({
    message: 'File valid: Lolos verifikasi ukuran, tipe MIME, ekstensi, dan kecocokan Magic Bytes!',
    file: {
      name: req.file.originalname,
      size: req.file.size,
      path: req.file.path
    }
  });
});

module.exports = router;

