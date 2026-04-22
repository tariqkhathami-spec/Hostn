const multer = require('multer');
const path = require('path');

// ── Storage config: memory storage for cloud uploads ─────────────────────────
const storage = multer.memoryStorage();

// ── File validation ──────────────────────────────────────────────────────────
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file

// Document types (PDF)
const DOCUMENT_TYPES = ['application/pdf'];
const DOCUMENT_EXTENSIONS = ['.pdf'];
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB per document

// Magic byte signatures for image formats
const MAGIC_BYTES = {
  'image/jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4E, 0x47])],
  'image/webp': [Buffer.from('RIFF')], // RIFF....WEBP
  'image/avif': [], // AVIF uses ftyp box — complex detection, skip for now
};

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    return cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP, AVIF`), false);
  }
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error(`Invalid file extension: ${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`), false);
  }
  cb(null, true);
};

/**
 * Validate magic bytes from a Buffer.
 */
function validateMagicBytes(buffer, mimetype) {
  const signatures = MAGIC_BYTES[mimetype];
  if (!signatures || signatures.length === 0) return true;

  const header = buffer.subarray(0, 12);
  const isValid = signatures.some((sig) => {
    for (let i = 0; i < sig.length; i++) {
      if (header[i] !== sig[i]) return false;
    }
    return true;
  });

  if (!isValid) {
    throw new Error('File content does not match declared type. Upload rejected.');
  }
  return true;
}

// ── Document file filter (PDFs) ─────────────────────────────────────────────
const documentFileFilter = (req, file, cb) => {
  if (!DOCUMENT_TYPES.includes(file.mimetype)) {
    return cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: PDF`), false);
  }
  const ext = path.extname(file.originalname).toLowerCase();
  if (!DOCUMENT_EXTENSIONS.includes(ext)) {
    return cb(new Error(`Invalid file extension: ${ext}. Allowed: ${DOCUMENT_EXTENSIONS.join(', ')}`), false);
  }
  cb(null, true);
};

// ── Multer instances ─────────────────────────────────────────────────────────
const multerOpts = { storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } };

const multerSingleImage = multer(multerOpts).single('image');
const multerSingleFile  = multer(multerOpts).single('file');
const multerMultiple    = multer({ ...multerOpts, limits: { fileSize: MAX_FILE_SIZE, files: 10 } }).array('images', 10);

// Document (PDF) upload
const multerDocumentOpts = { storage, fileFilter: documentFileFilter, limits: { fileSize: MAX_DOCUMENT_SIZE } };
const multerSingleDocument = multer(multerDocumentOpts).single('document');

/**
 * Handle multer errors and validate magic bytes after upload.
 */
function postProcess(err, req, res, next) {
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

  // Validate magic bytes
  try {
    if (req.file) validateMagicBytes(req.file.buffer, req.file.mimetype);
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) validateMagicBytes(file.buffer, file.mimetype);
    }
  } catch (validationErr) {
    return res.status(400).json({ success: false, message: validationErr.message });
  }

  next();
}

/**
 * Single image upload — accepts field name 'image' or 'file'.
 */
function uploadSingle(req, res, next) {
  multerSingleImage(req, res, (err) => {
    if (!err && req.file) return postProcess(null, req, res, next);
    // Try 'file' field if 'image' field had no file
    multerSingleFile(req, res, (err2) => postProcess(err2, req, res, next));
  });
}

/**
 * Multiple image upload — field name 'images'.
 */
function uploadMultiple(req, res, next) {
  multerMultiple(req, res, (err) => postProcess(err, req, res, next));
}

/**
 * Single document upload — field name 'document'.
 * Skips magic-byte validation (PDF magic bytes are complex).
 */
function uploadDocument(req, res, next) {
  multerSingleDocument(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File too large. Maximum 10MB.' });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}

module.exports = { uploadSingle, uploadMultiple, uploadDocument, validateMagicBytes };
