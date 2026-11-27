const mongoose = require('mongoose');

// One integration key saved from the admin dashboard, encrypted with
// AES-256-GCM under SECRETS_MASTER_KEY (which lives only in the server env).
// The plaintext is never stored and never sent back to the browser.
const integrationSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    iv: { type: String, required: true },         // base64, 12 bytes
    ciphertext: { type: String, required: true }, // base64
    tag: { type: String, required: true },        // base64, 16 bytes
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    updatedByName: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('IntegrationSetting', integrationSettingSchema);
