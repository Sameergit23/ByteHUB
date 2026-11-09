import { Request, Response, NextFunction } from "express";
import { internshipService } from "../services/internship.service.js";

export class InternshipController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await internshipService.listInternships(req.query as any);
      res.status(200).json({ status: "success", data });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await internshipService.getInternshipById(req.params.id);
      res.status(200).json({ status: "success", data });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await internshipService.createInternship(req.user!.userId, req.body);
      res.status(201).json({ status: "success", data });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await internshipService.updateInternship(
        req.params.id,
        req.user!.userId,
        req.user!.role,
        req.body
      );
      res.status(200).json({ status: "success", data });
    } catch (err) {
      next(err);
    }
  }
}

