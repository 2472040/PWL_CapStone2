const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { createDraftSchema, draftItemSchema } = require('../schemas/procurement');
const {
  getDrafts,
  createDraft,
  updateDraft,
  submitDraft,
  addDraftItem,
  deleteDraftItem,
  updateDraftItem,
  getDraftsForReview,
  approveDraftItems,
  finalizeDraft,
  getDraftHistory,
  getReceiving,
  receiveItem,
  completeDraft,
  requestRevision,
} = require('../controllers/procurementController');

router.use(authenticate);

// Kalab & Staflab — pengadaan
router.get('/drafts', authorize('kalab', 'staflab', 'kaprodi', 'admin'), getDrafts);
router.post('/drafts', authorize('kalab', 'staflab'), validate(createDraftSchema), createDraft);
router.put('/drafts/:id', authorize('kalab', 'staflab'), updateDraft);
router.post('/drafts/:id/submit', authorize('kalab', 'staflab'), submitDraft);
router.post(
  '/drafts/:id/items',
  authorize('kalab', 'staflab'),
  validate(draftItemSchema),
  addDraftItem
);
router.put(
  '/items/:itemId',
  authorize('kalab', 'staflab'),
  validate(draftItemSchema),
  updateDraftItem
);
router.delete('/items/:itemId', authorize('kalab', 'staflab'), deleteDraftItem);

// Kaprodi — review
router.get('/review', authorize('kaprodi'), getDraftsForReview);
router.post('/drafts/:id/approve', authorize('kaprodi'), approveDraftItems);
router.post('/drafts/:id/finalize', authorize('kaprodi'), finalizeDraft);
router.post('/drafts/:id/revision', authorize('kaprodi'), requestRevision);
router.get('/history', authorize('kaprodi'), getDraftHistory);

// Admin — receiving
router.get('/receiving', authorize('admin'), getReceiving);
router.post('/receiving', authorize('admin'), receiveItem);
router.post('/drafts/:id/complete', authorize('admin'), completeDraft);

module.exports = router;
