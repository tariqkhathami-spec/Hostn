const mongoose = require('mongoose');

// A host's answer to the "how likely are you to recommend Hostn" survey.
const hostNpsResponseSchema = new mongoose.Schema(
  {
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'Host', required: true, index: true },
    rating: { type: Number, required: true, min: 0, max: 10 },
    comment: { type: String, trim: true, maxlength: 1000, default: null },
    source: { type: String, default: 'host-app' },
  },
  { timestamps: true }
);

hostNpsResponseSchema.index({ host: 1, createdAt: -1 });

module.exports = mongoose.model('HostNpsResponse', hostNpsResponseSchema);
