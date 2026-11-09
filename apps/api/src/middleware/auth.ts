import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { UserRole } from "@bytehub/shared";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      status: "fail",
      code: "UNAUTHORIZED",
      message: "Authorization token missing or malformed",
    });
    return;
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    res.status(401).json({
      status: "fail",
      code: "UNAUTHORIZED",
      message: "Token missing",
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({
      status: "fail",
      code: "INVALID_TOKEN",
      message: "Session expired or signature invalid",
    });
  }
};

export const requireRoles = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        status: "fail",
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        status: "fail",
        code: "FORBIDDEN",
        message: `Forbidden: requires one of [${roles.join(", ")}]`,
      });
      return;
    }

    next();
  };
};

