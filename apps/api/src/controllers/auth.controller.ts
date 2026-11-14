import { Request, Response, NextFunction } from "express";
import { authService, TokenPair } from "../services/auth.service.js";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { twoFactorService } from "../services/twoFactor.service.js";
import { hashToken } from "../utils/password.js";
import type { UserRole } from "@bytehub/shared";

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

      // Staff with two-factor: no session yet, the browser asks for the authenticator code.
      if (result.twoFactorRequired) {
        res.status(200).json({
          status: "success",
          data: {
            twoFactorRequired: true,
            challengeToken: result.challengeToken,
            user: result.user,
          },
        });
        return;
      }

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

  /**
   * POST /api/auth/2fa/login — second sign-in step for staff (authenticator or backup code).
   */
  static async twoFactorLogin(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const ip = (req.headers["x-forwarded-for"] as string) || req.ip || "127.0.0.1";
      const userAgent = req.headers["user-agent"];
      const result = await authService.completeTwoFactorLogin(
        req.body.challengeToken,
        req.body.code,
        ip,
        userAgent
      );
      setAuthCookies(res, result.tokens);
      res.status(200).json({
        status: "success",
        data: { user: result.user, backupCodesLeft: result.backupCodesLeft },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/2fa/setup — staff start setting up their authenticator app (QR code).
   */
  static async twoFactorSetup(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const data = await twoFactorService.beginSetup(req.user!.id);
      res.status(200).json({ status: "success", data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/2fa/enable — confirm with a code; returns the backup codes (shown once)
   * and upgrades the current session to a two-factor session.
   */
  static async twoFactorEnable(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const ip = (req.headers["x-forwarded-for"] as string) || req.ip || "127.0.0.1";
      const userAgent = req.headers["user-agent"];
      const userId = req.user!.id;
      const backupCodes = await twoFactorService.confirmSetup(userId, req.body.code);

      // Replace the current (password-only) session with a two-factor one.
      const rawRefresh = req.cookies?.bh_refresh_token;
      if (rawRefresh) {
        await prisma.refreshToken
          .updateMany({
            where: { tokenHash: hashToken(rawRefresh), userId, revokedAt: null },
            data: { revokedAt: new Date() },
          })
          .catch(() => null);
      }
      const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
      const tokens = await authService.issueTokenPair(
        { id: user.id, email: user.email, role: user.role as UserRole, name: user.name },
        userAgent,
        { mfa: true }
      );
      setAuthCookies(res, tokens);

      await prisma.auditLog
        .create({
          data: {
            userId,
            action: "AUTH_TWO_FACTOR_ENABLED",
            entityType: "USER",
            entityId: userId,
            ipAddress: ip,
          },
        })
        .catch(() => null);

      res.status(200).json({ status: "success", data: { backupCodes } });
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

  static async logoutEverywhere(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const ip = (req.headers["x-forwarded-for"] as string) || req.ip || "127.0.0.1";
      await authService.logoutEverywhere(req.user!.userId, ip);
      clearAuthCookies(res);
      res
        .status(200)
        .json({ status: "success", message: "All sessions terminated successfully" });
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

  static async forgotPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const ip = (req.headers["x-forwarded-for"] as string) || req.ip || "127.0.0.1";
      const result = await authService.requestPasswordReset(req.body.email, ip);
      res.status(200).json({ status: "success", message: result.message });
    } catch (err) {
      next(err);
    }
  }

  static async resetPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const ip = (req.headers["x-forwarded-for"] as string) || req.ip || "127.0.0.1";
      const result = await authService.resetPassword(
        req.body.token,
        req.body.newPassword,
        ip
      );
      clearAuthCookies(res);
      res.status(200).json({ status: "success", message: result.message });
    } catch (err) {
      next(err);
    }
  }

  static async requestEmailVerification(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await authService.requestEmailVerification(req.body.email);
      res.status(200).json({ status: "success", message: result.message });
    } catch (err) {
      next(err);
    }
  }

  static async confirmEmailVerification(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
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
          twoFactorEnabledAt: true,
          twoFactorBackupCodes: true,
          staffRole: { select: { id: true, name: true, permissions: true } },
        },
      });

      if (!user) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found" } });
        return;
      }

      const { twoFactorEnabledAt, twoFactorBackupCodes, staffRole, ...profile } = user;
      res.status(200).json({
        status: "success",
        data: {
          ...profile,
          ...(user.role === "ADMIN"
            ? {
                staff: {
                  roleId: staffRole?.id ?? null,
                  roleName: staffRole?.name ?? null,
                  permissions: staffRole?.permissions ?? [],
                  twoFactorEnabled: Boolean(twoFactorEnabledAt),
                  backupCodesLeft: twoFactorBackupCodes.length,
                  // Whether this session passed the authenticator step.
                  sessionVerified: req.user!.mfa,
                },
              }
            : {}),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/auth/me/export (GDPR / Data Protection: Right to Data Portability)
   */
  static async exportData(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res
          .status(401)
          .json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });
        return;
      }

      const userData = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          studentProfile: true,
          companyProfile: true,
          applications: {
            select: {
              id: true,
              internshipId: true,
              fullName: true,
              collegeOrUniversity: true,
              status: true,
              createdAt: true,
            },
          },
          enrollments: {
            select: {
              id: true,
              cohortId: true,
              status: true,
              priceAmount: true,
              currency: true,
              createdAt: true,
            },
          },
          payments: {
            select: {
              id: true,
              orderId: true,
              amount: true,
              currency: true,
              status: true,
              provider: true,
              createdAt: true,
            },
          },
        },
      });

      if (!userData) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found" } });
        return;
      }

      // Strip internal password hashes or sensitive token records
      // (also the encrypted authenticator key and backup-code hashes: never leave the server)
      const {
        passwordHash: _passwordHash,
        twoFactorSecret: _twoFactorSecret,
        twoFactorBackupCodes: _twoFactorBackupCodes,
        twoFactorLastStep: _twoFactorLastStep,
        ...exportPayload
      } = userData;

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="bytehub_data_export_${userId}.json"`
      );
      res.status(200).json({
        exportDate: new Date().toISOString(),
        compliance: "GDPR / DPDP Right to Data Portability",
        data: exportPayload,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/auth/me (GDPR / Data Protection: Right to Erasure / Anonymization)
   */
  static async deleteAccount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res
          .status(401)
          .json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });
        return;
      }

      // Anonymize user records and soft-delete
      await prisma.$transaction(async (tx) => {
        // 1. Invalidate all active refresh tokens
        await tx.refreshToken.deleteMany({ where: { userId } });

        // 2. Redact profile PII
        await tx.studentProfile.deleteMany({ where: { userId } });

        // 3. Anonymize user record
        await tx.user.update({
          where: { id: userId },
          data: {
            email: `deleted_${userId.slice(0, 8)}@anonymized.local`,
            name: "Deleted Account",
            passwordHash: "DELETED_ACCOUNT_SCRUBBED",
            deletedAt: new Date(),
          },
        });

        // 4. Record audit log
        await tx.auditLog.create({
          data: {
            userId,
            action: "GDPR_RIGHT_TO_ERASURE_PROCESSED",
            entityType: "USER",
            entityId: userId,
            details: { anonymizedAt: new Date().toISOString() },
          },
        });
      });

      res.clearCookie("bh_access_token");
      res.clearCookie("bh_refresh_token");
      res.status(200).json({
        status: "success",
        message:
          "Account and personal data successfully anonymized and scheduled for permanent purge.",
      });
    } catch (err) {
      next(err);
    }
  }
}
