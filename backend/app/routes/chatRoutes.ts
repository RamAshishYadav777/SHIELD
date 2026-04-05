import express from 'express';
import chatController from '../controllers/chatController';
import { protect } from '../middleware/auth';

const router = express.Router();

// chat stuff
router.get('/nearby', protect, chatController.getNearbyMessages);

export default router;
