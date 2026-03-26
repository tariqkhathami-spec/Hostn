const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'user_login',
        'user_register',
        'user_suspended',
        'user_activated',
        'property_created',
        'property_approved',
        'property_rejected',
        'property_deactivated',
        'booking_created',
        'booking_confirmed',
        'booking_rejected',
        'booking_cancelled',
        'booking_completed',
        'payment_initiated',
        'payment_completed',
        'payment_failed',
        'payment_refunded',
        'review_created',
        'admin_action',
      ],
    },
    target: {
      type: { type: String, enum: ['User', 'Property', 'Booking', 'Payment', 'Review'] },
      id: mongoose.Schema.Types.ObjectId,
    },
    details: {
      type: String,
      maxlength: 500,
    },
    ip: String,
  },
  { timestamps: true }
);

activityLogSchema.index({ actor: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
