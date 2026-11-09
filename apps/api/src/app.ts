import express, { Express } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import { pinoHttpMiddleware } from "./middleware/pinoHttp.js";
import { errorHandler } from "./middleware/errorHandler.js";

import { healthRouter } from "./routes/health.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { internshipsRouter } from "./routes/internships.routes.js";
import { trainingRouter } from "./routes/training.routes.js";
import { applicationsRouter } from "./routes/applications.routes.js";
import { paymentsRouter } from "./routes/payments.routes.js";
import { adminRouter } from "./routes/admin.routes.js";

export const createApp = (): Express => {
  const app = express();

  // 1. Request ID & Structured Logging
  app.use(requestIdMiddleware);
  app.use(pinoHttpMiddleware);

  // 2. Security Headers & CORS
  app.use(helmet());
  app.use(
    cors({
      origin: env.NODE_ENV === "production" ? env.FRONTEND_URL : true,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Idempotency-Key", "X-Request-Id"],
    })
  );

  // 3. Rate Limiter
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: env.NODE_ENV === "test" ? 10000 : 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests. Please retry in a few minutes.",
      },
    },
  });
  app.use("/api", limiter);

  // 4. Body Parser
  app.use(express.json({ limit: "2mb" }));

  // 5. Dedicated Health Endpoints (Root & API)
  app.use("/health", healthRouter);
  app.use("/api/health", healthRouter);

  // 6. Domain API Routes
  app.use("/api/auth", authRouter);
  app.use("/api/internships", internshipsRouter);
  app.use("/api/training", trainingRouter);
  app.use("/api/applications", applicationsRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/admin", adminRouter);

  // 7. Route Not Found (404)
  app.use((_req, res) => {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Requested endpoint does not exist on this server",
      },
    });
  });

  // 8. Central Error Handler
  app.use(errorHandler);

  return app;
};
