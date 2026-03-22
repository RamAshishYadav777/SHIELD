import express from 'express';
import sosController from '../controllers/sosController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// sos endpoints
router.get('/history', protect, sosController.getSOSHistory);
router.post('/trigger', protect, sosController.triggerSOS);
router.get('/active', protect, authorize('admin'), sosController.getActiveSOS);
router.put('/resolve/:id', protect, sosController.resolveSOS);

export default router;
