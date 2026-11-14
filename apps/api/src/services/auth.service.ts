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
import { twoFactorService } from "./twoFactor.service.js";

/** Staff sessions end after this long, however active (students get 7 days). */
const STAFF_SESSION_HOURS = 12;
/** Staff are signed out after this long without any activity. */
const STAFF_IDLE_MINUTES = 60;
/** How long the "enter your authenticator code" step stays valid after the password. */
const TWO_FACTOR_CHALLENGE_SECONDS = 5 * 60;

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
  async issueTokenPair(
    user: { id: string; email: string; role: UserRole; name: string },
    deviceInfo?: string,
    options: { mfa?: boolean; sessionExpiresAt?: Date } = {}
  ): Promise<TokenPair> {
    const accessExpiresIn = "15m";
    const isStaff = user.role === "ADMIN";
    const mfa = isStaff && options.mfa === true;

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, name: user.name, mfa },
      env.JWT_SECRET,
      { expiresIn: accessExpiresIn }
    );

    const rawRefreshToken = generateSecureToken(32);
    const tokenHash = hashToken(rawRefreshToken);

    const accessTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    // Rotation keeps the original end time, so a staff session can't be stretched past 12 hours.
    const refreshTokenExpiresAt =
      options.sessionExpiresAt ??
      new Date(
        Date.now() +
          (isStaff ? STAFF_SESSION_HOURS * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000)
      );

    // Persist refresh token hash in DB
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        deviceInfo: deviceInfo || "Web Browser",
        expiresAt: refreshTokenExpiresAt,
        mfaVerified: mfa,
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
    // Only students sign up. ByteHUB posts internships itself; companies send roles
    // through the "For companies" form instead of having accounts.
    if (input.role !== "STUDENT") {
      throw AppError.forbidden(
        "Company accounts aren't available. Send your internship roles through the For companies page and the ByteHUB team will post them."
      );
    }

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

    if (user.blockedAt) {
      throw AppError.forbidden(
        "This account has been blocked. If you think this is a mistake, contact ByteHUB support."
      );
    }

    // Staff with two-factor set up: the password alone doesn't sign them in.
    if (user.role === "ADMIN" && user.twoFactorEnabledAt) {
      const challengeToken = jwt.sign(
        { purpose: "2fa", userId: user.id },
        env.JWT_SECRET,
        {
          expiresIn: TWO_FACTOR_CHALLENGE_SECONDS,
        }
      );
      await prisma.auditLog
        .create({
          data: {
            userId: user.id,
            action: "AUTH_PASSWORD_OK_TWO_FACTOR_PENDING",
            entityType: "USER",
            entityId: user.id,
            ipAddress: ip,
          },
        })
        .catch(() => null);
      return {
        twoFactorRequired: true as const,
        challengeToken,
        user: { id: user.id, name: user.name, role: user.role },
      };
    }

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
      twoFactorRequired: false as const,
      tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationName: user.organizationName,
        // Staff without two-factor are sent to set it up before using the admin panel.
        twoFactorSetupRequired: user.role === "ADMIN",
      },
    };
  }

  /**
   * Second sign-in step for staff: the code from their authenticator app (or a backup code).
   */
  async completeTwoFactorLogin(
    challengeToken: string,
    code: string,
    ip: string,
    userAgent?: string
  ) {
    let userId: string;
    try {
      const payload = jwt.verify(challengeToken, env.JWT_SECRET) as jwt.JwtPayload;
      if (payload.purpose !== "2fa" || typeof payload.userId !== "string")
        throw new Error();
      userId = payload.userId;
    } catch {
      throw AppError.unauthorized(
        "This sign-in step has expired. Enter your password again."
      );
    }

    const rateKey = `auth_2fa_${userId}`;
    const check = authRateLimiter.check(rateKey);
    if (check.locked) {
      throw AppError.forbidden(
        `Too many wrong codes. Try again in ${check.lockoutExpiresInSeconds} seconds.`
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt || user.blockedAt || user.role !== "ADMIN") {
      throw AppError.unauthorized(
        "This sign-in step has expired. Enter your password again."
      );
    }

    const method = await twoFactorService.verify(userId, code);
    if (!method) {
      const fail = authRateLimiter.recordFailure(rateKey);
      await prisma.auditLog
        .create({
          data: {
            userId,
            action: "AUTH_TWO_FACTOR_FAILED",
            entityType: "USER",
            entityId: userId,
            ipAddress: ip,
          },
        })
        .catch(() => null);
      if (fail.locked) {
        throw AppError.forbidden(
          `Too many wrong codes. Try again in ${fail.lockoutDurationSeconds} seconds.`
        );
      }
      throw AppError.unauthorized(
        "That code didn't work. Use the newest code from your authenticator app, or a backup code."
      );
    }
    authRateLimiter.recordSuccess(rateKey);

    await prisma.auditLog
      .create({
        data: {
          userId,
          action: "AUTH_LOGIN_SUCCESS",
          entityType: "USER",
          entityId: userId,
          ipAddress: ip,
          details: { role: user.role, twoFactor: method },
        },
      })
      .catch(() => null);

    const tokens = await this.issueTokenPair(
      { id: user.id, email: user.email, role: user.role as UserRole, name: user.name },
      userAgent,
      { mfa: true }
    );
    return {
      tokens,
      backupCodesLeft:
        method === "backup" ? user.twoFactorBackupCodes.length - 1 : undefined,
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

    // Blocked or deleted accounts lose every session.
    if (storedToken.user.deletedAt || storedToken.user.blockedAt) {
      await prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw AppError.unauthorized("This account can no longer sign in.");
    }

    // Staff are signed out after an hour without activity (each refresh happens while active).
    const isStaff = storedToken.user.role === "ADMIN";
    if (
      isStaff &&
      Date.now() - storedToken.createdAt.getTime() > STAFF_IDLE_MINUTES * 60 * 1000
    ) {
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });
      throw AppError.unauthorized(
        `You were signed out after ${STAFF_IDLE_MINUTES} minutes without activity. Please sign in again.`
      );
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
      userAgent,
      {
        mfa: storedToken.mfaVerified,
        // Staff sessions keep their original end time.
        sessionExpiresAt: isStaff ? storedToken.expiresAt : undefined,
      }
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
