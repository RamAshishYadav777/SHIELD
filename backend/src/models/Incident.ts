import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IIncident extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: 'Harassment' | 'Physical Assault' | 'Stalking' | 'Suspicious Activity' | 'Other';
  location: {
    type: string;
    coordinates: number[];
    address?: string;
  };
  images: string[];
  isVerified: boolean;
}

const incidentSchema: Schema<IIncident> = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Please provide a title'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please provide a description']
  },
  category: {
    type: String,
    enum: ['Harassment', 'Physical Assault', 'Stalking', 'Suspicious Activity', 'Other'],
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
    },
    address: {
      type: String
    }
  },
  images: [{
    type: String
  }],
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

incidentSchema.index({ location: '2dsphere' });

const Incident: Model<IIncident> = mongoose.model<IIncident>('Incident', incidentSchema);
export default Incident;
