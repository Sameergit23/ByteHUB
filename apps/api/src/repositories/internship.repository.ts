import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { CreateInternshipInput, UpdateInternshipInput } from "@bytehub/shared";

export class InternshipRepository {
  async findMany(where: Prisma.InternshipWhereInput, skip: number, take: number) {
    return prisma.internship.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
    });
  }

  async count(where: Prisma.InternshipWhereInput) {
    return prisma.internship.count({ where });
  }

  async findById(id: string) {
    return prisma.internship.findUnique({
      where: { id },
    });
  }

  async create(companyId: string, data: CreateInternshipInput) {
    const slug = `${data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;
    return prisma.internship.create({
      data: {
        companyId,
        slug,
        title: data.title,
        companyName: data.companyName,
        location: data.location,
        type: data.type,
        stipendAmount: data.stipend,
        currency: data.currency,
        durationMonths: data.durationMonths,
        description: data.description,
        whatYouWillDo: data.whatYouWillDo || [],
        requirements: data.requirements,
        skills: data.skills || [],
        openings: data.openings || 1,
        deadline: new Date(data.deadline),
        status: "PUBLISHED",
      },
    });
  }

  async update(id: string, data: UpdateInternshipInput) {
    const payload: Record<string, unknown> = { ...data };
    if (data.deadline) {
      payload.deadline = new Date(data.deadline);
    }
    if (data.stipend !== undefined) {
      payload.stipendAmount = data.stipend;
      delete payload.stipend;
    }
    return prisma.internship.update({
      where: { id },
      data: payload as Prisma.InternshipUncheckedUpdateInput,
    });
  }
}

export const internshipRepository = new InternshipRepository();
