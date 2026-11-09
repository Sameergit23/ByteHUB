import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`[ByteHUB API] Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

const gracefulShutdown = () => {
  console.log("[ByteHUB API] Received termination signal, closing HTTP server...");
  server.close(() => {
    console.log("[ByteHUB API] HTTP server closed gracefully");
    process.exit(0);
  });
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
