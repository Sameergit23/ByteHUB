import crypto from "node:crypto";
import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import {
  ALL_PERMISSIONS_WILDCARD,
  StaffRoleInputSchema,
  SUPER_ADMIN_ROLE_ID,
  SYSTEM_STAFF_ROLES,
  hasStaffPermission,
  type StaffPermission,
} from "@bytehub/shared";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/apiError.js";
import { hashPassword } from "../utils/password.js";
import { authService } from "../services/auth.service.js";
import { twoFactorService } from "../services/twoFactor.service.js";
import { requireAnyPermission, requirePermission } from "../middleware/staff.js";

/**
 * Users, staff and roles. Mounted inside the admin router, after its staff gate, so every
 * route here already has a signed-in, two-factor-verified staff member in req.staff.
 *
 * Safety rules: nobody changes their own role, blocks or deletes themselves; ByteHUB always
 * keeps an active Super Admin; only Super Admins hand out the Super Admin role; and a role can
 * only be given permissions the person editing it has.
 */
export const adminPeopleRouter: Router = Router();

type AsyncHandler = (req: Request, res: Response) => Promise<void>;
const wrap =
  (handler: AsyncHandler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res).catch(next);
  };

const clientIp = (req: Request) =>
  (req.headers["x-forwarded-for"] as string) || req.ip || "127.0.0.1";

async function audit(
  req: Request,
  action: string,
  entityType: string,
  entityId: string,
  details?: Prisma.InputJsonObject
) {
  await prisma.auditLog
    .create({
      data: {
        userId: req.user!.id,
        action,
        entityType,
        entityId,
        ipAddress: clientIp(req),
        ...(details ? { details } : {}),
      },
    })
    .catch(() => null);
}

const isSuperAdmin = (req: Request) =>
  (req.staff?.permissions ?? []).includes(ALL_PERMISSIONS_WILDCARD);

async function loadUser(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { staffRole: { select: { id: true, name: true } } },
  });
  if (!user || user.deletedAt) throw AppError.notFound("Account not found.");
  return user;
}

type LoadedUser = Awaited<ReturnType<typeof loadUser>>;

function assertNotSelf(req: Request, target: LoadedUser, what: string) {
  if (target.id === req.user!.id) {
    throw AppError.badRequest(
      `You can't ${what} your own account. Ask another Super Admin.`
    );
  }
}

/** Staff accounts can only be changed by people who manage staff. */
function assertMayChange(req: Request, target: LoadedUser) {
  if (
    target.role === "ADMIN" &&
    !hasStaffPermission(req.staff?.permissions, "staff.manage")
  ) {
    throw AppError.forbidden("Only people who manage staff can change staff accounts.");
  }
}

const isActiveSuperAdmin = (u: LoadedUser) =>
  u.role === "ADMIN" &&
  u.staffRoleId === SUPER_ADMIN_ROLE_ID &&
  !u.blockedAt &&
  !u.deletedAt;

/** Refuses a change that would leave ByteHUB without an active Super Admin. */
async function assertKeepsSuperAdmin(target: LoadedUser) {
  if (!isActiveSuperAdmin(target)) return;
  const others = await prisma.user.count({
    where: {
      role: "ADMIN",
      staffRoleId: SUPER_ADMIN_ROLE_ID,
      deletedAt: null,
      blockedAt: null,
      id: { not: target.id },
    },
  });
  if (others === 0) {
    throw AppError.badRequest(
      "ByteHUB needs at least one active Super Admin. Make someone else a Super Admin first."
    );
  }
}

async function endAllSessions(userId: string) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

adminPeopleRouter.get(
  "/users/:id",
  requirePermission("users.view"),
  wrap(async (req, res) => {
    const id = req.params.id!;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
        deletedAt: true,
        blockedAt: true,
        blockedReason: true,
        twoFactorEnabledAt: true,
        staffRole: { select: { id: true, name: true } },
        studentProfile: { select: { phone: true, college: true } },
        _count: { select: { applications: true, enrollments: true, payments: true } },
      },
    });
    if (!user || user.deletedAt) throw AppError.notFound("Account not found.");

    const [applications, enrollments, payments, lastLogin] = await Promise.all([
      prisma.application.findMany({
        where: { studentId: id, deletedAt: null },
        select: {
          id: true,
          status: true,
          createdAt: true,
          internship: { select: { title: true, companyName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.enrollment.findMany({
        where: { userId: id },
        select: {
          id: true,
          status: true,
          createdAt: true,
          cohort: {
            select: { cohortCode: true, programme: { select: { title: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.payment.findMany({
        where: { userId: id },
        select: {
          orderId: true,
          amount: true,
          currency: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.auditLog.findFirst({
        where: { userId: id, action: "AUTH_LOGIN_SUCCESS" },
        select: { createdAt: true, ipAddress: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const { twoFactorEnabledAt, deletedAt: _deletedAt, ...rest } = user;
    res.json({
      status: "success",
      data: {
        user: { ...rest, twoFactorEnabled: Boolean(twoFactorEnabledAt) },
        lastLoginAt: lastLogin?.createdAt ?? null,
        applications,
        enrollments,
        payments,
      },
    });
  })
);

const UpdateUserSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(100).optional(),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").optional(),
});

adminPeopleRouter.patch(
  "/users/:id",
  requirePermission("users.manage"),
  wrap(async (req, res) => {
    const input = UpdateUserSchema.parse(req.body);
    const target = await loadUser(req.params.id!);
    assertMayChange(req, target);
    if (input.email && input.email !== target.email) {
      const clash = await prisma.user.findUnique({ where: { email: input.email } });
      if (clash)
        throw AppError.conflict("Another account already uses this email address.");
    }
    const updated = await prisma.user.update({
      where: { id: target.id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.email && input.email !== target.email
          ? { email: input.email, isEmailVerified: false }
          : {}),
      },
      select: { id: true, name: true, email: true },
    });
    await audit(req, "USER_UPDATED_BY_ADMIN", "USER", target.id, {
      ...(input.name && input.name !== target.name
        ? { name: [target.name, input.name] }
        : {}),
      ...(input.email && input.email !== target.email
        ? { email: [target.email, input.email] }
        : {}),
    });
    res.json({ status: "success", data: updated });
  })
);

const BlockSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Give a short reason (the person isn't shown it)")
    .max(300),
});

adminPeopleRouter.post(
  "/users/:id/block",
  requirePermission("users.manage"),
  wrap(async (req, res) => {
    const { reason } = BlockSchema.parse(req.body);
    const target = await loadUser(req.params.id!);
    assertNotSelf(req, target, "block");
    assertMayChange(req, target);
    await assertKeepsSuperAdmin(target);
    if (target.blockedAt) throw AppError.conflict("This account is already blocked.");
    await prisma.user.update({
      where: { id: target.id },
      data: { blockedAt: new Date(), blockedReason: reason },
    });
    await endAllSessions(target.id);
    await audit(req, "USER_BLOCKED", "USER", target.id, { reason });
    res.json({ status: "success", data: { id: target.id, blocked: true } });
  })
);

adminPeopleRouter.post(
  "/users/:id/unblock",
  requirePermission("users.manage"),
  wrap(async (req, res) => {
    const target = await loadUser(req.params.id!);
    assertMayChange(req, target);
    if (!target.blockedAt) throw AppError.conflict("This account isn't blocked.");
    await prisma.user.update({
      where: { id: target.id },
      data: { blockedAt: null, blockedReason: null },
    });
    await audit(req, "USER_UNBLOCKED", "USER", target.id);
    res.json({ status: "success", data: { id: target.id, blocked: false } });
  })
);

adminPeopleRouter.delete(
  "/users/:id",
  requirePermission("users.manage"),
  wrap(async (req, res) => {
    const target = await loadUser(req.params.id!);
    assertNotSelf(req, target, "delete");
    assertMayChange(req, target);
    await assertKeepsSuperAdmin(target);

    // Same anonymisation as a student deleting their own account: payments and applications
    // stay for the records, personal details are removed.
    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.deleteMany({ where: { userId: target.id } });
      await tx.studentProfile.deleteMany({ where: { userId: target.id } });
      await tx.user.update({
        where: { id: target.id },
        data: {
          email: `deleted_${target.id.slice(0, 8)}@anonymized.local`,
          name: "Deleted Account",
          passwordHash: "DELETED_ACCOUNT_SCRUBBED",
          deletedAt: new Date(),
          staffRoleId: null,
          twoFactorSecret: null,
          twoFactorEnabledAt: null,
          twoFactorBackupCodes: [],
        },
      });
    });
    await audit(req, "USER_DELETED_BY_ADMIN", "USER", target.id, { role: target.role });
    res.json({ status: "success", data: { id: target.id, deleted: true } });
  })
);

adminPeopleRouter.post(
  "/users/:id/password-reset",
  requirePermission("users.manage"),
  wrap(async (req, res) => {
    const target = await loadUser(req.params.id!);
    assertMayChange(req, target);
    if (target.blockedAt) throw AppError.badRequest("Unblock the account first.");
    await authService.requestPasswordReset(target.email, clientIp(req));
    await audit(req, "USER_PASSWORD_RESET_SENT", "USER", target.id);
    res.json({ status: "success", data: { sentTo: target.email } });
  })
);

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------

async function loadRoleForAssignment(req: Request, roleId: string) {
  const role = await prisma.staffRole.findUnique({ where: { id: roleId } });
  if (!role) throw AppError.badRequest("Choose a role that exists.");
  if (role.id === SUPER_ADMIN_ROLE_ID && !isSuperAdmin(req)) {
    throw AppError.forbidden("Only a Super Admin can make someone a Super Admin.");
  }
  return role;
}

const AddStaffSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  name: z.string().trim().min(2).max(100).optional(),
  roleId: z.string().min(1, "Choose a role"),
});

adminPeopleRouter.post(
  "/staff",
  requirePermission("staff.manage"),
  wrap(async (req, res) => {
    const input = AddStaffSchema.parse(req.body);
    const role = await loadRoleForAssignment(req, input.roleId);
    const existing = await prisma.user.findUnique({ where: { email: input.email } });

    if (existing && !existing.deletedAt) {
      if (existing.role === "ADMIN")
        throw AppError.conflict("This person is already staff.");
      if (existing.blockedAt) throw AppError.badRequest("Unblock this account first.");
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: "ADMIN", staffRoleId: role.id },
      });
      // Signed out so their next sign-in starts with two-factor setup.
      await endAllSessions(existing.id);
      await audit(req, "STAFF_ADDED", "USER", existing.id, {
        role: role.name,
        existing: true,
      });
      res.status(201).json({
        status: "success",
        data: { id: existing.id, email: existing.email, invited: false, role: role.name },
      });
      return;
    }
    if (existing?.deletedAt) {
      throw AppError.conflict(
        "This email belonged to a deleted account. Use another email."
      );
    }

    const created = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name || input.email.split("@")[0]!,
        // A random password nobody knows; they choose their own from the emailed link.
        passwordHash: await hashPassword(crypto.randomBytes(32).toString("base64url")),
        role: "ADMIN",
        staffRoleId: role.id,
        isEmailVerified: true,
      },
    });
    await authService.requestPasswordReset(created.email, clientIp(req));
    await audit(req, "STAFF_ADDED", "USER", created.id, {
      role: role.name,
      invited: true,
    });
    res.status(201).json({
      status: "success",
      data: { id: created.id, email: created.email, invited: true, role: role.name },
    });
  })
);

const StaffRoleChangeSchema = z.object({ roleId: z.string().min(1).nullable() });

adminPeopleRouter.patch(
  "/users/:id/staff-role",
  requirePermission("staff.manage"),
  wrap(async (req, res) => {
    const { roleId } = StaffRoleChangeSchema.parse(req.body);
    const target = await loadUser(req.params.id!);
    assertNotSelf(req, target, "change the role of");
    if (target.role !== "ADMIN") {
      throw AppError.badRequest("This person isn't staff. Use Add staff member instead.");
    }
    if (target.staffRoleId === SUPER_ADMIN_ROLE_ID && !isSuperAdmin(req)) {
      throw AppError.forbidden("Only a Super Admin can change a Super Admin's role.");
    }
    if (roleId !== SUPER_ADMIN_ROLE_ID) await assertKeepsSuperAdmin(target);

    if (roleId === null) {
      // Remove staff access: back to a normal account, two-factor cleared, signed out.
      await prisma.user.update({
        where: { id: target.id },
        data: {
          role: "STUDENT",
          staffRoleId: null,
          twoFactorSecret: null,
          twoFactorEnabledAt: null,
          twoFactorLastStep: null,
          twoFactorBackupCodes: [],
        },
      });
      await endAllSessions(target.id);
      await audit(req, "STAFF_REMOVED", "USER", target.id, {
        previousRole: target.staffRole?.name ?? null,
      });
      res.json({ status: "success", data: { id: target.id, staff: false } });
      return;
    }

    const role = await loadRoleForAssignment(req, roleId);
    await prisma.user.update({
      where: { id: target.id },
      data: { staffRoleId: role.id },
    });
    await audit(req, "STAFF_ROLE_CHANGED", "USER", target.id, {
      from: target.staffRole?.name ?? null,
      to: role.name,
    });
    res.json({ status: "success", data: { id: target.id, role: role.name } });
  })
);

adminPeopleRouter.post(
  "/users/:id/reset-2fa",
  requirePermission("staff.manage"),
  wrap(async (req, res) => {
    const target = await loadUser(req.params.id!);
    assertNotSelf(req, target, "reset two-factor sign-in for");
    if (target.role !== "ADMIN")
      throw AppError.badRequest("Only staff use two-factor sign-in.");
    if (target.staffRoleId === SUPER_ADMIN_ROLE_ID && !isSuperAdmin(req)) {
      throw AppError.forbidden(
        "Only a Super Admin can reset a Super Admin's two-factor sign-in."
      );
    }
    await twoFactorService.reset(target.id);
    await endAllSessions(target.id);
    await audit(req, "STAFF_TWO_FACTOR_RESET", "USER", target.id);
    res.json({ status: "success", data: { id: target.id } });
  })
);

// ---------------------------------------------------------------------------
// Roles & permissions
// ---------------------------------------------------------------------------

adminPeopleRouter.get(
  "/roles",
  requireAnyPermission("staff.manage", "users.view"),
  wrap(async (_req, res) => {
    const roles = await prisma.staffRole.findMany({
      include: {
        _count: { select: { users: { where: { role: "ADMIN", deletedAt: null } } } },
      },
      orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
    });
    // Built-in roles from most to least access, then custom roles by age.
    const order = (id: string) => {
      const i = SYSTEM_STAFF_ROLES.findIndex((r) => r.id === id);
      return i === -1 ? SYSTEM_STAFF_ROLES.length : i;
    };
    roles.sort((a, b) => order(a.id) - order(b.id));
    res.json({
      status: "success",
      data: roles.map(({ _count, ...r }) => ({ ...r, staffCount: _count.users })),
    });
  })
);

/** A role can only be given permissions the person editing it already has. */
function assertGrantable(req: Request, permissions: readonly StaffPermission[]) {
  const mine = req.staff?.permissions ?? [];
  const extra = permissions.filter((p) => !hasStaffPermission(mine, p));
  if (extra.length) {
    throw AppError.forbidden(
      `You can't give permissions you don't have yourself (${extra.join(", ")}).`
    );
  }
}

adminPeopleRouter.post(
  "/roles",
  requirePermission("staff.manage"),
  wrap(async (req, res) => {
    const input = StaffRoleInputSchema.parse(req.body);
    assertGrantable(req, input.permissions);
    const clash = await prisma.staffRole.findFirst({
      where: { name: { equals: input.name, mode: "insensitive" } },
    });
    if (clash) throw AppError.conflict("A role with this name already exists.");
    const role = await prisma.staffRole.create({
      data: {
        name: input.name,
        description: input.description || null,
        permissions: Array.from(new Set(input.permissions)),
        isSystem: false,
      },
    });
    await audit(req, "ROLE_CREATED", "ROLE", role.id, {
      name: role.name,
      permissions: role.permissions,
    });
    res.status(201).json({ status: "success", data: role });
  })
);

adminPeopleRouter.patch(
  "/roles/:id",
  requirePermission("staff.manage"),
  wrap(async (req, res) => {
    const input = StaffRoleInputSchema.parse(req.body);
    const role = await prisma.staffRole.findUnique({ where: { id: req.params.id! } });
    if (!role) throw AppError.notFound("Role not found.");
    if (role.id === SUPER_ADMIN_ROLE_ID) {
      throw AppError.forbidden("The Super Admin role always has every permission.");
    }
    if (role.isSystem && input.name !== role.name) {
      throw AppError.badRequest(
        "Built-in roles keep their name. You can change their permissions."
      );
    }
    if (role.id === req.staff?.roleId) {
      throw AppError.badRequest("You can't change the permissions of your own role.");
    }
    assertGrantable(req, input.permissions);
    if (!role.isSystem && input.name.toLowerCase() !== role.name.toLowerCase()) {
      const clash = await prisma.staffRole.findFirst({
        where: {
          name: { equals: input.name, mode: "insensitive" },
          id: { not: role.id },
        },
      });
      if (clash) throw AppError.conflict("A role with this name already exists.");
    }
    const updated = await prisma.staffRole.update({
      where: { id: role.id },
      data: {
        ...(role.isSystem
          ? {}
          : { name: input.name, description: input.description || null }),
        permissions: Array.from(new Set(input.permissions)),
      },
    });
    await audit(req, "ROLE_UPDATED", "ROLE", role.id, {
      name: updated.name,
      before: role.permissions,
      after: updated.permissions,
    });
    res.json({ status: "success", data: updated });
  })
);

adminPeopleRouter.delete(
  "/roles/:id",
  requirePermission("staff.manage"),
  wrap(async (req, res) => {
    const role = await prisma.staffRole.findUnique({
      where: { id: req.params.id! },
      include: { _count: { select: { users: { where: { deletedAt: null } } } } },
    });
    if (!role) throw AppError.notFound("Role not found.");
    if (role.isSystem) throw AppError.forbidden("Built-in roles can't be deleted.");
    if (role._count.users > 0) {
      throw AppError.conflict(
        `${role._count.users} staff member(s) have this role. Give them another role first.`
      );
    }
    await prisma.staffRole.delete({ where: { id: role.id } });
    await audit(req, "ROLE_DELETED", "ROLE", role.id, { name: role.name });
    res.json({ status: "success", data: { id: role.id, deleted: true } });
  })
);
