const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
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
  type,
  title,
  message,
  data = {},
}) {
  const notification = await this.create({ user, type, title, message, data });
  // TODO: Send APNs push notification here when device tokens are available
  return notification;
};

module.exports = mongoose.model('Notification', notificationSchema);