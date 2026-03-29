const cloudinary = require('../config/cloudinary');

/**
 * Upload a buffer to Cloudinary
 * @param {Buffer} buffer - File buffer from multer memory storage
 * @param {Object} options - Upload options
 * @param {string} options.folder - Cloudinary folder (e.g., 'hostn/properties', 'hostn/avatars')
 * @param {string} [options.publicId] - Custom public ID
 * @returns {Promise<{url: string, publicId: string, width: number, height: number}>}
 */
async function uploadToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: options.folder || 'hostn/uploads',
      resource_type: 'image',
      transformation: [
        { quality: 'auto:good', fetch_format: 'auto' },
      ],
    };
    if (options.publicId) uploadOptions.public_id = options.publicId;

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) return reject(error);
      resolve({
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
      });
    });

    stream.end(buffer);
  });
}

/**
 * Delete an image from Cloudinary by public ID
 */
async function deleteFromCloudinary(publicId) {
  return cloudinary.uploader.destroy(publicId);
}

module.exports = { uploadToCloudinary, deleteFromCloudinary };
