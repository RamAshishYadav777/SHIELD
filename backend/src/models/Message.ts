import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IMessage extends Document {
  user: mongoose.Types.ObjectId;
  content: string;
  neighborhoodId: string;
  location: {
    type: string;
    coordinates: number[];
  };
}

const messageSchema: Schema<IMessage> = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  neighborhoodId: {
    type: String,
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
  }
}, {
  timestamps: true
});

messageSchema.index({ location: '2dsphere' });

const Message: Model<IMessage> = mongoose.model<IMessage>('Message', messageSchema);
export default Message;
