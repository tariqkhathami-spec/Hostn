import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayment extends Document {
  _id: mongoose.Types.ObjectId;
  booking: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  property: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  provider: 'moyasar' | 'stripe' | 'manual';
  providerPaymentId?: string;
  providerStatus?: string;
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded' | 'cancelled';
  paymentMethod?: string;
  cardBrand?: string;
  cardLast4?: string;
  fees: {
    platformFee: number;
    providerFee: number;
    hostPayout: number;
  };
  refundedAmount: number;
  refundedAt?: Date;
  metadata?: Record<string, any>;
  paidAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking ID is required'],
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    property: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Property ID is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'SAR',
    },
    provider: {
      type: String,
      enum: ['moyasar', 'stripe', 'manual'],
      default: 'moyasar',
    },
    providerPaymentId: {
      type: String,
      sparse: true,
    },
    providerStatus: {
      type: String,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled'],
      default: 'pending',
      index: true,
    },
    paymentMethod: {
      type: String,
    },
    cardBrand: {
      type: String,
    },
    cardLast4: {
      type: String,
    },
    fees: {
      platformFee: { type: Number, default: 0 },
      providerFee: { type: Number, default: 0 },
      hostPayout: { type: Number, default: 0 },
    },
    refundedAmount: {
      type: Number,
      default: 0,
    },
    refundedAt: {
      type: Date,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    paidAt: {
      type: Date,
    },
    failedAt: {
      type: Date,
    },
    failureReason: {
      type: String,
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Add compound indexes
paymentSchema.index({ booking: 1, status: 1 });
paymentSchema.index({ user: 1, status: 1 });
paymentSchema.index({ providerPaymentId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ createdAt: -1 });

const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>('Payment', paymentSchema);

export default Payment;
