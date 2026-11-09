import { trainingRepository } from "../repositories/training.repository.js";
import { AppError } from "../utils/apiError.js";
import { DEFAULT_PROGRAMS } from "../routes/training.routes.js";

export class TrainingService {
  async listPrograms() {
    try {
      const items = await trainingRepository.findPublished();
      if (items.length > 0) return items;
    } catch {
      // Fallback to static editorial seeds
    }
    return DEFAULT_PROGRAMS;
  }

  async getProgram(slugOrId: string) {
    try {
      const program = await trainingRepository.findByIdOrSlug(slugOrId);
      if (program) return program;
    } catch {
      // Fallback
    }

    const fallback = DEFAULT_PROGRAMS.find(
      (p) => p.id === slugOrId || p.slug === slugOrId
    );

    if (!fallback) {
      throw AppError.notFound("Training program track not found");
    }

    return fallback;
  }
}

export const trainingService = new TrainingService();
