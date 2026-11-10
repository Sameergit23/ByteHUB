import jwt from "jsonwebtoken";
import { notificationService } from "./notification.service.js";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/apiError.js";
import { SignUpInput, LoginInput, UserRole } from "@bytehub/shared";
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  hashToken,
  generateSecureToken,
} from "../utils/password.js";
import { authRateLimiter } from "../utils/rateLimiter.js";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

export class AuthService {
  /**
   * Helper to issue access (15m) & refresh (7d) tokens, storing the refresh token hash
   */
  private async issueTokenPair(
    user: { id: string; email: string; role: UserRole; name: string },
    deviceInfo?: string,
    _familyId?: string
  ): Promise<TokenPair> {
    const accessExpiresIn = "15m";
    const refreshExpiresDays = 7;

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, name: user.name },
      env.JWT_SECRET,
      { expiresIn: accessExpiresIn }
    );

    const rawRefreshToken = generateSecureToken(32);
    const tokenHash = hashToken(rawRefreshToken);

    const accessTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const refreshTokenExpiresAt = new Date(
      Date.now() + refreshExpiresDays * 24 * 60 * 60 * 1000
    );

    // Persist refresh token hash in DB
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        deviceInfo: deviceInfo || "Web Browser",
        expiresAt: refreshTokenExpiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    };
  }

  /**
   * Register a new Student or Company account
   */
  async register(input: SignUpInput, ip: string, userAgent?: string) {
    // 1. Enforce minimum 10 characters and common-passwords dictionary check
    const validation = validatePasswordStrength(input.password);
    if (!validation.valid) {
      throw AppError.badRequest(
        validation.message || "Password does not meet complexity standards"
      );
    }

    // 2. Check for duplicate email
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase().trim() },
    });
    if (existing) {
      throw AppError.conflict("An account with this email address already exists.");
    }

    // 3. Hash with Argon2id
    const passwordHash = await hashPassword(input.password);

    // 4. Create User and profile within a transaction with safe timeout for remote db
    const user = await prisma.$transaction(
      async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: input.email.toLowerCase().trim(),
            passwordHash,
            name: input.name.trim(),
            role: input.role,
            organizationName: input.role === "COMPANY" ? input.organizationName : null,
          },
        });

        if (input.role === "STUDENT") {
          await tx.studentProfile.create({
            data: {
              userId: newUser.id,
              college: "Pending Profile Completion",
              graduationYear: new Date().getFullYear() + 1,
              degree: "Computer Science & Engineering",
            },
          });
        } else if (input.role === "COMPANY") {
          await tx.companyProfile.create({
            data: {
              userId: newUser.id,
              companyName: input.organizationName || input.name,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            userId: newUser.id,
            action: "AUTH_REGISTER_SUCCESS",
            entityType: "USER",
            entityId: newUser.id,
            ipAddress: ip,
            details: { role: newUser.role, emailDomain: newUser.email.split("@")[1] },
          },
        });

        return newUser;
      },
      {
        maxWait: 15000,
        timeout: 30000,
      }
    );

    const tokens = await this.issueTokenPair(
      { id: user.id, email: user.email, role: user.role as UserRole, name: user.name },
      userAgent
    );

    // Send the "verify your email" link. Never blocks or fails the sign-up itself.
    await this.issueEmailVerification(user).catch(() => null);

    return {
      tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationName: user.organizationName,
      },
    };
  }

  /**
   * Creates a 24-hour single-use verification token and emails the link.
   */
  private async issueEmailVerification(user: {
    id: string;
    name: string;
    email: string;
  }) {
    const rawToken = generateSecureToken(32);

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await notificationService.sendVerificationEmail(user, rawToken);
  }

  /**
   * Log in with email, password, brute-force rate-limiting, and progressive delays
   */
  async login(input: LoginInput, ip: string, userAgent?: string) {
    const rateKey = `auth_fail_${ip}_${input.email.toLowerCase().trim()}`;
    const check = authRateLimiter.check(rateKey);

    if (check.locked) {
      throw AppError.forbidden(
        `Account temporarily locked due to repeated failed logins. Retry in ${check.lockoutExpiresInSeconds} seconds.`
      );
    }

    if (check.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, check.delayMs));
    }

    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase().trim() },
    });

    if (!user || user.deletedAt) {
      authRateLimiter.recordFailure(rateKey);
      throw AppError.unauthorized("Invalid email or password credentials.");
    }

    const isMatch = await verifyPassword(input.password, user.passwordHash);
    if (!isMatch) {
      const failStatus = authRateLimiter.recordFailure(rateKey);
      if (failStatus.locked) {
        await prisma.auditLog
          .create({
            data: {
              userId: user.id,
              action: "SECURITY_ACCOUNT_LOCKED",
              entityType: "USER",
              entityId: user.id,
              ipAddress: ip,
              details: { reason: "Max failed authentication attempts exceeded" },
            },
          })
          .catch(() => null);

        throw AppError.forbidden(
          `Security alert: Maximum failed attempts exceeded. Account locked for ${failStatus.lockoutDurationSeconds} seconds.`
        );
      }
      throw AppError.unauthorized("Invalid email or password credentials.");
    }

    // Reset rate limiter on successful auth
    authRateLimiter.recordSuccess(rateKey);

    // Audit log
    await prisma.auditLog
      .create({
        data: {
          userId: user.id,
          action: "AUTH_LOGIN_SUCCESS",
          entityType: "USER",
          entityId: user.id,
          ipAddress: ip,
          details: { role: user.role },
        },
      })
      .catch(() => null);

    const tokens = await this.issueTokenPair(
      { id: user.id, email: user.email, role: user.role as UserRole, name: user.name },
      userAgent
    );

    return {
      tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationName: user.organizationName,
      },
    };
  }

  /**
   * Rotating Refresh Token with Reuse Detection
   * If a revoked/already-used token is received, revoke all tokens for this user!
   */
  async rotateRefreshToken(rawRefreshToken: string, ip: string, userAgent?: string) {
    if (!rawRefreshToken) {
      throw AppError.unauthorized("Refresh token is required.");
    }

    const tokenHash = hashToken(rawRefreshToken);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!storedToken) {
      throw AppError.unauthorized("Invalid or expired session. Please sign in again.");
    }

    // REUSE DETECTION: If token was already revoked, an attacker or compromised client is reusing it!
    if (storedToken.revokedAt) {
      // Revoke ALL active sessions for this user family
      await prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await prisma.auditLog
        .create({
          data: {
            userId: storedToken.userId,
            action: "SECURITY_REFRESH_TOKEN_REUSE_DETECTED",
            entityType: "SESSION",
            entityId: storedToken.id,
            ipAddress: ip,
            details: {
              warning:
                "Attempted reuse of revoked refresh token. All user sessions terminated.",
            },
          },
        })
        .catch(() => null);

      throw AppError.unauthorized(
        "Security alert: Session replay detected. All active sessions have been terminated."
      );
    }

    // Check expiration
    if (storedToken.expiresAt < new Date()) {
      throw AppError.unauthorized("Session expired. Please sign in again.");
    }

    // Invalidate old token (mark as rotated/revoked)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    // Issue brand-new token pair
    const tokens = await this.issueTokenPair(
      {
        id: storedToken.user.id,
        email: storedToken.user.email,
        role: storedToken.user.role as UserRole,
        name: storedToken.user.name,
      },
      userAgent
    );

    return {
      tokens,
      user: {
        id: storedToken.user.id,
        email: storedToken.user.email,
        name: storedToken.user.name,
        role: storedToken.user.role,
        organizationName: storedToken.user.organizationName,
      },
    };
  }

  /**
   * Request password reset token with timing-neutral response (never reveals if email exists)
   */
  async requestPasswordReset(email: string, ip: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (user && !user.deletedAt) {
      const rawToken = generateSecureToken(32);
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      await prisma.auditLog
        .create({
          data: {
            userId: user.id,
            action: "AUTH_PASSWORD_RESET_REQUESTED",
            entityType: "USER",
            entityId: user.id,
            ipAddress: ip,
          },
        })
        .catch(() => null);

      await notificationService.sendPasswordResetEmail(user, rawToken, ip);
    }

    // Always return neutral constant-time message
    return {
      message:
        "If an account with that email address exists, password reset instructions have been dispatched.",
    };
  }

  /**
   * Confirm password reset using single-use hashed token
   */
  async resetPassword(token: string, newPassword: string, ip: string) {
    const validation = validatePasswordStrength(newPassword);
    if (!validation.valid) {
      throw AppError.badRequest(
        validation.message || "Password does not meet complexity standards"
      );
    }

    const tokenHash = hashToken(token);
    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < new Date()) {
      throw AppError.badRequest("Password reset token is invalid, used, or expired.");
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      // Update password
      await tx.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      });

      // Mark token as used
      await tx.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      });

      // Revoke all existing sessions for this user
      await tx.refreshToken.updateMany({
        where: { userId: resetRecord.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          userId: resetRecord.userId,
          action: "AUTH_PASSWORD_CHANGED",
          entityType: "USER",
          entityId: resetRecord.userId,
          ipAddress: ip,
          details: { method: "TOKEN_RESET" },
        },
      });
    });

    return {
      message: "Password updated successfully. Please sign in with your new password.",
    };
  }

  /**
   * Request email verification token (timing-neutral)
   */
  async requestEmailVerification(email: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (user && !user.deletedAt && !user.isEmailVerified) {
      await this.issueEmailVerification(user);
    }

    return {
      message:
        "If that email is registered and unverified, a verification link has been dispatched.",
    };
  }

  /**
   * Verify email via token
   */
  async confirmEmailVerification(token: string) {
    const tokenHash = hashToken(token);
    const record = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw AppError.badRequest("Verification token is invalid or expired.");
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { isEmailVerified: true },
      }),
      prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: "Email verification successful." };
  }

  /**
   * Log out single session
   */
  async logout(rawRefreshToken?: string) {
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { message: "Logged out successfully." };
  }

  /**
   * Log out everywhere: revokes all active refresh tokens for the user
   */
  async logoutEverywhere(userId: string, ip: string) {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await prisma.auditLog
      .create({
        data: {
          userId,
          action: "AUTH_LOGOUT_ALL_SESSIONS",
          entityType: "USER",
          entityId: userId,
          ipAddress: ip,
        },
      })
      .catch(() => null);

    return { message: "All active sessions have been terminated." };
  }

  /**
   * List active sessions for user
   */
  async listActiveSessions(userId: string) {
    const sessions = await prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        deviceInfo: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return sessions;
  }

  /**
   * Optional Google OAuth PKCE generation
   */
  generateGooglePKCE() {
    const codeVerifier = generateSecureToken(32);
    const codeChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");
    const state = generateSecureToken(16);

    return {
      state,
      codeVerifier,
      codeChallenge,
      authUrl: `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=GOOGLE_CLIENT_ID&redirect_uri=${encodeURIComponent(
        env.FRONTEND_URL + "/auth/callback/google"
      )}&scope=openid%20email%20profile&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`,
    };
  }
}

export const authService = new AuthService();
