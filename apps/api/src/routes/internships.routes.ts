import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { authenticateJWT, requireRoles } from "../middleware/auth.js";
import {
  CreateInternshipSchema,
  UpdateInternshipSchema,
  InternshipFilterSchema,
} from "@bytehub/shared";

export const internshipsRouter = Router();

internshipsRouter.get(
  "/",
  validateQuery(InternshipFilterSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { search, type, minStipend, skill, page, limit } = req.query as any;

    const skip = (page - 1) * limit;

    const where: any = {
      status: "PUBLISHED",
    };

    if (type) {
      where.type = type;
    }

    if (minStipend) {
      where.stipend = { gte: minStipend };
    }

    if (skill) {
      where.skills = { has: skill };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { companyName: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.internship.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.internship.count({ where }),
    ]);

    res.status(200).json({
      status: "success",
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }
);

internshipsRouter.get("/:id", async (req: Request, res: Response): Promise<void> => {
  const internship = await prisma.internship.findUnique({
    where: { id: req.params.id },
  });

  if (!internship) {
    res.status(404).json({
      status: "fail",
      code: "NOT_FOUND",
      message: "Internship post not found",
    });
    return;
  }

  res.status(200).json({
    status: "success",
    data: internship,
  });
});

internshipsRouter.post(
  "/",
  authenticateJWT,
  requireRoles("COMPANY", "ADMIN"),
  validateBody(CreateInternshipSchema),
  async (req: Request, res: Response): Promise<void> => {
    const data = req.body;

    const internship = await prisma.internship.create({
      data: {
        ...data,
        deadline: new Date(data.deadline),
        companyId: req.user!.userId,
      },
    });

    res.status(201).json({
      status: "success",
      data: internship,
    });
  }
);

internshipsRouter.patch(
  "/:id",
  authenticateJWT,
  requireRoles("COMPANY", "ADMIN"),
  validateBody(UpdateInternshipSchema),
  async (req: Request, res: Response): Promise<void> => {
    const existing = await prisma.internship.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      res.status(404).json({
        status: "fail",
        code: "NOT_FOUND",
        message: "Internship post not found",
      });
      return;
    }

    if (req.user!.role !== "ADMIN" && existing.companyId !== req.user!.userId) {
      res.status(403).json({
        status: "fail",
        code: "FORBIDDEN",
        message: "You can only edit your own internship posts",
      });
      return;
    }

    const updatePayload: any = { ...req.body };
    if (updatePayload.deadline) {
      updatePayload.deadline = new Date(updatePayload.deadline);
    }

    const updated = await prisma.internship.update({
      where: { id: req.params.id },
      data: updatePayload,
    });

    res.status(200).json({
      status: "success",
      data: updated,
    });
  }
);
