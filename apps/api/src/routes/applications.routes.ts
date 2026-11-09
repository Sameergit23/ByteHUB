import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { validateBody } from "../middleware/validate.js";
import { authenticateJWT, requireRoles } from "../middleware/auth.js";
import {
  CompleteApplicationSchema,
  UpdateApplicationStatusSchema,
} from "@bytehub/shared";

export const applicationsRouter = Router();

applicationsRouter.post(
  "/",
  authenticateJWT,
  requireRoles("STUDENT", "ADMIN"),
  validateBody(CompleteApplicationSchema),
  async (req: Request, res: Response): Promise<void> => {
    const data = req.body;
    const studentId = req.user!.userId;

    // Check internship exists and is published
    const internship = await prisma.internship.findUnique({
      where: { id: data.internshipId },
    });

    if (!internship || internship.status !== "PUBLISHED") {
      res.status(400).json({
        status: "fail",
        code: "INVALID_INTERNSHIP",
        message: "Internship does not exist or is no longer accepting applications",
      });
      return;
    }

    // Check duplicate application
    const existing = await prisma.application.findFirst({
      where: {
        internshipId: data.internshipId,
        studentId,
      },
    });

    if (existing) {
      res.status(409).json({
        status: "fail",
        code: "ALREADY_APPLIED",
        message: "You have already submitted an application for this position",
      });
      return;
    }

    const application = await prisma.application.create({
      data: {
        internshipId: data.internshipId,
        studentId,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        collegeOrUniversity: data.collegeOrUniversity,
        graduationYear: data.graduationYear,
        degree: data.degree,
        githubUrl: data.githubUrl,
        linkedinUrl: data.linkedinUrl,
        portfolioUrl: data.portfolioUrl || null,
        resumeUrl: data.resumeUrl,
        bioSummary: data.bioSummary,
        whyInterested: data.whyInterested,
        relevantProjectDescription: data.relevantProjectDescription,
        availableHoursPerWeek: data.availableHoursPerWeek,
        earliestStartDate: new Date(data.earliestStartDate),
        status: "SUBMITTED",
      },
    });

    res.status(201).json({
      status: "success",
      data: application,
      message: "Application submitted successfully",
    });
  }
);

applicationsRouter.get(
  "/my",
  authenticateJWT,
  async (req: Request, res: Response): Promise<void> => {
    const applications = await prisma.application.findMany({
      where: { studentId: req.user!.userId },
      include: {
        internship: {
          select: {
            title: true,
            companyName: true,
            location: true,
            type: true,
            stipend: true,
            currency: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      status: "success",
      data: applications,
    });
  }
);

applicationsRouter.get(
  "/internship/:internshipId",
  authenticateJWT,
  requireRoles("COMPANY", "ADMIN"),
  async (req: Request, res: Response): Promise<void> => {
    const { internshipId } = req.params;

    const internship = await prisma.internship.findUnique({
      where: { id: internshipId },
    });

    if (!internship) {
      res.status(404).json({
        status: "fail",
        code: "NOT_FOUND",
        message: "Internship not found",
      });
      return;
    }

    if (req.user!.role !== "ADMIN" && internship.companyId !== req.user!.userId) {
      res.status(403).json({
        status: "fail",
        code: "FORBIDDEN",
        message: "Access forbidden",
      });
      return;
    }

    const applications = await prisma.application.findMany({
      where: { internshipId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      status: "success",
      data: applications,
    });
  }
);

applicationsRouter.patch(
  "/:id/status",
  authenticateJWT,
  requireRoles("COMPANY", "ADMIN"),
  validateBody(UpdateApplicationStatusSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status, feedbackNote } = req.body;

    const application = await prisma.application.findUnique({
      where: { id },
      include: { internship: true },
    });

    if (!application) {
      res.status(404).json({
        status: "fail",
        code: "NOT_FOUND",
        message: "Application not found",
      });
      return;
    }

    if (
      req.user!.role !== "ADMIN" &&
      application.internship.companyId !== req.user!.userId
    ) {
      res.status(403).json({
        status: "fail",
        code: "FORBIDDEN",
        message: "Access forbidden",
      });
      return;
    }

    const updated = await prisma.application.update({
      where: { id },
      data: {
        status,
        ...(feedbackNote !== undefined ? { feedbackNote } : {}),
      },
    });

    res.status(200).json({
      status: "success",
      data: updated,
    });
  }
);
