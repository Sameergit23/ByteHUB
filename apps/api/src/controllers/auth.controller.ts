import { Request, Response, NextFunction } from "express";
import { authService, TokenPair } from "../services/auth.service.js";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";

/**
 * Cookie configuration helper
 */
const setAuthCookies = (res: Response, tokens: TokenPair): void => {
  const isProd = env.NODE_ENV === "production";

  // 1. Access Token Cookie (15 Minutes)
  res.cookie("bh_access_token", tokens.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    expires: tokens.accessTokenExpiresAt,
  });

  // 2. Rotating Refresh Token Cookie (7 Days)
  res.cookie("bh_refresh_token", tokens.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/api/auth",
    expires: tokens.refreshTokenExpiresAt,
  });
};

const clearAuthCookies = (res: Response): void => {
  const isProd = env.NODE_ENV === "production";
  res.clearCookie("bh_access_token", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
  });
  res.clearCookie("bh_refresh_token", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/api/auth",
  });
};

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = (req.headers["x-forwarded-for"] as string) || req.ip || "127.0.0.1";
      const userAgent = req.headers["user-agent"];
      const result = await authService.register(req.body, ip, userAgent);

      setAuthCookies(res, result.tokens);

      res.status(201).json({
        status: "success",
        data: {
          user: result.user,
          accessToken: result.tokens.accessToken, // Optional fallback for non-browser mobile/API clients
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = (req.headers["x-forwarded-for"] as string) || req.ip || "127.0.0.1";
      const userAgent = req.headers["user-agent"];
      const result = await authService.login(req.body, ip, userAgent);

      setAuthCookies(res, result.tokens);

      res.status(200).json({
        status: "success",
        data: {
          user: result.user,
          accessToken: result.tokens.accessToken,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = (req.headers["x-forwarded-for"] as string) || req.ip || "127.0.0.1";
      const userAgent = req.headers["user-agent"];
      // Extract refresh token from cookie or body
      const rawToken = req.cookies?.bh_refresh_token || req.body?.refreshToken;

      const result = await authService.rotateRefreshToken(rawToken, ip, userAgent);
      setAuthCookies(res, result.tokens);

      res.status(200).json({
        status: "success",
        data: {
          user: result.user,
          accessToken: result.tokens.accessToken,
        },
      });
    } catch (err) {
      clearAuthCookies(res);
      next(err);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawToken = req.cookies?.bh_refresh_token || req.body?.refreshToken;
      await authService.logout(rawToken);
      clearAuthCookies(res);
      res.status(200).json({ status: "success", message: "Logged out successfully" });
    } catch (err) {
      next(err);
    }
  }

  static async logoutEverywhere(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = (req.headers["x-forwarded-for"] as string) || req.ip || "127.0.0.1";
      await authService.logoutEverywhere(req.user!.userId, ip);
      clearAuthCookies(res);
      res.status(200).json({ status: "success", message: "All sessions terminated successfully" });
    } catch (err) {
      next(err);
    }
  }

  static async sessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessions = await authService.listActiveSessions(req.user!.userId);
      res.status(200).json({ status: "success", data: sessions });
    } catch (err) {
      next(err);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = (req.headers["x-forwarded-for"] as string) || req.ip || "127.0.0.1";
      const result = await authService.requestPasswordReset(req.body.email, ip);
      res.status(200).json({ status: "success", message: result.message });
    } catch (err) {
      next(err);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = (req.headers["x-forwarded-for"] as string) || req.ip || "127.0.0.1";
      const result = await authService.resetPassword(req.body.token, req.body.newPassword, ip);
      clearAuthCookies(res);
      res.status(200).json({ status: "success", message: result.message });
    } catch (err) {
      next(err);
    }
  }

  static async requestEmailVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.requestEmailVerification(req.body.email);
      res.status(200).json({ status: "success", message: result.message });
    } catch (err) {
      next(err);
    }
  }

  static async confirmEmailVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.confirmEmailVerification(req.body.token);
      res.status(200).json({ status: "success", message: result.message });
    } catch (err) {
      next(err);
    }
  }

  static async googleOAuthStart(_req: Request, res: Response): Promise<void> {
    const pkce = authService.generateGooglePKCE();
    res.status(200).json({ status: "success", data: pkce });
  }

  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isEmailVerified: true,
          organizationName: true,
          createdAt: true,
          studentProfile: true,
          companyProfile: true,
        },
      });

      if (!user) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found" } });
        return;
      }

      res.status(200).json({ status: "success", data: user });
    } catch (err) {
      next(err);
    }
  }
}
