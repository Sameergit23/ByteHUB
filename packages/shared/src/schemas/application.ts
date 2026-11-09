import { z } from "zod";

export const ApplicationStep1Schema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(100),
  email: z.string().trim().email("Valid email is required"),
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9\s-]{8,20}$/, "Valid phone number required"),
  collegeOrUniversity: z.string().trim().min(2, "College/University is required").max(150),
  graduationYear: z.coerce
    .number()
    .int()
    .min(2020)
    .max(2032, "Invalid graduation year"),
  degree: z.string().trim().min(2, "Degree name required").max(80),
});
export type ApplicationStep1Input = z.infer<typeof ApplicationStep1Schema>;

export const ApplicationStep2Schema = z.object({
  githubUrl: z
    .string()
    .trim()
    .url("Valid GitHub URL required")
    .regex(/github\.com/, "Must be a github.com URL"),
  linkedinUrl: z
    .string()
    .trim()
    .url("Valid LinkedIn URL required")
    .regex(/linkedin\.com/, "Must be a linkedin.com URL"),
  portfolioUrl: z.string().trim().url("Valid URL").or(z.literal("")).optional(),
  resumeUrl: z.string().trim().url("Valid public or hosted resume URL required"),
  bioSummary: z.string().trim().min(20, "Brief summary must be at least 20 characters").max(600),
});
export type ApplicationStep2Input = z.infer<typeof ApplicationStep2Schema>;

export const ApplicationStep3Schema = z.object({
  whyInterested: z
    .string()
    .trim()
    .min(50, "Please provide at least 50 characters explaining your interest")
    .max(1500),
  relevantProjectDescription: z
    .string()
    .trim()
    .min(50, "Please describe a relevant project in at least 50 characters")
    .max(2000),
  availableHoursPerWeek: z.coerce.number().int().min(10).max(60),
  earliestStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD required"),
});
export type ApplicationStep3Input = z.infer<typeof ApplicationStep3Schema>;

export const ApplicationStep4Schema = z.object({
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms & conditions" }),
  }),
  accurateInformationAcknowledged: z.literal(true, {
    errorMap: () => ({ message: "You must confirm that all details are accurate" }),
  }),
});
export type ApplicationStep4Input = z.infer<typeof ApplicationStep4Schema>;

export const CompleteApplicationSchema = ApplicationStep1Schema.merge(ApplicationStep2Schema)
  .merge(ApplicationStep3Schema)
  .merge(ApplicationStep4Schema)
  .extend({
    internshipId: z.string().min(1, "Internship ID required"),
  });
export type CompleteApplicationInput = z.infer<typeof CompleteApplicationSchema>;

export const ApplicationStatusSchema = z.enum([
  "SUBMITTED",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "REJECTED",
  "ACCEPTED",
]);
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;

export const UpdateApplicationStatusSchema = z.object({
  status: ApplicationStatusSchema,
  feedbackNote: z.string().max(1000).optional(),
});
export type UpdateApplicationStatusInput = z.infer<typeof UpdateApplicationStatusSchema>;
