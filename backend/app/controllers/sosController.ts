import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/auth";
import SOS from "../models/SOS";
import User from "../models/User";
import notificationController from "./notificationController";
import sendEmail from "../utils/sendEmail";
import logger from "../utils/logger";
import axios from "axios";

class SOSController {
  // trigger sos signal
  async triggerSOS(req: AuthRequest, res: Response) {
    try {
      const { coordinates, message } = req.body;
      let address = req.body.address;

      // reverse geocode if no address
      if (!address || address === "Current Location" || address === "") {
        try {
          const [lng, lat] = coordinates;
          const geoRes = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`,
            {
              headers: { "User-Agent": "SHIELD-Safety-Server" },
            },
          );
          if (geoRes.data && geoRes.data.display_name) {
            address = geoRes.data.display_name.split(",").slice(0, 3).join(",");
          }
        } catch (e) {
          console.warn("Backend geocoding failed, using placeholder");
        }
      }

      // ensure address exists
      address = address || "GPS Pinned Location";

      const user = await (User.findById(req.user.id) as any).populate(
        "emergencyContacts",
      );

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      console.log(`[SOS SIGNAL] Saving location: ${address}`);

      const sos = await SOS.create({
        user: req.user.id,
        location: {
          type: "Point",
          coordinates,
        },
        address: address,
        message,
      });

      // return early to user
      res.status(201).json({
        success: true,
        data: sos,
        message: "SOS triggered. We are notifying your contacts and admins",
      });

      // --- background alerts ---
      // handle notifications async to avoid delay for user
      (async () => {
        try {
          const io = req.app.get("io");
          const admins = await User.find({ role: "admin" });
          logger.info(
            `Background SOS alerts: Processing for ${admins.length} admins and ${user.emergencyContacts.length} contacts.`,
          );

          // socket alerts
          if (io) {
            io.emit("system-alert", {
              type: "SOS",
              userName: user.name,
              coordinates: coordinates,
              time: new Date(),
            });

            // live feed update
            io.emit("new-sos", {
              ...sos.toObject(),
              user: {
                name: user.name,
                email: user.email,
              },
            });
          }

          // Track emails already notified to avoid duplicates
          const notifiedEmails = new Set<string>();

          // notify admins
          for (const admin of admins) {
            notificationController
              .sendNotification(admin._id.toString(), {
                title: "🚨 EMERGENCY SOS ALERT",
                body: `${user.name} is in danger! Coordinates: ${coordinates[1]}, ${coordinates[0]}`,
                icon: "/logo.png",
              })
              .catch((e) =>
                logger.error(
                  `Push failed for admin ${admin._id}: ${e.message}`,
                ),
              );

            if (admin.email) {
              notifiedEmails.add(admin.email.toLowerCase());
              sendEmail({
                email: admin.email,
                subject: `🚨 SYSTEM ALERT: SOS triggered by ${user.name}`,
                message: `User ${user.name} (${user.phone}) has triggered an emergency SOS alert.`,
                html: `<h2 style="color: red;">🚨 ADMINISTRATIVE SOS ALERT</h2>
                       <p>User <strong>${user.name}</strong> is in distress.</p>
                       <p><strong>GPS:</strong> ${coordinates[1]}, ${coordinates[0]}</p>
                       <a href="https://www.google.com/maps?q=${coordinates[1]},${coordinates[0]}">Open in Google Maps</a>`,
              }).catch((e) =>
                logger.error(
                  `Email failed for admin ${admin.email}: ${e.message}`,
                ),
              );
            }
          }

          // notify emergency contacts
          for (const contact of user.emergencyContacts as any[]) {
            if (contact.email) {
              const contactEmail = contact.email.toLowerCase();
              if (notifiedEmails.has(contactEmail)) {
                logger.info(
                  `SOS System: Skipping ${contact.email} (already notified as admin)`,
                );
                continue;
              }
              notifiedEmails.add(contactEmail);
              logger.info(
                "send email to contact",
              );
              sendEmail({
                email: contact.email,
                subject: `🚨 EMERGENCY: ${user.name} needs help!`,
                message: `URGENT: ${user.name} has triggered an SOS alert.`,
                html: `
                  <div style="font-family: sans-serif; padding: 20px; border: 2px solid #ff0000; border-radius: 10px;">
                    <h1 style="color: #ff0000; margin-top: 0;">🚨 EMERGENCY ALERT</h1>
                    <p><strong>${user.name}</strong> has triggered an SOS signal on the SHIELD Defense Platform.</p>
                    <div style="background: #f8f8f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                      <p><strong>Message:</strong> ${message || "No message provided"}</p>
                      <p><strong>Coordinates:</strong> ${coordinates[1]}, ${coordinates[0]}</p>
                    </div>
                    <a href="https://www.google.com/maps?q=${coordinates[1]},${coordinates[0]}" 
                       style="display: block; background: #ff0000; color: white; text-align: center; padding: 15px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                       VIEW LIVE LOCATION ON MAP
                    </a>
                  </div>
                `,
              })
                .then(() =>
                  logger.info(
                    `SOS System: Successfully sent email to ${contact.email}`,
                  ),
                )
                .catch((e) =>
                  logger.error(
                    `SOS System: Email failed for contact ${contact.email}: ${e.message}`,
                  ),
                );
            } else {
              logger.info(
                `SOS System: Skipping contact ${contact.name} (No email provided)`,
              );
            }
          }
        } catch (backgroundError: any) {
          logger.error(
            "Critical failure in SOS background alert system: " +
              backgroundError.message,
          );
        }
      })();
    } catch (error: any) {
      res
        .status(500)
        .json({
          success: false,
          message: "SOS trigger failed: " + error.message,
        });
    }
  }

  // get active alerts
  async getActiveSOS(req: AuthRequest, res: Response) {
    try {
      const alerts = await SOS.aggregate([
        { $match: { status: "active" } },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        {
          $project: {
            "user.name": 1,
            "user.email": 1,
            location: 1,
            address: 1,
            message: 1,
            status: 1,
            createdAt: 1,
          },
        },
      ]);
      res.status(200).json({ success: true, data: alerts });
    } catch (error: any) {
      res
        .status(500)
        .json({
          success: false,
          message: "Fetch active alerts failed: " + error.message,
        });
    }
  }

  // get user history
  async getSOSHistory(req: AuthRequest, res: Response) {
    try {
      const history = await SOS.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(req.user.id) } },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        { $sort: { createdAt: -1 } },
        {
          $project: {
            "user.name": 1,
            "user.email": 1,
            location: 1,
            address: 1,
            message: 1,
            status: 1,
            resolvedAt: 1,
            createdAt: 1,
          },
        },
      ]);
      res.status(200).json({ success: true, data: history });
    } catch (error: any) {
      res
        .status(500)
        .json({
          success: false,
          message: "History fetch failed: " + error.message,
        });
    }
  }

  async getAllSOSAdmin(req: AuthRequest, res: Response) {
    try {
      const history = await SOS.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        { $sort: { createdAt: -1 } },
        {
          $project: {
            "user.name": 1,
            "user.email": 1,
            "user.role": 1,
            "user.phone": 1,
            "user.emergencyContacts": 1,
            location: 1,
            address: 1,
            message: 1,
            status: 1,
            resolvedAt: 1,
            createdAt: 1,
          },
        },
      ]);
      res.json({ success: true, count: history.length, data: history });
    } catch (error: any) {
      logger.error(`Error fetching admin SOS history: ${error.message}`);
      res.status(500).json({ success: false, message: error.message });
    }
  }
  // resolve alert
  async resolveSOS(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const sos = await SOS.findById(id);
      if (!sos) {
        return res
          .status(404)
          .json({ success: false, message: "SOS alert missing" });
      }

      // auth check
      if (sos.user.toString() !== req.user.id && req.user.role !== "admin") {
        return res
          .status(401)
          .json({ success: false, message: "No permission to resolve this" });
      }

      sos.status = "resolved";
      sos.resolvedAt = new Date();
      await sos.save();

      res.status(200).json({ success: true, data: sos });
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, message: "Resolve failed: " + error.message });
    }
  }
}

export default new SOSController();
