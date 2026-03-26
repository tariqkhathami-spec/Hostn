const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
      trim: true,
    },
    messageType: {
      type: String,
      enum: ['text', 'system', 'booking_update'],
      default: 'text',
    },
    readBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        readAt: { type: Date, default: Date.now },
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    metadata: {
      bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
      propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });

messageSchema.pre('save', function (next) {
  if (this.isNew) {
    this.readBy = [{ user: this.sender, readAt: new Date() }];
  }
  next();
});

messageSchema.post('save', async function () {
  const Conversation = mongoose.model('Conversation');
  const conversation = await Conversation.findById(this.conversation);
  if (conversation) {
    conversation.lastMessage = {
      content: this.content.substring(0, 100),
      sender: this.sender,
      timestamp: this.createdAt,
    };

    const participants = conversation.participants.map((p) => p.toString());
    const senderId = this.sender.toString();
    participants.forEach((p) => {
      if (p !== senderId) {
        const current = conversation.unreadCount.get(p) || 0;
        conversation.unreadCount.set(p, current + 1);
      }
    });

    await conversation.save();
  }
});

module.exports = mongoose.model('Message', messageSchema);
