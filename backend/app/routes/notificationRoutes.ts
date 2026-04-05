import express from 'express';
import notificationController from '../controllers/notificationController';
import { protect } from '../middleware/auth';

const router = express.Router();

// web push subscription
router.post('/subscribe', protect, notificationController.subscribe);

export default router;
