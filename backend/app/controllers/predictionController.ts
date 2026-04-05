import { Request, Response } from "express";
import Incident from "../models/Incident";

class PredictionController {
  // calculate safety/risk prediction for a location
  async getSafetyPrediction(req: Request, res: Response) {
    try {
      const { lng, lat, distance = 5000 } = req.query;

      // need to know where you are for the ai to work
      if (!lng || !lat) {
        return res
          .status(400)
          .json({
            success: false,
            message: "I need your location to analyze the area",
          });
      }

      const parsedLng = parseFloat(lng as string);
      const parsedLat = parseFloat(lat as string);
      const parsedDist = parseInt(distance as string) || 5000;

      if (isNaN(parsedLng) || isNaN(parsedLat)) {
        return res.status(400).json({ success: false, message: "Invalid coordinates provided" });
      }

      const nearbyIncidents = await Incident.aggregate([
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [parsedLng, parsedLat],
            },
            distanceField: "distance",
            maxDistance: parsedDist,
            spherical: true,
            query: {
              isVerified: true,
              createdAt: { $gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            },
          },
        },
      ]);

      // some math to figure out how safe it is
      let riskScore = 0;
      const hour = new Date().getHours();

      // density of reports adds risk
      riskScore += nearbyIncidents.length * 8;

      // night time is generally riskier
      if (hour >= 20 || hour <= 4) {
        riskScore += 25;
      } else if (hour >= 18 || hour <= 6) {
        riskScore += 10;
      }

      // making sure score stays between 0 and 100
      riskScore = Math.min(riskScore, 100);
      const safetyScore = 100 - riskScore;

      // clear levels that everyone can understand
      let level = "DANGER";
      let recommendation =
        "High risk in this area. Move quickly to a Safe Zone or call for help.";

      if (safetyScore > 80) {
        level = "SAFE";
        recommendation =
          "Everything looks good. Have a safe journey and stay alert!";
      } else if (safetyScore > 50) {
        level = "CAUTION";
        recommendation =
          "A few incidents reported nearby. Stay on busy, well-lit roads.";
      }

      res.status(200).json({
        success: true,
        data: {
          safetyScore,
          riskLevel: level,
          incidentCount: nearbyIncidents.length,
          recommendation,
          analysisTime: new Date(),
        },
      });
    } catch (error: any) {
      res
        .status(500)
        .json({
          success: false,
          message: "Prediction failed: " + error.message,
        });
    }
  }
}

export default new PredictionController();
