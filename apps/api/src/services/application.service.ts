import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/apiError.js";
import { CompleteApplicationInput, ApplicationStatus } from "@bytehub/shared";
import { storeResumeInVault, verifySignedResumeUrl } from "../utils/resumeStorage.js";

export class ApplicationService {
  /**
   * Submit 4-step application with deadline check, duplicate guard, and confirmation
   */
  async submitApplication(studentId: string, input: CompleteApplicationInput, ip?: string) {
    // 1. Verify internship exists & is published
    const internship = await prisma.internship.findFirst({
      where: {
        OR: [{ id: input.internshipId }, { slug: input.internshipId }],
        deletedAt: null,
      },
    });

    if (!internship || internship.status !== "PUBLISHED") {
      throw AppError.badRequest("This internship posting is currently closed or unpublished.");
    }

    // 2. Server-side deadline check
    const now = new Date();
    if (now > new Date(internship.deadline)) {
      throw AppError.badRequest("The submission deadline for this internship opening has passed.");
    }

    // 3. Duplicate application check
    const existing = await prisma.application.findUnique({
      where: {
        studentId_internshipId: {
          studentId,
          internshipId: internship.id,
        },
      },
    });

    if (existing) {
      throw AppError.conflict(
        `You have already submitted an application for ${internship.title} on ${existing.createdAt.toISOString().slice(0, 10)}.`
      );
    }

    // 4. Create application and audit log inside transaction
    const application = await prisma.$transaction(async (tx) => {
      const created = await tx.application.create({
        data: {
          internshipId: internship.id,
          studentId,
          fullName: input.fullName,
          email: input.email,
          phone: input.phone,
          collegeOrUniversity: input.collegeOrUniversity,
          graduationYear: input.graduationYear,
          degree: input.degree,
          githubUrl: input.githubUrl,
          linkedinUrl: input.linkedinUrl,
          portfolioUrl: input.portfolioUrl || null,
          resumeUrl: input.resumeUrl,
          bioSummary: input.bioSummary,
          whyInterested: input.whyInterested,
          relevantProjectDescription: input.relevantProjectDescription,
          availableHoursPerWeek: input.availableHoursPerWeek,
          earliestStartDate: new Date(input.earliestStartDate),
          status: "SUBMITTED",
        },
      });

      await tx.auditLog.create({
        data: {
          userId: studentId,
          action: "APPLICATION_SUBMITTED",
          entityType: "APPLICATION",
          entityId: created.id,
          ipAddress: ip,
          details: {
            internshipId: internship.id,
            internshipTitle: internship.title,
            companyName: internship.companyName,
          },
        },
      });

      return created;
    });

    return {
      application,
      confirmationMessage: `Your application for ${internship.title} at ${internship.companyName} has been received. A confirmation has been logged to your Student Dashboard.`,
    };
  }

  /**
   * Student withdraws their own active application
   */
  async withdrawApplication(applicationId: string, studentId: string, ip?: string) {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { internship: true },
    });

    if (!application || application.deletedAt) {
      throw AppError.notFound("Application not found.");
    }

    if (application.studentId !== studentId) {
      throw AppError.forbidden("Access denied: You can only withdraw your own applications.");
    }

    if (application.status === "WITHDRAWN") {
      throw AppError.badRequest("This application has already been withdrawn.");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.application.update({
        where: { id: applicationId },
        data: { status: "WITHDRAWN" },
      });

      await tx.auditLog.create({
        data: {
          userId: studentId,
          action: "APPLICATION_WITHDRAWN",
          entityType: "APPLICATION",
          entityId: applicationId,
          ipAddress: ip,
          details: { internshipTitle: application.internship.title },
        },
      });

      return res;
    });

    return {
      success: true,
      application: updated,
      message: "Application withdrawn successfully.",
    };
  }

  /**
   * List current student's applications
   */
  async getStudentApplications(studentId: string) {
    return prisma.application.findMany({
      where: {
        studentId,
        deletedAt: null,
      },
      include: {
        internship: {
          select: {
            id: true,
            slug: true,
            title: true,
            companyName: true,
            location: true,
            type: true,
            stipendAmount: true,
            currency: true,
            deadline: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Authorize and serve resume:
   * Only the student applicant, the company offering the role, or an admin can access!
   */
  async getAuthorizedResume(applicationId: string, userId: string, userRole: string) {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { internship: true },
    });

    if (!application || application.deletedAt) {
      throw AppError.notFound("Application record not found.");
    }

    // IDOR boundary: Verify authorization
    const isOwnerStudent = application.studentId === userId;
    const isOfferingCompany = application.internship.companyId === userId;
    const isAdmin = userRole === "ADMIN";

    if (!isOwnerStudent && !isOfferingCompany && !isAdmin) {
      await prisma.auditLog.create({
        data: {
          userId,
          action: "SECURITY_RESUME_IDOR_BLOCKED",
          entityType: "APPLICATION",
          entityId: applicationId,
          details: {
            attemptedBy: userId,
            studentOwner: application.studentId,
            companyOwner: application.internship.companyId,
          },
        },
      }).catch(() => null);

      throw AppError.forbidden("Access denied: You are not authorized to inspect this candidate's resume.");
    }

    return {
      resumeUrl: application.resumeUrl,
      applicantName: application.fullName,
    };
  }

  /**
   * Handle resume file buffer upload with magic bytes validation
   */
  async uploadResume(buffer: Buffer, originalFilename: string) {
    return storeResumeInVault(buffer, originalFilename);
  }

  /**
   * Company lists applications for their internship
   */
  async getInternshipApplications(internshipId: string, userId: string, userRole: string) {
    const internship = await prisma.internship.findUnique({
      where: { id: internshipId },
    });

    if (!internship) {
      throw AppError.notFound("Internship not found.");
    }

    if (userRole !== "ADMIN" && internship.companyId !== userId) {
      throw AppError.forbidden("Access denied: You may only review candidates for your organization's postings.");
    }

    return prisma.application.findMany({
      where: {
        internshipId,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Company updates application status (REVIEW, INTERVIEW, OFFERED, REJECTED)
   */
  async updateStatus(
    applicationId: string,
    status: ApplicationStatus,
    feedbackNote: string | undefined,
    userId: string,
    userRole: string
  ) {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { internship: true },
    });

    if (!application || application.deletedAt) {
      throw AppError.notFound("Application not found.");
    }

    if (userRole !== "ADMIN" && application.internship.companyId !== userId) {
      throw AppError.forbidden("Access denied: You cannot alter candidate states for another organization.");
    }

    return prisma.application.update({
      where: { id: applicationId },
      data: {
        status,
        feedbackNote: feedbackNote || null,
      },
    });
  }
}

export const applicationService = new ApplicationService();
