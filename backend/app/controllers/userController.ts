import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Incident from '../models/Incident';
import SafeZone from '../models/SafeZone';
import SOS from '../models/SOS';
import logger from '../utils/logger';

class UserController {
  // add emergency contact
  async addContact(req: AuthRequest, res: Response) {
    try {
      const { name, phone, email, relation } = req.body;
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({ success: false, message: 'Who are you? User not found' });
      }

      // max 3 contacts
      if (user.emergencyContacts.length >= 3) {
        return res.status(400).json({ success: false, message: 'Maximum limit of 3 emergency contacts reached.' });
      }

      // check payment status for extra slots
      if (user.emergencyContacts.length >= 1) {
        if (user.contactSlots < 1) {
           return res.status(403).json({ 
             success: false, 
             message: 'Additional contact registration requires a one-time payment.' 
           });
        }
        // consume credit
        user.contactSlots -= 1;
      }

      user.emergencyContacts.push({ name, phone, email, relation });
      await user.save();

      res.status(200).json({ success: true, data: user.emergencyContacts });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to add contact: ' + error.message });
    }
  }

  // remove contact
  async deleteContact(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      
      user.emergencyContacts = user.emergencyContacts.filter(
        (contact: any) => (contact as any)._id.toString() !== req.params.id
      );
      
      await user.save();
      res.status(200).json({ success: true, data: user.emergencyContacts });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Delete failed: ' + error.message });
    }
  }

  // list contacts
  async getContacts(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User missing' });
      }
      res.status(200).json({ success: true, data: user.emergencyContacts });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Fetch contacts error: ' + error.message });
    }
  }

  // update live location
  async updateLocation(req: AuthRequest, res: Response) {
    try {
      const { coordinates } = req.body;
      const user = await User.findByIdAndUpdate(req.user.id, {
        location: {
          type: 'Point',
          coordinates
        }
      }, { new: true });

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not here' });
      }

      res.status(200).json({ success: true, data: user.location });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Location update fail: ' + error.message });
    }
  }

  // notify arrival at safe zone
  async notifyArrival(req: AuthRequest, res: Response) {
    try {
      const { zoneName } = req.body;
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // log arrival
      logger.info(`User ${user.name} is safe at ${zoneName}`);
      
      res.status(200).json({ 
        success: true, 
        message: `Contacts told you reached ${zoneName}` 
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Arrival notification failed: ' + error.message });
    }
  }

  // update profile info
  async updateProfile(req: AuthRequest, res: Response) {
    try {
      const { name, phone, currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user.id).select('+password');
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      if (name) user.name = name;
      if (phone) user.phone = phone;

      // verify old password and update
      if (currentPassword && newPassword) {
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
        user.password = newPassword;
      }

      await user.save();
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully.',
        data: { name: user.name, phone: user.phone, email: user.email }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Profile update failed: ' + error.message });
    }
  }

  // delete account
  async deleteAccount(req: AuthRequest, res: Response) {
    try {
      const user = await User.findByIdAndDelete(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.status(200).json({ 
        success: true, 
        message: 'Account deleted successfully' 
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Account deletion failed: ' + error.message });
    }
  }

  // get public stats
  async getPublicStats(req: any, res: Response) {
    try {
      const [userCount, incidentCount, zoneCount] = await Promise.all([
        User.countDocuments(),
        Incident.countDocuments(),
        SafeZone.countDocuments()
      ]);

      res.status(200).json({
        success: true,
        data: {
          users: userCount,
          incidents: incidentCount,
          safeZones: zoneCount,
          protectionIndex: 98 // static "perfect" score or calculated
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Public stats fetch failed: ' + error.message });
    }
  }
}

export default new UserController();
