const mongoose = require('mongoose');

/**
 * One assistant conversation. `messages` holds the exact provider transcript
 * (Anthropic block shape: text / tool_use / tool_result / thinking). It is
 * append-only: earlier entries are never edited, because replayed thinking
 * blocks must match the conversation that produced them.
 */
const aiConversationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, refPath: 'userType', required: true },
    userType: { type: String, enum: ['Guest', 'Host', 'Admin'], required: true },
    role: { type: String, enum: ['guest', 'host', 'admin'], required: true },
    title: { type: String, maxlength: 120, default: '' },
    messages: { type: [mongoose.Schema.Types.Mixed], default: [] },
    // Notes for the model (e.g. "the user confirmed action X") that are added
    // to the next user message instead of rewriting history.
    pendingNotes: { type: [String], default: [] },
    usage: {
      inputTokens: { type: Number, default: 0 },
      outputTokens: { type: Number, default: 0 },
      turns: { type: Number, default: 0 },
    },
    lastModel: { type: String, default: '' },
    lastProvider: { type: String, default: '' },
  },
  { timestamps: true, minimize: false }
);

aiConversationSchema.index({ user: 1, updatedAt: -1 });
aiConversationSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('AiConversation', aiConversationSchema);
