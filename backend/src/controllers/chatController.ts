import { Request, Response } from 'express';
import Message from '../models/Message';

class ChatController {
  // pulling messages from around 5km area
  async getNearbyMessages(req: Request, res: Response) {
    try {
      const { lng, lat, distance = 5000 } = req.query;

      // need coords to work
      if (!lng || !lat) {
        return res.status(400).json({ success: false, message: 'I need your location coordinates' });
      }

      const messages = await Message.find({
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(lng as string), parseFloat(lat as string)]
            },
            $maxDistance: parseInt(distance as string)
          }
        }
      })
      .populate('user', 'name')
      .sort('-createdAt')
      .limit(50);

      res.status(200).json({ success: true, data: messages.reverse() });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Couldnt get chat messages: ' + error.message });
    }
  }

  // saving message from socket - internal thing
  async saveMessage(data: any) {
    try {
      const message = await Message.create(data);
      return await Message.findById(message._id).populate('user', 'name');
    } catch (err) {
      console.error('Save message fail:', err);
    }
  }
}

export default new ChatController();
