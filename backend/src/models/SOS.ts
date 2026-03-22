import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ISOS extends Document {
  user: mongoose.Types.ObjectId;
  location: {
    type: string;
    coordinates: number[];
  };
  status: 'active' | 'resolved';
  resolvedAt?: Date;
  message: string;
}

const sosSchema: Schema<ISOS> = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  status: {
    type: String,
    enum: ['active', 'resolved'],
    default: 'active'
  },
  resolvedAt: {
    type: Date
  },
  message: {
    type: String,
    default: 'I am in danger! Please help!'
  }
}, {
  timestamps: true
});

sosSchema.index({ location: '2dsphere' });

const SOS: Model<ISOS> = mongoose.model<ISOS>('SOS', sosSchema);
export default SOS;
