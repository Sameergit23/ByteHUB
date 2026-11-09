import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { validateRequest } from "../validators/validate.middleware.js";
import { authenticateJWT } from "../middleware/auth.js";
import { SignUpSchema, LoginSchema } from "@bytehub/shared";

export const authRouter = Router();

authRouter.post(
  "/register",
  validateRequest({ body: SignUpSchema }),
  AuthController.register
);

authRouter.post(
  "/login",
  validateRequest({ body: LoginSchema }),
  AuthController.login
);

authRouter.get(
  "/me",
  authenticateJWT,
  AuthController.getMe
);
