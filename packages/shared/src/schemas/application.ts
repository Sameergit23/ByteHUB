import { z } from "zod";

// Step 1: Personal Details
export const ApplicationDetailsSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().trim().email("Valid email address is required"),
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9\s-]{8,20}$/, "Valid phone number required"),
  location: z.string().trim().min(2, "City or country of residence required").max(100),
});
export type ApplicationDetailsInput = z.infer<typeof ApplicationDetailsSchema>;

// Step 2: Education & Experience
export const ApplicationEducationSchema = z.object({
  collegeOrUniversity: z.string().trim().min(2, "College/University name required").max(150),
  graduationYear: z.coerce
    .number()
    .int()
    .min(2020)
    .max(2035, "Valid graduation year required"),
  degree: z.string().trim().min(2, "Degree / Program name required").max(100),
  githubUrl: z
    .string()
    .trim()
    .url("Valid GitHub URL required")
    .regex(/github\.com/, "Must be a github.com profile link"),
  linkedinUrl: z
    .string()
    .trim()
    .url("Valid LinkedIn URL required")
    .regex(/linkedin\.com/, "Must be a linkedin.com profile link"),
  portfolioUrl: z.string().trim().url("Valid URL").or(z.literal("")).optional(),
});
export type ApplicationEducationInput = z.infer<typeof ApplicationEducationSchema>;

// Step 3: Resume & Statement
export const ApplicationResumeSchema = z.object({
  resumeUrl: z.string().trim().min(1, "Resume file must be uploaded (PDF or DOCX, max 5 MB)"),
  bioSummary: z
    .string()
    .trim()
    .min(20, "Brief summary must be at least 20 characters")
    .max(800),
  whyInterested: z
    .string()
    .trim()
    .min(30, "Please provide at least 30 characters explaining your interest")
    .max(1500),
  relevantProjectDescription: z
    .string()
    .trim()
    .min(50, "Please describe a technical project in at least 50 characters")
    .max(2000),
});
export type ApplicationResumeInput = z.infer<typeof ApplicationResumeSchema>;

// Step 4: Availability, Terms & Review
export const ApplicationReviewSchema = z.object({
  availableHoursPerWeek: z.coerce.number().int().min(10).max(60),
  earliestStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD required"),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "You must accept ByteHUB terms & code of conduct" }),
  }),
  accurateInformationAcknowledged: z.literal(true, {
    errorMap: () => ({ message: "You must verify that all details provided are accurate" }),
  }),
});
export type ApplicationReviewInput = z.infer<typeof ApplicationReviewSchema>;

// Complete Unified Application Schema
export const CompleteApplicationSchema = ApplicationDetailsSchema.merge(ApplicationEducationSchema)
  .merge(ApplicationResumeSchema)
  .merge(ApplicationReviewSchema)
  .extend({
    internshipId: z.string().min(1, "Internship identifier is required"),
  });
export type CompleteApplicationInput = z.infer<typeof CompleteApplicationSchema>;

export const ApplicationStatusSchema = z.enum([
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
