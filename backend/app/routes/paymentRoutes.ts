import express from 'express';
import paymentController from '../controllers/paymentController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// payments only for logged in people
router.use(protect);

router.post('/create-order', paymentController.createOrder.bind(paymentController));
router.post('/verify', paymentController.verifyPayment.bind(paymentController));
router.get('/admin/all', authorize('admin'), paymentController.getAllPayments.bind(paymentController));

export default router;
