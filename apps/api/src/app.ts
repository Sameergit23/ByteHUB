import express, { Express, Request, Response, NextFunction } from "express";
import type { IncomingMessage } from "node:http";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import { pinoHttpMiddleware } from "./middleware/pinoHttp.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { cookieParserMiddleware } from "./middleware/auth.js";
import { csrfProtection } from "./middleware/csrf.js";
import { globalRateLimiter } from "./middleware/rateLimiter.js";

import { healthRouter } from "./routes/health.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { internshipsRouter } from "./routes/internships.routes.js";
import { trainingRouter } from "./routes/training.routes.js";
import { applicationsRouter } from "./routes/applications.routes.js";
import { paymentsRouter } from "./routes/payments.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { contactRouter, inquiriesRouter } from "./routes/contact.routes.js";
import { certificatesRouter } from "./routes/certificates.routes.js";
import { metaRouter } from "./routes/meta.routes.js";

export const createApp = (): Express => {
  const app = express();

  // Behind the Next.js proxy / a load balancer the client IP arrives in X-Forwarded-For.
  // Trusting the configured number of hops keeps rate limits and audit logs per-client.
  app.set("trust proxy", env.TRUST_PROXY);

  // 1. Request ID & Structured Logging
  app.use(requestIdMiddleware);
  app.use(pinoHttpMiddleware);

  // 2. Cookie Parser
  app.use(cookieParserMiddleware);

  // 3. Strict Helmet Security Headers (OWASP Top 10 Hardened)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "https://sdk.cashfree.com",
            "https://checkout.razorpay.com",
            "https://js.stripe.com",
          ],
          connectSrc: [
            "'self'",
            "https://api.cashfree.com",
            "https://sandbox.cashfree.com",
            "https://payments.cashfree.com",
            "https://payments-test.cashfree.com",
            "https://api.razorpay.com",
            "https://lumberjack.razorpay.com",
            "https://api.stripe.com",
          ],
          frameSrc: [
            "'self'",
            "https://sdk.cashfree.com",
            "https://payments.cashfree.com",
            "https://payments-test.cashfree.com",
            "https://api.razorpay.com",
            "https://js.stripe.com",
            "https://hooks.stripe.com",
          ],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      hsts: {
        maxAge: 63072000,
        includeSubDomains: true,
        preload: true,
      },
      noSniff: true,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      frameguard: { action: "deny" },
    })
  );

  // Permissions-Policy (Feature Policy)
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      "Permissions-Policy",
      'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com" "https://js.stripe.com")'
    );
    next();
  });

  // 4. Request Timeout Protection (Slowloris Mitigation)
  app.use((req: Request, res: Response, next: NextFunction) => {
    req.setTimeout(15000, () => {
      if (!res.headersSent) {
        res.status(408).json({
          error: {
            code: "REQUEST_TIMEOUT",
            message: "Request processing exceeded timeout limit (15s).",
          },
        });
      }
    });
    next();
  });

  // 5. CORS with Explicit Allow-list (No wildcard '*' with credentials)
  const allowedOrigins = new Set([
    env.FRONTEND_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]);

  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        // Allow mobile clients or curl requests without origin in dev
        if (!requestOrigin) {
          return callback(null, true);
        }
        if (allowedOrigins.has(requestOrigin) || env.NODE_ENV !== "production") {
          return callback(null, true);
        }
        return callback(new Error("CORS origin access denied by policy."));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Idempotency-Key",
        "X-Request-Id",
        "X-CSRF-Token",
        "X-Admin-TOTP",
      ],
      maxAge: 86400, // 24-hour pre-flight caching
    })
  );

  // 6. Global Rate Limiter
  app.use("/api", globalRateLimiter);

  // 7a. Resume uploads carry a base64 file (max 5 MB => ~6.7 MB of JSON), so that one
  //     route gets a larger limit. Every other route keeps the strict 100kb cap below.
  app.use("/api/applications/upload-resume", express.json({ limit: "7mb" }));

  // 7. Request Body Parser with Strict 100kb Size Limit (Preserves raw buffer for webhooks)
  app.use(
    express.json({
      limit: "100kb",
      verify: (req, _res, buf) => {
        (req as IncomingMessage & { rawBody?: Buffer }).rawBody = buf;
      },
    })
  );

  // 8. CSRF Protection for state-changing operations
  app.use(csrfProtection);

  // 9. Dedicated Health Endpoints (Root & API)
  app.use("/health", healthRouter);
  app.use("/api/health", healthRouter);

  // 10. Domain API Routes with Tiered Rate Limiting
  app.use("/api/auth", authRouter);
  app.use("/api/internships", internshipsRouter);
  app.use("/api/training", trainingRouter);
  app.use("/api/applications", applicationsRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/contact", contactRouter);
  app.use("/api/inquiries", inquiriesRouter);
  app.use("/api/certificates", certificatesRouter);
  app.use("/api/meta", metaRouter);

  // 11. Route Not Found (404)
  app.use((_req, res) => {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Requested endpoint does not exist on this server",
      },
    });
  });

  // 12. Central Error Handler (Zero Internal Leakage)
  app.use(errorHandler);

  return app;
};
