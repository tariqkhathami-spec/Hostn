const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// ── Storage config: save to /uploads with unique filenames ────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate safe unique name — strip original extension, use whitelisted ext
    const ext = ALLOWED_EXTENSIONS.includes(path.extname(file.originalname).toLowerCase())
      ? path.extname(file.originalname).toLowerCase()
      : '.jpg'; // fallback
    const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, name);
  },
});

// ── File validation ──────────────────────────────────────────────────────────
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file

// Magic byte signatures for image formats
const MAGIC_BYTES = {
  'image/jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4E, 0x47])],
  'image/webp': [Buffer.from('RIFF')], // RIFF....WEBP
  'image/avif': [], // AVIF uses ftyp box — complex detection, skip for now
};

const fileFilter = (req, file, cb) => {
  // Check MIME type (client-reported, not trusted alone)
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    return cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP, AVIF`), false);
  }

  // Check extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error(`Invalid file extension: ${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`), false);
  }

  cb(null, true);
};

/**
 * Validate magic bytes AFTER upload. Call this in the route handler.
 * Returns true if valid, throws if invalid.
 */
function validateMagicBytes(filePath, mimetype) {
  const signatures = MAGIC_BYTES[mimetype];
  if (!signatures || signatures.length === 0) return true; // No signature to check

  const buffer = Buffer.alloc(12);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, 12, 0);
  fs.closeSync(fd);

  const isValid = signatures.some((sig) => {
    for (let i = 0; i < sig.length; i++) {
      if (buffer[i] !== sig[i]) return false;
    }
    return true;
  });

  if (!isValid) {
    // Delete the uploaded file
    fs.unlinkSync(filePath);
    throw new Error('File content does not match declared type. Upload rejected.');
  }

  return true;
}

// ── Export configured multer instances ─────────────────────────────────────────

// Single image (e.g., avatar)
const uploadSingle = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).single('image');

// Multiple images (e.g., property photos, max 10)
const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 10 },
}).array('images', 10);

// Wrap multer in error-handling middleware
const handleUpload = (multerMiddleware) => (req, res, next) => {
  multerMiddleware(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File too large. Maximum 5MB per file.' });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ success: false, message: 'Too many files. Maximum 10 images.' });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    // Validate magic bytes for uploaded files
    try {
      if (req.file) {
        validateMagicBytes(req.file.path, req.file.mimetype);
      }
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          validateMagicBytes(file.path, file.mimetype);
        }
      }
    } catch (validationErr) {
      return res.status(400).json({ success: false, message: validationErr.message });
    }

    next();
  });
};

module.exports = {
  uploadSingle: handleUpload(uploadSingle),
  uploadMultiple: handleUpload(uploadMultiple),
  validateMagicBytes,
};
