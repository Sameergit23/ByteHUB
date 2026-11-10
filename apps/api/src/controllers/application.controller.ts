import { Request, Response, NextFunction } from "express";
import path from "node:path";
import { applicationService } from "../services/application.service.js";
import { AppError } from "../utils/apiError.js";
import { verifySignedResumeUrl, getResumeVaultDir } from "../utils/resumeStorage.js";

export class ApplicationController {
  static async submit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = (req.headers["x-forwarded-for"] as string) || req.ip || "127.0.0.1";
      const result = await applicationService.submitApplication(
        req.user!.userId,
        req.body,
        ip
      );
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

  static async getMyApplications(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const applications = await applicationService.getStudentApplications(
        req.user!.userId
      );
      res.status(200).json({ status: "success", data: applications });
    } catch (err) {
      next(err);
    }
  }

  static async getCompanyApplications(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const applications = await applicationService.getCompanyApplications(
        req.user!.userId
      );
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

  static async uploadResume(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Support raw binary buffer or base64 file payload
      let buffer: Buffer;
      let filename = (req.headers["x-filename"] as string) || "resume.pdf";

      if (req.body?.fileBase64) {
        buffer = Buffer.from(req.body.fileBase64, "base64");
        filename = req.body.filename || filename;
      } else if (Buffer.isBuffer(req.body)) {
        buffer = req.body;
      } else {
        throw AppError.badRequest(
          "Invalid file upload payload. Please provide fileBase64 or raw binary stream."
        );
      }

      const result = await applicationService.uploadResume(buffer, filename);
      res.status(201).json({ status: "success", data: result });
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

  static async updateStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
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

  static async downloadResumeFile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { key, expires, signature } = req.query;
      if (
        typeof key !== "string" ||
        typeof expires !== "string" ||
        typeof signature !== "string"
      ) {
        throw AppError.badRequest("Missing signature, key, or expiry query parameters.");
      }

      const isValid = verifySignedResumeUrl(key, expires, signature);
      if (!isValid) {
        throw AppError.forbidden("Invalid or expired resume download signature.");
      }

      // Path Traversal Guard: key must strictly resolve inside storage/vault/resumes
      const normalizedKey = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
      if (!normalizedKey.startsWith("resumes/") || normalizedKey.includes("..")) {
        throw AppError.forbidden("Access denied: Invalid resume path.");
      }

      const filename = path.basename(normalizedKey);
      const vaultDir = getResumeVaultDir();
      const targetFile = path.resolve(vaultDir, filename);

      if (!targetFile.startsWith(vaultDir)) {
        throw AppError.forbidden("Path traversal violation blocked.");
      }

      const ext = path.extname(filename).toLowerCase();
      const mimeType =
        ext === ".pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

      res.setHeader("Content-Type", mimeType);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Disposition", `inline; filename="resume${ext}"`);
      res.sendFile(targetFile);
    } catch (err) {
      next(err);
    }
  }
}
