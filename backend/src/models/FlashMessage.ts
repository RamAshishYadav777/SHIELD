import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IFlashMessage extends Document {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'emergency';
  active: boolean;
  expiresAt: Date;
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

const FlashMessage: Model<IFlashMessage> = mongoose.model<IFlashMessage>('FlashMessage', flashMessageSchema);
export default FlashMessage;