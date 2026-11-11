import { Router, Request, Response, NextFunction } from "express";
import { Prisma, Role, InternshipStatus, PaymentStatus } from "@prisma/client";
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
import { authenticateJWT, requireRoles } from "../middleware/auth.js";
import { generateBase32Secret, verifyTOTPCode } from "../utils/totp.js";
import { AppError } from "../utils/apiError.js";
import { certificateService } from "../services/certificate.service.js";

export const adminRouter: Router = Router();

type AsyncHandler = (req: Request, res: Response) => Promise<void>;

/** Routes async failures (bad input, missing rows) to the central error handler. */
const wrap =
  (handler: AsyncHandler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res).catch(next);
  };

// Protect all admin routes with JWT and ADMIN role check
adminRouter.use(authenticateJWT, requireRoles("ADMIN"));

// ---------------------------------------------------------------------------
// 1. Admin 2FA (TOTP)
// ---------------------------------------------------------------------------

adminRouter.post(
  "/2fa/setup",
  wrap(async (req: Request, res: Response): Promise<void> => {
    const adminEmail = req.user?.email || "admin@bytehub.dev";
    const secret = generateBase32Secret(20);
    const otpauthUri = `otpauth://totp/ByteHUB:${encodeURIComponent(adminEmail)}?secret=${secret}&issuer=ByteHUB&algorithm=SHA1&digits=6&period=30`;

    res.status(200).json({
      status: "success",
      data: {
        secret,
        otpauthUri,
        message:
          "Add this secret to your Authenticator app (Google Authenticator, 1Password, Authy).",
      },
    });
  })
);

adminRouter.post(
  "/2fa/verify",
  wrap(async (req: Request, res: Response): Promise<void> => {
    const { code, secret } = req.body;
    if (!code || !secret) {
      res
        .status(400)
        .json({ error: { code: "BAD_REQUEST", message: "Code and secret required." } });
      return;
    }

    const isValid = verifyTOTPCode(code, secret);
    if (!isValid) {
      res.status(401).json({
        error: { code: "INVALID_2FA_CODE", message: "Invalid or expired 2FA code." },
      });
      return;
    }

    res.status(200).json({
      status: "success",
      data: {
        verified: true,
        message: "Admin 2FA code verified successfully.",
      },
    });
  })
);

// ---------------------------------------------------------------------------
// 2. High-Level Metrics & Analytics
// ---------------------------------------------------------------------------

adminRouter.get(
  "/metrics",
  wrap(async (_req: Request, res: Response): Promise<void> => {
    const [
      userCount,
      internshipCount,
      applicationCount,
      payments,
      activeEnrollments,
      unhandledMessages,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.internship.count({ where: { deletedAt: null } }),
      prisma.application.count({ where: { deletedAt: null } }),
      prisma.payment.findMany({
        where: { status: "PAID" },
        select: { amount: true, currency: true },
      }),
      prisma.enrollment.count({ where: { status: "ACTIVE" } }),
      prisma.contactMessage.count({ where: { isRead: false } }),
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
  wrap(async (req: Request, res: Response): Promise<void> => {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string, 10) || 15)
    );
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const role = pickEnum(req.query.role, Object.values(Role));

    const whereClause: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(role ? { role } : {}),
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
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    res.status(200).json({
      status: "success",
      data: {
        items: users,
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
          _count: { select: { applications: true } },
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
// 5. Programmes & Cohort Capacity Overrides
// ---------------------------------------------------------------------------

adminRouter.get(
  "/cohorts",
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
  wrap(async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id || "");
    const result = await certificateService.completeEnrollment(id, req.user?.id);
    res.status(200).json({ status: "success", data: result });
  })
);

// Mark every student with a confirmed seat in a cohort as completed.
adminRouter.post(
  "/cohorts/:id/complete",
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
      cohortCode: p.cohort?.cohortCode || null,
      programmeTitle: p.cohort?.programme?.title || null,
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
  wrap(async (_req: Request, res: Response): Promise<void> => {
    const { jobQueue } = await import("../jobs/queue.js");
    const failedJobs = jobQueue.getFailedJobs();
    res.status(200).json({ status: "success", data: failedJobs });
  })
);

adminRouter.post(
  "/jobs/retry/:jobId",
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
  wrap(async (_req: Request, res: Response): Promise<void> => {
    const { jobQueue } = await import("../jobs/queue.js");
    res.status(200).json({ status: "success", data: jobQueue.getStats() });
  })
);
