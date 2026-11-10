import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/apiError.js";
export { AppError };
import { logger } from "../utils/logger.js";
import { SentryService } from "../config/sentry.js";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isProduction = process.env.NODE_ENV === "production";
  const requestId = req.id || "unknown";

  // 1. Zod Validation Errors (Unknown fields, type mismatches, missing required)
  const maybeIssues = (err as { issues?: unknown }).issues;
  if (err instanceof ZodError || err.name === "ZodError" || Array.isArray(maybeIssues)) {
    const issues = (Array.isArray(maybeIssues) ? maybeIssues : []) as Array<{
      path?: (string | number)[];
      message: string;
    }>;
    const formatted = issues
      .map((i) => {
        const field = i.path ? i.path.join(".") : "";
        return field ? `${field}: ${i.message}` : i.message;
      })
      .join(", ");

    logger.warn({ requestId, err: formatted }, "Validation Error");

    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: formatted || err.message,
        requestId,
      },
    });
    return;
  }

  // 2. Custom Application Errors (Controlled operational errors)
  if (err instanceof AppError) {
    // 5xx AppErrors (e.g. payment gateway unreachable) still need a human to look at them.
    if (err.statusCode >= 500) {
      SentryService.captureException(err, {
        tags: { code: err.code },
        requestId,
        method: req.method,
        path: req.path,
      });
    }

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
        requestId,
      },
    });
    return;
  }

  // 3. Unhandled Server Errors (Database connection, unexpected runtime bugs)
  // NEVER leak database details, SQL statements, or stack traces in responses
  SentryService.captureException(err, {
    requestId,
    method: req.method,
    path: req.path,
  });

  const safeMessage = isProduction
    ? `An unexpected server error occurred. Please contact support with correlation ID: ${requestId}`
    : err.message || "Internal server error";

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: safeMessage,
      requestId,
    },
  });
}
