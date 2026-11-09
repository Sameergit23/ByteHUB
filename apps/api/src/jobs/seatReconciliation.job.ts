import { prisma } from "../lib/prisma.js";
import { logger } from "../utils/logger.js";

/**
 * Background job to ensure database seat counts match verified enrollments
 */
export async function runSeatReconciliation(): Promise<{ reconciledCount: number }> {
  logger.info("Executing Seat Reconciliation Job...");

  const programs = await prisma.trainingProgram.findMany({
    include: {
      _count: {
        select: { enrollments: { where: { status: "ACTIVE" } } },
      },
    },
  });

  let reconciledCount = 0;

  for (const prog of programs) {
    const expectedSeatsLeft = Math.max(0, prog.seatsTotal - prog._count.enrollments);
    if (prog.seatsLeft !== expectedSeatsLeft) {
      await prisma.trainingProgram.update({
        where: { id: prog.id },
        data: { seatsLeft: expectedSeatsLeft },
      });
      reconciledCount++;
      logger.warn(
        { programId: prog.id, previous: prog.seatsLeft, corrected: expectedSeatsLeft },
        "Reconciled cohort seat discrepancy"
      );
    }
  }

  logger.info({ reconciledCount }, "Seat Reconciliation Job Completed");
  return { reconciledCount };
}

