import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

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
userSchema.pre('save', async function(this: any) {
  console.log('--- PRE-SAVE DEBUG ---');
  console.log('Email:', this.email);
  console.log('Is password modified?', this.isModified('password'));
  console.log('Password length:', this.password?.length);

  if (!this.isModified('password') || !this.password) {
    console.log('Save skipped: password not modified or missing');
    return;
  }
  
  // Prevent double hashing if the value is already a bcrypt hash
  const isHashed = /^\$2[aby]\$\d+\$.+/.test(this.password);
  console.log('Is already hashed?', isHashed);
  if (isHashed) {
    console.log('Save skipped: already hashed');
    return;
  }

  try {
    const start = Date.now();
    this.password = await bcrypt.hash(this.password, 10);
    console.log('Password hashed in', Date.now() - start, 'ms');
  } catch (err: any) {
    console.error('Hashing error:', err);
    throw err;
  }
  console.log('--- END PRE-SAVE DEBUG ---');
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
export default User;
