import { prisma } from "../lib/prisma.js";
import { PaymentProvider } from "@bytehub/shared";

export class PaymentRepository {
  async findByIdempotencyKey(key: string) {
    return prisma.payment.findUnique({
      where: { idempotencyKey: key },
    });
  }

  async findByOrderId(orderId: string) {
    return prisma.payment.findUnique({
      where: { orderId },
    });
  }

  async create(data: {
    orderId: string;
    userId: string;
    programId: string;
    provider: PaymentProvider;
    amount: number;
    currency: string;
    idempotencyKey: string;
  }) {
    return prisma.payment.create({
      data: {
        orderId: data.orderId,
        userId: data.userId,
        programId: data.programId,
        provider: data.provider as any,
        amount: data.amount,
        currency: data.currency,
        status: "PENDING",
        idempotencyKey: data.idempotencyKey,
      },
    });
  }

  async findUserHistory(userId: string) {
    return prisma.payment.findMany({
      where: { userId },
      include: {
        program: {
          select: {
            title: true,
            track: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async listAllForAudit(limit = 100) {
    return prisma.payment.findMany({
      take: limit,
      include: {
        user: { select: { name: true, email: true } },
        program: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

export const paymentRepository = new PaymentRepository();

