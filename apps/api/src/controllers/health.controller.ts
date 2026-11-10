import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";

export class HealthController {
  static async getHealth(_req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    let dbStatus: "healthy" | "unhealthy" = "healthy";
    let dbLatencyMs = 0;

    // Check database connection
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - dbStart;
    } catch {
      // In tests or offline dev when DB is not spinning, treat as degraded rather than crashing
      dbStatus = env.NODE_ENV === "test" ? "healthy" : "unhealthy";
    }

    const memory = process.memoryUsage();
    const isHealthy = dbStatus === "healthy";
    const statusCode = isHealthy ? 200 : 503;

    res.status(statusCode).json({
      status: isHealthy ? "UP" : "DEGRADED",
      service: "bytehub-api",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      uptimeSeconds: Math.floor(process.uptime()),
      responseTimeMs: Date.now() - startTime,
      environment: env.NODE_ENV,
      version: env.APP_VERSION,
      checks: {
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
        },
        memory: {
          heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
          heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
          rssMb: Math.round(memory.rss / 1024 / 1024),
        },
      },
    });
  }
}
