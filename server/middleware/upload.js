const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists inside workspace
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration with filename sanitization
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename to prevent path traversal (OWASP)
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${sanitized}`);
  },
});

// File Filter for extensions and MIME types
const fileFilter = (req, file, cb) => {
  const allowedExts = ['.png', '.jpg', '.jpeg'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedExts.includes(ext)) {
    return cb(new Error('Ekstensi file tidak didukung. Hanya menerima .png, .jpg, .jpeg'), false);
  }

  const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Tipe MIME tidak didukung. Hanya menerima gambar PNG atau JPEG'), false);
  }

  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB strict size limit
  },
});

/**
 * Deep Inspection Middleware (Magic Bytes Validation)
 * Reads the first few bytes of the uploaded file to verify that
 * a .jpg/.png is truly a valid image and not an executable/script in disguise.
 */
const validateMagicBytes = (req, res, next) => {
  if (!req.file) {
    return next();
  }

  const filePath = req.file.path;

  fs.open(filePath, 'r', (err, fd) => {
    if (err) {
      return res.status(500).json({ error: 'Gagal memvalidasi integritas file.' });
    }

    const buffer = Buffer.alloc(4);
    fs.read(fd, buffer, 0, 4, 0, (readErr, bytesRead) => {
      fs.close(fd, () => {});

      if (readErr) {
        // Clean up file on failure
        fs.unlink(filePath, () => {});
        return res.status(500).json({ error: 'Gagal membaca header file.' });
      }

      const hex = buffer.toString('hex');
      const ext = path.extname(req.file.originalname).toLowerCase();

      let isValid = false;
      if (ext === '.png' && hex === '89504e47') {
        isValid = true; // PNG Magic Bytes: \x89PNG
      } else if ((ext === '.jpg' || ext === '.jpeg') && hex.startsWith('ffd8')) {
        isValid = true; // JPEG Magic Bytes: \xff\xd8
      }

      if (!isValid) {
        // Clean up malicious file
        fs.unlink(filePath, () => {});
        console.error(
          `⚠️🚨 [SECURITY WARNING] DETEKSI FILE PALSU! File "${req.file.originalname}" dengan hex "${hex}" ditolak.`
        );
        return res.status(400).json({
          error:
            'Proteksi Unggah: File terdeteksi palsu (Magic Bytes tidak cocok dengan ekstensi). File telah dihapus secara aman.',
        });
      }

      next();
    });
  });
};

module.exports = {
  uploadImage: upload.single('image'),
  validateMagicBytes,
};
