import express from 'express';
import incidentController from '../controllers/incidentController';
import { protect, authorize } from '../middleware/auth';
import { upload } from '../utils/imageUpload';
import predictionController from '../controllers/predictionController';

const router = express.Router();

// get ai safety score
router.get('/prediction', protect, predictionController.getSafetyPrediction);

router.get('/my-reports', protect, incidentController.getMyIncidents);

// core incident routes
router.route('/')
  .get(incidentController.getIncidents)
  .post(protect, upload.single('image'), incidentController.createIncident);

router.get('/:id', incidentController.getIncidentById);

export default router;
