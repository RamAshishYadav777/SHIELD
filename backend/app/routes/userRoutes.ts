import express from 'express';
import userController from '../controllers/userController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// public routes (no token required)
router.get('/public/stats', userController.getPublicStats);

// everything here needs a token
// User Profile and Contact Management (Requires Token)
router.use(protect);

router.route('/contacts')
  .get(userController.getContacts)
  .post(userController.addContact);

router.put('/profile', userController.updateProfile);
router.delete('/contacts/:id', userController.deleteContact);
router.put('/location', userController.updateLocation);
router.post('/at-safezone', userController.notifyArrival);
router.delete('/me', userController.deleteAccount);

export default router;
