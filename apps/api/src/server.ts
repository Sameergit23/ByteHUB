import type { Server } from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { SentryService } from "./config/sentry.js";
import { runProductionPreflight, reportPreflight } from "./config/preflight.js";
import { logger } from "./utils/logger.js";
import { jobQueue, JobTypeName } from "./jobs/queue.js";

// ---------------------------------------------------------------------------
// Error reporting for anything that escapes request handling
// ---------------------------------------------------------------------------
SentryService.init();

process.on("unhandledRejection", (reason) => {
  SentryService.captureException(reason, { tags: { mechanism: "unhandledRejection" } });
});

process.on("uncaughtException", (err) => {
  SentryService.captureException(err, { tags: { mechanism: "uncaughtException" } });
  // The process state is unknown after an uncaught exception: report, then exit so the
  // container platform restarts a clean instance.
  void SentryService.flush(2000).finally(() => process.exit(1));
});

// ---------------------------------------------------------------------------
// Recurring background jobs
// ---------------------------------------------------------------------------
const timers: NodeJS.Timeout[] = [];

const schedule = (name: JobTypeName, everyMs: number): void => {
  const timer = setInterval(() => {
    jobQueue
      .add(name, {})
      .catch((err) => logger.error({ err, name }, "Failed to queue job"));
  }, everyMs);
  timer.unref();
  timers.push(timer);
};

function startBackgroundJobs(): void {
  if (env.BACKGROUND_JOBS !== "on" || env.NODE_ENV === "test") return;
  const MINUTE = 60 * 1000;
  schedule("EXPIRE_RESERVATIONS", MINUTE); // release unpaid 15-minute seat holds
  schedule("NIGHTLY_RECONCILIATION", 30 * MINUTE); // re-check open orders with the gateway
  schedule("DATA_RETENTION_CLEANUP", 24 * 60 * MINUTE); // purge expired sessions
  logger.info("[ByteHUB API] Background job scheduler started");
}

// ---------------------------------------------------------------------------
// Start-up
// ---------------------------------------------------------------------------
let server: Server | null = null;

async function start(): Promise<void> {
  // Production only: refuses to start with demo accounts or unwritable resume storage.
  const preflight = await runProductionPreflight();
  if (!reportPreflight(preflight)) {
    process.exit(1);
  }

  const app = createApp();
  server = app.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV },
      `[ByteHUB API] Server running on http://localhost:${env.PORT}`
    );
  });

  startBackgroundJobs();
}

const gracefulShutdown = (signal: string) => {
  timers.forEach((t) => clearInterval(t));
  logger.info(
    { signal },
    "[ByteHUB API] Shutdown signal received. Closing HTTP server..."
  );

  const exit = () => {
    void SentryService.flush(2000).finally(() => process.exit(0));
  };

  if (!server) return exit();
  server.close(() => {
    logger.info("[ByteHUB API] HTTP server closed gracefully");
    exit();
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

start().catch((err) => {
  SentryService.captureException(err, { tags: { mechanism: "startup" } });
  void SentryService.flush(2000).finally(() => process.exit(1));
});
