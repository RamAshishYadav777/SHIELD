import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import FlashMessage from '../models/FlashMessage';

class FlashController {
  // admin can make a flash message for everyone
  async createFlashMessage(req: AuthRequest, res: Response) {
    try {
      const { title, message, type, durationInHours } = req.body;
      
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + (durationInHours || 24));

      const flash = await FlashMessage.create({
        title,
        message,
        type,
        expiresAt,
        createdBy: req.user.id
      });

      const io = req.app.get('io');
      if (io) {
        io.emit('new-flash-message', flash);
      }

      res.status(201).json({ success: true, data: flash });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Couldnt make flash: ' + error.message });
    }
  }

  // showing only messages that are still active
  async getActiveFlashMessages(req: Request, res: Response) {
    try {
      const messages = await FlashMessage.find({
        active: true,
        expiresAt: { $gt: new Date() }
      }).sort('-createdAt');
      
      res.status(200).json({ success: true, data: messages });
    } catch (error: any) {
      console.error('FLASH FETCH ERROR:', error);
      res.status(500).json({ success: false, message: 'Flash fetch failed: ' + error.message });
    }
  }
}

export default new FlashController();
