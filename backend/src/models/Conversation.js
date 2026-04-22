const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'participants.userType',
      required: true,
    },
    userType: {
      type: String,
      enum: ['Guest', 'Host', 'Admin'],
      required: true,
    },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    participants: [participantSchema],
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      default: null,
    },
    lastMessage: {
      content: { type: String, default: '' },
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'lastMessage.senderType',
      },
      senderType: { type: String, enum: ['Guest', 'Host', 'Admin'] },
      timestamp: { type: Date, default: Date.now },
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'blockedByType',
      default: null,
    },
    blockedByType: {
      type: String,
      enum: ['Guest', 'Host', 'Admin', null],
      default: null,
    },
    isArchived: {
      type: Map,
      of: Boolean,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ 'participants.user': 1, updatedAt: -1 });
conversationSchema.index({ booking: 1 }, { sparse: true });
conversationSchema.index({ property: 1 });

conversationSchema.methods.getOtherParticipant = function (userId) {
  const participant = this.participants.find(
    (p) => p.user.toString() !== userId.toString()
  );
  return participant ? { user: participant.user, userType: participant.userType } : null;
};

/**
 * Find or create a 2-person conversation.
 * @param participants Array of { user: ObjectId, userType: 'Guest'|'Host'|'Admin' }
 */
conversationSchema.statics.findOrCreate = async function ({
  participants,
  booking,
  property,
}) {
  const userIds = participants.map((p) => p.user.toString()).sort();

  let query = {
    'participants.user': { $all: userIds },
    participants: { $size: 2 },
  };

  if (booking) {
    query.booking = booking;
  }

  let conversation = await this.findOne(query);

  if (!conversation) {
    const unreadCount = {};
    userIds.forEach((id) => {
      unreadCount[id] = 0;
    });
    conversation = await this.create({
      participants,
      booking: booking || null,
      property: property || null,
      unreadCount,
    });
  }

  return conversation;
};

module.exports = mongoose.model('Conversation', conversationSchema);
