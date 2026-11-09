import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticateJWT, requireRoles } from "../middleware/auth.js";

export const adminRouter = Router();

// Protect all admin routes
adminRouter.use(authenticateJWT, requireRoles("ADMIN"));

adminRouter.get("/metrics", async (_req: Request, res: Response): Promise<void> => {
  const [
    userCount,
    internshipCount,
    applicationCount,
    payments,
    activeEnrollments,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.internship.count(),
    prisma.application.count(),
    prisma.payment.findMany({
      where: { status: "SUCCESS" },
      select: { amount: true, currency: true },
    }),
    prisma.enrollment.count({ where: { status: "ACTIVE" } }),
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
      totalRevenueINR,
      totalRevenueUSD,
    },
  });
});

adminRouter.get("/ledger", async (_req: Request, res: Response): Promise<void> => {
  const ledger = await prisma.payment.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      program: {
        select: {
          title: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  res.status(200).json({
    status: "success",
    data: ledger,
  });
});

adminRouter.get("/users", async (_req: Request, res: Response): Promise<void> => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      organizationName: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  res.status(200).json({
    status: "success",
    data: users,
  });
});
