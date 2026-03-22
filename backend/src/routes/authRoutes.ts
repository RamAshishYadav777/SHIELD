import express from 'express';
import authController from '../controllers/authController';
import { protect } from '../middleware/auth';

const router = express.Router();

// auth endpoints
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-otp', authController.verifyOTP);
router.post('/resend-otp', authController.resendOTP);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/logout', authController.logout);
router.get('/refresh', authController.refresh.bind(authController));
router.get('/me', protect, authController.getMe);

export default router;
