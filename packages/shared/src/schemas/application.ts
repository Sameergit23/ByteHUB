import { z } from "zod";

// Step 1: Personal Details
export const ApplicationDetailsSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().trim().email("Valid email address is required"),
  // Country code and number, e.g. "+91 9876543210".
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9\s-]{8,20}$/, "Valid phone number required"),
  // Address. The form asks for city and state; they are optional here so an older copy of the
  // form (which sent a single "location" line) still works during a deploy.
  country: z.string().trim().max(60).optional(),
  pincode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9 -]{3,10}$/, "Enter a valid PIN / postal code")
    .or(z.literal(""))
    .optional(),
  addressLine: z.string().trim().max(200).optional(),
  locality: z.string().trim().max(120).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  location: z.string().trim().max(150).optional(),
});
export type ApplicationDetailsInput = z.infer<typeof ApplicationDetailsSchema>;

// Step 2: Education & Experience
export const ApplicationEducationSchema = z.object({
  collegeOrUniversity: z
    .string()
    .trim()
    .min(2, "College/University name required")
    .max(150),
  graduationYear: z.coerce
    .number()
    .int()
    .min(2020)
    .max(2035, "Valid graduation year required"),
  degree: z.string().trim().min(2, "Degree / Program name required").max(100),
  // Optional; when given they must point at the right site.
  githubUrl: z
    .string()
    .trim()
    .url("Enter a full link, e.g. https://github.com/username")
    .regex(/github\.com/, "Must be a github.com profile link")
    .or(z.literal(""))
    .optional(),
  linkedinUrl: z
    .string()
    .trim()
    .url("Enter a full link, e.g. https://linkedin.com/in/username")
    .regex(/linkedin\.com/, "Must be a linkedin.com profile link")
    .or(z.literal(""))
    .optional(),
  portfolioUrl: z.string().trim().url("Valid URL").or(z.literal("")).optional(),
});
export type ApplicationEducationInput = z.infer<typeof ApplicationEducationSchema>;

// Step 3: Resume & Statement
export const ApplicationResumeSchema = z.object({
  resumeUrl: z
    .string()
    .trim()
    .min(1, "Resume file must be uploaded (PDF or DOCX, max 5 MB)"),
  // Optional statements: students can leave them blank.
  bioSummary: z
    .string()
    .trim()
    .max(800, "Keep the summary under 800 characters")
    .optional(),
  whyInterested: z
    .string()
    .trim()
    .max(1500, "Keep this under 1,500 characters")
    .optional(),
  relevantProjectDescription: z
    .string()
    .trim()
    .max(2000, "Keep this under 2,000 characters")
    .optional(),
});
export type ApplicationResumeInput = z.infer<typeof ApplicationResumeSchema>;

// Step 4: Availability, Terms & Review
export const ApplicationReviewSchema = z.object({
  availableHoursPerWeek: z.coerce.number().int().min(10).max(60),
  earliestStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD required"),
  termsAccepted: z.literal(true, {
    error: "You must accept ByteHUB terms & code of conduct",
  }),
  accurateInformationAcknowledged: z.literal(true, {
    error: "You must verify that all details provided are accurate",
  }),
});
export type ApplicationReviewInput = z.infer<typeof ApplicationReviewSchema>;

// Complete Unified Application Schema (all four steps plus the internship being applied to)
export const CompleteApplicationSchema = z.object({
  ...ApplicationDetailsSchema.shape,
  ...ApplicationEducationSchema.shape,
  ...ApplicationResumeSchema.shape,
  ...ApplicationReviewSchema.shape,
  internshipId: z.string().min(1, "Internship identifier is required"),
});
export type CompleteApplicationInput = z.infer<typeof CompleteApplicationSchema>;

export const ApplicationStatusSchema = z.enum([
  // Saved, but the internship's registration fee is not paid yet. Admin can't see or move these.
  "PENDING_PAYMENT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "INTERVIEW",
  "OFFERED",
  "REJECTED",
  "WITHDRAWN",
]);
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;

export const UpdateApplicationStatusSchema = z.object({
  status: ApplicationStatusSchema,
  feedbackNote: z.string().max(1000).optional(),
});
export type UpdateApplicationStatusInput = z.infer<typeof UpdateApplicationStatusSchema>;
