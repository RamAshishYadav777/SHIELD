import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Incident from '../models/Incident';
import SafeZone from '../models/SafeZone';
import logger from '../utils/logger';

class AdminController {
  // get all users
  async getAllUsers(req: AuthRequest, res: Response) {
    try {
      const users = await User.aggregate([
        { $sort: { createdAt: -1 } },
        {
          $project: {
            password: 0,
          },
        },
      ]);
      logger.info(`Admin ${req.user.name} fetched all user records.`);
      res.status(200).json({
        success: true,
        count: users.length,
        data: users
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Fetch all users failed: ' + error.message });
    }
  }

  // block or unblock
  async toggleBlockUser(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      // update status
      user.isBlocked = !user.isBlocked;
      await user.save();

      const status = user.isBlocked ? 'blocked' : 'unblocked';
      logger.info(`Admin ${req.user.name} ${status} user: ${user.email}`);

      res.status(200).json({
        success: true,
        message: `User ${status} successfully.`,
        data: user
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Blocking toggle failed: ' + error.message });
    }
  }
  // reports

  // verify report
  async toggleIncidentVerification(req: AuthRequest, res: Response) {
    try {
      const incident = await Incident.findById(req.params.id);
      if (!incident) return res.status(404).json({ success: false, message: 'Incident not found.' });

      incident.isVerified = !incident.isVerified;
      await incident.save();

      const status = incident.isVerified ? 'verified' : 'unverified';
      logger.info(`Admin ${req.user.name} marked incident ${incident._id} as ${status}.`);

      res.status(200).json({ success: true, data: incident });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Incident verification failed: ' + error.message });
    }
  }

  // remove report
  async adminDeleteIncident(req: AuthRequest, res: Response) {
    try {
      const incident = await Incident.findByIdAndDelete(req.params.id);
      if (!incident) return res.status(404).json({ success: false, message: 'Incident not found.' });

      logger.warn(`Admin ${req.user.name} DELETED incident report: ${incident._id}`);

      res.status(200).json({ success: true, message: 'Incident report permanently removed.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Incident deletion failed: ' + error.message });
    }
  }

  // hubs

  // make hub
  async adminCreateSafeZone(req: AuthRequest, res: Response) {
    try {
      const zone = await SafeZone.create(req.body);
      logger.info(`Admin ${req.user.name} REGISTERED NEW SAFE HUB: ${zone.name}`);
      res.status(201).json({ success: true, data: zone });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Safe hub registration failed: ' + error.message });
    }
  }

  // remove hub
  async adminDeleteSafeZone(req: AuthRequest, res: Response) {
    try {
      const zone = await SafeZone.findByIdAndDelete(req.params.id);
      if (!zone) return res.status(404).json({ success: false, message: 'Safety hub record not found.' });

      logger.warn(`Admin ${req.user.name} REMOVED safe hub: ${zone.name}`);
      res.status(200).json({ success: true, message: 'Safety hub record permanently removed from SHIELD.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Safe hub deletion failed: ' + error.message });
    }
  }
}

export default new AdminController();


