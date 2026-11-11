const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'actorType',
      default: null,
    },
    actorType: {
      type: String,
      enum: ['Guest', 'Host', 'Admin', null],
      default: null,
    },
    // Legacy lowercase role ('guest'|'host'|'admin') — kept for backward compat with existing logs
    actorRole: {
      type: String,
      enum: ['guest', 'host', 'admin'],
      default: null,
    },
    actorAdminRole: {
      type: String,
      enum: ['super', 'support', 'finance', 'account_manager'],
      default: null,
    },
    action: {
      type: String,
      required: true,
      enum: [
        // Auth
        'user_login',
        'user_register',
        'user_suspended',
        'user_activated',
        // Admin role management
        'admin_action',
        'admin_role_changed',
        // Properties
        'property_created',
        'property_approved',
        'property_rejected',
        'property_deactivated',
        // Bookings
        'booking_created',
        'booking_confirmed',
        'booking_rejected',
        'booking_cancelled',
        'booking_completed',
        'booking_pending',
        // Payments
        'payment_initiated',
        'payment_completed',
        'payment_failed',
        'payment_refunded',
        'payment_amount_mismatch',
        // Webhooks
        'webhook_processed',
        'webhook_signature_failed',
        'webhook_unlinked',
        'webhook_amount_mismatch',
        // Reviews
        'review_created',
        // Buy-now-pay-later (Tabby / Tamara). These were written by
        // bnplController but missing here, so the log write failed validation
        // and took the payment request down with it.
        'bnpl_tabby_initiated',
        'bnpl_tabby_completed',
        'bnpl_tabby_failed',
        'bnpl_tamara_initiated',
        'bnpl_tamara_completed',
        'bnpl_tamara_failed',
        'bnpl_webhook_tabby',
        'bnpl_webhook_tamara',
        // Admin removed a booking; account owner deleted their account
        'booking_deleted',
        'account_deleted',
        // Tourism permit review
        'license_approved',
        'license_rejected',
        // Staff and account managers
        'staff_created',
        'account_manager_assigned',
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
