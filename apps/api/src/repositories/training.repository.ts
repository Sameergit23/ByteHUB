import { prisma } from "../lib/prisma.js";

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
   * All enrolments of one student with cohort, programme and certificate (dashboard view).
   */
  async findEnrollmentsForUser(userId: string) {
    return prisma.enrollment.findMany({
      where: {
        userId,
        deletedAt: null,
        status: { in: ["PENDING", "ACTIVE", "COMPLETED"] },
      },
      include: {
        cohort: { include: { programme: true } },
        certificate: true,
      },
      orderBy: { createdAt: "desc" },
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

      // 2. One enrolment row exists per (student, cohort); look at whatever is there.
      const existing = await tx.enrollment.findFirst({
        where: { userId, cohortId },
      });

      const now = new Date();
      const isFree = cohort.priceAmount === 0;
      const reservedUntil = isFree
        ? null
        : new Date(Date.now() + reservationMinutes * 60 * 1000);
      const holdIsLive =
        existing?.status === "PENDING" &&
        !!existing.reservedUntil &&
        existing.reservedUntil > now;

      if (
        existing &&
        (existing.status === "ACTIVE" || existing.status === "COMPLETED" || holdIsLive)
      ) {
        return {
          alreadyEnrolled: true,
          enrollment: existing,
          cohort,
        };
      }

      // A lapsed PENDING hold that the expiry job has not swept yet still owns its seat,
      // so it can simply be extended. Anything else needs a fresh seat from the pool.
      const stillHoldsSeat = existing?.status === "PENDING";

      if (!stillHoldsSeat) {
        // 3. Atomically decrement seats if seatsLeft > 0 (conditional update prevents overbooking)
        const updatedCount = await tx.$executeRaw`
          UPDATE "Cohort"
          SET "seatsLeft" = "seatsLeft" - 1, "updatedAt" = NOW()
          WHERE "id" = ${cohortId} AND "seatsLeft" > 0 AND "published" = true;
        `;

        if (updatedCount === 0) {
          throw new Error("SEATS_EXHAUSTED");
        }
      }

      // 4. Create the enrolment, or revive the student's earlier (expired/cancelled) one
      const data = {
        priceAmount: cohort.priceAmount,
        currency: cohort.currency,
        status: (isFree ? "ACTIVE" : "PENDING") as "ACTIVE" | "PENDING",
        reservedUntil,
      };

      const enrollment = existing
        ? await tx.enrollment.update({
            where: { id: existing.id },
            data: { ...data, paymentId: null, deletedAt: null },
            include: { cohort: { include: { programme: true } } },
          })
        : await tx.enrollment.create({
            data: { userId, cohortId, ...data },
            include: { cohort: { include: { programme: true } } },
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
