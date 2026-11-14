import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  Prisma,
  Role,
  InternshipStatus,
  PaymentStatus,
  ApplicationStatus,
} from "@prisma/client";
import { prisma } from "../lib/prisma.js";

/** Returns the value only when it is one of the allowed enum members. */
function pickEnum<T extends string>(
  value: unknown,
  allowed: readonly T[]
): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}
import { authenticateJWT } from "../middleware/auth.js";
import {
  requireAnyPermission,
  requirePermission,
  requireStaff,
} from "../middleware/staff.js";
import { AppError } from "../utils/apiError.js";
import { certificateService } from "../services/certificate.service.js";
import { adminPeopleRouter } from "./adminPeople.routes.js";

export const adminRouter: Router = Router();

type AsyncHandler = (req: Request, res: Response) => Promise<void>;

/** Routes async failures (bad input, missing rows) to the central error handler. */
const wrap =
  (handler: AsyncHandler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res).catch(next);
  };

// Every admin route: signed in, staff, not blocked, two-factor done. Each route below also
// checks the specific permission, so a hidden button is never the only protection.
adminRouter.use(authenticateJWT, requireStaff());

// Users, staff and roles & permissions (see adminPeople.routes.ts).
adminRouter.use(adminPeopleRouter);

// ---------------------------------------------------------------------------
// 1. Dashboard metrics
// ---------------------------------------------------------------------------

adminRouter.get(
  "/metrics",
  requirePermission("dashboard.view"),
  wrap(async (_req: Request, res: Response): Promise<void> => {
    const [
      userCount,
      internshipCount,
      applicationCount,
      payments,
      activeEnrollments,
      unhandledMessages,
      newApplications,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.internship.count({ where: { deletedAt: null } }),
      prisma.application.count({
        where: { deletedAt: null, status: { not: "PENDING_PAYMENT" } },
      }),
      prisma.payment.findMany({
        where: { status: "PAID" },
        select: { amount: true, currency: true },
      }),
      prisma.enrollment.count({ where: { status: "ACTIVE" } }),
      prisma.contactMessage.count({ where: { isRead: false } }),
      prisma.application.count({ where: { deletedAt: null, status: "SUBMITTED" } }),
    ]);

    const totalRevenueINR = payments
      .filter((p) => p.currency === "INR")
      .reduce((sum, p) => sum + p.amount / 100, 0);

    const totalRevenueUSD = payments
      .filter((p) => p.currency === "USD")
      .reduce((sum, p) => sum + p.amount / 100, 0);

    res.status(200).json({
      status: "success",
      data: {
        userCount,
        internshipCount,
        applicationCount,
        activeEnrollments,
        unhandledMessages,
        newApplications,
        totalRevenueINR,
        totalRevenueUSD,
      },
    });
  })
);

// ---------------------------------------------------------------------------
// 3. User Management with Pagination, Search & Role Filter
// ---------------------------------------------------------------------------

adminRouter.get(
  "/users",
  requirePermission("users.view"),
  wrap(async (req: Request, res: Response): Promise<void> => {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string, 10) || 15)
    );
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const role = pickEnum(req.query.role, Object.values(Role));
    const status =
      req.query.status === "blocked" || req.query.status === "active"
        ? req.query.status
        : null;

    const whereClause: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(role ? { role } : {}),
      ...(status === "blocked" ? { blockedAt: { not: null } } : {}),
      ...(status === "active" ? { blockedAt: null } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where: whereClause }),
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          organizationName: true,
          createdAt: true,
          isEmailVerified: true,
          blockedAt: true,
          twoFactorEnabledAt: true,
          staffRole: { select: { id: true, name: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    res.status(200).json({
      status: "success",
      data: {
        items: users.map(({ twoFactorEnabledAt, ...u }) => ({
          ...u,
          twoFactorEnabled: Boolean(twoFactorEnabledAt),
        })),
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  })
);

// ---------------------------------------------------------------------------
// 4. Internship Approvals & Management
// ---------------------------------------------------------------------------

adminRouter.get(
  "/internships",
  requireAnyPermission("internships.manage", "applications.view"),
  wrap(async (req: Request, res: Response): Promise<void> => {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string, 10) || 15)
    );
    const status = pickEnum(req.query.status, Object.values(InternshipStatus));

    const whereClause: Prisma.InternshipWhereInput = {
      deletedAt: null,
      ...(status ? { status } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.internship.count({ where: whereClause }),
      prisma.internship.findMany({
        where: whereClause,
        include: {
          company: { select: { name: true, organizationName: true, email: true } },
          _count: {
            select: {
              applications: {
                where: { deletedAt: null, status: { not: "PENDING_PAYMENT" } },
              },
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    res.status(200).json({
      status: "success",
      data: {
        items,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  })
);

adminRouter.patch(
  "/internships/:id/status",
  requirePermission("internships.manage"),
  wrap(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status } = req.body;

    if (!["DRAFT", "PUBLISHED", "CLOSED"].includes(status)) {
      throw AppError.badRequest("Invalid internship status value.");
    }

    const updated = await prisma.internship.update({
      where: { id },
      data: { status },
    });

    res.status(200).json({ status: "success", data: updated });
  })
);

// ---------------------------------------------------------------------------
// 4b. Applications (ByteHUB reviews every applicant; companies have no accounts)
// ---------------------------------------------------------------------------

adminRouter.get(
  "/applications",
  requirePermission("applications.view"),
  wrap(async (req: Request, res: Response): Promise<void> => {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string, 10) || 20)
    );
    const status = pickEnum(req.query.status, Object.values(ApplicationStatus));
    const internshipId =
      typeof req.query.internshipId === "string" ? req.query.internshipId : undefined;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

    const where: Prisma.ApplicationWhereInput = {
      deletedAt: null,
      // Applications reach the team once their registration fee is paid; the unpaid ones are
      // only listed when the "Awaiting payment" filter is picked.
      status: status ?? { not: "PENDING_PAYMENT" },
      ...(internshipId ? { internshipId } : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.application.count({ where }),
      prisma.application.findMany({
        where,
        include: {
          internship: {
            select: {
              id: true,
              title: true,
              companyName: true,
              slug: true,
              registrationFeeAmount: true,
            },
          },
          payments: {
            where: { status: { in: ["PAID", "REFUNDED", "PARTIALLY_REFUNDED"] } },
            select: {
              orderId: true,
              amount: true,
              currency: true,
              status: true,
              refunds: { select: { amount: true, status: true, createdAt: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // The resume itself is opened through /applications/:id/resume (signed, short-lived
    // link), so the stored file path is not sent to the browser.
    const items = rows.map(({ resumeUrl, studentId: _studentId, payments, ...rest }) => {
      const fee = payments[0];
      const processed = fee ? fee.refunds.filter((r) => r.status === "PROCESSED") : [];
      return {
        ...rest,
        hasResume: Boolean(resumeUrl),
        fee: fee
          ? {
              orderId: fee.orderId,
              amount: fee.amount,
              currency: fee.currency,
              status: fee.status,
              refundedAmount: processed.reduce((sum, r) => sum + r.amount, 0),
              refundedAt: processed.length
                ? processed[processed.length - 1]!.createdAt
                : null,
            }
          : null,
      };
    });

    res.status(200).json({
      status: "success",
      data: { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } },
    });
  })
);

// ---------------------------------------------------------------------------
// 4c. Training catalogue: tracks, programmes and cohorts (create & edit)
// ---------------------------------------------------------------------------

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const SyllabusWeekSchema = z.object({
  week: z.number().int().min(1).max(104),
  title: z.string().trim().min(2, "Each week needs a title").max(160),
  description: z.string().trim().max(600),
});

const programmeFields = {
  trackId: z.string().min(1, "Choose a track"),
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(100)
    .regex(SLUG_PATTERN, "Web address: lowercase letters, numbers and dashes only"),
  summary: z.string().trim().min(10, "Summary must be at least 10 characters").max(240),
  description: z
    .string()
    .trim()
    .min(30, "Description must be at least 30 characters")
    .max(5000),
  syllabus: z.array(SyllabusWeekSchema).max(104),
  prerequisites: z.array(z.string().trim().min(1).max(200)).max(30),
  published: z.boolean(),
};

const ProgrammeCreateSchema = z.object({
  ...programmeFields,
  slug: programmeFields.slug.optional(),
  syllabus: programmeFields.syllabus.optional(),
  prerequisites: programmeFields.prerequisites.optional(),
  published: programmeFields.published.optional(),
});
// No defaults on update, so fields that are not sent stay as they are.
const ProgrammeUpdateSchema = z.object(programmeFields).partial();

const cohortFields = {
  programmeId: z.string().min(1, "Choose a programme"),
  name: z.string().trim().min(3, "Name must be at least 3 characters").max(120),
  cohortCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{3,40}$/, "Code: letters, numbers and dashes only (3 to 40)"),
  mode: z.enum(["REMOTE", "HYBRID", "ON_SITE"]),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  priceAmount: z.number().int().min(0).max(100_000_000), // paise
  seatsTotal: z.number().int().min(0).max(10_000),
  published: z.boolean(),
};

const CohortCreateSchema = z.object({
  ...cohortFields,
  published: cohortFields.published.optional(),
});
// The code and programme are fixed once created (payments and certificates refer to them);
// seats change through /cohorts/:id/capacity.
const CohortUpdateSchema = z
  .object({
    name: cohortFields.name,
    mode: cohortFields.mode,
    startDate: cohortFields.startDate,
    endDate: cohortFields.endDate,
    priceAmount: cohortFields.priceAmount,
    published: cohortFields.published,
  })
  .partial();

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);

const weeksBetween = (start: Date, end: Date): number =>
  Math.max(1, Math.round((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)));

/** Turns a unique-constraint clash into a readable 409. */
function uniqueClash(err: unknown, message: string): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    throw AppError.conflict(message);
  }
  throw err;
}

async function auditAdmin(
  req: Request,
  action: string,
  entityType: string,
  entityId: string,
  details: Prisma.InputJsonValue
) {
  await prisma.auditLog
    .create({ data: { userId: req.user?.id, action, entityType, entityId, details } })
    .catch(() => null);
}

adminRouter.get(
  "/tracks",
  requireAnyPermission("training.manage", "internships.manage"),
  wrap(async (_req: Request, res: Response): Promise<void> => {
    const tracks = await prisma.track.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: { id: true, slug: true, name: true },
    });
    res.status(200).json({ status: "success", data: tracks });
  })
);

adminRouter.get(
  "/programmes",
  requireAnyPermission("training.manage", "enrolments.manage"),
  wrap(async (_req: Request, res: Response): Promise<void> => {
    const programmes = await prisma.programme.findMany({
      include: {
        track: { select: { id: true, name: true } },
        _count: { select: { cohorts: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    res.status(200).json({ status: "success", data: programmes });
  })
);

adminRouter.post(
  "/programmes",
  requirePermission("training.manage"),
  wrap(async (req: Request, res: Response): Promise<void> => {
    const input = ProgrammeCreateSchema.parse(req.body);
    const slug = input.slug || slugify(input.title);
    if (!SLUG_PATTERN.test(slug)) {
      throw AppError.badRequest(
        "Choose a web address made of letters, numbers and dashes."
      );
    }
    const programme = await prisma.programme
      .create({
        data: {
          trackId: input.trackId,
          slug,
          title: input.title,
          summary: input.summary,
          description: input.description,
          syllabus: input.syllabus ?? [],
          prerequisites: input.prerequisites ?? [],
          published: input.published ?? true,
        },
      })
      .catch((err) =>
        uniqueClash(err, `Another programme already uses the web address "${slug}".`)
      );
    await auditAdmin(req, "ADMIN_PROGRAMME_CREATED", "PROGRAMME", programme.id, {
      slug,
      title: input.title,
    });
    res.status(201).json({ status: "success", data: programme });
  })
);

adminRouter.patch(
  "/programmes/:id",
  requirePermission("training.manage"),
  wrap(async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id || "");
    const input = ProgrammeUpdateSchema.parse(req.body);
    const programme = await prisma.programme
      .update({ where: { id }, data: input })
      .catch((err) => {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
          throw AppError.notFound("Programme not found.");
        }
        return uniqueClash(err, "Another programme already uses that web address.");
      });
    await auditAdmin(req, "ADMIN_PROGRAMME_UPDATED", "PROGRAMME", id, {
      fields: Object.keys(input),
    });
    res.status(200).json({ status: "success", data: programme });
  })
);

adminRouter.post(
  "/cohorts",
  requirePermission("training.manage"),
  wrap(async (req: Request, res: Response): Promise<void> => {
    const input = CohortCreateSchema.parse(req.body);
    if (input.endDate <= input.startDate) {
      throw AppError.badRequest("The end date must be after the start date.");
    }
    const programme = await prisma.programme.findUnique({
      where: { id: input.programmeId },
      select: { id: true },
    });
    if (!programme) throw AppError.notFound("Programme not found.");

    const cohort = await prisma.cohort
      .create({
        data: {
          programmeId: input.programmeId,
          cohortCode: input.cohortCode,
          name: input.name,
          mode: input.mode,
          startDate: input.startDate,
          endDate: input.endDate,
          durationWeeks: weeksBetween(input.startDate, input.endDate),
          seatsTotal: input.seatsTotal,
          seatsLeft: input.seatsTotal,
          priceAmount: input.priceAmount,
          currency: "INR",
          published: input.published ?? true,
        },
      })
      .catch((err) =>
        uniqueClash(err, `Another cohort already uses the code ${input.cohortCode}.`)
      );
    await auditAdmin(req, "ADMIN_COHORT_CREATED", "COHORT", cohort.id, {
      cohortCode: cohort.cohortCode,
      priceAmount: cohort.priceAmount,
      seatsTotal: cohort.seatsTotal,
    });
    res.status(201).json({ status: "success", data: cohort });
  })
);

adminRouter.patch(
  "/cohorts/:id",
  requirePermission("training.manage"),
  wrap(async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id || "");
    const input = CohortUpdateSchema.parse(req.body);
    const existing = await prisma.cohort.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound("Cohort not found.");

    const startDate = input.startDate ?? existing.startDate;
    const endDate = input.endDate ?? existing.endDate;
    if (endDate <= startDate) {
      throw AppError.badRequest("The end date must be after the start date.");
    }
    const cohort = await prisma.cohort.update({
      where: { id },
      data: {
        ...input,
        ...(input.startDate || input.endDate
          ? { durationWeeks: weeksBetween(startDate, endDate) }
          : {}),
      },
    });
    await auditAdmin(req, "ADMIN_COHORT_UPDATED", "COHORT", id, {
      cohortCode: existing.cohortCode,
      fields: Object.keys(input),
    });
    res.status(200).json({ status: "success", data: cohort });
  })
);

// ---------------------------------------------------------------------------
// 5. Programmes & Cohort Capacity Overrides
// ---------------------------------------------------------------------------

adminRouter.get(
  "/cohorts",
  requireAnyPermission("training.manage", "enrolments.manage"),
  wrap(async (_req: Request, res: Response): Promise<void> => {
    const cohorts = await prisma.cohort.findMany({
      include: {
        programme: { select: { title: true, slug: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { startDate: "asc" },
    });

    res.status(200).json({ status: "success", data: cohorts });
  })
);

adminRouter.patch(
  "/cohorts/:id/capacity",
  requirePermission("training.manage"),
  wrap(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { seatsTotal, seatsLeft } = req.body;

    if (typeof seatsTotal !== "number" || typeof seatsLeft !== "number") {
      throw AppError.badRequest("seatsTotal and seatsLeft numbers required.");
    }

    const updated = await prisma.cohort.update({
      where: { id },
      data: { seatsTotal, seatsLeft },
    });

    res.status(200).json({ status: "success", data: updated });
  })
);

// ---------------------------------------------------------------------------
// 6. Enrolments List
// ---------------------------------------------------------------------------

adminRouter.get(
  "/enrolments",
  requirePermission("enrolments.manage"),
  wrap(async (req: Request, res: Response): Promise<void> => {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string, 10) || 15)
    );

    const [total, items] = await Promise.all([
      prisma.enrollment.count(),
      prisma.enrollment.findMany({
        include: {
          user: { select: { id: true, name: true, email: true } },
          cohort: {
            include: { programme: { select: { title: true } } },
          },
          certificate: { select: { certificateCode: true, revokedAt: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    res.status(200).json({
      status: "success",
      data: {
        items,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  })
);

// Mark one student as completed: issues their certificate and emails it (once).
adminRouter.post(
  "/enrolments/:id/complete",
  requirePermission("enrolments.manage"),
  wrap(async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id || "");
    const result = await certificateService.completeEnrollment(id, req.user?.id);
    res.status(200).json({ status: "success", data: result });
  })
);

// Mark every student with a confirmed seat in a cohort as completed.
adminRouter.post(
  "/cohorts/:id/complete",
  requirePermission("enrolments.manage"),
  wrap(async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id || "");
    const summary = await certificateService.completeCohort(id, req.user?.id);
    res.status(200).json({ status: "success", data: summary });
  })
);

// ---------------------------------------------------------------------------
// 6b. Payments Ledger
// ---------------------------------------------------------------------------

adminRouter.get(
  "/payments",
  requirePermission("payments.view"),
  wrap(async (req: Request, res: Response): Promise<void> => {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string, 10) || 20)
    );
    const status = pickEnum(req.query.status, Object.values(PaymentStatus));

    const whereClause: Prisma.PaymentWhereInput = status ? { status } : {};

    const [total, payments] = await Promise.all([
      prisma.payment.count({ where: whereClause }),
      prisma.payment.findMany({
        where: whereClause,
        include: {
          user: { select: { id: true, name: true, email: true } },
          cohort: {
            select: { cohortCode: true, programme: { select: { title: true } } },
          },
          application: {
            select: { id: true, internship: { select: { title: true } } },
          },
          refunds: { select: { amount: true, status: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const items = payments.map((p) => ({
      id: p.id,
      orderId: p.orderId,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      provider: p.provider,
      createdAt: p.createdAt,
      user: p.user,
      kind: p.application ? "INTERNSHIP_FEE" : "TRAINING",
      applicationId: p.application?.id ?? null,
      cohortCode: p.cohort?.cohortCode || null,
      programmeTitle: p.application
        ? `Registration fee: ${p.application.internship.title}`
        : p.cohort?.programme?.title || null,
      refundedAmount: p.refunds
        .filter((r) => r.status === "PROCESSED")
        .reduce((sum, r) => sum + r.amount, 0),
    }));

    res.status(200).json({
      status: "success",
      data: {
        items,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  })
);

// ---------------------------------------------------------------------------
// 7. Contact Messages (Inquiries)
// ---------------------------------------------------------------------------

adminRouter.get(
  "/contact-messages",
  requirePermission("messages.manage"),
  wrap(async (_req: Request, res: Response): Promise<void> => {
    const messages = await prisma.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    res.status(200).json({ status: "success", data: messages });
  })
);

adminRouter.patch(
  "/contact-messages/:id/read",
  requirePermission("messages.manage"),
  wrap(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const updated = await prisma.contactMessage.update({
      where: { id },
      data: { isRead: true, respondedAt: new Date() },
    });

    res.status(200).json({ status: "success", data: updated });
  })
);

// ---------------------------------------------------------------------------
// 8. Audit Logs
// ---------------------------------------------------------------------------

adminRouter.get(
  "/audit-logs",
  requirePermission("audit.view"),
  wrap(async (req: Request, res: Response): Promise<void> => {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string, 10) || 20)
    );

    const [total, logs] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.findMany({
        include: {
          user: { select: { email: true, name: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    res.status(200).json({
      status: "success",
      data: {
        items: logs,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  })
);

// ---------------------------------------------------------------------------
// 9. Server-Side CSV Export (Audit Logged)
// ---------------------------------------------------------------------------

// Helper: Sanitize fields to prevent CSV Formula Injection (CWE-1236)
function sanitizeCsvField(field: unknown): string {
  if (field === null || field === undefined) return '""';
  let str = String(field);
  // Neutralize spreadsheet formula execution triggers: =, +, -, @, \t, \r
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

adminRouter.get(
  "/export/:entity",
  requirePermission("reports.export"),
  wrap(async (req: Request, res: Response): Promise<void> => {
    const { entity } = req.params;
    const adminUserId = req.user?.id;

    let csvContent = "";
    let rowCount = 0;

    if (entity === "users") {
      const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1000,
      });
      rowCount = users.length;
      csvContent =
        "ID,Name,Email,Role,CreatedAt\n" +
        users
          .map((u) =>
            [
              sanitizeCsvField(u.id),
              sanitizeCsvField(u.name),
              sanitizeCsvField(u.email),
              sanitizeCsvField(u.role),
              sanitizeCsvField(u.createdAt.toISOString()),
            ].join(",")
          )
          .join("\n");
    } else if (entity === "payments") {
      const payments = await prisma.payment.findMany({
        include: { user: { select: { email: true } } },
        orderBy: { createdAt: "desc" },
        take: 1000,
      });
      rowCount = payments.length;
      csvContent =
        "ID,OrderID,UserEmail,Amount,Currency,Provider,Status,CreatedAt\n" +
        payments
          .map((p) =>
            [
              sanitizeCsvField(p.id),
              sanitizeCsvField(p.orderId),
              sanitizeCsvField(p.user?.email || ""),
              sanitizeCsvField(p.amount),
              sanitizeCsvField(p.currency),
              sanitizeCsvField(p.provider),
              sanitizeCsvField(p.status),
              sanitizeCsvField(p.createdAt.toISOString()),
            ].join(",")
          )
          .join("\n");
    } else if (entity === "enrolments") {
      const enrolments = await prisma.enrollment.findMany({
        include: {
          user: { select: { email: true } },
          cohort: { select: { cohortCode: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 1000,
      });
      rowCount = enrolments.length;
      csvContent =
        "ID,UserEmail,CohortCode,Status,PriceAmount,Currency,CreatedAt\n" +
        enrolments
          .map((e) =>
            [
              sanitizeCsvField(e.id),
              sanitizeCsvField(e.user?.email || ""),
              sanitizeCsvField(e.cohort?.cohortCode || ""),
              sanitizeCsvField(e.status),
              sanitizeCsvField(e.priceAmount),
              sanitizeCsvField(e.currency),
              sanitizeCsvField(e.createdAt.toISOString()),
            ].join(",")
          )
          .join("\n");
    } else {
      throw AppError.badRequest(
        `Unknown export entity '${entity}'. Supported: users, payments, enrolments.`
      );
    }

    // Audit log every export action
    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: "ADMIN_DATA_EXPORT_CSV",
        entityType: entity.toUpperCase(),
        entityId: "BULK_EXPORT",
        details: {
          entity,
          rowCount,
          exportedAt: new Date().toISOString(),
        },
      },
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="bytehub_export_${entity}_${Date.now()}.csv"`
    );
    res.status(200).send(csvContent);
  })
);

// ---------------------------------------------------------------------------
// 10. BullMQ / Job Queue & Dead-Letter Queue (DLQ) Management
// ---------------------------------------------------------------------------

adminRouter.get(
  "/jobs/failed",
  requirePermission("system.view"),
  wrap(async (_req: Request, res: Response): Promise<void> => {
    const { jobQueue } = await import("../jobs/queue.js");
    const failedJobs = jobQueue.getFailedJobs();
    res.status(200).json({ status: "success", data: failedJobs });
  })
);

adminRouter.post(
  "/jobs/retry/:jobId",
  requirePermission("system.view"),
  wrap(async (req: Request, res: Response): Promise<void> => {
    const { jobQueue } = await import("../jobs/queue.js");
    const jobId = req.params.jobId || "";
    try {
      const job = await jobQueue.retryJob(jobId);
      res.status(200).json({
        status: "success",
        message: `Job '${jobId}' re-queued from Dead-Letter Queue.`,
        data: job,
      });
    } catch (err) {
      res.status(404).json({
        error: {
          code: "JOB_NOT_FOUND",
          message: err instanceof Error ? err.message : "Job not found.",
        },
      });
    }
  })
);

adminRouter.get(
  "/jobs/stats",
  requirePermission("system.view"),
  wrap(async (_req: Request, res: Response): Promise<void> => {
    const { jobQueue } = await import("../jobs/queue.js");
    res.status(200).json({ status: "success", data: jobQueue.getStats() });
  })
);
