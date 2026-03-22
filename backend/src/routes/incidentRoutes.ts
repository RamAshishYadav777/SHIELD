import express from 'express';
import incidentController from '../controllers/incidentController';
import { protect, authorize } from '../middleware/auth';
import { upload } from '../utils/imageUpload';
import predictionController from '../controllers/predictionController';

const router = express.Router();

// get ai safety score
router.get('/prediction', protect, predictionController.getSafetyPrediction);

// core incident routes
router.route('/')
  .get(incidentController.getIncidents)
  .post(protect, upload.single('image'), incidentController.createIncident);

router.get('/:id', incidentController.getIncidentById);
router.put('/:id/verify', protect, authorize('admin'), incidentController.toggleVerification);
router.delete('/:id', protect, authorize('admin'), incidentController.deleteIncident);

export default router;
