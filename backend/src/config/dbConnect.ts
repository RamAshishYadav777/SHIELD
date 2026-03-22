import mongoose from 'mongoose';
import logger from '../utils/logger';

/**
 * Connects to the MongoDB database using the URI from environment variables.
 * If the connection fails, it logs the error and terminates the process.
 */
const dbConnect = async (): Promise<void> => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shield';
    
    const options = {
      autoIndex: true,
    };

    await mongoose.connect(MONGODB_URI, options);
    logger.info('Successfully connected to MongoDB.');
  } catch (error) {
    logger.error('Error connecting to MongoDB:', error);
    // Exit process with failure
    process.exit(1);
  }
};

export default dbConnect;
