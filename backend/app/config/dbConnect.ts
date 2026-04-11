import mongoose from 'mongoose';
import logger from '../utils/logger';


// connects to mongodb with some retries if it fails
const dbConnect = async (retries = 5): Promise<void> => {
  const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/shield';

  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(MONGODB_URI, { autoIndex: true });
      logger.info('MongoDB connected ready');
      return;
    } catch (error) {
      // if final retry fails, kill the app
      if (i === retries - 1) {
        logger.error('CRITICAL: MongoDB connection failed after many tries. Killing app.', error);
        process.exit(1);
      }
      
      // wait a bit before trying again (exponential backoff)
      const delay = Math.pow(2, i) * 1000;
      logger.warn(`DB connect failed (try ${i + 1}/${retries}). Retrying in ${delay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

export default dbConnect;
