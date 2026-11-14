import { Router } from "express";
import { ApplicationController } from "../controllers/application.controller.js";
import { validateRequest } from "../validators/validate.middleware.js";
import { authenticateJWT, requireRoles } from "../middleware/auth.js";
import { requirePermission, requireStaff, staffOnlyNeeds } from "../middleware/staff.js";
import { uploadRateLimiter } from "../middleware/rateLimiter.js";
import {
  CompleteApplicationSchema,
  UpdateApplicationStatusSchema,
} from "@bytehub/shared";

export const applicationsRouter: Router = Router();

// Secure signed resume download (token-authenticated via HMAC & expiry)
applicationsRouter.get("/resume-download", ApplicationController.downloadResumeFile);

// Student: Submit application
applicationsRouter.post(
  "/",
  authenticateJWT,
  requireRoles("STUDENT", "ADMIN"),
  validateRequest({ body: CompleteApplicationSchema }),
  ApplicationController.submit
);

// Student: List my submitted applications
applicationsRouter.get(
  "/my",
  authenticateJWT,
  requireRoles("STUDENT", "ADMIN"),
  ApplicationController.getMyApplications
);

// Student: Withdraw application
applicationsRouter.post(
  "/:id/withdraw",
  authenticateJWT,
  requireRoles("STUDENT", "ADMIN"),
  ApplicationController.withdraw
);

// Company & Admin: every application across the company's own postings
applicationsRouter.get(
  "/company",
  authenticateJWT,
  requireStaff(),
  requirePermission("applications.view"),
  ApplicationController.getCompanyApplications
);

// Student, Company, Admin: Download / view resume (guarded against IDOR)
applicationsRouter.get(
  "/:id/resume",
  authenticateJWT,
  // Students can open their own resume; staff need the applications permission.
  staffOnlyNeeds("applications.view"),
  ApplicationController.getResume
);

// Resume upload with magic bytes verification and rate limiting
applicationsRouter.post(
  "/upload-resume",
  authenticateJWT,
  requireRoles("STUDENT", "ADMIN"),
  uploadRateLimiter,
  ApplicationController.uploadResume
);

// Company & Admin: Review candidate applications for a specific posting
applicationsRouter.get(
  "/internship/:internshipId",
  authenticateJWT,
  requireStaff(),
  requirePermission("applications.view"),
  ApplicationController.getInternshipApplications
);

// Company & Admin: Update candidate pipeline stage
applicationsRouter.patch(
  "/:id/status",
  authenticateJWT,
  requireStaff(),
  requirePermission("applications.manage"),
  validateRequest({ body: UpdateApplicationStatusSchema }),
  ApplicationController.updateStatus
);
