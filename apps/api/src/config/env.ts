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
  CASHFREE_APP_ID: z.string().default("test_cashfree_app_id"),
  CASHFREE_SECRET_KEY: z.string().default("test_cashfree_secret_key"),
  CASHFREE_ENV: z.enum(["SANDBOX", "PRODUCTION"]).default("SANDBOX"),
  CASHFREE_API_VERSION: z.string().default("2023-08-01"),
  RAZORPAY_KEY_ID: z.string().default("rzp_test_placeholder_key"),
  RAZORPAY_KEY_SECRET: z.string().default("rzp_test_placeholder_secret"),
  RAZORPAY_WEBHOOK_SECRET: z.string().default("rzp_webhook_secret_placeholder"),
  STRIPE_SECRET_KEY: z.string().default("sk_test_placeholder_secret_key"),
  STRIPE_PUBLISHABLE_KEY: z.string().default("pk_test_placeholder_publishable_key"),
  STRIPE_WEBHOOK_SECRET: z.string().default("whsec_placeholder_webhook_signing_secret"),
  FRONTEND_URL: z
    .string()
    .url("FRONTEND_URL must be a valid URL")
    .default("http://localhost:3000"),
  EMAIL_PROVIDER: z.enum(["RESEND", "SES", "SENDGRID", "MOCK"]).default("MOCK"),
  EMAIL_FROM: z.string().default("ByteHUB Admissions <admissions@bytehub.dev>"),
  RESEND_API_KEY: z.string().default("re_test_mock_api_key"),
  REDIS_URL: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  ALERT_WEBHOOK_URL: z.string().optional(),
  // Where uploaded resumes are stored: "local" disk (development, or a mounted disk) or
  // "supabase" Storage (needed on hosting without a persistent disk, e.g. Render free).
  // "s3" and "minio" are accepted for older configs but currently behave like "local".
  STORAGE_DRIVER: z.enum(["local", "supabase", "s3", "minio"]).default("local"),
  // Supabase Storage (STORAGE_DRIVER=supabase). The service-role / secret key bypasses
  // row-level security, so it must only ever be set on the API, never on the website.
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().min(3).default("resumes"),
  S3_BUCKET_NAME: z.string().default("bytehub-resumes"),
  S3_REGION: z.string().default("ap-south-1"),
  S3_ENDPOINT: z.string().optional(),
  CDN_URL: z.string().optional(),
  APP_VERSION: z.string().default("1.0.0"),
  // Number of reverse-proxy hops in front of the API (the Next.js proxy counts as one).
  // Needed so rate limiting and audit logs see the real client IP.
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),
  // Public base URL of this API (e.g. https://api.bytehub.dev). When set, Cashfree is told
  // to deliver payment webhooks to <API_PUBLIC_URL>/api/payments/webhooks/cashfree.
  API_PUBLIC_URL: z.string().url().optional(),
  // Recurring jobs (seat-hold expiry, payment reconciliation, cleanup). Turn off on all but
  // one instance when several API replicas run, or for read-only local checks.
  BACKGROUND_JOBS: z.enum(["on", "off"]).default("on"),
  // Ceiling on requests per client IP per 15 minutes across the whole API. Sensitive
  // routes (sign-in, payments, uploads, contact) have their own much stricter limits.
  RATE_LIMIT_GLOBAL_MAX: z.coerce.number().int().positive().default(1000),
  // Where uploaded resumes are stored. In containers point this at a mounted volume,
  // otherwise every redeploy deletes them. Defaults to ./storage/vault/resumes.
  RESUME_STORAGE_DIR: z.string().optional(),
  // Staging only: lets a production-mode server start while the seeded demo accounts
  // (known password) still exist. Never set this on the real production server.
  ALLOW_DEMO_ACCOUNTS: z.enum(["true", "false"]).default("false"),
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

// ---------------------------------------------------------------------------
// Payment gateway configuration helpers
// ---------------------------------------------------------------------------

const isPlaceholder = (value: string | undefined): boolean =>
  !value || /placeholder|mock|^test_/i.test(value);

/** True when real Cashfree credentials are present. */
export const isCashfreeConfigured = (): boolean =>
  !isPlaceholder(env.CASHFREE_APP_ID) && !isPlaceholder(env.CASHFREE_SECRET_KEY);

/**
 * Simulated Cashfree payments are only ever allowed outside production,
 * and only when no real credentials are configured.
 */
export const isCashfreeMockMode = (): boolean =>
  env.NODE_ENV !== "production" && !isCashfreeConfigured();

/** Razorpay and Stripe are only accepted once real secrets are supplied. */
export const isRazorpayConfigured = (): boolean =>
  !isPlaceholder(env.RAZORPAY_KEY_ID) &&
  !isPlaceholder(env.RAZORPAY_KEY_SECRET) &&
  !isPlaceholder(env.RAZORPAY_WEBHOOK_SECRET);

export const isStripeConfigured = (): boolean =>
  !isPlaceholder(env.STRIPE_SECRET_KEY) && !isPlaceholder(env.STRIPE_WEBHOOK_SECRET);

/** True when transactional email will really be delivered (not just logged). */
export const isEmailDeliveryConfigured = (): boolean =>
  env.EMAIL_PROVIDER === "RESEND" && !isPlaceholder(env.RESEND_API_KEY);

// ---------------------------------------------------------------------------
// Production start-up guard: refuse to run with settings that would silently break
// payments or account emails. (Database-level checks run in config/preflight.ts.)
// ---------------------------------------------------------------------------
if (env.NODE_ENV === "production") {
  const problems: string[] = [];

  if (!isCashfreeConfigured()) {
    problems.push(
      "Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY to live Cashfree credentials."
    );
  }
  if (!isEmailDeliveryConfigured()) {
    problems.push(
      "Set EMAIL_PROVIDER=RESEND and a real RESEND_API_KEY (SES and SENDGRID are not implemented); " +
        "without it, verification and password-reset emails are never sent."
    );
  }
  if (
    env.STORAGE_DRIVER === "supabase" &&
    (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)
  ) {
    problems.push(
      "STORAGE_DRIVER=supabase needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (Supabase → Project Settings → API)."
    );
  }
  if (!/^https:\/\//.test(env.FRONTEND_URL)) {
    problems.push("Set FRONTEND_URL to the public https:// address of the website.");
  }

  if (problems.length > 0) {
    console.error(
      [
        "",
        "================================================================================",
        "  FATAL: ByteHUB API refuses to start in production:",
        ...problems.map((p) => `  ✕ ${p}`),
        "================================================================================",
        "",
      ].join("\n")
    );
    process.exit(1);
  }
}
