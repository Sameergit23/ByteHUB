import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { validateRequest } from "../validators/validate.middleware.js";
import { authenticateJWT } from "../middleware/auth.js";
import { authRateLimiter } from "../middleware/rateLimiter.js";
import {
  SignUpSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  EmailVerificationRequestSchema,
  EmailVerificationConfirmSchema,
} from "@bytehub/shared";

export const authRouter: Router = Router();

authRouter.post(
  "/register",
  authRateLimiter,
  validateRequest({ body: SignUpSchema }),
  AuthController.register
);

authRouter.post(
  "/login",
  authRateLimiter,
  validateRequest({ body: LoginSchema }),
  AuthController.login
);

authRouter.post("/refresh", AuthController.refresh);

authRouter.post("/logout", AuthController.logout);

authRouter.post("/logout-all", authenticateJWT, AuthController.logoutEverywhere);

authRouter.get("/sessions", authenticateJWT, AuthController.sessions);

authRouter.post(
  "/forgot-password",
  authRateLimiter,
  validateRequest({ body: ForgotPasswordSchema }),
  AuthController.forgotPassword
);

authRouter.post(
  "/reset-password",
  authRateLimiter,
  validateRequest({ body: ResetPasswordSchema }),
  AuthController.resetPassword
);

authRouter.post(
  "/verify-email/request",
  authRateLimiter,
  validateRequest({ body: EmailVerificationRequestSchema }),
  AuthController.requestEmailVerification
);

authRouter.post(
  "/verify-email/confirm",
  validateRequest({ body: EmailVerificationConfirmSchema }),
  AuthController.confirmEmailVerification
);

authRouter.get("/oauth/google/start", AuthController.googleOAuthStart);

authRouter.get("/me", authenticateJWT, AuthController.getMe);

authRouter.get("/me/export", authenticateJWT, AuthController.exportData);

authRouter.delete("/me", authenticateJWT, AuthController.deleteAccount);
