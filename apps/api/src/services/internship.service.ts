import { internshipRepository } from "../repositories/internship.repository.js";
import { AppError } from "../utils/apiError.js";
import {
  CreateInternshipInput,
  UpdateInternshipInput,
  InternshipFilter,
} from "@bytehub/shared";

export class InternshipService {
  async listInternships(filters: InternshipFilter) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      status: "PUBLISHED",
    };

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.minStipend) {
      where.stipend = { gte: filters.minStipend };
    }

    if (filters.skill) {
      where.skills = { has: filters.skill };
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { companyName: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      internshipRepository.findMany(where, skip, limit),
      internshipRepository.count(where),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getInternshipById(id: string) {
    const internship = await internshipRepository.findById(id);
    if (!internship) {
      throw AppError.notFound("Internship posting not found");
    }
    return internship;
  }

  async createInternship(companyId: string, input: CreateInternshipInput) {
    return internshipRepository.create(companyId, input);
  }

  async updateInternship(
    id: string,
    userId: string,
    userRole: string,
    input: UpdateInternshipInput
  ) {
    const existing = await internshipRepository.findById(id);
    if (!existing) {
      throw AppError.notFound("Internship posting not found");
    }

    if (userRole !== "ADMIN" && existing.companyId !== userId) {
      throw AppError.forbidden("You may only modify internship postings authored by your organization");
    }

    return internshipRepository.update(id, input);
  }
}

export const internshipService = new InternshipService();

