import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/apiError.js";
import { logger } from "../utils/logger.js";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isProduction = process.env.NODE_ENV === "production";
  const requestId = req.id || "unknown";

  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    const formatted = err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
    logger.warn({ requestId, err: formatted }, "Validation Error");

    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: formatted,
      },
    });
    return;
  }

  // 2. Custom Application Errors
  if (err instanceof AppError) {
    logger.warn(
      {
        requestId,
        code: err.code,
        statusCode: err.statusCode,
        message: err.message,
      },
      "Application Error"
    );

    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // 3. Unhandled Server Errors
  logger.error(
    {
      requestId,
      message: err.message,
      stack: isProduction ? undefined : err.stack,
    },
    "Unhandled Internal Server Error"
  );

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: isProduction ? "An unexpected server error occurred" : err.message,
    },
  });
}
