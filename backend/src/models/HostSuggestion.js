const mongoose = require('mongoose');

// A suggestion a host sends to the platform from the host app. Visible to
// other hosts (who can vote on it) unless an admin hides it.
const hostSuggestionSchema = new mongoose.Schema(
  {
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'Host', required: true, index: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    status: {
      type: String,
      enum: ['open', 'under_review', 'implemented', 'declined'],
      default: 'open',
    },
    // Filled in by the platform team.
    platformResponse: { type: String, trim: true, maxlength: 2000, default: null },
    isHidden: { type: Boolean, default: false },
  },
  { timestamps: true }
);

hostSuggestionSchema.index({ isHidden: 1, createdAt: -1 });

module.exports = mongoose.model('HostSuggestion', hostSuggestionSchema);
