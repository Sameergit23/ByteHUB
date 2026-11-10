import crypto from "node:crypto";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

/**
 * Error reporting to Sentry.
 *
 * Sends events straight to Sentry's envelope endpoint using the DSN, so no SDK dependency is
 * needed. Only error events are sent (no performance tracing). Request headers, cookies and
 * anything that looks like a secret are never included.
 */

export interface SentryBreadcrumb {
  category: string;
  message: string;
  level?: "info" | "warning" | "error";
  data?: Record<string, unknown>;
  timestamp?: number;
}

interface ParsedDsn {
  dsn: string;
  publicKey: string;
  envelopeUrl: string;
}

interface StackFrame {
  function?: string;
  filename: string;
  lineno?: number;
  colno?: number;
  in_app: boolean;
}

const SENSITIVE_KEY =
  /pass|secret|token|authorization|cookie|signature|card|cvv|otp|api[-_]?key/i;
const MAX_EVENTS_PER_MINUTE = 30;
const MAX_BREADCRUMBS = 30;

function parseDsn(dsn: string): ParsedDsn | null {
  try {
    const url = new URL(dsn);
    const segments = url.pathname.split("/").filter(Boolean);
    const projectId = segments.pop();
    if (!url.username || !projectId) return null;
    const prefix = segments.length ? `/${segments.join("/")}` : "";
    return {
      dsn,
      publicKey: url.username,
      envelopeUrl: `${url.protocol}//${url.host}${prefix}/api/${projectId}/envelope/`,
    };
  } catch {
    return null;
  }
}

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[Truncated]";
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => scrub(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY.test(key) ? "[Filtered]" : scrub(v, depth + 1);
    }
    return out;
  }
  if (typeof value === "string" && value.length > 2000) return `${value.slice(0, 2000)}…`;
  return value;
}

function parseStack(stack: string | undefined): StackFrame[] {
  if (!stack) return [];
  const frames: StackFrame[] = [];
  for (const line of stack.split("\n").slice(1, 51)) {
    const match = /^\s*at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?\s*$/.exec(line);
    if (!match) continue;
    const filename = match[2] || "<unknown>";
    frames.push({
      function: match[1] || "<anonymous>",
      filename,
      lineno: Number(match[3]),
      colno: Number(match[4]),
      in_app: !filename.includes("node_modules") && !filename.startsWith("node:"),
    });
  }
  // Sentry expects the oldest call first.
  return frames.reverse();
}

export class SentryService {
  private static target: ParsedDsn | null = null;
  private static pending = new Set<Promise<void>>();
  private static breadcrumbs: Array<Record<string, unknown>> = [];
  private static windowStart = 0;
  private static sentInWindow = 0;

  static init(): void {
    if (!env.SENTRY_DSN) {
      logger.info("Sentry DSN not set: errors are only written to the logs.");
      return;
    }

    const parsed = parseDsn(env.SENTRY_DSN);
    if (!parsed) {
      logger.warn("SENTRY_DSN is not a valid Sentry DSN: error reporting is disabled.");
      return;
    }

    this.target = parsed;
    logger.info({ environment: env.NODE_ENV }, "Sentry error reporting enabled");
  }

  static get isEnabled(): boolean {
    return this.target !== null;
  }

  /**
   * Logs the error and, when Sentry is configured, reports it. Never throws.
   * Returns the event id so it can be quoted in logs or responses.
   */
  static captureException(
    error: Error | unknown,
    context?: Record<string, unknown>
  ): string {
    const eventId = crypto.randomUUID().replace(/-/g, "");
    const err = error instanceof Error ? error : new Error(String(error));

    logger.error(
      {
        err: { message: err.message, stack: err.stack },
        errorId: eventId,
        context: scrub(context),
      },
      "Exception captured"
    );

    if (!this.target || !this.withinRateLimit()) return eventId;

    const { tags, ...extra } = (context || {}) as {
      tags?: Record<string, string>;
    } & Record<string, unknown>;
    const event = {
      event_id: eventId,
      timestamp: Date.now() / 1000,
      platform: "node",
      level: "error",
      logger: "bytehub-api",
      environment: env.NODE_ENV,
      release: `bytehub-api@${env.APP_VERSION}`,
      exception: {
        values: [
          {
            type: err.name || "Error",
            value: err.message,
            stacktrace: { frames: parseStack(err.stack) },
          },
        ],
      },
      tags: { service: "bytehub-api", ...(tags || {}) },
      extra: scrub(extra),
      breadcrumbs: { values: this.breadcrumbs.slice(-MAX_BREADCRUMBS) },
    };

    this.send(eventId, event);
    return eventId;
  }

  static addBreadcrumb(breadcrumb: SentryBreadcrumb): void {
    if (!this.target) return;
    this.breadcrumbs.push({
      category: breadcrumb.category,
      message: breadcrumb.message,
      level: breadcrumb.level || "info",
      data: scrub(breadcrumb.data),
      timestamp: breadcrumb.timestamp ?? Date.now() / 1000,
    });
    if (this.breadcrumbs.length > MAX_BREADCRUMBS) this.breadcrumbs.shift();
  }

  /** Waits (up to `timeoutMs`) for queued reports to finish, e.g. before the process exits. */
  static async flush(timeoutMs = 2000): Promise<void> {
    if (this.pending.size === 0) return;
    await Promise.race([
      Promise.allSettled([...this.pending]),
      new Promise((resolve) => setTimeout(resolve, timeoutMs).unref?.()),
    ]);
  }

  private static withinRateLimit(): boolean {
    const now = Date.now();
    if (now - this.windowStart > 60_000) {
      this.windowStart = now;
      this.sentInWindow = 0;
    }
    this.sentInWindow += 1;
    return this.sentInWindow <= MAX_EVENTS_PER_MINUTE;
  }

  private static send(eventId: string, event: Record<string, unknown>): void {
    const target = this.target;
    if (!target) return;

    const body = [
      JSON.stringify({
        event_id: eventId,
        sent_at: new Date().toISOString(),
        dsn: target.dsn,
      }),
      JSON.stringify({ type: "event" }),
      JSON.stringify(event),
    ].join("\n");

    const request = fetch(target.envelopeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${target.publicKey}, sentry_client=bytehub-api/${env.APP_VERSION}`,
      },
      body,
      signal: AbortSignal.timeout(5000),
    })
      .then((res) => {
        if (!res.ok)
          logger.warn({ status: res.status }, "Sentry rejected an error report");
      })
      .catch((err) => {
        logger.warn(
          { err: err instanceof Error ? err.message : String(err) },
          "Could not reach Sentry"
        );
      })
      .finally(() => {
        this.pending.delete(request);
      });

    this.pending.add(request);
  }
}
