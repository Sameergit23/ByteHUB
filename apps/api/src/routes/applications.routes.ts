import { Router } from "express";
import { ApplicationController } from "../controllers/application.controller.js";
import { validateRequest } from "../validators/validate.middleware.js";
import { authenticateJWT, requireRoles } from "../middleware/auth.js";
import {
  CompleteApplicationSchema,
  UpdateApplicationStatusSchema,
} from "@bytehub/shared";

export const applicationsRouter = Router();

applicationsRouter.post(
  "/",
  authenticateJWT,
  requireRoles("STUDENT", "ADMIN"),
  validateRequest({ body: CompleteApplicationSchema }),
  ApplicationController.submit
);

applicationsRouter.get(
  "/my",
  authenticateJWT,
  ApplicationController.getMyApplications
);

applicationsRouter.get(
  "/internship/:internshipId",
  authenticateJWT,
  requireRoles("COMPANY", "ADMIN"),
  ApplicationController.getInternshipApplications
);

applicationsRouter.patch(
  "/:id/status",
  authenticateJWT,
  requireRoles("COMPANY", "ADMIN"),
  validateRequest({ body: UpdateApplicationStatusSchema }),
  ApplicationController.updateStatus
);
