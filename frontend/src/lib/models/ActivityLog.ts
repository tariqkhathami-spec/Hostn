import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IActivityLog extends Document {
  _id: mongoose.Types.ObjectId;
  action: string;
  performedBy: mongoose.Types.ObjectId;
  targetType: 'user' | 'property' | 'booking' | 'review' | 'system' | 'payment';
  targetId?: string;
  details: string;
  createdAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'property_approved', 'property_rejected', 'property_created',
        'user_banned', 'user_unbanned',
        'host_suspended', 'host_activated',
        'booking_cancelled', 'booking_created', 'booking_confirmed',
        'review_deleted', 'system_action',
        'payment_initiated', 'payment_verified', 'payment_failed',
        'refund_requested', 'refund_processed', 'refund_failed',
        'payout_completed', 'image_uploaded',
      ],
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetType: {
      type: String,
      enum: ['user', 'property', 'booking', 'review', 'system', 'payment'],
      required: true,
    },
    targetId: { type: String },
    details: { type: String, required: true },
  },
  { timestamps: true }
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ action: 1 });
activityLogSchema.index({ performedBy: 1 });

const ActivityLog: Model<IActivityLog> =
  mongoose.models.ActivityLog || mongoose.model<IActivityLog>('ActivityLog', activityLogSchema);
export default ActivityLog;
