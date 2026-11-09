import { prisma } from "../lib/prisma.js";
import { UserRole } from "@bytehub/shared";

export class UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationName: true,
        createdAt: true,
      },
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async create(data: {
    email: string;
    passwordHash: string;
    name: string;
    role: UserRole;
    organizationName?: string | null;
  }) {
    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        name: data.name,
        role: data.role as any,
        organizationName: data.organizationName,
      },
    });
  }

  async listAll(limit = 100) {
    return prisma.user.findMany({
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationName: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

export const userRepository = new UserRepository();
