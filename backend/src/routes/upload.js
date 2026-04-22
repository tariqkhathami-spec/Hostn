const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { uploadSingle, uploadMultiple, uploadDocument } = require('../middleware/upload');

// Use S3 if AWS credentials are configured, otherwise fall back to Cloudinary
const useS3 = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_S3_BUCKET);

let uploadImage, deleteImage;
if (useS3) {
  const { uploadToS3, deleteFromS3 } = require('../services/s3Upload');
  uploadImage = (buffer, opts) => uploadToS3(buffer, opts);
  deleteImage = (key) => deleteFromS3(key);
  console.log('[Upload] Using AWS S3 storage');
} else {
  const { uploadToCloudinary, deleteFromCloudinary } = require('../services/cloudinaryUpload');
  uploadImage = (buffer, opts) => uploadToCloudinary(buffer, { folder: `hostn/${opts.folder || 'uploads'}` });
  deleteImage = (publicId) => deleteFromCloudinary(publicId);
  console.log('[Upload] Using Cloudinary storage (S3 not configured)');
}

// All upload routes require authentication
router.use(protect);

// @desc    Upload a single image
// @route   POST /api/v1/upload/single  OR  POST /api/v1/upload/image
// @access  Private
const handleSingleUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const folder = req.query.folder || 'properties';
    const result = await uploadImage(req.file.buffer, { folder });

    res.json({
      success: true,
      url: result.url,
      data: {
        url: result.url,
        sizes: result.sizes || null,
        key: result.key || result.publicId || null,
        width: result.width,
        height: result.height,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (error) {
    console.error('[Upload] Single upload failed:', error.message);
    res.status(500).json({ success: false, message: 'Image upload failed. Please try again.' });
  }
};

// Support both field names: 'image' (backend standard) and 'file' (frontend uses this)
const singleWithFieldFallback = (req, res, next) => {
  // If multer didn't pick up a file under 'image', check 'file'
  if (!req.file && req.files) {
    req.file = req.files[0];
  }
  next();
};

router.post('/single', uploadSingle, handleSingleUpload);
router.post('/image', uploadSingle, handleSingleUpload);

// @desc    Upload multiple images (property photos)
// @route   POST /api/v1/upload/multiple
// @access  Private
router.post('/multiple', uploadMultiple, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const folder = req.query.folder || 'properties';
    const uploadPromises = req.files.map((file) =>
      uploadImage(file.buffer, { folder }).then((result) => ({
        url: result.url,
        sizes: result.sizes || null,
        key: result.key || result.publicId || null,
        width: result.width,
        height: result.height,
        size: file.size,
        mimetype: file.mimetype,
      }))
    );

    const files = await Promise.all(uploadPromises);

    res.json({
      success: true,
      data: files,
    });
  } catch (error) {
    console.error('[Upload] Multiple upload failed:', error.message);
    res.status(500).json({ success: false, message: 'Image upload failed. Please try again.' });
  }
});

// @desc    Upload a single document (PDF)
// @route   POST /api/v1/upload/document
// @access  Private
router.post('/document', uploadDocument, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const folder = req.query.folder || 'documents';
    const result = await uploadImage(req.file.buffer, { folder });

    res.json({
      success: true,
      data: {
        url: result.url,
        key: result.key || result.publicId || null,
        size: req.file.size,
        mimetype: req.file.mimetype,
        originalName: req.file.originalname,
      },
    });
  } catch (error) {
    console.error('[Upload] Document upload failed:', error.message);
    res.status(500).json({ success: false, message: 'Document upload failed. Please try again.' });
  }
});

// Export for use by other controllers
router.uploadImage = uploadImage;
router.deleteImage = deleteImage;

module.exports = router;
