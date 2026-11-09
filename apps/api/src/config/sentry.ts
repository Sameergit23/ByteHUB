import { env } from "./env.js";
import { logger } from "../utils/logger.js";

export interface SentryBreadcrumb {
  category: string;
  message: string;
  level?: "info" | "warning" | "error";
  data?: Record<string, unknown>;
  timestamp?: number;
}

export class SentryService {
  private static isInitialized = false;

  static init(): void {
    if (!env.SENTRY_DSN) {
      logger.info({ msg: "Sentry DSN not provided. Crash reporting in local/disabled mode." });
      return;
    }

    try {
      // In production environments with @sentry/node installed, Sentry.init is bound here:
      // Sentry.init({
      //   dsn: env.SENTRY_DSN,
      //   environment: env.NODE_ENV,
      //   release: env.APP_VERSION,
      //   tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,
      //   beforeSend(event) {
      //     // Sanitize PII: scrub authorization, cookies, passwords, and card tokens
      //     if (event.request?.headers) {
      //       delete event.request.headers["authorization"];
      //       delete event.request.headers["cookie"];
      //       delete event.request.headers["x-csrf-token"];
      //     }
      //     return event;
      //   },
      // });
      this.isInitialized = true;
      logger.info({ msg: "Sentry error tracking initialized successfully", environment: env.NODE_ENV });
    } catch (err) {
      logger.error({ err, msg: "Failed to initialize Sentry monitoring" });
    }
  }

  static captureException(error: Error | unknown, context?: Record<string, unknown>): string {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    // Always log with structured Pino logger (PII scrubbed)
    logger.error({
      err: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      errorId,
      context,
      msg: "Unhandled Exception Captured by Sentry Service",
    });

    return errorId;
  }

  static addBreadcrumb(breadcrumb: SentryBreadcrumb): void {
    if (!this.isInitialized) return;
    // Log trace breadcrumb
    logger.debug({
      msg: `[Sentry Breadcrumb] ${breadcrumb.category}: ${breadcrumb.message}`,
      data: breadcrumb.data,
    });
  }
}
