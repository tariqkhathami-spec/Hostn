const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'userType',
      required: true,
      index: true,
    },
    userType: {
      type: String,
      enum: ['Guest', 'Host', 'Admin'],
      required: true,
    },
    type: {
      type: String,
      enum: [
        'booking_created',
        'booking_confirmed',
        'booking_rejected',
        'booking_cancelled',
        'booking_completed',
        'payment_success',
        'payment_failed',
        'review_received',
        'listing_approved',
        'listing_rejected',
        'new_message',
        'support_reply',
        'report_update',
        'system',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    data: {
      bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
      propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
      paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
      reviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Review' },
      conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
      ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupportTicket' },
      reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'Report' },
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
    // APNs push notification fields
    push: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      deviceToken: String,
      apnsId: String,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

// Static method to create and optionally send push
notificationSchema.statics.createNotification = async function ({
  user,
  userType,
  type,
  title,
  message,
  data = {},
}) {
  const notification = await this.create({ user, userType, type, title, message, data });
  // Deliver to the user's phones in the background; a push failure must never
  // fail the request that created the notification.
  deliverPush(notification).catch((err) => console.error('[Push] delivery failed:', err.message));
  return notification;
};

async function deliverPush(notification) {
  if (process.env.NODE_ENV === 'test' || process.env.PUSH_DISABLED === 'true') return;
  const Model = mongoose.models[notification.userType];
  if (!Model) return;
  const account = await Model.findById(notification.user).select('deviceTokens').lean();
  const deviceTokens = (account && account.deviceTokens) || [];
  if (deviceTokens.length === 0) return;

  const { sendPush } = require('../services/pushNotification');
  const data = { type: notification.type, notificationId: String(notification._id) };
  const raw = notification.data ? notification.data.toObject?.() || notification.data : {};
  for (const [key, value] of Object.entries(raw)) {
    if (value) data[key] = String(value);
  }

  const result = await sendPush(deviceTokens, {
    title: notification.title,
    body: notification.message,
    data,
  });
  if (!result) return;

  if (result.invalidTokens && result.invalidTokens.length > 0) {
    await Model.updateOne(
      { _id: notification.user },
      { $pull: { deviceTokens: { token: { $in: result.invalidTokens } } } }
    );
  }
  if (result.successCount > 0) {
    await mongoose.models.Notification.updateOne(
      { _id: notification._id },
      { $set: { 'push.sent': true, 'push.sentAt': new Date() } }
    );
  }
}

module.exports = mongoose.model('Notification', notificationSchema);
