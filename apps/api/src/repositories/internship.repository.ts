import { prisma } from "../lib/prisma.js";
import { CreateInternshipInput, UpdateInternshipInput } from "@bytehub/shared";

export class InternshipRepository {
  async findMany(where: Record<string, unknown>, skip: number, take: number) {
    return prisma.internship.findMany({
      where: where as any,
      skip,
      take,
      orderBy: { createdAt: "desc" },
    });
  }

  async count(where: Record<string, unknown>) {
    return prisma.internship.count({ where: where as any });
  }

  async findById(id: string) {
    return prisma.internship.findUnique({
      where: { id },
    });
  }

  async create(companyId: string, data: CreateInternshipInput) {
    return prisma.internship.create({
      data: {
        companyId,
        title: data.title,
        companyName: data.companyName,
        location: data.location,
        type: data.type,
        stipend: data.stipend,
        currency: data.currency,
        durationMonths: data.durationMonths,
        description: data.description,
        requirements: data.requirements,
        perks: data.perks,
        openings: data.openings,
        deadline: new Date(data.deadline),
        skills: data.skills,
        status: "PUBLISHED",
      },
    });
  }

  async update(id: string, data: UpdateInternshipInput) {
    const payload: Record<string, unknown> = { ...data };
    if (data.deadline) {
      payload.deadline = new Date(data.deadline);
    }
    return prisma.internship.update({
      where: { id },
      data: payload as any,
    });
  }
}

export const internshipRepository = new InternshipRepository();

