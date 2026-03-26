const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
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
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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
      ref: 'User',
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

conversationSchema.index({ participants: 1, updatedAt: -1 });
conversationSchema.index({ booking: 1 }, { sparse: true });
conversationSchema.index({ property: 1 });

conversationSchema.methods.getOtherParticipant = function (userId) {
  return this.participants.find(
    (p) => p.toString() !== userId.toString()
  );
};

conversationSchema.statics.findOrCreate = async function ({
  participants,
  booking,
  property,
}) {
  const sorted = participants.map((p) => p.toString()).sort();

  let query = {
    participants: { $all: sorted, $size: 2 },
  };

  if (booking) {
    query.booking = booking;
  }

  let conversation = await this.findOne(query);

  if (!conversation) {
    const unreadCount = {};
    sorted.forEach((p) => {
      unreadCount[p] = 0;
    });
    conversation = await this.create({
      participants: sorted,
      booking: booking || null,
      property: property || null,
      unreadCount,
    });
  }

  return conversation;
};

module.exports = mongoose.model('Conversation', conversationSchema);
