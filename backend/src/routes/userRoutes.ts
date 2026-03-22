import express from 'express';
import userController from '../controllers/userController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// public routes (no token required)
router.get('/public/stats', userController.getPublicStats);

// everything here needs a token
router.use(protect);

// Admin only routes
router.get('/admin/all', authorize('admin'), userController.getAllUsers);
router.put('/admin/block/:id', authorize('admin'), userController.toggleBlockUser);
router.delete('/admin/:id', authorize('admin'), userController.adminDeleteUser);

router.route('/contacts')
  .get(userController.getContacts)
  .post(userController.addContact);

router.put('/profile', userController.updateProfile);
router.delete('/contacts/:id', userController.deleteContact);
router.put('/location', userController.updateLocation);
router.post('/at-safezone', userController.notifyArrival);
router.delete('/me', userController.deleteAccount);

export default router;
