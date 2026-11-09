import { Request, Response, NextFunction } from "express";
import { applicationService } from "../services/application.service.js";
import { AppError } from "../utils/apiError.js";

export class ApplicationController {
  static async submit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = (req.headers["x-forwarded-for"] as string) || req.ip || "127.0.0.1";
      const result = await applicationService.submitApplication(req.user!.userId, req.body, ip);
      res.status(201).json({ status: "success", data: result });
    } catch (err) {
      next(err);
    }
  }

  static async withdraw(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = (req.headers["x-forwarded-for"] as string) || req.ip || "127.0.0.1";
      const result = await applicationService.withdrawApplication(
        req.params.id!,
        req.user!.userId,
        ip
      );
      res.status(200).json({ status: "success", data: result });
    } catch (err) {
      next(err);
    }
  }

  static async getMyApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const applications = await applicationService.getStudentApplications(req.user!.userId);
      res.status(200).json({ status: "success", data: applications });
    } catch (err) {
      next(err);
    }
  }

  static async getResume(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await applicationService.getAuthorizedResume(
        req.params.id!,
        req.user!.userId,
        req.user!.role
      );
      res.status(200).json({ status: "success", data: result });
    } catch (err) {
      next(err);
    }
  }

  static async uploadResume(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Support raw binary buffer or base64 file payload
      let buffer: Buffer;
      let filename = req.headers["x-filename"] as string || "resume.pdf";

      if (req.body?.fileBase64) {
        buffer = Buffer.from(req.body.fileBase64, "base64");
        filename = req.body.filename || filename;
      } else if (Buffer.isBuffer(req.body)) {
        buffer = req.body;
      } else {
        throw AppError.badRequest("Invalid file upload payload. Please provide fileBase64 or raw binary stream.");
      }

      const result = await applicationService.uploadResume(buffer, filename);
      res.status(201).json({ status: "success", data: result });
    } catch (err) {
      next(err);
    }
  }

  static async getInternshipApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const applications = await applicationService.getInternshipApplications(
        req.params.internshipId!,
        req.user!.userId,
        req.user!.role
      );
      res.status(200).json({ status: "success", data: applications });
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await applicationService.updateStatus(
        req.params.id!,
        req.body.status,
        req.body.feedbackNote,
        req.user!.userId,
        req.user!.role
      );
      res.status(200).json({ status: "success", data: updated });
    } catch (err) {
      next(err);
    }
  }
}
