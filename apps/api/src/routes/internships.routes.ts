import { Router } from "express";
import { InternshipController } from "../controllers/internship.controller.js";
import { validateRequest } from "../validators/validate.middleware.js";
import { authenticateJWT, requireRoles } from "../middleware/auth.js";
import {
  CreateInternshipSchema,
  UpdateInternshipSchema,
  InternshipFilterSchema,
} from "@bytehub/shared";

export const internshipsRouter = Router();

// Public: list with filters & cursor pagination
internshipsRouter.get(
  "/",
  validateRequest({ query: InternshipFilterSchema }),
  InternshipController.list
);

// Public: detail by slug or id
internshipsRouter.get(
  "/:slug",
  InternshipController.getBySlug
);

// Company & Admin: create internship
internshipsRouter.post(
  "/",
  authenticateJWT,
  requireRoles("COMPANY", "ADMIN"),
  validateRequest({ body: CreateInternshipSchema }),
  InternshipController.create
);

// Company & Admin: edit own internship
internshipsRouter.patch(
  "/:id",
  authenticateJWT,
  requireRoles("COMPANY", "ADMIN"),
  validateRequest({ body: UpdateInternshipSchema }),
  InternshipController.update
);

// Admin only: approve internship before publication
internshipsRouter.patch(
  "/:id/approve",
  authenticateJWT,
  requireRoles("ADMIN"),
  InternshipController.approve
);
