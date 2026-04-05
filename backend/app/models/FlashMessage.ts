import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IFlashMessage extends Document {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'emergency';
  active: boolean;
  expiresAt: Date;
  areaName?: string;
  location?: {
    type: string;
    coordinates: number[];
  };
  createdBy?: mongoose.Types.ObjectId;
}

const flashMessageSchema: Schema<IFlashMessage> = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'emergency'],
    default: 'info'
  },
  areaName: {
    type: String,
    trim: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number]
    }
  },
  active: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

flashMessageSchema.index({ location: '2dsphere' });

const FlashMessage: Model<IFlashMessage> = mongoose.model<IFlashMessage>('FlashMessage', flashMessageSchema);
export default FlashMessage;