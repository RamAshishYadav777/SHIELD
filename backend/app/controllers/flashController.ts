import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import FlashMessage from '../models/FlashMessage';

class FlashController {
  // global alert
  async createFlashMessage(req: AuthRequest, res: Response) {
    try {
      const { title, message, type, durationInHours, areaName, coordinates } = req.body;
      
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + (durationInHours || 24));

      const flashData: any = {
        title,
        message,
        type,
        expiresAt,
        areaName,
        createdBy: req.user.id
      };

      if (Array.isArray(coordinates) && coordinates.length === 2) {
        const [lng, lat] = coordinates.map(c => parseFloat(c));
        if (!isNaN(lng) && !isNaN(lat)) {
          flashData.location = {
            type: 'Point',
            coordinates: [lng, lat]
          };
        }
      }

      const flash = await FlashMessage.create(flashData);

      const io = req.app.get('io');
      if (io) {
        // broadcast
        io.emit('new-flash-message', flash);
        io.emit('system-alert', {
           type: 'FLASH_ALERT',
           title: flash.title,
           locationName: flash.areaName || 'Global Area'
        });
      }

      res.status(201).json({ success: true, data: flash });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Couldnt make flash: ' + error.message });
    }
  }

  // active alerts
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