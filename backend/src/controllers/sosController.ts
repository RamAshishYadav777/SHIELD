import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import SOS from '../models/SOS';
import User from '../models/User';
import notificationController from './notificationController';
import sendEmail from '../utils/sendEmail';
import logger from '../utils/logger';

class SOSController {
  // fires off an sos signal
  async triggerSOS(req: AuthRequest, res: Response) {
    try {
      const { coordinates, message } = req.body;
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found in data' });
      }

      const sos = await SOS.create({
        user: req.user.id,
        location: {
          type: 'Point',
          coordinates
        },
        message
      });

      // notify the emergency list and admins
      const io = req.app.get('io');
      const admins = await User.find({ role: 'admin' });
      logger.info(`SOS Triggered: Found ${admins.length} admins and ${user.emergencyContacts.length} emergency contacts.`);
      
      // Global Socket Alert for real-time monitoring
      if (io) {
        io.emit('system-alert', {
          type: 'SOS',
          userName: user.name,
          coordinates: coordinates,
          time: new Date()
        });
      }
      
      // 1. Alerting Admins (System and Email)
      for (const admin of admins) {
        // Socket/Push
        notificationController.sendNotification(admin._id.toString(), {
          title: '🚨 EMERGENCY SOS ALERT',
          body: `${user.name} is in danger! Coordinates: ${coordinates[1]}, ${coordinates[0]}`,
          icon: '/logo.png'
        });

        // Email Admin
        if (admin.email) {
          try {
            await sendEmail({
              email: admin.email,
              subject: `🚨 SYSTEM ALERT: SOS triggered by ${user.name}`,
              message: `User ${user.name} (${user.phone}) has triggered an emergency SOS alert.
              
Location: ${coordinates[1]}, ${coordinates[0]}
Navigation: https://www.google.com/maps?q=${coordinates[1]},${coordinates[0]}`,
              html: `<h2 style="color: red;">🚨 ADMINISTRATIVE SOS ALERT</h2>
                     <p>User <strong>${user.name}</strong> is in distress.</p>
                     <p><strong>GPS:</strong> ${coordinates[1]}, ${coordinates[0]}</p>
                     <a href="https://www.google.com/maps?q=${coordinates[1]},${coordinates[0]}">Open in Google Maps</a>`
            });
          } catch (e) {}
        }
      }

      // 2. Emailing Emergency Contacts
      for (const contact of user.emergencyContacts as any[]) {
        if (contact.email) {
          logger.info(`Attempting to email emergency contact: ${contact.name} (${contact.email})`);
          try {
            await sendEmail({
              email: contact.email,
              subject: `🚨 EMERGENCY: ${user.name} needs help!`,
              message: `URGENT: ${user.name} has triggered an SOS alert on SHIELD. 
              
Location: ${coordinates[1]}, ${coordinates[0]}
Message: ${message || 'No additional message provided.'}

Direct Navigation: https://www.google.com/maps?q=${coordinates[1]},${coordinates[0]}

Please take immediate action.`,
              html: `
                <div style="font-family: sans-serif; padding: 20px; border: 2px solid #ff0000; border-radius: 10px;">
                  <h1 style="color: #ff0000; margin-top: 0;">🚨 EMERGENCY ALERT</h1>
                  <p><strong>${user.name}</strong> has triggered an SOS signal on the SHIELD Defense Platform.</p>
                  <div style="background: #f8f8f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Message:</strong> ${message || 'No message provided'}</p>
                    <p><strong>Coordinates:</strong> ${coordinates[1]}, ${coordinates[0]}</p>
                  </div>
                  <a href="https://www.google.com/maps?q=${coordinates[1]},${coordinates[0]}" 
                     style="display: block; background: #ff0000; color: white; text-align: center; padding: 15px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                     VIEW LIVE LOCATION ON MAP
                  </a>
                  <p style="font-size: 12px; color: #666; margin-top: 20px;">
                    This is an automated emergency signal from the SHIELD Global Defense Matrix.
                  </p>
                </div>
              `
            });
            logger.info(`Successfully emailed ${contact.name}`);
          } catch (err) {
            logger.error(`Failed to email contact ${contact.email}:`, err);
          }
        } else {
          logger.info(`Contact ${contact.name} has no email address. Skipping email alert.`);
        }
      }
      
      res.status(201).json({
        success: true,
        data: sos,
        message: 'SOS triggered. We are notifying your contacts and admins'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'SOS trigger failed: ' + error.message });
    }
  }

  // list of active alerts for admins to see
  async getActiveSOS(req: AuthRequest, res: Response) {
    try {
      const alerts = await SOS.find({ status: 'active' }).populate('user', 'name phone email');
      res.status(200).json({ success: true, data: alerts });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Fetch active alerts failed: ' + error.message });
    }
  }

  // user wants to see their past sos calls
  async getSOSHistory(req: AuthRequest, res: Response) {
    try {
      const history = await SOS.find({ user: req.user.id }).sort('-createdAt');
      res.status(200).json({ success: true, data: history });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'History fetch failed: ' + error.message });
    }
  }

  // mark an alert as resolved
  async resolveSOS(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const sos = await SOS.findById(id);
      if (!sos) {
        return res.status(404).json({ success: false, message: 'SOS alert missing' });
      }

      // check if it is the owner or admin doing this
      if (sos.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(401).json({ success: false, message: 'No permission to resolve this' });
      }

      sos.status = 'resolved';
      sos.resolvedAt = new Date();
      await sos.save();

      res.status(200).json({ success: true, data: sos });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Resolve failed: ' + error.message });
    }
  }
}

export default new SOSController();
