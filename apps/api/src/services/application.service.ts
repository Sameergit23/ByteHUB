import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/apiError.js";
import { CompleteApplicationInput, ApplicationStatus } from "@bytehub/shared";
import {
  storeResumeInVault,
  extractResumeKey,
  resumeExists,
  signResumeUrl,
} from "../utils/resumeStorage.js";
import { notificationService, formatMoney } from "./notification.service.js";
import { paymentService } from "./paymentService.js";
import { logger } from "../utils/logger.js";

export class ApplicationService {
  /**
   * Submit 4-step application with deadline check, duplicate guard, and confirmation
   */
  async submitApplication(
    studentId: string,
    input: CompleteApplicationInput,
    ip?: string
  ) {
    // 1. Verify internship exists & is published
    const internship = await prisma.internship.findFirst({
      where: {
        OR: [{ id: input.internshipId }, { slug: input.internshipId }],
        deletedAt: null,
      },
    });

    if (!internship || internship.status !== "PUBLISHED") {
      throw AppError.badRequest(
        "This internship posting is currently closed or unpublished."
      );
    }

    // 2. Server-side deadline check
    const now = new Date();
    if (now > new Date(internship.deadline)) {
      throw AppError.badRequest(
        "The submission deadline for this internship opening has passed."
      );
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

    // An application saved earlier but never paid for can be sent again (it is updated in place).
    if (existing && existing.status !== "PENDING_PAYMENT") {
      throw AppError.conflict(
        `You have already submitted an application for ${internship.title} on ${existing.createdAt.toISOString().slice(0, 10)}.`
      );
    }
    const feeAmount = internship.registrationFeeAmount; // paise; 0 = free to apply

    // 4. The resume must be a file uploaded to our vault. Only its key is stored, so the
    //    application never carries an expiring link or an arbitrary outside URL.
    const resumeKey = extractResumeKey(input.resumeUrl);
    if (!resumeKey || !(await resumeExists(resumeKey))) {
      throw AppError.badRequest(
        "Resume upload not found. Please upload your resume again (PDF or DOCX, max 5 MB)."
      );
    }

    // 5. Create application and audit log inside transaction. With a registration fee the
    //    application waits as PENDING_PAYMENT and only reaches the admin team once paid.
    const fields = {
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      collegeOrUniversity: input.collegeOrUniversity,
      graduationYear: input.graduationYear,
      degree: input.degree,
      githubUrl: input.githubUrl || null,
      linkedinUrl: input.linkedinUrl || null,
      portfolioUrl: input.portfolioUrl || null,
      resumeUrl: resumeKey,
      bioSummary: input.bioSummary || null,
      whyInterested: input.whyInterested || null,
      relevantProjectDescription: input.relevantProjectDescription || null,
      country: input.country || null,
      pincode: input.pincode || null,
      addressLine: input.addressLine || null,
      locality: input.locality || null,
      // Older copies of the form send a single "City, Country" line instead.
      city: input.city || input.location || null,
      state: input.state || null,
      availableHoursPerWeek: input.availableHoursPerWeek,
      earliestStartDate: new Date(input.earliestStartDate),
    };
    const status = feeAmount > 0 ? ("PENDING_PAYMENT" as const) : ("SUBMITTED" as const);

    const application = await prisma.$transaction(async (tx) => {
      const saved = existing
        ? await tx.application.update({
            where: { id: existing.id },
            data: { ...fields, status },
          })
        : await tx.application.create({
            data: {
              internshipId: internship.id,
              studentId,
              ...fields,
              status,
            },
          });

      await tx.auditLog.create({
        data: {
          userId: studentId,
          action:
            status === "SUBMITTED"
              ? "APPLICATION_SUBMITTED"
              : "APPLICATION_SAVED_AWAITING_FEE",
          entityType: "APPLICATION",
          entityId: saved.id,
          ipAddress: ip,
          details: {
            internshipId: internship.id,
            internshipTitle: internship.title,
            companyName: internship.companyName,
            ...(feeAmount > 0 ? { registrationFeeAmount: feeAmount } : {}),
          },
        },
      });

      return saved;
    });

    if (status === "PENDING_PAYMENT") {
      // The confirmation email goes out once the fee is paid.
      return {
        application,
        paymentRequired: true,
        registrationFeeAmount: feeAmount,
        currency: "INR",
        confirmationMessage: `Your application for ${internship.title} is saved. Pay the ${formatMoney(feeAmount, "INR")} registration fee to send it to our team.`,
      };
    }

    await notificationService.sendApplicationReceived({
      studentName: application.fullName,
      studentEmail: application.email,
      roleTitle: internship.title,
      companyName: internship.companyName,
      applicationId: application.id,
    });

    return {
      application,
      paymentRequired: false,
      registrationFeeAmount: 0,
      currency: "INR",
      confirmationMessage: `Your application for ${internship.title} at ${internship.companyName} has been received. A confirmation email is on its way and it is listed on your Student Dashboard.`,
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
      throw AppError.forbidden(
        "Access denied: You can only withdraw your own applications."
      );
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
            registrationFeeAmount: true,
            currency: true,
            deadline: true,
          },
        },
        payments: {
          where: { status: { in: ["PAID", "REFUNDED", "PARTIALLY_REFUNDED"] } },
          select: { orderId: true, amount: true, currency: true, status: true },
          orderBy: { createdAt: "desc" },
          take: 1,
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
      await prisma.auditLog
        .create({
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
        })
        .catch(() => null);

      throw AppError.forbidden(
        "Access denied: You are not authorized to inspect this candidate's resume."
      );
    }

    // Vault files get a fresh 15-minute signed link on every authorised request.
    const resumeKey = extractResumeKey(application.resumeUrl);

    return {
      resumeUrl: resumeKey ? signResumeUrl(resumeKey) : application.resumeUrl,
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
  async getInternshipApplications(
    internshipId: string,
    userId: string,
    userRole: string
  ) {
    const internship = await prisma.internship.findUnique({
      where: { id: internshipId },
    });

    if (!internship) {
      throw AppError.notFound("Internship not found.");
    }

    if (userRole !== "ADMIN" && internship.companyId !== userId) {
      throw AppError.forbidden(
        "Access denied: You may only review candidates for your organization's postings."
      );
    }

    return prisma.application.findMany({
      where: {
        internshipId,
        deletedAt: null,
        status: { not: "PENDING_PAYMENT" },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Every application across all of a company's postings (newest first).
   */
  async getCompanyApplications(companyId: string) {
    return prisma.application.findMany({
      where: {
        deletedAt: null,
        status: { not: "PENDING_PAYMENT" },
        internship: { companyId, deletedAt: null },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        collegeOrUniversity: true,
        graduationYear: true,
        degree: true,
        githubUrl: true,
        linkedinUrl: true,
        portfolioUrl: true,
        bioSummary: true,
        whyInterested: true,
        relevantProjectDescription: true,
        availableHoursPerWeek: true,
        earliestStartDate: true,
        status: true,
        feedbackNote: true,
        createdAt: true,
        internship: { select: { id: true, slug: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
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
      throw AppError.forbidden(
        "Access denied: You cannot alter candidate states for another organization."
      );
    }

    if (application.status === "WITHDRAWN") {
      throw AppError.badRequest("This candidate has withdrawn their application.");
    }
    if (status === "WITHDRAWN") {
      throw AppError.badRequest("Only the candidate can withdraw an application.");
    }
    if (application.status === "PENDING_PAYMENT") {
      throw AppError.badRequest(
        "This applicant hasn't paid the registration fee yet, so the application can't be reviewed."
      );
    }
    if (status === "PENDING_PAYMENT") {
      throw AppError.badRequest("Choose a review stage for this application.");
    }

    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: {
        status,
        feedbackNote: feedbackNote || null,
      },
    });

    // "Refund if not selected": rejecting an applicant who paid the registration fee records a
    // full refund. The money itself is sent from the Cashfree dashboard by an admin.
    let feeRefund: { amount: number; currency: string; orderId: string } | null = null;
    let feeRefundError: string | null = null;
    if (updated.status === "REJECTED" && application.status !== "REJECTED") {
      const feePayment = await prisma.payment.findFirst({
        where: { applicationId, status: { in: ["PAID", "PARTIALLY_REFUNDED"] } },
        orderBy: { createdAt: "desc" },
      });
      if (feePayment) {
        try {
          const result = await paymentService.processRefund(userId, {
            paymentId: feePayment.id,
            reason: "Not selected for the internship: registration fee refunded in full",
          });
          feeRefund = {
            amount: result.refund.amount,
            currency: result.refund.currency,
            orderId: feePayment.orderId,
          };
        } catch (err) {
          feeRefundError =
            err instanceof Error ? err.message : "Refund could not be recorded.";
          logger.error(
            { err, applicationId, orderId: feePayment.orderId },
            "Could not record the registration fee refund for a rejected application"
          );
        }
      }
    }

    if (updated.status !== application.status) {
      await prisma.auditLog
        .create({
          data: {
            userId,
            action: "APPLICATION_STATUS_CHANGED",
            entityType: "APPLICATION",
            entityId: applicationId,
            details: { from: application.status, to: updated.status },
          },
        })
        .catch(() => null);

      await notificationService.sendApplicationStatusChanged({
        studentName: application.fullName,
        studentEmail: application.email,
        roleTitle: application.internship.title,
        companyName: application.internship.companyName,
        newStatus: updated.status,
        note: feeRefund
          ? `Your registration fee of ${formatMoney(feeRefund.amount, feeRefund.currency)} will be refunded in full to the account you paid from. Refunds usually reach you within 5 to 7 working days.`
          : undefined,
      });
    }

    return { ...updated, feeRefund, feeRefundError };
  }
}

export const applicationService = new ApplicationService();
