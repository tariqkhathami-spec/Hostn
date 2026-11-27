const mongoose = require('mongoose');

/**
 * A change the assistant proposed. Nothing is written until the same user
 * confirms it; the tool runs again at that moment with the user's current
 * permissions, so a revoked role cannot be bypassed by an old proposal.
 */
const aiActionSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'AiConversation', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, refPath: 'userType', required: true },
    userType: { type: String, enum: ['Guest', 'Host', 'Admin'], required: true },
    tool: { type: String, required: true },
    input: { type: mongoose.Schema.Types.Mixed, default: {} },
    summary: { type: String, maxlength: 2000, default: '' },
    status: {
      type: String,
      enum: ['pending', 'executed', 'rejected', 'failed', 'expired'],
      default: 'pending',
    },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
    error: { type: String, default: null },
    decidedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, minimize: false }
);

aiActionSchema.index({ user: 1, status: 1, createdAt: -1 });
aiActionSchema.index({ conversation: 1, createdAt: 1 });

module.exports = mongoose.model('AiAction', aiActionSchema);
