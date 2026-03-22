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
      const user = await (User.findById(req.user.id) as any).populate('emergencyContacts');

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const sos = await SOS.create({
        user: req.user.id,
        location: {
          type: 'Point',
          coordinates
        },
        message
      });

      // Notify user immediately that we received the signal
      res.status(201).json({
        success: true,
        data: sos,
        message: 'SOS triggered. We are notifying your contacts and admins'
      });

      // ─── BACKGROUND NOTIFICATIONS ───────────────────────────────────────────
      // We run this AFTER sending the response to ensure "Zero Delay" for the user
      (async () => {
        try {
          const io = req.app.get('io');
          const admins = await User.find({ role: 'admin' });
          logger.info(`Background SOS alerts: Processing for ${admins.length} admins and ${user.emergencyContacts.length} contacts.`);

          // Global Socket Alert
          if (io) {
            io.emit('system-alert', {
              type: 'SOS',
              userName: user.name,
              coordinates: coordinates,
              time: new Date()
            });
          }

          // Track emails already notified to avoid duplicates
          const notifiedEmails = new Set<string>();

          // 1. Alerting Admins
          for (const admin of admins) {
            notificationController.sendNotification(admin._id.toString(), {
              title: '🚨 EMERGENCY SOS ALERT',
              body: `${user.name} is in danger! Coordinates: ${coordinates[1]}, ${coordinates[0]}`,
              icon: '/logo.png'
            }).catch(e => logger.error(`Push failed for admin ${admin._id}: ${e.message}`));

            if (admin.email) {
              notifiedEmails.add(admin.email.toLowerCase());
              sendEmail({
                email: admin.email,
                subject: `🚨 SYSTEM ALERT: SOS triggered by ${user.name}`,
                message: `User ${user.name} (${user.phone}) has triggered an emergency SOS alert.`,
                html: `<h2 style="color: red;">🚨 ADMINISTRATIVE SOS ALERT</h2>
                       <p>User <strong>${user.name}</strong> is in distress.</p>
                       <p><strong>GPS:</strong> ${coordinates[1]}, ${coordinates[0]}</p>
                       <a href="https://www.google.com/maps?q=${coordinates[1]},${coordinates[0]}">Open in Google Maps</a>`
              }).catch(e => logger.error(`Email failed for admin ${admin.email}: ${e.message}`));
            }
          }

          // 2. Alerting Emergency Contacts (skip anyone already notified as admin)
          for (const contact of user.emergencyContacts as any[]) {
            if (contact.email) {
              const contactEmail = contact.email.toLowerCase();
              if (notifiedEmails.has(contactEmail)) {
                logger.info(`SOS System: Skipping ${contact.email} (already notified as admin)`);
                continue;
              }
              notifiedEmails.add(contactEmail);
              logger.info(`SOS System: Attempting to email emergency contact ${contact.name} at ${contact.email}`);
              sendEmail({
                email: contact.email,
                subject: `🚨 EMERGENCY: ${user.name} needs help!`,
                message: `URGENT: ${user.name} has triggered an SOS alert.`,
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
                  </div>
                `
              })
              .then(() => logger.info(`SOS System: Successfully sent email to ${contact.email}`))
              .catch(e => logger.error(`SOS System: Email failed for contact ${contact.email}: ${e.message}`));
            } else {
              logger.info(`SOS System: Skipping contact ${contact.name} (No email provided)`);
            }
          }
        } catch (backgroundError: any) {
          logger.error('Critical failure in SOS background alert system: ' + backgroundError.message);
        }
      })();
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
