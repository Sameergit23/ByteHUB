import { Router } from "express";
import { InternshipController } from "../controllers/internship.controller.js";
import { validateRequest } from "../validators/validate.middleware.js";
import { authenticateJWT } from "../middleware/auth.js";
import { requirePermission, requireStaff } from "../middleware/staff.js";
import {
  CreateInternshipSchema,
  UpdateInternshipSchema,
  InternshipFilterSchema,
} from "@bytehub/shared";

export const internshipsRouter: Router = Router();

// Public: list with filters & cursor pagination
internshipsRouter.get(
  "/",
  validateRequest({ query: InternshipFilterSchema }),
  InternshipController.list
);

// Company & Admin: own postings with applicant counts (must sit before "/:slug")
internshipsRouter.get(
  "/mine",
  authenticateJWT,
  requireStaff(),
  requirePermission("internships.manage"),
  InternshipController.listMine
);

// Public: detail by slug or id
internshipsRouter.get("/:slug", InternshipController.getBySlug);

// Admin only: ByteHUB posts every internship (companies don't have accounts)
internshipsRouter.post(
  "/",
  authenticateJWT,
  requireStaff(),
  requirePermission("internships.manage"),
  validateRequest({ body: CreateInternshipSchema }),
  InternshipController.create
);

// Admin only: edit an internship
internshipsRouter.patch(
  "/:id",
  authenticateJWT,
  requireStaff(),
  requirePermission("internships.manage"),
  validateRequest({ body: UpdateInternshipSchema }),
  InternshipController.update
);

// Admin only: approve internship before publication
internshipsRouter.patch(
  "/:id/approve",
  authenticateJWT,
  requireStaff(),
  requirePermission("internships.manage"),
  InternshipController.approve
);
