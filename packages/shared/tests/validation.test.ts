import { describe, it, expect } from "vitest";
import {
  SignUpSchema,
  CreateInternshipSchema,
  CompleteApplicationSchema,
  CreateOrderRequestSchema,
} from "../src/index.js";

describe("Shared Zod Schemas Validation", () => {
  it("validates a valid student signup payload", () => {
    const valid = {
      email: "student@bytehub.io",
      password: "SecurePassword123",
      name: "Aarav Sharma",
      role: "STUDENT",
    };
    const parsed = SignUpSchema.parse(valid);
    expect(parsed.email).toBe("student@bytehub.io");
    expect(parsed.role).toBe("STUDENT");
  });

  it("rejects weak password without numbers/uppercase", () => {
    const invalid = {
      email: "student@bytehub.io",
      password: "weakpassword",
      name: "Aarav Sharma",
      role: "STUDENT",
    };
    expect(() => SignUpSchema.parse(invalid)).toThrow();
  });

  it("validates complete 4-step internship application", () => {
    const validApplication = {
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
        "ByteHUB's platform engineering program aligns with my aspiration to ship distributed production systems with strict types.",
      relevantProjectDescription:
        "Built a real-time event ticketing pipeline processing concurrent bookings with PostgreSQL ACID transactions.",
      availableHoursPerWeek: 30,
      earliestStartDate: "2026-12-01",
      termsAccepted: true,
      accurateInformationAcknowledged: true,
      internshipId: "intern-101",
    };

    const parsed = CompleteApplicationSchema.parse(validApplication);
    expect(parsed.internshipId).toBe("intern-101");
    expect(parsed.termsAccepted).toBe(true);
  });

  it("validates payment order creation request", () => {
    const order = {
      programId: "prog-systems-01",
      provider: "RAZORPAY",
      currency: "INR",
      idempotencyKey: "idem_92817293812739182",
    };
    const parsed = CreateOrderRequestSchema.parse(order);
    expect(parsed.provider).toBe("RAZORPAY");
  });
});

