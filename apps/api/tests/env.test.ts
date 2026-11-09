import { describe, it, expect } from "vitest";
import { z } from "zod";

describe("Environment Validation Module Specification", () => {
  const EnvSchema = z.object({
    PORT: z.coerce.number().int().positive().default(5000),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long"),
    RAZORPAY_KEY_ID: z.string().min(1, "RAZORPAY_KEY_ID is required"),
    RAZORPAY_KEY_SECRET: z.string().min(1, "RAZORPAY_KEY_SECRET is required"),
    STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
  });

  it("fails with readable error messages when required env vars are missing", () => {
    const invalidEnv = {
      PORT: "5000",
      NODE_ENV: "development",
      // missing DATABASE_URL, JWT_SECRET, etc.
    };

    const res = EnvSchema.safeParse(invalidEnv);
    expect(res.success).toBe(false);

    if (!res.success) {
      const paths = res.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("DATABASE_URL");
      expect(paths).toContain("JWT_SECRET");
      expect(paths).toContain("RAZORPAY_KEY_ID");
      expect(paths).toContain("STRIPE_SECRET_KEY");
    }
  });

  it("fails when JWT_SECRET is too short (< 32 characters)", () => {
    const shortSecretEnv = {
      DATABASE_URL: "postgresql://localhost:5432/db",
      JWT_SECRET: "too_short_secret",
      RAZORPAY_KEY_ID: "rzp_id",
      RAZORPAY_KEY_SECRET: "rzp_sec",
      STRIPE_SECRET_KEY: "sk_key",
    };

    const res = EnvSchema.safeParse(shortSecretEnv);
    expect(res.success).toBe(false);
    if (!res.success) {
      const jwtIssue = res.error.issues.find((i) => i.path[0] === "JWT_SECRET");
      expect(jwtIssue?.message).toContain("at least 32 characters");
    }
  });

  it("succeeds when all required environment variables are valid", () => {
    const validEnv = {
      PORT: "5000",
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/testdb",
      JWT_SECRET: "a_very_long_valid_jwt_secret_with_more_than_32_characters",
      RAZORPAY_KEY_ID: "rzp_test_123",
      RAZORPAY_KEY_SECRET: "rzp_sec_123",
      STRIPE_SECRET_KEY: "sk_test_123",
    };

    const res = EnvSchema.safeParse(validEnv);
    expect(res.success).toBe(true);
  });
});
