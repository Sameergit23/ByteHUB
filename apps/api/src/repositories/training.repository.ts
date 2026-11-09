import { prisma } from "../lib/prisma.js";
import { Prisma } from "@prisma/client";

export class TrainingRepository {
  /**
   * Find all published programmes along with their active cohorts and track info.
   */
  async findPublished(trackSlug?: string) {
    return prisma.programme.findMany({
      where: {
        published: true,
        ...(trackSlug ? { track: { slug: trackSlug } } : {}),
      },
      include: {
        track: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
        cohorts: {
          where: { published: true },
          orderBy: { startDate: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Find a programme by either its unique slug or UUID.
   */
  async findByIdOrSlug(idOrSlug: string) {
    return prisma.programme.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        published: true,
      },
      include: {
        track: true,
        cohorts: {
          where: { published: true },
          orderBy: { startDate: "asc" },
        },
      },
    });
  }

  /**
   * Find a single cohort with programme info.
   */
  async findCohortById(cohortId: string) {
    return prisma.cohort.findUnique({
      where: { id: cohortId },
      include: {
        programme: true,
      },
    });
  }

  /**
   * Find existing enrollment for user in cohort.
   */
  async findUserEnrollment(userId: string, cohortId: string) {
    return prisma.enrollment.findFirst({
      where: {
        userId,
        cohortId,
        status: { in: ["PENDING", "ACTIVE"] },
      },
      include: {
        cohort: {
          include: { programme: true },
        },
      },
    });
  }

  /**
   * Find enrollment by ID with full cohort and programme details.
   */
  async findEnrollmentById(enrollmentId: string) {
    return prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        cohort: {
          include: { programme: true },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Atomically reserve a seat using an ACID transaction with row-level decrement.
   * If seatsLeft <= 0, the atomic conditional update returns 0 rows updated,
   * completely preventing race conditions.
   */
  async reserveSeatAtomic(params: {
    userId: string;
    cohortId: string;
    reservationMinutes?: number;
  }) {
    const { userId, cohortId, reservationMinutes = 15 } = params;

    return prisma.$transaction(async (tx) => {
      // 1. Fetch cohort with lock or check status
      const cohort = await tx.cohort.findUnique({
        where: { id: cohortId },
        include: { programme: true },
      });

      if (!cohort || !cohort.published) {
        throw new Error("COHORT_NOT_FOUND");
      }

      // 2. Check for active or unexpired pending enrollment
      const existing = await tx.enrollment.findFirst({
        where: {
          userId,
          cohortId,
          OR: [
            { status: "ACTIVE" },
            {
              status: "PENDING",
              reservedUntil: { gt: new Date() },
            },
          ],
        },
      });

      if (existing) {
        return {
          alreadyEnrolled: true,
          enrollment: existing,
          cohort,
        };
      }

      // 3. Atomically decrement seats if seatsLeft > 0
      // In PostgreSQL: UPDATE "Cohort" SET "seatsLeft" = "seatsLeft" - 1 WHERE id = $1 AND "seatsLeft" > 0 RETURNING *
      const updatedCount = await tx.$executeRaw`
        UPDATE "Cohort"
        SET "seatsLeft" = "seatsLeft" - 1, "updatedAt" = NOW()
        WHERE "id" = ${cohortId} AND "seatsLeft" > 0 AND "published" = true;
      `;

      if (updatedCount === 0) {
        throw new Error("SEATS_EXHAUSTED");
      }

      const isFree = cohort.priceAmount === 0;
      const reservedUntil = isFree
        ? null
        : new Date(Date.now() + reservationMinutes * 60 * 1000);

      // 4. Create enrollment record
      const enrollment = await tx.enrollment.create({
        data: {
          userId,
          cohortId,
          priceAmount: cohort.priceAmount,
          currency: cohort.currency,
          status: isFree ? "ACTIVE" : "PENDING",
          reservedUntil,
        },
        include: {
          cohort: {
            include: { programme: true },
          },
        },
      });

      return {
        alreadyEnrolled: false,
        enrollment,
        cohort,
      };
    });
  }

  /**
   * Expire reservations that have passed their reservedUntil timestamp and are still PENDING.
   * Atomically restores seatsLeft on each associated cohort.
   */
  async expireUnpaidReservations() {
    const now = new Date();

    return prisma.$transaction(async (tx) => {
      // Find all expired pending reservations
      const expiredEnrollments = await tx.enrollment.findMany({
        where: {
          status: "PENDING",
          reservedUntil: { lt: now },
        },
      });

      if (expiredEnrollments.length === 0) {
        return { expiredCount: 0 };
      }

      const cohortIdsToRestore: Record<string, number> = {};
      const enrollmentIdsToUpdate: string[] = [];

      for (const e of expiredEnrollments) {
        enrollmentIdsToUpdate.push(e.id);
        cohortIdsToRestore[e.cohortId] = (cohortIdsToRestore[e.cohortId] || 0) + 1;
      }

      // Batch update status to EXPIRED
      await tx.enrollment.updateMany({
        where: { id: { in: enrollmentIdsToUpdate } },
        data: { status: "EXPIRED" },
      });

      // Restore seatsLeft for each cohort
      for (const [cohortId, count] of Object.entries(cohortIdsToRestore)) {
        await tx.$executeRaw`
          UPDATE "Cohort"
          SET "seatsLeft" = LEAST("seatsTotal", "seatsLeft" + ${count}), "updatedAt" = NOW()
          WHERE "id" = ${cohortId};
        `;
      }

      return { expiredCount: expiredEnrollments.length };
    });
  }
}

export const trainingRepository = new TrainingRepository();
