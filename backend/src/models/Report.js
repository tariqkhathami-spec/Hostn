const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'reporterType',
      required: true,
    },
    reporterType: {
      type: String,
      enum: ['Guest', 'Host', 'Admin'],
      required: true,
    },
    targetType: {
      type: String,
      enum: ['property', 'user', 'review'],
      required: [true, 'Report target type is required'],
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'targetType',
    },
    reason: {
      type: String,
      enum: [
        'inappropriate_content',
        'spam',
        'harassment',
        'fraud',
        'safety_concern',
        'misleading_listing',
        'discrimination',
        'property_damage',
        'policy_violation',
        'other',
      ],
      required: [true, 'Report reason is required'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      trim: true,
    },
    relatedBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'resolved', 'dismissed'],
      default: 'pending',
    },
    adminNotes: {
      type: String,
      maxlength: 2000,
      default: '',
    },
    actionTaken: {
      type: String,
      enum: ['none', 'warning', 'suspension', 'listing_removed', 'account_banned'],
      default: 'none',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

reportSchema.index({ reporter: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1 });
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, status: 1 });

module.exports = mongoose.model('Report', reportSchema);
