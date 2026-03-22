import { Request, Response } from 'express';
import SafeZone from '../models/SafeZone';

class SafeZoneController {
  // fetching all registered safe zones - global list
  async getAllSafeZones(req: Request, res: Response) {
    try {
      const zones = await SafeZone.find({}).sort('-createdAt');
      res.status(200).json({ success: true, count: zones.length, data: zones });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Global fetch failed: ' + error.message });
    }
  }

  // fetching safe spots like police stations or hospitals nearby
  async getNearbySafeZones(req: Request, res: Response) {
    try {
      const { lng, lat, distance = 5000 } = req.query;

      // need your spot to find nearby ones
      if (!lng || !lat) {
        return res.status(400).json({ success: false, message: 'Need your coordinates for safe zones' });
      }

      const zones = await SafeZone.find({
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(lng as string), parseFloat(lat as string)]
            },
            $maxDistance: parseInt(distance as string)
          }
        }
      });

      res.status(200).json({ success: true, count: zones.length, data: zones });
    } catch (error: any) {
      console.error('SAFEZONE FETCH ERROR:', error);
      res.status(500).json({ success: false, message: 'Safe zone fetch failed: ' + error.message });
    }
  }

  // adding a new safe spot - admin only
  async createSafeZone(req: Request, res: Response) {
    try {
      const zone = await SafeZone.create(req.body);
      res.status(201).json({ success: true, data: zone });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Couldnt add safe zone: ' + error.message });
    }
  }

  // delete a hub that is incorrect
  async deleteSafeZone(req: Request, res: Response) {
    try {
      const zone = await SafeZone.findByIdAndDelete(req.params.id);
      if (!zone) {
        return res.status(404).json({ success: false, message: 'Hub not found' });
      }
      res.status(200).json({ success: true, message: 'Hub permanently removed' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Delete failed: ' + error.message });
    }
  }
}

export default new SafeZoneController();
