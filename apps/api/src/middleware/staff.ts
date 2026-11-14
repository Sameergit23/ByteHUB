import { Request, Response, NextFunction } from "express";
import {
  STAFF_PERMISSIONS,
  hasStaffPermission,
  type StaffPermission,
} from "@bytehub/shared";
import { prisma } from "../lib/prisma.js";

export interface StaffContext {
  roleId: string | null;
  roleName: string | null;
  permissions: string[];
  twoFactorEnabled: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Express type augmentation
  namespace Express {
    interface Request {
      staff?: StaffContext;
    }
  }
}

const deny = (res: Response, status: number, code: string, message: string) => {
  res.status(status).json({ error: { code, message } });
};

/**
 * Admin-panel gate. Runs after authenticateJWT and reads the staff member fresh from the
 * database on every request, so blocking someone or changing their role takes effect at once.
 * Two-factor sign-in is required unless `allowWithoutTwoFactor` (only the setup steps use it).
 */
export const requireStaff =
  (options: { allowWithoutTwoFactor?: boolean } = {}) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        deny(res, 401, "UNAUTHORIZED", "Please sign in.");
        return;
      }
      if (req.user.role !== "ADMIN") {
        deny(res, 403, "FORBIDDEN_ROLE", "This area is for ByteHUB staff only.");
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          deletedAt: true,
          blockedAt: true,
          twoFactorEnabledAt: true,
          staffRole: { select: { id: true, name: true, permissions: true } },
        },
      });
      if (!user || user.deletedAt || user.blockedAt) {
        deny(res, 403, "ACCOUNT_DISABLED", "This account has been disabled.");
        return;
      }

      if (!options.allowWithoutTwoFactor) {
        if (!user.twoFactorEnabledAt) {
          deny(
            res,
            403,
            "TWO_FACTOR_SETUP_REQUIRED",
            "Set up two-factor sign-in with an authenticator app to use the admin panel."
          );
          return;
        }
        if (!req.user.mfa) {
          deny(
            res,
            403,
            "TWO_FACTOR_REQUIRED",
            "Sign in again and enter the code from your authenticator app."
          );
          return;
        }
      }

      req.staff = {
        roleId: user.staffRole?.id ?? null,
        roleName: user.staffRole?.name ?? null,
        permissions: user.staffRole?.permissions ?? [],
        twoFactorEnabled: Boolean(user.twoFactorEnabledAt),
      };
      next();
    } catch (err) {
      next(err);
    }
  };

/** Allows the request only when the staff member's role includes the permission. */
export const requirePermission =
  (permission: StaffPermission) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!hasStaffPermission(req.staff?.permissions, permission)) {
      deny(
        res,
        403,
        "PERMISSION_DENIED",
        `Your role doesn't allow this (${STAFF_PERMISSIONS[permission].label.toLowerCase()}).`
      );
      return;
    }
    next();
  };

/**
 * For routes open to students and staff alike (e.g. opening a resume): students pass straight
 * through to the route's own ownership checks; staff must pass the staff gate and permission.
 */
export const staffOnlyNeeds =
  (permission: StaffPermission) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (req.user?.role !== "ADMIN") {
      next();
      return;
    }
    void requireStaff()(req, res, (err?: unknown) => {
      if (err) return next(err);
      requirePermission(permission)(req, res, next);
    });
  };

/** Allows the request when the staff member has at least one of the permissions. */
export const requireAnyPermission =
  (...permissions: StaffPermission[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!permissions.some((p) => hasStaffPermission(req.staff?.permissions, p))) {
      deny(res, 403, "PERMISSION_DENIED", "Your role doesn't allow this.");
      return;
    }
    next();
  };
