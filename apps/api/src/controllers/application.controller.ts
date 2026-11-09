import { Request, Response, NextFunction } from "express";
import { applicationService } from "../services/application.service.js";

export class ApplicationController {
  static async submit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await applicationService.submitApplication(req.user!.userId, req.body);
      res.status(201).json({
        status: "success",
        message: "Application submitted successfully",
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMyApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await applicationService.getStudentApplications(req.user!.userId);
      res.status(200).json({ status: "success", data });
    } catch (err) {
      next(err);
    }
  }

  static async getInternshipApplications(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const data = await applicationService.getInternshipApplications(
        req.params.internshipId,
        req.user!.userId,
        req.user!.role
      );
      res.status(200).json({ status: "success", data });
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await applicationService.updateStatus(
        req.params.id,
        req.body.status,
        req.body.feedbackNote,
        req.user!.userId,
        req.user!.role
      );
      res.status(200).json({ status: "success", data });
    } catch (err) {
      next(err);
    }
  }
}
