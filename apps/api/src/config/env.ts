import dotenv from "dotenv";
import { z } from "zod";

// Load .env into process.env before validation
dotenv.config();

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  RAZORPAY_KEY_ID: z.string().min(1, "RAZORPAY_KEY_ID is required"),
  RAZORPAY_KEY_SECRET: z.string().min(1, "RAZORPAY_KEY_SECRET is required"),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1, "RAZORPAY_WEBHOOK_SECRET is required"),
  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
  STRIPE_PUBLISHABLE_KEY: z.string().default("pk_test_placeholder_publishable_key"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, "STRIPE_WEBHOOK_SECRET is required"),
  FRONTEND_URL: z.string().url("FRONTEND_URL must be a valid URL").default("http://localhost:3000"),
  EMAIL_PROVIDER: z.enum(["RESEND", "SES", "SENDGRID", "MOCK"]).default("MOCK"),
  EMAIL_FROM: z.string().default("ByteHUB Admissions <admissions@bytehub.dev>"),
  RESEND_API_KEY: z.string().default("re_test_mock_api_key"),
  REDIS_URL: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  ALERT_WEBHOOK_URL: z.string().optional(),
  STORAGE_DRIVER: z.enum(["local", "s3", "minio"]).default("local"),
  S3_BUCKET_NAME: z.string().default("bytehub-resumes"),
  S3_REGION: z.string().default("ap-south-1"),
  S3_ENDPOINT: z.string().optional(),
  CDN_URL: z.string().optional(),
  APP_VERSION: z.string().default("1.0.0"),
});

export type Env = z.infer<typeof EnvSchema>;

const result = EnvSchema.safeParse(process.env);

if (!result.success) {
  const issues = result.error.issues;
  const missingOrInvalid = issues.map((issue) => {
    const varName = issue.path.join(".");
    return `  ✕ [${varName}]: ${issue.message}`;
  });

  const banner = [
    "",
    "================================================================================",
    "  FATAL: ByteHUB API Environment Configuration Failure",
    "================================================================================",
    "  The application failed to start because one or more required environment",
    "  variables are missing or invalid in your runtime environment / .env file:",
    "",
    ...missingOrInvalid,
    "",
    "  Refer to apps/api/.env.example for required variable definitions and placeholders.",
    "================================================================================",
    "",
  ].join("\n");

  console.error(banner);
  process.exit(1);
}

export const env: Env = result.data;
