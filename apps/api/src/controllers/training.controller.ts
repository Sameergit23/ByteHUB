import { Request, Response, NextFunction } from "express";
import { trainingService } from "../services/training.service.js";

export class TrainingController {
  static async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await trainingService.listPrograms();
      res.status(200).json({ status: "success", data });
    } catch (err) {
      next(err);
    }
  }

  static async getBySlugOrId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await trainingService.getProgram(req.params.slugOrId);
      res.status(200).json({ status: "success", data });
    } catch (err) {
      next(err);
    }
  }
}

