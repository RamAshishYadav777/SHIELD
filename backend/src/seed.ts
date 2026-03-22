import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SafeZone from './models/SafeZone';

dotenv.config();

const seedSafeZones = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shield';
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing
    await SafeZone.deleteMany({});

    const zones = [
      {
        name: 'Central Police Station',
        type: 'Police Station',
        location: { type: 'Point', coordinates: [-73.9857, 40.7484] },
        address: '123 Main St, New York, NY',
        rating: 5
      },
      {
        name: 'City General Hospital',
        type: 'Hospital',
        location: { type: 'Point', coordinates: [-73.9880, 40.7495] },
        address: '456 Emergency Way, New York, NY',
        rating: 4
      },
      {
        name: 'Verified Safe Store - 24/7',
        type: 'Verified Store',
        location: { type: 'Point', coordinates: [-73.9840, 40.7470] },
        address: '789 Safety Ave, New York, NY',
        rating: 5
      }
    ];

    await SafeZone.insertMany(zones);
    console.log('Safe zones seeded successfully!');
    process.exit();
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seedSafeZones();
