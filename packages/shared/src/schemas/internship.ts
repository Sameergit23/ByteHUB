import { z } from "zod";

export const InternshipTypeSchema = z.enum(["REMOTE", "HYBRID", "ON_SITE"]);
export const InternshipStatusSchema = z.enum(["DRAFT", "PUBLISHED", "CLOSED"]);

export const CreateInternshipSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(120),
  companyName: z.string().trim().min(2).max(100),
  location: z.string().trim().min(2).max(100),
  type: InternshipTypeSchema,
  stipend: z.number().int().nonnegative("Stipend must be positive or 0"),
  // Paid online by the student when applying, in rupees. 0 (or left out) = free to apply.
  registrationFee: z
    .number()
    .int("Registration fee must be a whole number of rupees")
    .min(0, "Registration fee can't be negative")
    .max(50000, "Registration fee can be at most ₹50,000")
    .optional(),
  currency: z.enum(["INR", "USD"]).default("INR"),
  durationMonths: z.number().int().min(1).max(24),
  description: z.string().trim().min(50, "Description must be at least 50 characters"),
  whatYouWillDo: z.array(z.string().trim()).default([]),
  requirements: z
    .array(z.string().trim().min(2))
    .min(1, "At least one requirement is needed"),
  skills: z.array(z.string().trim().min(1)).min(1, "At least one skill required"),
  openings: z.number().int().min(1).default(1),
  deadline: z.string().datetime("Must be a valid ISO date-time"),
  trackId: z.string().optional(),
});
export type CreateInternshipInput = z.infer<typeof CreateInternshipSchema>;

export const UpdateInternshipSchema = CreateInternshipSchema.partial().extend({
  status: InternshipStatusSchema.optional(),
});
export type UpdateInternshipInput = z.infer<typeof UpdateInternshipSchema>;

export const InternshipFilterSchema = z.object({
  search: z.string().optional(),
  type: InternshipTypeSchema.optional(),
  minStipend: z.coerce.number().optional(),
  skill: z.string().optional(),
  trackId: z.string().optional(),
  cursor: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
export type InternshipFilter = z.infer<typeof InternshipFilterSchema>;
