import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/apiError.js";
import {
  CreateInternshipInput,
  UpdateInternshipInput,
  InternshipFilter,
} from "@bytehub/shared";

export class InternshipService {
  /**
   * List internships with filters & cursor pagination
   */
  async listInternships(filters: InternshipFilter) {
    const limit = Math.min(filters.limit || 10, 50);

    const where: Prisma.InternshipWhereInput = {
      status: "PUBLISHED",
      deletedAt: null,
    };

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.trackId) {
      where.trackId = filters.trackId;
    }

    if (filters.minStipend) {
      where.stipendAmount = { gte: filters.minStipend * 100 }; // convert to paise if passed in INR
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

    const queryOptions: Prisma.InternshipFindManyArgs = {
      where,
      take: limit + 1, // Take one extra to determine nextCursor
      orderBy: { createdAt: "desc" },
      include: {
        track: true,
      },
    };

    if (filters.cursor) {
      queryOptions.cursor = { id: filters.cursor };
      queryOptions.skip = 1;
    }

    const items = await prisma.internship.findMany(queryOptions);

    let nextCursor: string | null = null;
    if (items.length > limit) {
      const nextItem = items.pop();
      nextCursor = nextItem ? nextItem.id : null;
    }

    const total = await prisma.internship.count({ where });

    return {
      items,
      nextCursor,
      total,
    };
  }

  /**
   * A company's own postings (any status) with how many candidates applied to each.
   */
  async listCompanyInternships(companyId: string) {
    return prisma.internship.findMany({
      where: { companyId, deletedAt: null },
      include: {
        track: { select: { id: true, slug: true, name: true } },
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Detail by slug or UUID
   */
  async getInternshipBySlugOrId(slugOrId: string) {
    const internship = await prisma.internship.findFirst({
      where: {
        OR: [{ slug: slugOrId }, { id: slugOrId }],
        deletedAt: null,
        status: "PUBLISHED",
      },
      include: {
        track: true,
        company: {
          select: {
            id: true,
            name: true,
            organizationName: true,
            companyProfile: true,
          },
        },
      },
    });

    if (!internship) {
      throw AppError.notFound("Internship opening not found.");
    }

    return internship;
  }

  /**
   * Company creates internship (defaults to DRAFT pending Admin approval)
   */
  async createInternship(
    companyId: string,
    userRole: string,
    input: CreateInternshipInput
  ) {
    const slug =
      input.title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") + `-${Date.now().toString(36)}`;

    const status = userRole === "ADMIN" ? "PUBLISHED" : "DRAFT";

    return prisma.internship.create({
      data: {
        companyId,
        slug,
        title: input.title,
        companyName: input.companyName,
        location: input.location,
        type: input.type,
        stipendAmount: input.stipend * 100, // stored in paise
        currency: input.currency,
        durationMonths: input.durationMonths,
        description: input.description,
        whatYouWillDo: input.whatYouWillDo || [],
        requirements: input.requirements,
        skills: input.skills,
        openings: input.openings,
        deadline: new Date(input.deadline),
        trackId: input.trackId || null,
        status,
      },
    });
  }

  /**
   * Company edits only their own internship
   */
  async updateInternship(
    id: string,
    userId: string,
    userRole: string,
    input: UpdateInternshipInput
  ) {
    const existing = await prisma.internship.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw AppError.notFound("Internship posting not found.");
    }

    if (userRole !== "ADMIN" && existing.companyId !== userId) {
      throw AppError.forbidden(
        "Access denied: You may only modify postings created by your organization."
      );
    }

    const { stipend, deadline, ...rest } = input;
    const data: Prisma.InternshipUncheckedUpdateInput = {
      ...rest,
      ...(stipend !== undefined ? { stipendAmount: stipend * 100 } : {}),
      ...(deadline ? { deadline: new Date(deadline) } : {}),
    };

    // Non-admins cannot self-approve to PUBLISHED
    if (userRole !== "ADMIN" && data.status === "PUBLISHED") {
      delete data.status;
    }

    return prisma.internship.update({
      where: { id },
      data,
    });
  }

  /**
   * Admin approves internship before it goes public
   */
  async approveInternship(id: string) {
    const existing = await prisma.internship.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw AppError.notFound("Internship posting not found.");
    }

    return prisma.internship.update({
      where: { id },
      data: { status: "PUBLISHED" },
    });
  }
}

export const internshipService = new InternshipService();
