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
      refPath: 'senderType',
      required: true,
    },
    senderType: {
      type: String,
      enum: ['Guest', 'Host', 'Admin'],
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
        user: { type: mongoose.Schema.Types.ObjectId, refPath: 'readBy.userType' },
        userType: { type: String, enum: ['Guest', 'Host', 'Admin'] },
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
    this.readBy = [{ user: this.sender, userType: this.senderType, readAt: new Date() }];
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
      senderType: this.senderType,
      timestamp: this.createdAt,
    };

    const senderId = this.sender.toString();
    conversation.participants.forEach((p) => {
      const pid = (p.user || p).toString();
      if (pid !== senderId) {
        const current = conversation.unreadCount.get(pid) || 0;
        conversation.unreadCount.set(pid, current + 1);
      }
    });

    await conversation.save();
  }
});

module.exports = mongoose.model('Message', messageSchema);
