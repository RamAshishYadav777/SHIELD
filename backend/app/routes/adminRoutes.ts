import express from 'express';
import adminController from '../controllers/adminController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/all', adminController.getAllUsers);
router.put('/users/block/:id', adminController.toggleBlockUser);


// Incident Oversight
router.put('/incidents/verify/:id', adminController.toggleIncidentVerification);
router.delete('/incidents/:id', adminController.adminDeleteIncident);

// Safe Hub Grid Maintenance
router.post('/safezones', adminController.adminCreateSafeZone);
router.delete('/safezones/:id', adminController.adminDeleteSafeZone);


export default router;
