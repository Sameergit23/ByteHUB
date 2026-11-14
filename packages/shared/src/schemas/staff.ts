import { z } from "zod";

/**
 * Admin-panel permissions. Every admin action on the server checks one of these, so hiding a
 * button is never the only protection. Labels are shown on the Roles & permissions page.
 */
export const STAFF_PERMISSIONS = {
  "dashboard.view": { group: "General", label: "See the dashboard" },
  "internships.manage": { group: "Internships", label: "Post and edit internships" },
  "applications.view": { group: "Internships", label: "See applications and resumes" },
  "applications.manage": {
    group: "Internships",
    label: "Move applications between stages (records fee refunds)",
  },
  "training.manage": {
    group: "Training",
    label: "Create and edit programmes and cohorts",
  },
  "enrolments.manage": {
    group: "Training",
    label: "Manage enrolments and issue certificates",
  },
  "payments.view": { group: "Payments", label: "See payments" },
  "payments.refund": { group: "Payments", label: "Record refunds" },
  "users.view": { group: "Users", label: "See student accounts" },
  "users.manage": {
    group: "Users",
    label: "Edit, block, unblock and delete accounts; send password resets",
  },
  "staff.manage": {
    group: "Users",
    label: "Manage staff, roles and permissions; reset two-factor sign-in",
  },
  "messages.manage": { group: "Support", label: "Read and handle contact messages" },
  "notifications.send": { group: "Support", label: "Send announcements to students" },
  "reports.view": { group: "Reports", label: "See reports and charts" },
  "reports.export": { group: "Reports", label: "Export data (CSV / PDF)" },
  "audit.view": { group: "System", label: "See the activity log" },
  "system.view": { group: "System", label: "See system health and integrations" },
  "settings.manage": { group: "System", label: "Change application settings" },
} as const;

export type StaffPermission = keyof typeof STAFF_PERMISSIONS;

export const ALL_STAFF_PERMISSIONS = Object.keys(STAFF_PERMISSIONS) as StaffPermission[];

/** Stands for every permission, including ones added later. Only the Super Admin role has it. */
export const ALL_PERMISSIONS_WILDCARD = "*";

/** Built-in roles. Their ids are fixed so the database migration can create them. */
export const SYSTEM_STAFF_ROLES = [
  {
    id: "role_super_admin",
    name: "Super Admin",
    description: "Full access, including staff, roles and settings.",
    permissions: [ALL_PERMISSIONS_WILDCARD],
  },
  {
    id: "role_admin",
    name: "Admin",
    description: "Runs day-to-day operations. Can't manage staff or settings.",
    permissions: ALL_STAFF_PERMISSIONS.filter(
      (p) => p !== "staff.manage" && p !== "settings.manage"
    ),
  },
  {
    id: "role_manager",
    name: "Manager",
    description: "Internships, applications, training and reports.",
    permissions: [
      "dashboard.view",
      "internships.manage",
      "applications.view",
      "applications.manage",
      "training.manage",
      "enrolments.manage",
      "payments.view",
      "users.view",
      "messages.manage",
      "reports.view",
      "reports.export",
    ],
  },
  {
    id: "role_moderator",
    name: "Moderator",
    description: "Reviews applications and answers messages.",
    permissions: [
      "dashboard.view",
      "applications.view",
      "applications.manage",
      "users.view",
      "messages.manage",
    ],
  },
  {
    id: "role_staff",
    name: "Staff",
    description: "Sees applications and answers messages.",
    permissions: ["dashboard.view", "applications.view", "messages.manage"],
  },
] as const;

export const SUPER_ADMIN_ROLE_ID = "role_super_admin";

export function hasStaffPermission(
  granted: readonly string[] | null | undefined,
  needed: StaffPermission
): boolean {
  if (!granted) return false;
  return granted.includes(ALL_PERMISSIONS_WILDCARD) || granted.includes(needed);
}

const permissionKey = z.enum(
  ALL_STAFF_PERMISSIONS as [StaffPermission, ...StaffPermission[]]
);

export const StaffRoleInputSchema = z.object({
  name: z.string().trim().min(2, "Give the role a name").max(40),
  description: z.string().trim().max(200).optional(),
  permissions: z.array(permissionKey).max(ALL_STAFF_PERMISSIONS.length),
});
export type StaffRoleInput = z.infer<typeof StaffRoleInputSchema>;

/** Six digits from the authenticator app, or a backup code like "k3f9-x2m7". */
export const TwoFactorCodeSchema = z
  .string()
  .trim()
  .min(6, "Enter the 6-digit code")
  .max(20)
  .regex(/^[0-9a-zA-Z -]+$/, "Use only the digits from your authenticator app");

export const TwoFactorLoginSchema = z.object({
  challengeToken: z.string().min(10).max(2000),
  code: TwoFactorCodeSchema,
});
export type TwoFactorLoginInput = z.infer<typeof TwoFactorLoginSchema>;

export const TwoFactorEnableSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app"),
});
