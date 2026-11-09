import { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { env } from "../config/env.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Generates and sets double-submit CSRF cookie on safe requests
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // 1. Generate CSRF token cookie if missing on safe requests
  if (!req.cookies?.bh_csrf_token && SAFE_METHODS.has(req.method)) {
    const csrfToken = crypto.randomBytes(24).toString("hex");
    res.cookie("bh_csrf_token", csrfToken, {
      httpOnly: false, // Accessible to JavaScript to read and attach as header
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  }

  // 2. Safe methods require no mutation validation
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  // 3. Webhook endpoints have their own HMAC signature verification
  if (req.path.includes("/payments/webhook/")) {
    return next();
  }

  // 4. Origin & Referer Verification
  const origin = req.headers.origin;
  const referer = req.headers.referer;

  if (env.NODE_ENV === "production") {
    const allowedOrigin = env.FRONTEND_URL;
    if (origin && !origin.startsWith(allowedOrigin)) {
      res.status(403).json({
        error: {
          code: "CSRF_ORIGIN_MISMATCH",
          message: "Request origin does not match authorized application domain.",
        },
      });
      return;
    }

    if (!origin && referer && !referer.startsWith(allowedOrigin)) {
      res.status(403).json({
        error: {
          code: "CSRF_REFERER_MISMATCH",
          message: "Request referer does not match authorized application domain.",
        },
      });
      return;
    }
  }

  // 5. Double-Submit Token Check if cookies are utilized for authentication
  const cookieCsrf = req.cookies?.bh_csrf_token;
  const headerCsrf = req.headers["x-csrf-token"] as string | undefined;

  if (cookieCsrf && headerCsrf) {
    const bufCookie = Buffer.from(cookieCsrf);
    const bufHeader = Buffer.from(headerCsrf);

    if (bufCookie.length !== bufHeader.length || !crypto.timingSafeEqual(bufCookie, bufHeader)) {
      res.status(403).json({
        error: {
          code: "CSRF_TOKEN_INVALID",
          message: "CSRF validation token mismatch.",
        },
      });
      return;
    }
  }

  next();
}
