import test from "node:test";
import assert from "node:assert/strict";
import {
  SignUpSchema,
  CreateInternshipSchema,
  CompleteApplicationSchema,
  CreateOrderRequestSchema,
} from "../dist/index.js";

test("SignUpSchema: accepts valid student registration", () => {
  const payload = {
    email: "student@bytehub.io",
    password: "SecurePassword123",
    name: "Aarav Sharma",
    role: "STUDENT",
  };
  const parsed = SignUpSchema.parse(payload);
  assert.equal(parsed.email, "student@bytehub.io");
  assert.equal(parsed.role, "STUDENT");
});

test("SignUpSchema: rejects weak password without numbers or uppercase", () => {
  const invalid = {
    email: "student@bytehub.io",
    password: "weakpassword",
    name: "Aarav Sharma",
    role: "STUDENT",
  };
  assert.throws(() => SignUpSchema.parse(invalid));
});

test("CreateOrderRequestSchema: validates Razorpay and Stripe order requests", () => {
  const rzpOrder = {
    programId: "prog-01",
    provider: "RAZORPAY",
    currency: "INR",
    idempotencyKey: "bh_idemp_12345",
  };
  const parsedRzp = CreateOrderRequestSchema.parse(rzpOrder);
  assert.equal(parsedRzp.provider, "RAZORPAY");

  const stripeOrder = {
    programId: "prog-02",
    provider: "STRIPE",
    currency: "USD",
    idempotencyKey: "bh_idemp_67890",
  };
  const parsedStripe = CreateOrderRequestSchema.parse(stripeOrder);
  assert.equal(parsedStripe.currency, "USD");
});

test("CompleteApplicationSchema: validates 4-step internship application", () => {
  const validApp = {
    internshipId: "intern-01",
    fullName: "Maya Sen",
    email: "maya.sen@domain.edu",
    phone: "+91 9876543210",
    collegeOrUniversity: "Indian Institute of Technology",
    graduationYear: 2026,
    degree: "B.Tech Computer Science",
    githubUrl: "https://github.com/mayasen",
    linkedinUrl: "https://linkedin.com/in/mayasen",
    portfolioUrl: "https://mayasen.dev",
    resumeUrl: "https://drive.google.com/file/d/sample-resume",
    bioSummary: "Passionate full-stack developer experienced in React, TypeScript and Node.js.",
    whyInterested:
      "ByteHUB's platform engineering program aligns with my aspiration to ship distributed production systems.",
    relevantProjectDescription:
      "Built a real-time event ticketing pipeline processing concurrent bookings with PostgreSQL ACID transactions.",
    availableHoursPerWeek: 30,
    earliestStartDate: "2026-12-01",
    termsAccepted: true,
    accurateInformationAcknowledged: true,
  };
  const parsed = CompleteApplicationSchema.parse(validApp);
  assert.equal(parsed.fullName, "Maya Sen");
  assert.equal(parsed.termsAccepted, true);
});
