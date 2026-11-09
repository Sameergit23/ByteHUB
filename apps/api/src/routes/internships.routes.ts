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

internshipsRouter.get(
  "/",
  validateRequest({ query: InternshipFilterSchema }),
  InternshipController.list
);

internshipsRouter.get(
  "/:id",
  InternshipController.getById
);

internshipsRouter.post(
  "/",
  authenticateJWT,
  requireRoles("COMPANY", "ADMIN"),
  validateRequest({ body: CreateInternshipSchema }),
  InternshipController.create
);

internshipsRouter.patch(
  "/:id",
  authenticateJWT,
  requireRoles("COMPANY", "ADMIN"),
  validateRequest({ body: UpdateInternshipSchema }),
  InternshipController.update
);
