import { Request, Response } from "express";
import SafeZone from "../models/SafeZone";

class SafeZoneController {
  // get all hubs
  async getAllSafeZones(req: Request, res: Response) {
    try {
      const zones = await SafeZone.aggregate([{ $sort: { createdAt: -1 } }]);
      res.status(200).json({ success: true, count: zones.length, data: zones });
    } catch (error: any) {
      res
        .status(500)
        .json({
          success: false,
          message: "Global fetch failed: " + error.message,
        });
    }
  }

  // nearby hubs
  async getNearbySafeZones(req: Request, res: Response) {
    try {
      const { lng, lat, distance = 5000 } = req.query;

      // check coords
      if (!lng || !lat) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Need your coordinates for safe zones",
          });
      }

      const parsedLng = parseFloat(lng as string);
      const parsedLat = parseFloat(lat as string);
      const parsedDist = parseInt(distance as string) || 5000;

      if (isNaN(parsedLng) || isNaN(parsedLat)) {
        return res.status(400).json({ success: false, message: "Invalid coordinates provided" });
      }

      const zones = await SafeZone.aggregate([
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [parsedLng, parsedLat],
            },
            distanceField: "distance",
            maxDistance: parsedDist,
            spherical: true,
          },
        },
      ]);

      res.status(200).json({ success: true, count: zones.length, data: zones });
    } catch (error: any) {
      console.error("SAFEZONE FETCH ERROR:", error);
      res
        .status(500)
        .json({
          success: false,
          message: "Safe zone fetch failed: " + error.message,
        });
    }
  }
}

export default new SafeZoneController();
