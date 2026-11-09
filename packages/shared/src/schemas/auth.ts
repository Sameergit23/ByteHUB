import { z } from "zod";

export const UserRoleSchema = z.enum(["STUDENT", "COMPANY", "ADMIN"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const SignUpSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  name: z.string().trim().min(2, "Full name must be at least 2 characters").max(100),
  role: z.enum(["STUDENT", "COMPANY"]),
  organizationName: z.string().trim().max(120).optional(),
});
export type SignUpInput = z.infer<typeof SignUpSchema>;

export const LoginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

export const EmailVerificationRequestSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
});
export type EmailVerificationRequestInput = z.infer<typeof EmailVerificationRequestSchema>;

export const EmailVerificationConfirmSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});
export type EmailVerificationConfirmInput = z.infer<typeof EmailVerificationConfirmSchema>;

export const AuthResponseSchema = z.object({
  accessToken: z.string().optional(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    role: UserRoleSchema,
    organizationName: z.string().nullable().optional(),
  }),
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
