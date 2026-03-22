import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IPayment extends Document {
  user: mongoose.Types.ObjectId;
  orderId: string;
  paymentId?: string;
  signature?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed';
  purpose: 'additional_contact';
}

const paymentSchema: Schema<IPayment> = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  paymentId: {
    type: String
  },
  signature: {
    type: String
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },
  purpose: {
    type: String,
    enum: ['additional_contact'],
    default: 'additional_contact'
  }
}, {
  timestamps: true
});

const Payment: Model<IPayment> = mongoose.model<IPayment>('Payment', paymentSchema);
export default Payment;
