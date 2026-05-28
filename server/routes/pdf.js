const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { generateBastPdf } = require('../controllers/pdfController');

router.get('/drafts/:id/pdf', authenticate, generateBastPdf);

module.exports = router;
