import { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";
  const code = err.code || "INTERNAL_ERROR";

  if (process.env.NODE_ENV !== "test") {
    console.error(`[API ERROR] ${code}: ${message}`, err.stack);
  }

  res.status(statusCode).json({
    status: "error",
    code,
    message,
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
};
