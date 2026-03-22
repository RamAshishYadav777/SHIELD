import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ISafeZone extends Document {
  name: string;
  type: 'Police Station' | 'Hospital' | 'Public Booth' | 'Verified Store' | 'Other';
  location: {
    type: string;
    coordinates: number[];
  };
  address?: string;
  rating: number;
  isActive: boolean;
}

const safeZoneSchema: Schema<ISafeZone> = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['Police Station', 'Hospital', 'Public Booth', 'Verified Store', 'Other'],
    default: 'Other'
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
  address: String,
  rating: {
    type: Number,
    default: 5
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

safeZoneSchema.index({ location: '2dsphere' });

const SafeZone: Model<ISafeZone> = mongoose.model<ISafeZone>('SafeZone', safeZoneSchema);
export default SafeZone;
