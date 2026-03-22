const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');

dotenv.config({ path: path.join(__dirname, '.env') });

const SOSSchema = new mongoose.Schema({
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number],
    address: String
  }
}, { timestamps: true });

const SOS = mongoose.model('SOS', SOSSchema);

async function backfill() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to Database...');

    const sosData = await SOS.find({ 'location.address': { $exists: false } });
    console.log(`Found ${sosData.length} records needing backfill...`);

    for (const record of sosData) {
      const [lng, lat] = record.location.coordinates;
      console.log(`Geocoding ${lat}, ${lng}...`);

      try {
        const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`, {
            headers: { 'User-Agent': 'SHIELD-Backfill' }
        });
        const address = res.data.display_name?.split(',').slice(0, 3).join(',') || 'Current Location';
        
        await SOS.findByIdAndUpdate(record._id, { 'location.address': address });
        console.log(`Updated record ${record._id} with address: ${address}`);
        
        // Rate limiting for Nominatim (1 request per second)
        await new Promise(r => setTimeout(r, 1000));
      } catch (err) {
        console.error(`Failed to geocode record ${record._id}: ${err.message}`);
      }
    }

    console.log('Backfill complete!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

backfill();
