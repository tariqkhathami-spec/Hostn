import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  type:
    | 'booking_created'
    | 'booking_confirmed'
    | 'booking_rejected'
    | 'booking_cancelled'
    | 'booking_completed'
    | 'payment_success'
    | 'payment_failed'
    | 'review_received'
    | 'listing_approved'
    | 'listing_rejected'
    | 'system';
  title: string;
  message: string;
  data?: {
    bookingId?: mongoose.Types.ObjectId;
    propertyId?: mongoose.Types.ObjectId;
    paymentId?: mongoose.Types.ObjectId;
    reviewId?: mongoose.Types.ObjectId;
  };
  isRead: boolean;
  readAt?: Date;
  push?: {
    sent: boolean;
    sentAt?: Date;
    deviceToken?: string;
    apnsId?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
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
      bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
      propertyId: { type: Schema.Types.ObjectId, ref: 'Property' },
      paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
      reviewId: { type: Schema.Types.ObjectId, ref: 'Review' },
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
    push: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      deviceToken: String,
      apnsId: String,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', notificationSchema);

export default Notification;
