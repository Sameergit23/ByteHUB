import { Router } from "express";
import { HealthController } from "../controllers/health.controller.js";

export const healthRouter: Router = Router();

healthRouter.get("/", HealthController.getHealth);
