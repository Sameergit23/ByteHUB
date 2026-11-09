export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "PAYMENT_FAILED"
  | "INTERNAL_SERVER_ERROR";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, code: ErrorCode = "INTERNAL_SERVER_ERROR") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code: ErrorCode = "BAD_REQUEST"): AppError {
    return new AppError(message, 400, code);
  }

  static unauthorized(message = "Authentication required", code: ErrorCode = "UNAUTHORIZED"): AppError {
    return new AppError(message, 401, code);
  }

  static forbidden(message = "Access denied", code: ErrorCode = "FORBIDDEN"): AppError {
    return new AppError(message, 403, code);
  }

  static notFound(message = "Resource not found", code: ErrorCode = "NOT_FOUND"): AppError {
    return new AppError(message, 404, code);
  }

  static conflict(message: string, code: ErrorCode = "CONFLICT"): AppError {
    return new AppError(message, 409, code);
  }

  static internal(message = "Internal server error"): AppError {
    return new AppError(message, 500, "INTERNAL_SERVER_ERROR");
  }
}
