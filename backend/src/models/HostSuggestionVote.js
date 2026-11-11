const mongoose = require('mongoose');

// One vote per host per suggestion (enforced by the unique index).
const hostSuggestionVoteSchema = new mongoose.Schema(
  {
    suggestion: { type: mongoose.Schema.Types.ObjectId, ref: 'HostSuggestion', required: true },
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'Host', required: true },
    vote: { type: String, enum: ['important', 'moderate', 'not_important'], required: true },
  },
  { timestamps: true }
);

hostSuggestionVoteSchema.index({ suggestion: 1, host: 1 }, { unique: true });

module.exports = mongoose.model('HostSuggestionVote', hostSuggestionVoteSchema);
