import express from 'express';
import authController from '../controllers/authController';
import { protect } from '../middleware/auth';

const router = express.Router();

// auth endpoints
router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));
router.post('/verify-otp', authController.verifyOTP.bind(authController));
router.post('/resend-otp', authController.resendOTP.bind(authController));
router.post('/forgot-password', authController.forgotPassword.bind(authController));
router.post('/reset-password', authController.resetPassword.bind(authController));
router.get('/logout', authController.logout.bind(authController));
router.get('/refresh', authController.refresh.bind(authController));
router.get('/me', protect, authController.getMe.bind(authController));

export default router;
