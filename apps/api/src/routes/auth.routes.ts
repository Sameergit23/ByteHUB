import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { validateRequest } from "../validators/validate.middleware.js";
import { authenticateJWT } from "../middleware/auth.js";
import {
  SignUpSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  EmailVerificationRequestSchema,
  EmailVerificationConfirmSchema,
} from "@bytehub/shared";

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

authRouter.post("/refresh", AuthController.refresh);

authRouter.post("/logout", AuthController.logout);

authRouter.post(
  "/logout-all",
  authenticateJWT,
  AuthController.logoutEverywhere
);

authRouter.get(
  "/sessions",
  authenticateJWT,
  AuthController.sessions
);

authRouter.post(
  "/forgot-password",
  validateRequest({ body: ForgotPasswordSchema }),
  AuthController.forgotPassword
);

authRouter.post(
  "/reset-password",
  validateRequest({ body: ResetPasswordSchema }),
  AuthController.resetPassword
);

authRouter.post(
  "/verify-email/request",
  validateRequest({ body: EmailVerificationRequestSchema }),
  AuthController.requestEmailVerification
);

authRouter.post(
  "/verify-email/confirm",
  validateRequest({ body: EmailVerificationConfirmSchema }),
  AuthController.confirmEmailVerification
);

authRouter.get("/oauth/google/start", AuthController.googleOAuthStart);

authRouter.get(
  "/me",
  authenticateJWT,
  AuthController.getMe
);
