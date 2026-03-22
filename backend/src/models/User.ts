import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IEmergencyContact {
  name: string;
  phone: string;
  email?: string;
  relation?: string;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  phone: string;
  role: 'user' | 'admin';
  emergencyContacts: IEmergencyContact[];
  profileImage: string;
  isVerified: boolean;
  isBlocked: boolean;
  socketId: string;
  location: {
    type: string;
    coordinates: number[];
    updatedAt: Date;
  };
  contactSlots: number;
  verificationToken?: string;
  verificationOTP?: string;
  verificationOTPExpire?: Date;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema: Schema<IUser> = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false
  },
  phone: {
    type: String,
    required: [true, 'Please provide a phone number'],
    unique: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  emergencyContacts: [{
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    relation: { type: String }
  }],
  profileImage: {
    type: String,
    default: ''
  },
  isVerified: {
     type: Boolean,
     default: false
  },
  isBlocked: {
     type: Boolean,
     default: false
  },
  socketId: {
     type: String,
     default: ''
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  contactSlots: {
    type: Number,
    default: 1
  },
  verificationToken: String,
  verificationOTP: String,
  verificationOTPExpire: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date
}, {
  timestamps: true
});

// Index for geoqueries
userSchema.index({ location: '2dsphere' });

// Hash password before saving
userSchema.pre('save', async function(this: IUser) {
  if (!this.isModified('password')) return;
  if (this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
export default User;
