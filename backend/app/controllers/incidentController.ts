import { Request, Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/auth";
import Incident from "../models/Incident";
import { uploadToCloudinary } from "../utils/imageUpload";

class IncidentController {
  // reporting a new safety incident
  async createIncident(req: AuthRequest, res: Response) {
    try {
      const { title, description, category, address, coordinates } = req.body;
      let imageUrls: string[] = [];

      // if user sent a pic, upload it
      if (req.file) {
        const url = await uploadToCloudinary(req.file.buffer);
        imageUrls.push(url);
      }

      const incident = await Incident.create({
        user: req.user.id,
        title,
        description,
        category,
        location: {
          type: "Point",
          coordinates:
            typeof coordinates === "string"
              ? JSON.parse(coordinates)
              : coordinates,
          address,
        },
        images: imageUrls,
      });

      res.status(201).json({ success: true, data: incident });
    } catch (error: any) {
      res
        .status(500)
        .json({
          success: false,
          message: "Couldnt submit incident: " + error.message,
        });
    }
  }

  // get incidents
  async getIncidents(req: Request, res: Response) {
    try {
      const pipeline: any[] = [];
      if (req.query.verified === "true") {
        pipeline.push({ $match: { isVerified: true } });
      }
      pipeline.push(
        { $sort: { createdAt: -1 } },
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
            title: 1,
            description: 1,
            category: 1,
            location: 1,
            images: 1,
            isVerified: 1,
            createdAt: 1,
          },
        },
      );

      const incidents = await Incident.aggregate(pipeline);
      res.status(200).json({ success: true, data: incidents });
    } catch (error: any) {
      res
        .status(500)
        .json({
          success: false,
          message: "Server error while fetching incidents: " + error.message,
        });
    }
  }

  // get incident by id
  async getIncidentById(req: Request, res: Response) {
    try {
      const incident = await Incident.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(req.params.id as string) } },
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
            title: 1,
            description: 1,
            category: 1,
            location: 1,
            images: 1,
            isVerified: 1,
            createdAt: 1,
          },
        },
      ]);
      if (!incident || incident.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "No such incident found" });
      }
      res.status(200).json({ success: true, data: incident[0] });
    } catch (error: any) {
      res
        .status(500)
        .json({
          success: false,
          message: "Error getting incident: " + error.message,
        });
    }
  }

  // get user incidents
  async getMyIncidents(req: AuthRequest, res: Response) {
    try {
      const incidents = await Incident.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(req.user.id as string) } },
        { $sort: { createdAt: -1 } },
      ]);
      res
        .status(200)
        .json({ success: true, count: incidents.length, data: incidents });
    } catch (error: any) {
      res
        .status(500)
        .json({
          success: false,
          message: "Couldnt get my reports: " + error.message,
        });
    }
  }
}

export default new IncidentController();
