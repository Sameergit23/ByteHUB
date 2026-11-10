import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { UserRole } from "@bytehub/shared";
import { prisma } from "../lib/prisma.js";

export interface AuthenticatedUser {
  id: string;
  userId: string;
  email: string;
  role: UserRole;
  name: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Express type augmentation
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      cookies?: Record<string, string>;
      /** Unparsed request body, kept for verifying payment webhook signatures. */
      rawBody?: Buffer;
    }
  }
}

/**
 * Native, zero-dependency cookie parser middleware
 */
export const cookieParserMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    req.cookies = {};
    return next();
  }

  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    const name = parts[0]?.trim();
    if (name) {
      cookies[name] = decodeURIComponent(parts.slice(1).join("=").trim());
    }
  });

  req.cookies = cookies;
  next();
};

/**
 * Authenticates requests via httpOnly cookie or Authorization Bearer header
 */
export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // 1. Check httpOnly cookie first, then Bearer header
  let token = req.cookies?.bh_access_token;

  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication token is missing. Please sign in to proceed.",
      },
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload & {
      userId?: string;
      id?: string;
      email?: string;
      role?: UserRole;
      name?: string;
    };
    const uid = decoded.userId || decoded.id || "";
    req.user = {
      id: uid,
      userId: uid,
      email: decoded.email || "",
      role: decoded.role as UserRole,
      name: decoded.name || "",
    };
    next();
  } catch {
    res.status(401).json({
      error: {
        code: "TOKEN_EXPIRED_OR_INVALID",
        message:
          "Your session has expired or the token signature is invalid. Please re-authenticate.",
      },
    });
  }
};

/**
 * Role-Based Access Control (RBAC) middleware
 */
export const requireRoles = (...roles: (UserRole | UserRole[])[]) => {
  const allowedRoles = roles.flat();

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required to access this resource.",
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: {
          code: "FORBIDDEN_ROLE",
          message: `Access denied. Requires one of the following permissions: [${allowedRoles.join(", ")}].`,
        },
      });
      return;
    }

    next();
  };
};

export const requireRole = requireRoles;

/**
 * Resource-Level Authorization (IDOR Prevention)
 * Guarantees that a student or company can only view or mutate their own records.
 */
export const checkResourceOwnership = (
  getResourceOwnerId: (req: Request) => Promise<string | null> | string | null
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
      return;
    }

    // Admins bypass resource ownership checks
    if (req.user.role === "ADMIN") {
      return next();
    }

    try {
      const ownerId = await getResourceOwnerId(req);

      if (!ownerId) {
        res.status(404).json({
          error: { code: "NOT_FOUND", message: "Target resource does not exist" },
        });
        return;
      }

      if (ownerId !== req.user.userId) {
        // Record security audit log for blocked IDOR attempt
        await prisma.auditLog
          .create({
            data: {
              userId: req.user.userId,
              action: "SECURITY_IDOR_BLOCKED",
              entityType: "RESOURCE",
              entityId: req.params.id || "unknown",
              details: {
                attemptedBy: req.user.userId,
                actualOwner: ownerId,
                path: req.originalUrl,
                method: req.method,
              },
            },
          })
          .catch(() => null);

        res.status(403).json({
          error: {
            code: "FORBIDDEN_RESOURCE",
            message:
              "Access denied. You do not have permission to view or modify this record.",
          },
        });
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
