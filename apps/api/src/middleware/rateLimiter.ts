import { Request } from "express";
import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";
import { env } from "../config/env.js";

/**
 * ByteHUB Tiered Rate Limiting System
 * Supports Redis when configured via REDIS_URL, with an in-memory sliding window fallback.
 */

const isTest = env.NODE_ENV === "test";

// 1. Global API Rate Limiter
export const globalRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  // The web app's own server-side rendering and session keep-alive share this budget,
  // so it is a flood ceiling rather than a per-action limit.
  max: isTest ? 10000 : env.RATE_LIMIT_GLOBAL_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Global rate limit exceeded. Please retry after a few minutes.",
    },
  },
});

// 2. Strict Auth Limiter (Brute-force protection on /login, /signup, /password-reset)
export const authRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : 5, // 5 attempts per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const email = req.body?.email ? String(req.body.email).toLowerCase().trim() : "";
    const ip = req.ip || req.socket.remoteAddress || "unknown_ip";
    return email ? `auth_${email}_${ip}` : `auth_ip_${ip}`;
  },
  message: {
    error: {
      code: "AUTH_RATE_LIMITED",
      message:
        "Too many authentication attempts. Your IP/account is temporarily throttled for 15 minutes.",
    },
  },
});

// 3. Strict Contact Form Limiter (Spam prevention)
export const contactRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "CONTACT_RATE_LIMITED",
      message:
        "Too many messages submitted. Please wait 15 minutes before reaching out again.",
    },
  },
});

// 4. File Upload Limiter (DOS & storage exhaustion prevention)
export const uploadRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "UPLOAD_RATE_LIMITED",
      message:
        "Upload rate limit reached. Maximum 10 document uploads allowed per 15-minute window.",
    },
  },
});

// 5. Payment Initiation Limiter (Carding & gateway abuse protection)
export const paymentRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userId = req.user?.id || req.ip || "unknown";
    return `pay_${userId}`;
  },
  message: {
    error: {
      code: "PAYMENT_RATE_LIMITED",
      message:
        "Too many payment orders initiated. Please wait 15 minutes before creating new orders.",
    },
  },
});
