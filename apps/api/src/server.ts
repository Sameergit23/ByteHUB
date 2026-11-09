import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV },
    `[ByteHUB API] Server running on http://localhost:${env.PORT}`
  );
});

const gracefulShutdown = (signal: string) => {
  logger.info({ signal }, "[ByteHUB API] Shutdown signal received. Closing HTTP server...");
  server.close(() => {
    logger.info("[ByteHUB API] HTTP server closed gracefully");
    process.exit(0);
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
