import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import Payment, { IPayment } from '../models/Payment';
import User from '../models/User';
import logger from '../utils/logger';
import dotenv from 'dotenv';


dotenv.config();

class PaymentController {
  private razorpay: Razorpay;

  constructor() {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
      logger.warn('Razorpay keys are missing. Payment features will not work.');
      // fallback to prevent crash if keys missing
      this.razorpay = new Razorpay({
        key_id: 'dummy_key',
        key_secret: 'dummy_secret',
      });
    } else {
      logger.info(`Razorpay initialized with Key ID: ${key_id.substring(0, 8)}...`);
      this.razorpay = new Razorpay({
        key_id,
        key_secret,
      });
    }
  }

  // buy contact slot
  async createOrder(req: AuthRequest, res: Response) {
    try {
      if (process.env.RAZORPAY_KEY_ID === 'placeholder_key' || !process.env.RAZORPAY_KEY_ID) {
        return res.status(400).json({ 
          success: false, 
          message: 'Payments are not configured on this server. Please add your Razorpay keys to the .env file.' 
        });
      }

      const amount = 1000 * 100; // 1000 in paise
      const options = {
        amount,
        currency: 'INR',
        receipt: `slot_${req.user.id.toString().slice(-6)}_${Date.now()}`,
      };

      const order = await this.razorpay.orders.create(options);

      // save to db
      await Payment.create({
        user: req.user.id,
        orderId: order.id,
        amount: 1000,
        currency: 'INR',
        status: 'pending',
        purpose: 'additional_contact'
      });

      res.status(200).json({
        success: true,
        order_id: order.id,
        amount: order.amount,
        key_id: process.env.RAZORPAY_KEY_ID
      });
    } catch (error: any) {
      const errorMsg = error.error?.description || error.message || 'Unknown Razorpay Error';
      logger.error(`Failed to create Razorpay order: ${errorMsg}`);
      console.error('Full Razorpay Error:', error);
      res.status(500).json({ success: false, message: errorMsg });
    }
  }

  // verify signature from razorpay
  async verifyPayment(req: AuthRequest, res: Response) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || '')
        .update(body.toString())
        .digest("hex");

      const isAuthentic = expectedSignature === razorpay_signature;

      if (isAuthentic) {
        // update record
        const payment = await Payment.findOneAndUpdate(
          { orderId: razorpay_order_id },
          { 
            status: 'success', 
            paymentId: razorpay_payment_id, 
            signature: razorpay_signature 
          },
          { new: true }
        );

        if (payment) {
          // inc slot count
          await User.findByIdAndUpdate(req.user.id, {
            $inc: { contactSlots: 1 }
          });
          
          logger.info(`User ${req.user.id} bought a new contact slot`);
          res.status(200).json({ success: true, message: 'Payment verified, slot added!' });
        } else {
           res.status(404).json({ success: false, message: 'Payment record missing' });
        }
      } else {
        res.status(400).json({ success: false, message: 'Invalid payment signature' });
      }
    } catch (error: any) {
      logger.error('Verification error: ' + error.message);
      res.status(500).json({ success: false, message: 'Verification failed' });
    }
  }

  // admin: get all payments
  async getAllPayments(req: AuthRequest, res: Response) {
    try {
      const payments = await Payment.find({})
        .populate('user', 'name email')
        .sort('-createdAt');
        
      res.status(200).json({ 
        success: true, 
        count: payments.length,
        totalAmount: payments.filter(p => p.status === 'success').reduce((acc: number, p: IPayment) => acc + p.amount, 0),
        data: payments 
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Admin fetch failed: ' + error.message });
    }
  }
}

export default new PaymentController();