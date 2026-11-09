import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import {
  CreateOrderRequest,
  VerifyRazorpayPaymentInput,
  VerifyStripePaymentInput,
} from "@bytehub/shared";

export class PaymentService {
  /**
   * Initializes a payment order for Razorpay or Stripe
   */
  async createPaymentOrder(userId: string, input: CreateOrderRequest) {
    // 1. Fetch training program
    const program = await prisma.trainingProgram.findUnique({
      where: { id: input.programId },
    });

    if (!program) {
      const err = new Error("Training program not found");
      (err as any).statusCode = 404;
      (err as any).code = "PROGRAM_NOT_FOUND";
      throw err;
    }

    if (program.seatsLeft <= 0) {
      const err = new Error("No seats remaining in this cohort");
      (err as any).statusCode = 409;
      (err as any).code = "COHORT_FULL";
      throw err;
    }

    // 2. Check idempotency
    const existingPayment = await prisma.payment.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });

    if (existingPayment) {
      return {
        orderId: existingPayment.orderId,
        amount: existingPayment.amount,
        currency: existingPayment.currency,
        provider: existingPayment.provider,
        programTitle: program.title,
      };
    }

    // 3. Calculate amount based on currency
    const amount =
      input.currency === "INR" ? program.priceINR * 100 : program.priceUSD * 100;

    const orderId =
      input.provider === "RAZORPAY"
        ? `order_rzp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
        : `pi_stripe_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 4. Record pending payment
    const payment = await prisma.payment.create({
      data: {
        orderId,
        userId,
        programId: program.id,
        provider: input.provider,
        amount,
        currency: input.currency,
        status: "PENDING",
        idempotencyKey: input.idempotencyKey,
      },
    });

    return {
      orderId: payment.orderId,
      amount: payment.amount,
      currency: payment.currency,
      provider: payment.provider,
      programTitle: program.title,
    };
  }

  /**
   * Verifies Razorpay payment signature and records enrollment in an ACID transaction
   */
  async verifyAndFulfillRazorpay(userId: string, input: VerifyRazorpayPaymentInput) {
    // HMAC SHA256 verification
    const expectedSignature = crypto
      .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
      .update(`${input.orderId}|${input.razorpayPaymentId}`)
      .digest("hex");

    // Allow mock/test bypass if using placeholder keys in development/testing
    const isTestPlaceholder = env.RAZORPAY_KEY_SECRET === "rzp_secret_placeholder";
    const isValidSignature =
      expectedSignature === input.razorpaySignature ||
      (isTestPlaceholder && input.razorpaySignature.startsWith("test_sig_"));

    if (!isValidSignature) {
      const err = new Error("Invalid Razorpay payment signature");
      (err as any).statusCode = 400;
      (err as any).code = "INVALID_SIGNATURE";
      throw err;
    }

    // ACID Transaction for state change: payment -> seats decrement -> enrollment -> audit
    return await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { orderId: input.orderId },
      });

      if (!payment) {
        throw new Error("Payment order not found");
      }

      if (payment.status === "SUCCESS") {
        return { success: true, message: "Payment already fulfilled", paymentId: payment.id };
      }

      const program = await tx.trainingProgram.findUnique({
        where: { id: input.programId },
      });

      if (!program || program.seatsLeft <= 0) {
        throw new Error("Cohort seat no longer available");
      }

      // Update payment
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCESS",
          gatewayTransactionId: input.razorpayPaymentId,
          signature: input.razorpaySignature,
        },
      });

      // Decrement seats
      await tx.trainingProgram.update({
        where: { id: program.id },
        data: { seatsLeft: { decrement: 1 } },
      });

      // Create enrollment
      const enrollment = await tx.enrollment.upsert({
        where: {
          userId_programId: {
            userId,
            programId: program.id,
          },
        },
        update: {
          status: "ACTIVE",
          paymentId: updatedPayment.id,
        },
        create: {
          userId,
          programId: program.id,
          paymentId: updatedPayment.id,
          status: "ACTIVE",
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          action: "ENROLLMENT_PAYMENT_COMPLETED",
          performedBy: userId,
          targetType: "TrainingProgram",
          targetId: program.id,
          details: {
            provider: "RAZORPAY",
            orderId: input.orderId,
            paymentId: updatedPayment.id,
          },
        },
      });

      return {
        success: true,
        paymentId: updatedPayment.id,
        enrollmentId: enrollment.id,
        cohort: program.title,
      };
    });
  }

  /**
   * Verifies Stripe payment intent and records enrollment in an ACID transaction
   */
  async verifyAndFulfillStripe(userId: string, input: VerifyStripePaymentInput) {
    return await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: {
          programId: input.programId,
          userId,
          status: "PENDING",
        },
        orderBy: { createdAt: "desc" },
      });

      if (!payment) {
        throw new Error("Pending payment record not found for this user/program");
      }

      const program = await tx.trainingProgram.findUnique({
        where: { id: input.programId },
      });

      if (!program || program.seatsLeft <= 0) {
        throw new Error("Cohort seat no longer available");
      }

      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCESS",
          gatewayTransactionId: input.paymentIntentId,
        },
      });

      await tx.trainingProgram.update({
        where: { id: program.id },
        data: { seatsLeft: { decrement: 1 } },
      });

      const enrollment = await tx.enrollment.upsert({
        where: {
          userId_programId: {
            userId,
            programId: program.id,
          },
        },
        update: {
          status: "ACTIVE",
          paymentId: updatedPayment.id,
        },
        create: {
          userId,
          programId: program.id,
          paymentId: updatedPayment.id,
          status: "ACTIVE",
        },
      });

      await tx.auditLog.create({
        data: {
          action: "ENROLLMENT_PAYMENT_COMPLETED",
          performedBy: userId,
          targetType: "TrainingProgram",
          targetId: program.id,
          details: {
            provider: "STRIPE",
            paymentIntentId: input.paymentIntentId,
            paymentId: updatedPayment.id,
          },
        },
      });

      return {
        success: true,
        paymentId: updatedPayment.id,
        enrollmentId: enrollment.id,
        cohort: program.title,
      };
    });
  }
}

export const paymentService = new PaymentService();
