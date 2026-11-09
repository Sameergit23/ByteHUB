import express, { Express } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.routes.js";
import { internshipsRouter } from "./routes/internships.routes.js";
import { trainingRouter } from "./routes/training.routes.js";
import { applicationsRouter } from "./routes/applications.routes.js";
import { paymentsRouter } from "./routes/payments.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

export const createApp = (): Express => {
  const app = express();

  // Security Headers
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: env.NODE_ENV === "production" ? env.FRONTEND_URL : true,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Idempotency-Key"],
    })
  );

  // Rate Limiting (100 reqs per 15 mins for general, tighter for auth)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: env.NODE_ENV === "test" ? 10000 : 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: "fail",
      code: "RATE_LIMITED",
      message: "Too many requests, please try again later",
    },
  });
  app.use("/api", limiter);

  // JSON Body Parser
  app.use(express.json({ limit: "2mb" }));

  // Health Endpoint
  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      status: "healthy",
      service: "bytehub-api",
      timestamp: new Date().toISOString(),
    });
  });

  // API Routes
  app.use("/api/auth", authRouter);
  app.use("/api/internships", internshipsRouter);
  app.use("/api/training", trainingRouter);
  app.use("/api/applications", applicationsRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/admin", adminRouter);

  // 404 Fallback
  app.use((_req, res) => {
    res.status(404).json({
      status: "fail",
      code: "ROUTE_NOT_FOUND",
      message: "Resource does not exist on this server",
    });
  });

  // Central Error Handler
  app.use(errorHandler);

  return app;
};
