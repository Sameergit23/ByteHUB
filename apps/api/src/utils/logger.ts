import pino from "pino";
import { maskEmail } from "./sanitize.js";

const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

export const logger = pino({
  level: isTest ? "silent" : process.env.LOG_LEVEL || "info",
  redact: {
    paths: [
      "password",
      "*.password",
      "passwordHash",
      "*.passwordHash",
      "token",
      "*.token",
      "accessToken",
      "refreshToken",
      "authorization",
      "headers.authorization",
      "req.headers.authorization",
      "cookie",
      "headers.cookie",
      "card",
      "cardNumber",
      "*.cardNumber",
      "cvv",
      "cvc",
      "secret",
      "keySecret",
      "razorpay_signature",
      "stripe_signature",
    ],
    censor: "[REDACTED]",
  },
  formatters: {
    log(object: Record<string, unknown>) {
      // If email exists at root or in body, mask it
      if (typeof object.email === "string") {
        object.email = maskEmail(object.email);
      }
      return object;
    },
  },
  transport:
    !isProduction && !isTest
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
          },
        }
      : undefined,
});

