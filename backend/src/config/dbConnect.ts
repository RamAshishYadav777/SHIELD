import mongoose from 'mongoose';
import logger from '../utils/logger';

/**
 * Connects to the MongoDB database using the URI from environment variables.
 * If the connection fails, it logs the error and terminates the process.
 */
const dbConnect = async (retries = 5): Promise<void> => {
  const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/shield';

  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(MONGODB_URI, { autoIndex: true });
      logger.info('Successfully connected to MongoDB');
      return;
    } catch (error) {
      if (i === retries - 1) {
        logger.error('CRITICAL: Exhausted all MongoDB connection retries. Shutting down.', error);
        process.exit(1);
      }
      const delay = Math.pow(2, i) * 1000;
      logger.warn(`MongoDB connection failed (Attempt ${i + 1}/${retries}): ${error instanceof Error ? error.message : String(error)}. Retrying in ${delay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

export default dbConnect;
