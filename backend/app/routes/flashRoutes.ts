import express from 'express';
import flashController from '../controllers/flashController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// flash notification routes
router.get('/active', flashController.getActiveFlashMessages);
router.post('/', protect, authorize('admin'), flashController.createFlashMessage);

export default router;
