import { prisma } from "../lib/prisma.js";
import { logger } from "../utils/logger.js";

/**
 * Background job to ensure database seat counts match verified enrollments
 */
export async function runSeatReconciliation(): Promise<{ reconciledCount: number }> {
  logger.info("Executing Seat Reconciliation Job...");

  const cohorts = await prisma.cohort.findMany({
    include: {
      _count: {
        select: { enrollments: { where: { status: "ACTIVE" } } },
      },
    },
  });

  let reconciledCount = 0;

  for (const c of cohorts) {
    const expectedSeatsLeft = Math.max(0, c.seatsTotal - c._count.enrollments);
    if (c.seatsLeft !== expectedSeatsLeft) {
      await prisma.cohort.update({
        where: { id: c.id },
        data: { seatsLeft: expectedSeatsLeft },
      });
      reconciledCount++;
      logger.warn(
        { cohortId: c.id, previous: c.seatsLeft, corrected: expectedSeatsLeft },
        "Reconciled cohort seat discrepancy"
      );
    }
  }

  logger.info({ reconciledCount }, "Seat Reconciliation Job Completed");
  return { reconciledCount };
}
