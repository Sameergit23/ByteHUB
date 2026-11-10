import { z } from "zod";

export const TrainingProgramSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string().trim().min(3).max(120),
  track: z.enum([
    "FULL_STACK",
    "SYSTEMS_ENGINEERING",
    "DEVOPS_CLOUD",
    "DATA_AI",
    "CYBERSECURITY",
  ]),
  priceINR: z.number().int().positive("Price INR must be positive"),
  priceUSD: z.number().int().positive("Price USD must be positive"),
  durationWeeks: z.number().int().min(2).max(52),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  cohortStart: z.string(),
  seatsTotal: z.number().int().positive(),
  seatsLeft: z.number().int().nonnegative(),
  summary: z.string().min(20),
  syllabus: z.array(
    z.object({
      week: z.number().int(),
      title: z.string(),
      description: z.string(),
      deliverables: z.array(z.string()),
    })
  ),
  outcomes: z.array(z.string()),
  tools: z.array(z.string()),
  published: z.boolean().default(true),
});
export type TrainingProgram = z.infer<typeof TrainingProgramSchema>;

export const EnrollTrainingSchema = z.object({
  programId: z.string().min(1),
  gateway: z.enum(["CASHFREE", "RAZORPAY", "STRIPE"]).default("CASHFREE"),
  currency: z.enum(["INR", "USD"]).default("INR"),
});
export type EnrollTrainingInput = z.infer<typeof EnrollTrainingSchema>;
