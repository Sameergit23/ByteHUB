import { z } from "zod";

export const UserRoleSchema = z.enum(["STUDENT", "COMPANY", "ADMIN"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const SignUpSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
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

export const AuthResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    role: UserRoleSchema,
    organizationName: z.string().nullable().optional(),
  }),
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

