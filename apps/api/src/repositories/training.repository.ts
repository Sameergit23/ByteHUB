import { prisma } from "../lib/prisma.js";

export class TrainingRepository {
  async findPublished() {
    return prisma.trainingProgram.findMany({
      where: { published: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async findByIdOrSlug(idOrSlug: string) {
    return prisma.trainingProgram.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
    });
  }

  async decrementSeats(programId: string) {
    return prisma.trainingProgram.update({
      where: { id: programId },
      data: { seatsLeft: { decrement: 1 } },
    });
  }
}

export const trainingRepository = new TrainingRepository();

