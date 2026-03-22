import webpush from 'web-push';
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Subscription from '../models/Subscription';

class NotificationController {
  constructor() {
    // setting up vapid details if keys exist
    if (process.env.PUSH_PUBLIC_KEY && process.env.PUSH_PRIVATE_KEY) {
      webpush.setVapidDetails(
        'mailto:support@shield.com',
        process.env.PUSH_PUBLIC_KEY,
        process.env.PUSH_PRIVATE_KEY
      );
    }
  }

  // user wants to receive notifications on this device
  async subscribe(req: AuthRequest, res: Response) {
    try {
      const subscription = req.body;
      
      // update user subscription in mongo
      await Subscription.findOneAndUpdate(
        { user: req.user.id },
        { subscription },
        { upsert: true, new: true }
      );

      res.status(201).json({ success: true, message: 'Settings saved successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Couldnt save subscription: ' + error.message });
    }
  }

  // helper to push message to a specific user
  async sendNotification(userId: string, payload: any) {
    try {
      const subRecord = await Subscription.findOne({ user: userId });
      if (!subRecord) return;

      await webpush.sendNotification(
        subRecord.subscription,
        JSON.stringify(payload)
      );
    } catch (error) {
      console.error('Push failed:', error);
    }
  }
}

export default new NotificationController();
