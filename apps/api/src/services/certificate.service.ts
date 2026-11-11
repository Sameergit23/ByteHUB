import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/apiError.js";
import { logger } from "../utils/logger.js";
import { notificationService } from "./notification.service.js";

/** No 0/O/1/I, so codes read back correctly when typed from a printed certificate. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** "BYTE-2026-K7M2QX9D": year of issue plus 8 random characters. */
export function generateCertificateCode(now = new Date()): string {
  let suffix = "";
  for (let i = 0; i < 8; i++) {
    suffix += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  }
  return `BYTE-${now.getUTCFullYear()}-${suffix}`;
}

export function certificateUrl(code: string): string {
  return `${env.FRONTEND_URL.replace(/\/$/, "")}/verify/${encodeURIComponent(code)}`;
}

const isUniqueViolation = (err: unknown): boolean =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";

export interface CompletionResult {
  enrollmentId: string;
  certificateCode: string;
  /** False when the student was already completed with a certificate (nothing was sent). */
  newlyIssued: boolean;
}

export const certificateService = {
  /**
   * Marks one enrolment as completed and issues its certificate (once). The certificate email
   * goes out only when the certificate is new, so repeating the action never double-sends.
   */
  async completeEnrollment(
    enrollmentId: string,
    adminUserId: string | undefined
  ): Promise<CompletionResult> {
    for (let attempt = 1; ; attempt++) {
      try {
        const outcome = await prisma.$transaction(async (tx) => {
          const enrollment = await tx.enrollment.findUnique({
            where: { id: enrollmentId },
            include: {
              user: { select: { id: true, name: true, email: true } },
              cohort: { include: { programme: { select: { title: true } } } },
              certificate: true,
            },
          });

          if (!enrollment || enrollment.deletedAt) {
            throw AppError.notFound("Enrolment not found.");
          }
          if (enrollment.status !== "ACTIVE" && enrollment.status !== "COMPLETED") {
            throw AppError.badRequest(
              "Only students with a confirmed seat can be marked completed."
            );
          }
          if (enrollment.certificate?.revokedAt) {
            throw AppError.conflict(
              "This student's certificate was revoked, so a new one is not issued automatically."
            );
          }

          if (enrollment.status !== "COMPLETED") {
            await tx.enrollment.update({
              where: { id: enrollment.id },
              data: { status: "COMPLETED" },
            });
          }

          let certificate = enrollment.certificate;
          const newlyIssued = !certificate;
          if (!certificate) {
            const code = generateCertificateCode();
            certificate = await tx.certificate.create({
              data: {
                enrollmentId: enrollment.id,
                userId: enrollment.userId,
                certificateCode: code,
                title: enrollment.cohort.programme.title,
                verificationUrl: certificateUrl(code),
              },
            });
            await tx.auditLog.create({
              data: {
                userId: adminUserId,
                action: "CERTIFICATE_ISSUED",
                entityType: "ENROLLMENT",
                entityId: enrollment.id,
                details: {
                  certificateCode: code,
                  cohortCode: enrollment.cohort.cohortCode,
                  studentId: enrollment.userId,
                },
              },
            });
          }

          return { enrollment, certificate, newlyIssued };
        });

        if (outcome.newlyIssued) {
          await notificationService.sendCertificateIssued({
            studentName: outcome.enrollment.user.name,
            studentEmail: outcome.enrollment.user.email,
            programmeTitle: outcome.enrollment.cohort.programme.title,
            cohortCode: outcome.enrollment.cohort.cohortCode,
            certificateCode: outcome.certificate.certificateCode,
          });
        }

        return {
          enrollmentId: outcome.enrollment.id,
          certificateCode: outcome.certificate.certificateCode,
          newlyIssued: outcome.newlyIssued,
        };
      } catch (err) {
        // A clash on the random code (or a double click) aborts the transaction; try again.
        if (isUniqueViolation(err) && attempt < 3) continue;
        throw err;
      }
    }
  },

  /** Marks every student with a confirmed seat in the cohort as completed. */
  async completeCohort(cohortId: string, adminUserId: string | undefined) {
    const cohort = await prisma.cohort.findUnique({
      where: { id: cohortId },
      select: { id: true, cohortCode: true },
    });
    if (!cohort) throw AppError.notFound("Cohort not found.");

    const active = await prisma.enrollment.findMany({
      where: { cohortId, status: "ACTIVE", deletedAt: null },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });

    let issued = 0;
    const failed: { enrollmentId: string; reason: string }[] = [];
    for (const { id } of active) {
      try {
        const result = await certificateService.completeEnrollment(id, adminUserId);
        if (result.newlyIssued) issued++;
      } catch (err) {
        logger.error({ err, enrollmentId: id }, "Could not complete enrolment");
        failed.push({
          enrollmentId: id,
          reason: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return {
      cohortCode: cohort.cohortCode,
      completed: active.length - failed.length,
      certificatesIssued: issued,
      failed,
    };
  },

  /** Public lookup for the verification page. Returns only what is printed on the certificate. */
  async verify(code: string) {
    const certificate = await prisma.certificate.findUnique({
      where: { certificateCode: code.toUpperCase() },
      include: {
        user: { select: { name: true } },
        enrollment: {
          select: {
            cohort: {
              select: {
                name: true,
                cohortCode: true,
                durationWeeks: true,
                startDate: true,
                endDate: true,
                mode: true,
                programme: { select: { title: true, slug: true } },
              },
            },
          },
        },
      },
    });
    if (!certificate) return null;

    const cohort = certificate.enrollment.cohort;
    return {
      certificateCode: certificate.certificateCode,
      holderName: certificate.user.name,
      title: certificate.title,
      programmeTitle: cohort.programme.title,
      programmeSlug: cohort.programme.slug,
      cohortName: cohort.name,
      cohortCode: cohort.cohortCode,
      durationWeeks: cohort.durationWeeks,
      mode: cohort.mode,
      startDate: cohort.startDate,
      endDate: cohort.endDate,
      issuedAt: certificate.issuedAt,
      revokedAt: certificate.revokedAt,
      valid: !certificate.revokedAt,
    };
  },
};
