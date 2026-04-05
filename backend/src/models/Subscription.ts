import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ISubscription extends Document {
  user: mongoose.Types.ObjectId;
  subscription: any;
}

const subscriptionSchema: Schema<ISubscription> = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subscription: {
    type: Object,
    required: true
  }
}, {
  timestamps: true
});

const Subscription: Model<ISubscription> = mongoose.model<ISubscription>('Subscription', subscriptionSchema);
export default Subscription;