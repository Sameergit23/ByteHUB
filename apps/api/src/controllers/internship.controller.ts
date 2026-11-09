import { Request, Response, NextFunction } from "express";
import { internshipService } from "../services/internship.service.js";

export class InternshipController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await internshipService.listInternships(req.query as any);
      res.status(200).json({ status: "success", data: result });
    } catch (err) {
      next(err);
    }
  }

  static async getBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const internship = await internshipService.getInternshipBySlugOrId(req.params.slug!);
      res.status(200).json({ status: "success", data: internship });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const internship = await internshipService.createInternship(
        req.user!.userId,
        req.user!.role,
        req.body
      );
      res.status(201).json({ status: "success", data: internship });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await internshipService.updateInternship(
        req.params.id!,
        req.user!.userId,
        req.user!.role,
        req.body
      );
      res.status(200).json({ status: "success", data: updated });
    } catch (err) {
      next(err);
    }
  }

  static async approve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const approved = await internshipService.approveInternship(req.params.id!);
      res.status(200).json({ status: "success", data: approved });
    } catch (err) {
      next(err);
    }
  }
}
