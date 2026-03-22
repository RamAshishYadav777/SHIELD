import express from 'express';
import sosController from '../controllers/sosController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// sos endpoints
router.get('/history', protect, sosController.getSOSHistory.bind(sosController));
router.get('/admin/history', protect, authorize('admin'), sosController.getAllSOSAdmin.bind(sosController));
router.post('/trigger', protect, sosController.triggerSOS.bind(sosController));
router.get('/active', protect, authorize('admin'), sosController.getActiveSOS.bind(sosController));
router.put('/resolve/:id', protect, sosController.resolveSOS.bind(sosController));

export default router;
