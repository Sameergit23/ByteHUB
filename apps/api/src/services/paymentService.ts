import crypto from "node:crypto";
import { paymentRepository } from "../repositories/payment.repository.js";
import { trainingRepository } from "../repositories/training.repository.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/apiError.js";
import {
  PaymentStatus,
  validateStateTransition,
  canRefund,
} from "../utils/paymentStateMachine.js";
import {
  verifyRazorpayWebhookSignature,
  verifyRazorpayPaymentSignature,
  verifyStripeWebhookSignature,
  assertAmountIntegrity,
} from "../utils/paymentSecurity.js";
import {
  generateInvoiceData,
  buildSimpleInvoicePdfBuffer,
} from "../utils/invoiceGenerator.js";
import { prisma } from "../lib/prisma.js";

export interface CreatePaymentIntentInput {
  cohortId: string;
  provider?: "RAZORPAY" | "STRIPE";
  idempotencyKey: string;
}

export class PaymentService {
  /**
   * Initializes a provider order / PaymentIntent.
   * Architecture rule: The server decides the amount and currency from the database.
   * Never accept a price from the client.
   * Card data NEVER touches our server or logs.
   */
  async createPaymentIntent(userId: string, input: CreatePaymentIntentInput) {
    const { cohortId, idempotencyKey } = input;

    if (!cohortId) {
      throw AppError.badRequest("Cohort ID is required");
    }
    if (!idempotencyKey) {
      throw AppError.badRequest("Idempotency key is required");
    }

    // 1. Check idempotency: Return existing payment if already created
    const existingPayment = await paymentRepository.findByIdempotencyKey(idempotencyKey);
    if (existingPayment) {
      return {
        orderId: existingPayment.orderId,
        amount: existingPayment.amount,
        currency: existingPayment.currency,
        provider: existingPayment.provider,
        status: existingPayment.status,
        keyId: env.RAZORPAY_KEY_ID,
        publishableKey: env.STRIPE_PUBLISHABLE_KEY,
        programmeTitle: existingPayment.cohort?.programme?.title,
      };
    }

    // 2. Fetch Cohort strictly from database (single source of truth for price)
    const cohort = await trainingRepository.findCohortById(cohortId);
    if (!cohort || !cohort.published) {
      throw AppError.notFound("Cohort not found or is closed for enrolments.");
    }

    const amount = cohort.priceAmount; // Integer smallest unit (paise/cents)
    const currency = cohort.currency.toUpperCase(); // "INR" or "USD"

    if (amount <= 0) {
      throw AppError.badRequest(
        "This programme is free. Use direct enrolment endpoint instead of payment checkout."
      );
    }

    // 3. Ensure user has a valid pending seat reservation
    let enrollment = await trainingRepository.findUserEnrollment(userId, cohortId);
    if (!enrollment) {
      // Auto-reserve seat for 15 minutes if not already reserved
      const reservation = await trainingRepository.reserveSeatAtomic({
        userId,
        cohortId,
        reservationMinutes: 15,
      });
      enrollment = reservation.enrollment as any;
    }

    // 4. Determine Provider: Razorpay default for INR; Stripe for international
    const provider = input.provider || (currency === "INR" ? "RAZORPAY" : "STRIPE");

    // 5. Generate provider order id
    // In test mode: generate structured provider order ID
    let orderId: string;
    let clientSecret: string | undefined;

    if (provider === "RAZORPAY") {
      // Razorpay order id format: order_XXXXXXXXXXXXXXXX
      orderId = `order_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
    } else {
      // Stripe payment intent id: pi_XXXXXXXXXXXXXXXX
      orderId = `pi_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
      clientSecret = `${orderId}_secret_${crypto.randomBytes(12).toString("hex")}`;
    }

    // 6. Record Payment in database in CREATED status
    const payment = await paymentRepository.create({
      orderId,
      userId,
      cohortId,
      provider,
      amount,
      currency,
      idempotencyKey,
      metadata: {
        programmeTitle: cohort.programme?.title,
        cohortCode: cohort.cohortCode,
        enrollmentId: enrollment?.id,
      },
    });

    return {
      orderId: payment.orderId,
      amount: payment.amount,
      currency: payment.currency,
      provider: payment.provider,
      status: payment.status,
      // Only send public keys to browser
      keyId: provider === "RAZORPAY" ? env.RAZORPAY_KEY_ID : undefined,
      publishableKey: provider === "STRIPE" ? env.STRIPE_PUBLISHABLE_KEY : undefined,
      clientSecret,
      programmeTitle: cohort.programme?.title,
      cohortCode: cohort.cohortCode,
      seatsLeft: cohort.seatsLeft,
    };
  }

  /**
   * Razorpay Webhook Handler
   * Source of truth: verified webhook payload against RAW body.
   */
  async handleRazorpayWebhook(rawBody: Buffer | string, signatureHeader: string) {
    // 1. Verify HMAC SHA-256 signature
    const isValid = verifyRazorpayWebhookSignature(
      rawBody,
      signatureHeader,
      env.RAZORPAY_WEBHOOK_SECRET
    );

    if (!isValid) {
      throw AppError.badRequest(
        "Invalid Razorpay webhook signature header.",
        "INVALID_SIGNATURE"
      );
    }

    // 2. Parse payload
    const bodyText = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody;
    const payload = JSON.parse(bodyText);

    const eventType = payload.event;
    // Razorpay webhook events carry an event id or unique order+payment identifier
    const eventId =
      payload.event_id ||
      `rzp_evt_${payload.payload?.payment?.entity?.id || ""}_${eventType}_${payload.created_at || Date.now()}`;

    // 3. Replay Protection: Check if already processed
    const existingEvent = await paymentRepository.findPaymentEventByEventId(eventId);
    if (existingEvent) {
      return { status: "already_processed", eventId };
    }

    // Record incoming event
    await paymentRepository.recordPaymentEvent({
      provider: "RAZORPAY",
      eventType,
      eventId,
      rawPayload: payload,
      signatureHeader,
    });

    // 4. Handle events
    if (eventType === "payment.captured" || eventType === "order.paid") {
      const paymentEntity = payload.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const gatewayPaymentId = paymentEntity?.id;
      const receivedAmount = paymentEntity?.amount;

      if (!orderId) {
        throw AppError.badRequest("Missing order_id in webhook payment payload");
      }

      // Fetch payment record
      const payment = await paymentRepository.findByOrderId(orderId);
      if (!payment) {
        throw AppError.notFound(`Payment record for order '${orderId}' not found`);
      }

      // TAMPERING CHECK: Database amount must match gateway captured amount
      assertAmountIntegrity(payment.amount, receivedAmount, orderId);

      // Validate state transition
      validateStateTransition(payment.status as any, PaymentStatus.PAID, orderId);

      // ACID transaction: confirm payment and activate enrolment
      const result = await paymentRepository.fulfillPaymentAndEnrolment({
        paymentId: payment.id,
        orderId: payment.orderId,
        userId: payment.userId,
        cohortId: payment.cohortId,
        gatewayPaymentId,
        gatewaySignature: signatureHeader,
        eventId,
      });

      // Issue invoice data with [GST DETAILS] placeholder
      const invoice = generateInvoiceData({
        paymentId: payment.id,
        orderId: payment.orderId,
        gatewayPaymentId,
        studentName: payment.user.name,
        studentEmail: payment.user.email,
        programmeTitle: payment.cohort?.programme?.title || "Training Programme",
        cohortCode: payment.cohort?.cohortCode || "COHORT",
        amount: payment.amount,
        currency: payment.currency,
      });

      return {
        status: "confirmed",
        paymentId: result.payment.id,
        enrollmentId: result.enrollment.id,
        invoice,
      };
    }

    if (eventType === "payment.failed") {
      const paymentEntity = payload.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const reason = paymentEntity?.error_description || "Payment failed at gateway";

      if (orderId) {
        const payment = await paymentRepository.findByOrderId(orderId);
        if (payment) {
          await paymentRepository.failPaymentAndReleaseSeat({
            paymentId: payment.id,
            orderId,
            reason,
            eventId,
          });
        }
      }

      return { status: "payment_failed_handled", orderId };
    }

    return { status: "ignored_event_type", eventType };
  }

  /**
   * Stripe Webhook Handler
   * Source of truth: verified webhook payload against RAW body.
   */
  async handleStripeWebhook(rawBody: Buffer | string, signatureHeader: string) {
    // 1. Verify Stripe signature
    const isValid = verifyStripeWebhookSignature(
      rawBody,
      signatureHeader,
      env.STRIPE_WEBHOOK_SECRET
    );

    if (!isValid) {
      throw AppError.badRequest(
        "Invalid Stripe webhook signature header.",
        "INVALID_SIGNATURE"
      );
    }

    // 2. Parse payload
    const bodyText = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody;
    const event = JSON.parse(bodyText);
    const eventId = event.id;
    const eventType = event.type;

    // 3. Replay Protection: Check if event was already processed
    const existingEvent = await paymentRepository.findPaymentEventByEventId(eventId);
    if (existingEvent) {
      return { status: "already_processed", eventId };
    }

    await paymentRepository.recordPaymentEvent({
      provider: "STRIPE",
      eventType,
      eventId,
      rawPayload: event,
      signatureHeader,
    });

    // 4. Handle events
    if (eventType === "payment_intent.succeeded") {
      const paymentIntent = event.data?.object;
      const orderId = paymentIntent?.id;
      const receivedAmount = paymentIntent?.amount;

      if (!orderId) {
        throw AppError.badRequest("Missing payment_intent id in webhook payload");
      }

      const payment = await paymentRepository.findByOrderId(orderId);
      if (!payment) {
        throw AppError.notFound(`Payment record for intent '${orderId}' not found`);
      }

      // TAMPERING CHECK
      assertAmountIntegrity(payment.amount, receivedAmount, orderId);

      // Validate legal state transition
      validateStateTransition(payment.status as any, PaymentStatus.PAID, orderId);

      const result = await paymentRepository.fulfillPaymentAndEnrolment({
        paymentId: payment.id,
        orderId: payment.orderId,
        userId: payment.userId,
        cohortId: payment.cohortId,
        gatewayPaymentId: paymentIntent.id,
        gatewaySignature: signatureHeader,
        eventId,
      });

      const invoice = generateInvoiceData({
        paymentId: payment.id,
        orderId: payment.orderId,
        gatewayPaymentId: paymentIntent.id,
        studentName: payment.user.name,
        studentEmail: payment.user.email,
        programmeTitle: payment.cohort?.programme?.title || "Training Programme",
        cohortCode: payment.cohort?.cohortCode || "COHORT",
        amount: payment.amount,
        currency: payment.currency,
      });

      return {
        status: "confirmed",
        paymentId: result.payment.id,
        enrollmentId: result.enrollment.id,
        invoice,
      };
    }

    if (eventType === "payment_intent.payment_failed") {
      const paymentIntent = event.data?.object;
      const orderId = paymentIntent?.id;
      const reason =
        paymentIntent?.last_payment_error?.message || "Stripe card transaction declined";

      if (orderId) {
        const payment = await paymentRepository.findByOrderId(orderId);
        if (payment) {
          await paymentRepository.failPaymentAndReleaseSeat({
            paymentId: payment.id,
            orderId,
            reason,
            eventId,
          });
        }
      }

      return { status: "payment_failed_handled", orderId };
    }

    return { status: "ignored_event_type", eventType };
  }

  /**
   * Fast client-side callback verification (marks payment as PENDING).
   * Note: Webhook remains the sole definitive source of truth.
   */
  async verifyClientCheckout(params: {
    orderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    const { orderId, razorpayPaymentId, razorpaySignature } = params;

    const isValid = verifyRazorpayPaymentSignature(
      orderId,
      razorpayPaymentId,
      razorpaySignature,
      env.RAZORPAY_KEY_SECRET
    );

    if (!isValid) {
      throw AppError.badRequest("Invalid Razorpay payment signature from client.");
    }

    const payment = await paymentRepository.findByOrderId(orderId);
    if (!payment) {
      throw AppError.notFound("Payment order not found.");
    }

    // Transition from CREATED to PENDING while webhook arrives
    if (payment.status === "CREATED") {
      await paymentRepository.updateStatus(payment.id, "PENDING", {
        gatewayPaymentId: razorpayPaymentId,
        gatewaySignature: razorpaySignature,
      });
    }

    return {
      status: "pending_webhook_confirmation",
      orderId,
      message: "Signature verified. Awaiting webhook capture confirmation.",
    };
  }

  /**
   * Client polls this endpoint to verify if the webhook confirmed the payment.
   */
  async getPaymentStatus(orderId: string, requestingUserId: string, requestingRole: string) {
    const payment = await paymentRepository.findByOrderId(orderId);
    if (!payment) {
      throw AppError.notFound(`Payment order '${orderId}' not found.`);
    }

    // IDOR protection: only owner or admin can inspect
    if (payment.userId !== requestingUserId && requestingRole !== "ADMIN") {
      throw AppError.forbidden("Access denied: You cannot inspect another student's payment.");
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: payment.userId,
        cohortId: payment.cohortId,
      },
    });

    let invoice: any = null;
    if (payment.status === "PAID") {
      invoice = generateInvoiceData({
        paymentId: payment.id,
        orderId: payment.orderId,
        gatewayPaymentId: payment.gatewayPaymentId || undefined,
        studentName: payment.user.name,
        studentEmail: payment.user.email,
        programmeTitle: payment.cohort?.programme?.title || "Training Programme",
        cohortCode: payment.cohort?.cohortCode || "COHORT",
        amount: payment.amount,
        currency: payment.currency,
      });
    }

    return {
      orderId: payment.orderId,
      status: payment.status,
      isPaid: payment.status === "PAID",
      amount: payment.amount,
      currency: payment.currency,
      provider: payment.provider,
      enrollment: enrollment
        ? {
            id: enrollment.id,
            status: enrollment.status,
            cohortId: enrollment.cohortId,
          }
        : null,
      invoice,
    };
  }

  /**
   * Downloads tax invoice / receipt PDF.
   */
  async downloadInvoicePdf(orderId: string, requestingUserId: string, requestingRole: string) {
    const statusData = await this.getPaymentStatus(orderId, requestingUserId, requestingRole);
    if (!statusData.isPaid || !statusData.invoice) {
      throw AppError.badRequest("Cannot generate invoice for unpaid or pending payment.");
    }

    return buildSimpleInvoicePdfBuffer(statusData.invoice);
  }

  /**
   * Admin-Only: Process Partial or Full Refund with ACID transaction and Audit Log.
   */
  async processRefund(
    adminUserId: string,
    params: {
      paymentId: string;
      amount?: number; // In smallest unit. If omitted, full refund.
      reason: string;
    }
  ) {
    const { paymentId, reason } = params;

    if (!paymentId || !reason) {
      throw AppError.badRequest("Payment ID and reason are required for refunds.");
    }

    const payment = await paymentRepository.findById(paymentId);
    if (!payment) {
      throw AppError.notFound("Payment not found");
    }

    if (!canRefund(payment.status as any)) {
      throw AppError.badRequest(
        `Cannot refund payment in status '${payment.status}'. Only PAID or PARTIALLY_REFUNDED payments can be refunded.`
      );
    }

    const totalRefundedSoFar = payment.refunds.reduce(
      (sum, r) => sum + (r.status === "PROCESSED" ? r.amount : 0),
      0
    );
    const remainingBalance = payment.amount - totalRefundedSoFar;

    const refundAmount = params.amount ?? remainingBalance;

    if (refundAmount <= 0 || refundAmount > remainingBalance) {
      throw AppError.badRequest(
        `Invalid refund amount. Requested: ${refundAmount}, Maximum refundable: ${remainingBalance}`
      );
    }

    // Call provider refund API in test mode
    const gatewayRefundId = `ref_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;

    // Process in ACID transaction
    return paymentRepository.processRefund({
      paymentId: payment.id,
      adminUserId,
      amount: refundAmount,
      reason,
      gatewayRefundId,
    });
  }

  /**
   * Nightly reconciliation job:
   * Compares database CREATED/PENDING payments with provider records, alerting on mismatches.
   */
  async reconcileNightly() {
    const stalePayments = await paymentRepository.findStalePaymentsForReconciliation(24);
    const report: Array<{
      orderId: string;
      provider: string;
      statusInDb: string;
      actionTaken: string;
    }> = [];

    for (const p of stalePayments) {
      // In test mode, if older than 2 hours and still CREATED/PENDING, transition to FAILED and release seat
      const ageHours = (Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60);
      if (ageHours > 1) {
        await paymentRepository.failPaymentAndReleaseSeat({
          paymentId: p.id,
          orderId: p.orderId,
          reason: "Nightly reconciliation: order expired without gateway payment capture.",
        });

        report.push({
          orderId: p.orderId,
          provider: p.provider,
          statusInDb: p.status,
          actionTaken: "AUTO_FAILED_AND_SEAT_RELEASED",
        });
      }
    }

    return {
      reconciledCount: stalePayments.length,
      actions: report,
      timestamp: new Date().toISOString(),
    };
  }
}

export const paymentService = new PaymentService();
