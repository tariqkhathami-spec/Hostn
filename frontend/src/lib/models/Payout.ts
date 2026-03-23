import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayout extends Document {
  _id: mongoose.Types.ObjectId;
  host: mongoose.Types.ObjectId;
  payments: mongoose.Types.ObjectId[];
  totalAmount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed';
  payoutMethod?: string;
  bankDetails?: {
    bankName?: string;
    iban?: string;
    accountHolder?: string;
  };
  transactionId?: string;
  paidAt?: Date;
  failureReason?: string;
  notes?: string;
  periodStart?: Date;
  periodEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const payoutSchema = new Schema<IPayout>(
  {
    host: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Host ID is required'],
      index: true,
    },
    payments: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Payment',
      },
    ],
    totalAmount: {
      type: Number,
      required: [true, 'Payout amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'SAR',
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
      index: true,
    },
    payoutMethod: {
      type: String,
      enum: ['bank_transfer', 'wallet', 'other'],
    },
    bankDetails: {
      bankName: { type: String },
      iban: { type: String },
      accountHolder: { type: String },
    },
    transactionId: { type: String },
    paidAt: { type: Date },
    failureReason: { type: String },
    notes: { type: String },
    periodStart: { type: Date },
    periodEnd: { type: Date },
  },
  { timestamps: true }
);

payoutSchema.index({ host: 1, status: 1 });
payoutSchema.index({ createdAt: -1 });

const Payout: Model<IPayout> =
  mongoose.models.Payout || mongoose.model<IPayout>('Payout', payoutSchema);
export default Payout;
