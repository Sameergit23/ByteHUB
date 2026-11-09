import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";
import { maskEmail } from "../utils/sanitize.js";

export function pinoHttpMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    const emailHeader = req.headers["x-user-email"];
    const maskedEmail = typeof emailHeader === "string" ? maskEmail(emailHeader) : undefined;

    logger.info(
      {
        reqId: req.id,
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs,
        userEmail: maskedEmail,
      },
      "HTTP Request Completed"
    );
  });

  next();
}

