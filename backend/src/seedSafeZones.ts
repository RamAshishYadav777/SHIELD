import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import SafeZone from './models/SafeZone';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shield';

const seedSafeZones = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for seeding SafeZones...');

    // Clear existing safe zones for a clean start
    await SafeZone.deleteMany({});
    console.log('Cleared existing SafeZones.');

    const sampleZones = [
      {
        name: 'Adityapur Police Station',
        type: 'Police Station',
        location: {
          type: 'Point',
          coordinates: [86.162, 22.785] // Near NIT Jamshedpur
        },
        address: 'Adityapur, Jamshedpur, Jharkhand',
        rating: 5,
        isActive: true
      },
      {
        name: 'Tata Main Hospital (TMH)',
        type: 'Hospital',
        location: {
          type: 'Point',
          coordinates: [86.195, 22.798] // Bistupur area
        },
        address: 'Bistupur, Jamshedpur, Jharkhand',
        rating: 5,
        isActive: true
      },
      {
        name: 'Bistupur Police Station',
        type: 'Police Station',
        location: {
          type: 'Point',
          coordinates: [86.198, 22.802]
        },
        address: 'Main Road, Bistupur, Jamshedpur',
        rating: 4,
        isActive: true
      },
      {
        name: 'NIT Jamshedpur Health Centre',
        type: 'Hospital',
        location: {
          type: 'Point',
          coordinates: [86.145, 22.775]
        },
        address: 'NIT Jamshedpur Campus',
        rating: 4,
        isActive: true
      },
      {
        name: 'Sakchi Police Station',
        type: 'Police Station',
        location: {
          type: 'Point',
          coordinates: [86.202, 22.808]
        },
        address: 'Sakchi, Jamshedpur',
        rating: 5,
        isActive: true
      }
    ];

    await SafeZone.insertMany(sampleZones);
    console.log('Successfully seeded 5 SafeZones in Jamshedpur area.');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  } catch (error) {
    console.error('Error seeding SafeZones:', error);
    process.exit(1);
  }
};

seedSafeZones();
