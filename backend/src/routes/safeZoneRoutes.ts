import express from 'express';
import safeZoneController from '../controllers/safeZoneController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// safe zones api
router.get('/', safeZoneController.getAllSafeZones);
router.get('/nearby', safeZoneController.getNearbySafeZones);

export default router;
