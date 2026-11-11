import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import {
  PaymentStatus,
  validateStateTransition,
  PaymentStatusType,
} from "../utils/paymentStateMachine.js";
import { AppError } from "../utils/apiError.js";

export class PaymentRepository {
  async findByIdempotencyKey(key: string) {
    return prisma.payment.findUnique({
      where: { idempotencyKey: key },
      include: {
        cohort: {
          include: { programme: true },
        },
        application: {
          include: {
            internship: {
              select: { id: true, title: true, companyName: true, slug: true },
            },
          },
        },
      },
    });
  }

  async findByOrderId(orderId: string) {
    return prisma.payment.findUnique({
      where: { orderId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        cohort: {
          include: { programme: true },
        },
        application: {
          include: {
            internship: {
              select: { id: true, title: true, companyName: true, slug: true },
            },
          },
        },
        refunds: true,
      },
    });
  }

  async findById(paymentId: string) {
    return prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        cohort: {
          include: { programme: true },
        },
        application: {
          include: {
            internship: {
              select: { id: true, title: true, companyName: true, slug: true },
            },
          },
        },
        refunds: true,
      },
    });
  }

  async create(data: {
    orderId: string;
    userId: string;
    /** Set for a training seat. */
    cohortId?: string | null;
    /** Set for an internship registration fee. */
    applicationId?: string | null;
    provider: "CASHFREE" | "RAZORPAY" | "STRIPE";
    amount: number;
    currency: string;
    idempotencyKey: string;
    metadata?: Prisma.InputJsonObject;
  }) {
    return prisma.payment.create({
      data: {
        orderId: data.orderId,
        userId: data.userId,
        cohortId: data.cohortId ?? null,
        applicationId: data.applicationId ?? null,
        provider: data.provider,
        amount: data.amount,
        currency: data.currency,
        status: PaymentStatus.CREATED,
        idempotencyKey: data.idempotencyKey,
        metadata: data.metadata || {},
      },
      include: {
        cohort: {
          include: { programme: true },
        },
        application: {
          include: {
            internship: {
              select: { id: true, title: true, companyName: true, slug: true },
            },
          },
        },
      },
    });
  }

  async updateStatus(
    paymentId: string,
    newStatus: PaymentStatusType,
    extraData?: {
      gatewayPaymentId?: string;
      gatewaySignature?: string;
    }
  ) {
    const existing = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!existing) {
      throw AppError.notFound(`Payment ${paymentId} not found`);
    }

    // Validate legal transition
    validateStateTransition(
      existing.status as PaymentStatusType,
      newStatus,
      existing.orderId
    );

    return prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: newStatus,
        ...(extraData?.gatewayPaymentId
          ? { gatewayPaymentId: extraData.gatewayPaymentId }
          : {}),
        ...(extraData?.gatewaySignature
          ? { gatewaySignature: extraData.gatewaySignature }
          : {}),
      },
    });
  }

  // --- Webhook Event Deduplication ---
  async findPaymentEventByEventId(eventId: string) {
    return prisma.paymentEvent.findUnique({
      where: { eventId },
    });
  }

  async recordPaymentEvent(data: {
    paymentId?: string;
    provider: "CASHFREE" | "RAZORPAY" | "STRIPE";
    eventType: string;
    eventId: string;
    rawPayload: Prisma.InputJsonValue;
    signatureHeader?: string;
    processed?: boolean;
    processingError?: string;
  }) {
    return prisma.paymentEvent.create({
      data: {
        paymentId: data.paymentId,
        provider: data.provider,
        eventType: data.eventType,
        eventId: data.eventId,
        rawPayload: data.rawPayload,
        signatureHeader: data.signatureHeader,
        processed: data.processed || false,
        processingError: data.processingError,
      },
    });
  }

  async markPaymentEventProcessed(eventId: string, error?: string) {
    return prisma.paymentEvent.update({
      where: { eventId },
      data: {
        processed: !error,
        processingError: error,
      },
    });
  }

  // --- ACID Transaction: Fulfill Payment and Activate Enrollment ---
  // A training payment activates the seat; an internship fee payment submits the application.
  async fulfillPaymentAndEnrolment(params: {
    paymentId: string;
    orderId: string;
    userId: string;
    gatewayPaymentId: string;
    gatewaySignature?: string;
    eventId?: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch current payment with row locking
      const payment = await tx.payment.findUnique({
        where: { id: params.paymentId },
      });

      if (!payment) {
        throw new Error("PAYMENT_NOT_FOUND");
      }

      // Check state transition
      validateStateTransition(
        payment.status as PaymentStatusType,
        PaymentStatus.PAID,
        params.orderId
      );

      // 2. Transition payment to PAID
      const updatedPayment = await tx.payment.update({
        where: { id: params.paymentId },
        data: {
          status: PaymentStatus.PAID,
          gatewayPaymentId: params.gatewayPaymentId,
          gatewaySignature: params.gatewaySignature,
        },
      });

      // 3a. Internship registration fee: the application now reaches the admin team.
      if (payment.applicationId) {
        const application = await tx.application.findUnique({
          where: { id: payment.applicationId },
        });
        if (application?.status === "PENDING_PAYMENT") {
          await tx.application.update({
            where: { id: application.id },
            data: { status: "SUBMITTED" },
          });
        }

        if (params.eventId) {
          await tx.paymentEvent.updateMany({
            where: { eventId: params.eventId },
            data: { processed: true, paymentId: updatedPayment.id },
          });
        }

        await tx.auditLog.create({
          data: {
            userId: params.userId,
            action: "PAYMENT_CAPTURED",
            entityType: "PAYMENT",
            entityId: updatedPayment.id,
            details: {
              orderId: params.orderId,
              gatewayPaymentId: params.gatewayPaymentId,
              amount: updatedPayment.amount,
              currency: updatedPayment.currency,
              applicationId: payment.applicationId,
              applicationStatusBefore: application?.status ?? null,
            },
          },
        });

        return { payment: updatedPayment, enrollment: null };
      }

      // 3b. Training seat: find or update the enrolment.
      const cohortId = payment.cohortId;
      if (!cohortId) {
        throw new Error("PAYMENT_HAS_NO_COHORT_OR_APPLICATION");
      }
      let enrollment = await tx.enrollment.findFirst({
        where: {
          userId: params.userId,
          cohortId,
        },
      });

      if (enrollment) {
        // If the hold had already lapsed its seat went back to the pool; take one again.
        if (enrollment.status === "EXPIRED" || enrollment.status === "CANCELLED") {
          await tx.$executeRaw`
            UPDATE "Cohort"
            SET "seatsLeft" = GREATEST(0, "seatsLeft" - 1), "updatedAt" = NOW()
            WHERE "id" = ${cohortId};
          `;
        }

        enrollment = await tx.enrollment.update({
          where: { id: enrollment.id },
          data: {
            status: "ACTIVE",
            paymentId: updatedPayment.id,
            reservedUntil: null,
          },
        });
      } else {
        // Create active enrollment if direct payment
        enrollment = await tx.enrollment.create({
          data: {
            userId: params.userId,
            cohortId,
            paymentId: updatedPayment.id,
            status: "ACTIVE",
            priceAmount: updatedPayment.amount,
            currency: updatedPayment.currency,
            reservedUntil: null,
          },
        });
      }

      // 4. Mark event processed if present
      if (params.eventId) {
        await tx.paymentEvent.updateMany({
          where: { eventId: params.eventId },
          data: { processed: true, paymentId: updatedPayment.id },
        });
      }

      // 5. Create Audit Log
      await tx.auditLog.create({
        data: {
          userId: params.userId,
          action: "PAYMENT_CAPTURED",
          entityType: "PAYMENT",
          entityId: updatedPayment.id,
          details: {
            orderId: params.orderId,
            gatewayPaymentId: params.gatewayPaymentId,
            amount: updatedPayment.amount,
            currency: updatedPayment.currency,
            cohortId,
            enrollmentId: enrollment.id,
          },
        },
      });

      return { payment: updatedPayment, enrollment };
    });
  }

  // --- ACID Transaction: Fail Payment and Release Seat ---
  async failPaymentAndReleaseSeat(params: {
    paymentId: string;
    orderId: string;
    reason: string;
    eventId?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: params.paymentId },
      });

      if (!payment) return null;

      // Validate transition to FAILED
      validateStateTransition(
        payment.status as PaymentStatusType,
        PaymentStatus.FAILED,
        params.orderId
      );

      const updatedPayment = await tx.payment.update({
        where: { id: params.paymentId },
        data: { status: PaymentStatus.FAILED },
      });

      // Find pending enrollment and release (internship fee payments hold no seat;
      // their application simply stays "awaiting payment" so the student can try again)
      const enrollment = payment.cohortId
        ? await tx.enrollment.findFirst({
            where: {
              userId: payment.userId,
              cohortId: payment.cohortId,
              status: "PENDING",
            },
          })
        : null;

      if (enrollment) {
        await tx.enrollment.update({
          where: { id: enrollment.id },
          data: { status: "EXPIRED" },
        });

        // Atomically restore seat
        await tx.$executeRaw`
          UPDATE "Cohort"
          SET "seatsLeft" = LEAST("seatsTotal", "seatsLeft" + 1), "updatedAt" = NOW()
          WHERE "id" = ${payment.cohortId};
        `;
      }

      if (params.eventId) {
        await tx.paymentEvent.updateMany({
          where: { eventId: params.eventId },
          data: { processed: true, processingError: params.reason },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: payment.userId,
          action: "PAYMENT_FAILED",
          entityType: "PAYMENT",
          entityId: updatedPayment.id,
          details: {
            orderId: params.orderId,
            reason: params.reason,
            cohortId: payment.cohortId,
            applicationId: payment.applicationId,
          },
        },
      });

      return updatedPayment;
    });
  }

  // --- ACID Transaction: Issue Partial or Full Refund ---
  async processRefund(params: {
    paymentId: string;
    adminUserId: string;
    amount: number; // Smallest unit
    reason: string;
    gatewayRefundId: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: params.paymentId },
        include: { refunds: true },
      });

      if (!payment) {
        throw AppError.notFound("Payment record not found");
      }

      if (payment.status !== "PAID" && payment.status !== "PARTIALLY_REFUNDED") {
        throw AppError.badRequest(
          `Cannot refund payment in '${payment.status}' status. Only PAID or PARTIALLY_REFUNDED payments can be refunded.`
        );
      }

      // Calculate total already refunded
      const totalRefundedSoFar = payment.refunds.reduce(
        (sum, r) => sum + (r.status === "PROCESSED" ? r.amount : 0),
        0
      );
      const remainingBalance = payment.amount - totalRefundedSoFar;

      if (params.amount <= 0 || params.amount > remainingBalance) {
        throw AppError.badRequest(
          `Refund amount (${params.amount}) exceeds remaining refundable balance (${remainingBalance}).`
        );
      }

      // Create Refund record
      const refund = await tx.refund.create({
        data: {
          paymentId: payment.id,
          amount: params.amount,
          currency: payment.currency,
          reason: params.reason,
          gatewayRefundId: params.gatewayRefundId,
          status: "PROCESSED",
        },
      });

      const isFullRefund = totalRefundedSoFar + params.amount === payment.amount;
      const nextStatus = isFullRefund
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PARTIALLY_REFUNDED;

      // Update payment status
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: nextStatus },
      });

      // If full refund: cancel enrollment and release seat back to cohort
      if (isFullRefund && payment.cohortId) {
        const enrollment = await tx.enrollment.findFirst({
          where: {
            userId: payment.userId,
            cohortId: payment.cohortId,
          },
        });

        if (enrollment) {
          await tx.enrollment.update({
            where: { id: enrollment.id },
            data: { status: "CANCELLED" },
          });

          await tx.$executeRaw`
            UPDATE "Cohort"
            SET "seatsLeft" = LEAST("seatsTotal", "seatsLeft" + 1), "updatedAt" = NOW()
            WHERE "id" = ${payment.cohortId};
          `;
        }
      }

      // Record in AuditLog
      await tx.auditLog.create({
        data: {
          userId: params.adminUserId,
          action: isFullRefund ? "PAYMENT_REFUND_FULL" : "PAYMENT_REFUND_PARTIAL",
          entityType: "REFUND",
          entityId: refund.id,
          details: {
            paymentId: payment.id,
            refundAmount: params.amount,
            currency: payment.currency,
            reason: params.reason,
            gatewayRefundId: params.gatewayRefundId,
            isFullRefund,
          },
        },
      });

      return { refund, nextStatus };
    });
  }

  // --- Stale Payments for Nightly Reconciliation ---
  /** Open (unsettled) payments created at least `minMinutes` ago, oldest first. */
  async findOpenPaymentsOlderThan(minMinutes = 30, limit = 200) {
    const cutoff = new Date(Date.now() - minMinutes * 60 * 1000);
    return prisma.payment.findMany({
      where: {
        status: { in: ["CREATED", "PENDING"] },
        createdAt: { lte: cutoff },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }

  async findStalePaymentsForReconciliation(hours = 24) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return prisma.payment.findMany({
      where: {
        status: { in: ["CREATED", "PENDING"] },
        createdAt: { gte: cutoff },
      },
      include: {
        cohort: true,
      },
    });
  }
}

export const paymentRepository = new PaymentRepository();
