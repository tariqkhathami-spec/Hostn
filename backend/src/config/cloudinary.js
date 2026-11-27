const cloudinary = require('cloudinary').v2;
const secretStore = require('../services/secretStore');

function configure() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

configure();

// The keys can be changed from the admin dashboard; apply them at once.
secretStore.events.on('change', (key) => {
  if (key.startsWith('CLOUDINARY_')) configure();
});

module.exports = cloudinary;
