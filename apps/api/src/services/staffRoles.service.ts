import { SYSTEM_STAFF_ROLES, SUPER_ADMIN_ROLE_ID } from "@bytehub/shared";
import { prisma } from "../lib/prisma.js";
import { logger } from "../utils/logger.js";

/**
 * Creates any built-in staff role that is missing (never overwrites changes made in the admin
 * panel), keeps the Super Admin role at full access, and gives admins without a role the
 * Super Admin role so nobody is locked out.
 */
export async function ensureSystemStaffRoles(): Promise<void> {
  const created = await prisma.staffRole.createMany({
    data: SYSTEM_STAFF_ROLES.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      permissions: [...r.permissions],
      isSystem: true,
    })),
    skipDuplicates: true,
  });
  await prisma.staffRole.update({
    where: { id: SUPER_ADMIN_ROLE_ID },
    data: { permissions: ["*"], isSystem: true },
  });
  const promoted = await prisma.user.updateMany({
    where: { role: "ADMIN", staffRoleId: null, deletedAt: null },
    data: { staffRoleId: SUPER_ADMIN_ROLE_ID },
  });
  if (created.count || promoted.count) {
    logger.info(
      { rolesCreated: created.count, adminsGivenSuperAdmin: promoted.count },
      "Built-in staff roles checked"
    );
  }
}
