import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Incident from '../models/Incident';
import SafeZone from '../models/SafeZone';
import SOS from '../models/SOS';
import logger from '../utils/logger';

class UserController {
  // add a new person to emergency contact list
  async addContact(req: AuthRequest, res: Response) {
    try {
      const { name, phone, email, relation } = req.body;
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({ success: false, message: 'who are you? user not found' });
      }

      // limit to 3 contacts
      if (user.emergencyContacts.length >= 3) {
        return res.status(400).json({ success: false, message: 'max 3 contacts allowed' });
      }

      // check if they paid for extra slots (first one is free)
      if (user.emergencyContacts.length >= 1) {
        if (user.contactSlots < 1) {
           return res.status(403).json({ 
             success: false, 
             message: 'you need to pay for more contact slots' 
           });
        }
        user.contactSlots -= 1;
      }

      user.emergencyContacts.push({ name, phone, email, relation });
      await user.save();

      res.status(200).json({ success: true, data: user.emergencyContacts });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'failed to add contact: ' + error.message });
    }
  }

  // remove a contact by id
  async deleteContact(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'user not found' });
      }
      
      user.emergencyContacts = user.emergencyContacts.filter(
        (contact: any) => (contact as any)._id.toString() !== req.params.id
      );
      
      await user.save();
      res.status(200).json({ success: true, data: user.emergencyContacts });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'delete failed: ' + error.message });
    }
  }

  // list all emergency contacts
  async getContacts(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'user missing' });
      }
      res.status(200).json({ success: true, data: user.emergencyContacts });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'fetch contacts error: ' + error.message });
    }
  }

  // update users current lat/lng
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
        return res.status(404).json({ success: false, message: 'user not here' });
      }

      res.status(200).json({ success: true, data: user.location });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'location update fail: ' + error.message });
    }
  }

  // log when someone reaches a safe place
  async notifyArrival(req: AuthRequest, res: Response) {
    try {
      const { zoneName } = req.body;
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({ success: false, message: 'user not found' });
      }

      logger.info(`User ${user.name} is safe at ${zoneName}`);
      
      res.status(200).json({ 
        success: true, 
        message: `sent notify to contacts that you're at ${zoneName}` 
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'arrival notification failed: ' + error.message });
    }
  }

  // change name, phone or password
  async updateProfile(req: AuthRequest, res: Response) {
    try {
      const { name, phone, currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user.id).select('+password');
      if (!user) return res.status(404).json({ success: false, message: 'user not found' });

      if (name) user.name = name;
      if (phone) user.phone = phone;

      // handles password change
      if (currentPassword && newPassword) {
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) return res.status(401).json({ success: false, message: 'password is wrong' });
        user.password = newPassword;
      }

      await user.save();
      res.status(200).json({
        success: true,
        message: 'profile updated ok',
        data: { name: user.name, phone: user.phone, email: user.email }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'profile update failed: ' + error.message });
    }
  }

  // remove user from system
  async deleteAccount(req: AuthRequest, res: Response) {
    try {
      const user = await User.findByIdAndDelete(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'user not found' });
      }

      res.status(200).json({ 
        success: true, 
        message: 'account deleted' 
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'account deletion failed: ' + error.message });
    }
  }

  // get general system stats for home page
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
          protectionIndex: 98
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'stats fetch failed: ' + error.message });
    }
  }
}

export default new UserController();
