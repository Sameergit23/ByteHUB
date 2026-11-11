import crypto from "node:crypto";
import { paymentRepository } from "../repositories/payment.repository.js";
import { trainingRepository } from "../repositories/training.repository.js";
import {
  env,
  isCashfreeMockMode,
  isRazorpayConfigured,
  isStripeConfigured,
} from "../config/env.js";
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
import { CashfreeService, CashfreeOrderStatus } from "./cashfree.service.js";

/** Cashfree webhook body (fields we read; shapes differ slightly between webhook versions). */
interface CashfreeWebhookPayload {
  type?: string;
  event?: string;
  order_id?: string;
  orderId?: string;
  data?: { order?: CashfreeWebhookOrder; payment?: CashfreeWebhookPayment };
  order?: CashfreeWebhookOrder;
  payment?: CashfreeWebhookPayment;
}
interface CashfreeWebhookOrder {
  order_id?: string;
  order_amount?: number | string;
  order_currency?: string;
}
interface CashfreeWebhookPayment {
  cf_payment_id?: string | number;
  payment_id?: string | number;
  payment_status?: string;
  payment_amount?: number | string;
  payment_currency?: string;
  payment_message?: string;
}
import { notificationService } from "./notification.service.js";
import { AlertService } from "./alert.service.js";
import { logger } from "../utils/logger.js";

export interface CreatePaymentIntentInput {
  cohortId: string;
  provider?: "CASHFREE" | "RAZORPAY" | "STRIPE";
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
      if (existingPayment.userId !== userId) {
        throw AppError.conflict("This idempotency key has already been used.");
      }
      const madeIn = this.orderCashfreeEnv(existingPayment.metadata);
      if (
        madeIn &&
        madeIn !== this.cashfreeEnvironment() &&
        (existingPayment.status === "CREATED" || existingPayment.status === "PENDING")
      ) {
        throw AppError.conflict(
          "Payment settings changed since this page was opened. Please refresh the page and try again."
        );
      }
      return {
        orderId: existingPayment.orderId,
        amount: existingPayment.amount,
        currency: existingPayment.currency,
        provider: existingPayment.provider,
        status: existingPayment.status,
        paymentSessionId: (
          existingPayment.metadata as { paymentSessionId?: string } | null
        )?.paymentSessionId,
        cashfreeEnv: this.cashfreeEnvironment(),
        isTestMode: isCashfreeMockMode(),
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

    // 3. Only Cashfree (INR) is integrated end to end. Razorpay and Stripe are rejected
    //    up front so no order can be created that the gateway can never settle.
    const provider = input.provider || "CASHFREE";
    if (provider !== "CASHFREE") {
      throw AppError.badRequest(
        `${provider} checkout is not available yet. Please pay with Cashfree (UPI, cards, netbanking).`
      );
    }
    if (currency !== "INR") {
      throw AppError.badRequest(
        "This cohort is priced in a currency that online checkout does not support yet."
      );
    }

    // 4. Reserve (or re-use) the student's seat for 15 minutes
    let reservation;
    try {
      reservation = await trainingRepository.reserveSeatAtomic({
        userId,
        cohortId,
        reservationMinutes: 15,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message === "SEATS_EXHAUSTED") {
        throw AppError.badRequest(
          "All seats in this cohort have already been filled.",
          "SEATS_EXHAUSTED"
        );
      }
      if (message === "COHORT_NOT_FOUND") {
        throw AppError.notFound("Cohort not found or is closed for enrolments.");
      }
      throw err;
    }

    const enrollment = reservation.enrollment;
    if (enrollment.status === "ACTIVE" || enrollment.status === "COMPLETED") {
      throw AppError.conflict("You are already enrolled in this cohort.");
    }

    // 5. Create the Cashfree order and obtain the checkout session
    const orderId = `order_cf_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: { select: { phone: true } } },
    });
    const phoneDigits = (user?.studentProfile?.phone || "").replace(/\D/g, "").slice(-10);

    const cfOrder = await CashfreeService.createOrder({
      orderId,
      amount: amount / 100, // paise to INR
      currency: "INR",
      customer: {
        customerId: userId,
        customerName: user?.name || "ByteHUB Student",
        customerEmail: user?.email || "student@bytehub.dev",
        customerPhone: phoneDigits.length === 10 ? phoneDigits : undefined,
      },
      notifyUrl: env.API_PUBLIC_URL
        ? `${env.API_PUBLIC_URL.replace(/\/$/, "")}/api/payments/webhooks/cashfree`
        : undefined,
    });
    const paymentSessionId = cfOrder.paymentSessionId;

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
        enrollmentId: enrollment.id,
        paymentSessionId,
        cashfreeEnv: this.cashfreeEnvironment(),
      },
    });

    return {
      orderId: payment.orderId,
      amount: payment.amount,
      currency: payment.currency,
      provider: payment.provider,
      status: payment.status,
      // Session token for the Cashfree browser SDK
      paymentSessionId,
      cashfreeEnv: this.cashfreeEnvironment(),
      isTestMode: isCashfreeMockMode(),
      reservedUntil: enrollment.reservedUntil,
      programmeTitle: cohort.programme?.title,
      cohortCode: cohort.cohortCode,
      seatsLeft: cohort.seatsLeft,
    };
  }

  /**
   * Starts (or resumes) the Cashfree checkout for an internship's registration fee.
   * The amount always comes from the internship in the database, never from the browser.
   * Once paid, the application moves from PENDING_PAYMENT to SUBMITTED.
   */
  async createApplicationFeeIntent(userId: string, applicationId: string) {
    if (!applicationId || typeof applicationId !== "string") {
      throw AppError.badRequest("applicationId is required.");
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { internship: true },
    });
    if (!application || application.deletedAt || application.studentId !== userId) {
      throw AppError.notFound("Application not found.");
    }
    if (application.status === "WITHDRAWN") {
      throw AppError.badRequest(
        "This application was withdrawn, so there is nothing to pay."
      );
    }
    if (application.status !== "PENDING_PAYMENT") {
      throw AppError.conflict(
        "The registration fee for this application is already paid."
      );
    }

    const internship = application.internship;
    if (
      internship.deletedAt ||
      internship.status !== "PUBLISHED" ||
      new Date() > new Date(internship.deadline)
    ) {
      throw AppError.badRequest(
        "This internship is no longer taking applications, so the fee can't be paid."
      );
    }

    const amount = internship.registrationFeeAmount; // paise
    if (amount <= 0) {
      // The fee was removed after the student applied: submit the application free of charge.
      await prisma.application.update({
        where: { id: application.id },
        data: { status: "SUBMITTED" },
      });
      await prisma.auditLog
        .create({
          data: {
            userId,
            action: "APPLICATION_SUBMITTED",
            entityType: "APPLICATION",
            entityId: application.id,
            details: {
              internshipId: internship.id,
              note: "Fee removed by admin; submitted without payment",
            },
          },
        })
        .catch(() => null);
      await notificationService.sendApplicationReceived({
        studentName: application.fullName,
        studentEmail: application.email,
        roleTitle: internship.title,
        companyName: internship.companyName,
        applicationId: application.id,
      });
      return {
        feeRequired: false as const,
        status: "SUBMITTED",
        applicationId: application.id,
      };
    }

    const describe = (payment: {
      orderId: string;
      amount: number;
      currency: string;
      provider: string;
      status: string;
      metadata: unknown;
    }) => ({
      feeRequired: true as const,
      applicationId: application.id,
      orderId: payment.orderId,
      amount: payment.amount,
      currency: payment.currency,
      provider: payment.provider,
      status: payment.status,
      paymentSessionId: (payment.metadata as { paymentSessionId?: string } | null)
        ?.paymentSessionId,
      cashfreeEnv: this.cashfreeEnvironment(),
      isTestMode: isCashfreeMockMode(),
      internshipTitle: internship.title,
      companyName: internship.companyName,
    });

    // Re-use a recent open order (double clicks, closing and reopening the payment window).
    // Cashfree orders expire after 20 minutes, so only reuse ones younger than 15, and only
    // ones made in the current Cashfree mode (a test session doesn't work on the live page).
    const currentEnv = this.cashfreeEnvironment();
    const recentOrders = await prisma.payment.findMany({
      where: {
        applicationId: application.id,
        userId,
        amount,
        status: { in: ["CREATED", "PENDING"] },
        createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    const openOrder = recentOrders.find(
      (order) => this.orderCashfreeEnv(order.metadata) === currentEnv
    );
    if (openOrder) {
      return describe(openOrder);
    }

    const orderId = `order_cf_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    const phoneDigits = (application.phone || "").replace(/\D/g, "").slice(-10);
    const frontend = env.FRONTEND_URL.replace(/\/$/, "");

    const cfOrder = await CashfreeService.createOrder({
      orderId,
      amount: amount / 100, // paise to INR
      currency: "INR",
      customer: {
        customerId: userId,
        customerName: user?.name || application.fullName || "ByteHUB Student",
        customerEmail: user?.email || application.email,
        customerPhone: phoneDigits.length === 10 ? phoneDigits : undefined,
      },
      returnUrl: `${frontend}/payments/return?order_id={order_id}`,
      notifyUrl: env.API_PUBLIC_URL
        ? `${env.API_PUBLIC_URL.replace(/\/$/, "")}/api/payments/webhooks/cashfree`
        : undefined,
    });

    const payment = await paymentRepository.create({
      orderId,
      userId,
      applicationId: application.id,
      provider: "CASHFREE",
      amount,
      currency: "INR",
      idempotencyKey: `appfee_${application.id}_${orderId}`,
      metadata: {
        kind: "INTERNSHIP_FEE",
        internshipTitle: internship.title,
        companyName: internship.companyName,
        paymentSessionId: cfOrder.paymentSessionId,
        cashfreeEnv: currentEnv,
      },
    });

    return describe(payment);
  }

  /**
   * The Cashfree mode (test or live) an order was created in, when it was recorded.
   * A test order's payment session is rejected by the live checkout and the other way round,
   * so an order is only reused, or checked with the gateway, in the mode it was made in.
   */
  private orderCashfreeEnv(metadata: unknown): "PRODUCTION" | "SANDBOX" | null {
    const value = (metadata as { cashfreeEnv?: string } | null)?.cashfreeEnv;
    return value === "PRODUCTION" || value === "SANDBOX" ? value : null;
  }

  private cashfreeEnvironment(): "PRODUCTION" | "SANDBOX" {
    return env.CASHFREE_SECRET_KEY.includes("_prod_") || env.CASHFREE_ENV === "PRODUCTION"
      ? "PRODUCTION"
      : "SANDBOX";
  }

  /**
   * Sends the receipt and enrolment confirmation once a payment is captured.
   * Never throws: a mail problem must not undo a confirmed payment.
   */
  private async notifyPaymentConfirmed(orderId: string): Promise<void> {
    try {
      const payment = await paymentRepository.findByOrderId(orderId);
      if (!payment || payment.status !== PaymentStatus.PAID) return;

      // Internship registration fee: one email that confirms the application and the payment.
      if (payment.application) {
        const application = payment.application;
        if (application.status === "WITHDRAWN") {
          // Paid through an order that was still open after the student withdrew.
          await AlertService.sendAlert({
            title: `Registration fee paid for a withdrawn application (${orderId}) — refund it`,
            severity: "WARNING",
            event: "PAYMENT_REVIEW_REQUIRED",
            details: { orderId, applicationId: application.id },
          }).catch(() => null);
          return;
        }
        await notificationService.sendApplicationFeePaid({
          studentName: application.fullName,
          studentEmail: application.email,
          roleTitle: application.internship.title,
          companyName: application.internship.companyName,
          applicationId: application.id,
          orderId: payment.orderId,
          amountMinor: payment.amount,
          currency: payment.currency,
        });
        return;
      }

      await notificationService.sendPaymentConfirmed({
        studentName: payment.user.name,
        studentEmail: payment.user.email,
        programmeTitle: payment.cohort?.programme?.title || "Training Programme",
        cohortCode: payment.cohort?.cohortCode || "COHORT",
        orderId: payment.orderId,
        amountMinor: payment.amount,
        currency: payment.currency,
        startDate: payment.cohort?.startDate,
        mode: payment.cohort?.mode,
      });

      // The seat is now confirmed, so the internship offer letter goes out with the receipt.
      if (payment.cohort) {
        const enrollment = await prisma.enrollment.findFirst({
          where: {
            userId: payment.userId,
            cohortId: payment.cohort.id,
            status: { in: ["ACTIVE", "COMPLETED"] },
          },
          select: { id: true },
        });
        if (enrollment) {
          await notificationService.sendOfferLetter({
            enrollmentId: enrollment.id,
            studentName: payment.user.name,
            studentEmail: payment.user.email,
            programmeTitle: payment.cohort.programme?.title || "Training Programme",
            cohortName: payment.cohort.name,
            cohortCode: payment.cohort.cohortCode,
            startDate: payment.cohort.startDate,
            endDate: payment.cohort.endDate,
            durationWeeks: payment.cohort.durationWeeks,
            mode: payment.cohort.mode,
          });
        }
      }
    } catch (err) {
      logger.error({ err, orderId }, "Failed to send payment confirmation emails");
    }
  }

  /**
   * Razorpay Webhook Handler
   * Source of truth: verified webhook payload against RAW body.
   */
  async handleRazorpayWebhook(rawBody: Buffer | string, signatureHeader: string) {
    if (!isRazorpayConfigured()) {
      throw AppError.badRequest("Razorpay is not enabled on this server.");
    }

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
      validateStateTransition(payment.status, PaymentStatus.PAID, orderId);

      // ACID transaction: confirm payment and activate enrolment
      const result = await paymentRepository.fulfillPaymentAndEnrolment({
        paymentId: payment.id,
        orderId: payment.orderId,
        userId: payment.userId,
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
        enrollmentId: result.enrollment?.id ?? null,
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
    if (!isStripeConfigured()) {
      throw AppError.badRequest("Stripe is not enabled on this server.");
    }

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
      validateStateTransition(payment.status, PaymentStatus.PAID, orderId);

      const result = await paymentRepository.fulfillPaymentAndEnrolment({
        paymentId: payment.id,
        orderId: payment.orderId,
        userId: payment.userId,
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
        enrollmentId: result.enrollment?.id ?? null,
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
    requestingUserId?: string;
  }) {
    const { orderId, razorpayPaymentId, razorpaySignature, requestingUserId } = params;

    if (!isRazorpayConfigured()) {
      throw AppError.badRequest("Razorpay is not enabled on this server.");
    }

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

    if (requestingUserId && payment.userId !== requestingUserId) {
      throw AppError.forbidden(
        "Access denied: You cannot verify a payment session belonging to another user."
      );
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
   * Confirms a Cashfree order that the gateway reports as paid.
   * Walks the state machine (CREATED -> PENDING -> PAID), tolerates the webhook and the
   * browser callback racing each other, and sends the receipt exactly once.
   */
  private async confirmCashfreePayment(params: {
    orderId: string;
    gatewayPaymentId: string;
    gatewaySignature: string;
    eventId: string;
    paidAmountMajor?: number;
    paidCurrency?: string;
  }): Promise<{
    status: "confirmed" | "already_paid" | "requires_review";
    orderId: string;
  }> {
    const { orderId } = params;
    const payment = await paymentRepository.findByOrderId(orderId);
    if (!payment) {
      throw AppError.notFound(`Payment order ${orderId} not found.`);
    }

    if (payment.status === PaymentStatus.PAID) {
      return { status: "already_paid", orderId };
    }

    // The gateway is the source of truth for what was charged; it must match our ledger.
    if (params.paidAmountMajor !== undefined) {
      assertAmountIntegrity(
        payment.amount,
        Math.round(params.paidAmountMajor * 100),
        orderId
      );
    }
    if (
      params.paidCurrency &&
      params.paidCurrency.toUpperCase() !== payment.currency.toUpperCase()
    ) {
      throw AppError.badRequest(
        `Currency mismatch for order '${orderId}'. Transaction aborted.`,
        "AMOUNT_TAMPERED"
      );
    }

    if (
      payment.status !== PaymentStatus.CREATED &&
      payment.status !== PaymentStatus.PENDING
    ) {
      // Money arrived for an order we already closed (failed/refunded). Never drop it silently.
      logger.error(
        {
          orderId,
          statusInDb: payment.status,
          gatewayPaymentId: params.gatewayPaymentId,
        },
        "Gateway reports PAID for an order that is closed in the ledger — manual review required"
      );
      await prisma.auditLog
        .create({
          data: {
            userId: payment.userId,
            action: "PAYMENT_CAPTURED_AFTER_CLOSE",
            entityType: "PAYMENT",
            entityId: payment.id,
            details: {
              orderId,
              statusInDb: payment.status,
              gatewayPaymentId: params.gatewayPaymentId,
            },
          },
        })
        .catch(() => null);
      await AlertService.sendAlert({
        title: `Payment received for closed order ${orderId} — refund or re-activate manually`,
        severity: "CRITICAL",
        event: "PAYMENT_REVIEW_REQUIRED",
        details: {
          orderId,
          statusInDb: payment.status,
          gatewayPaymentId: params.gatewayPaymentId,
        },
      }).catch(() => null);
      return { status: "requires_review", orderId };
    }

    try {
      if (payment.status === PaymentStatus.CREATED) {
        await paymentRepository.updateStatus(payment.id, PaymentStatus.PENDING, {
          gatewayPaymentId: params.gatewayPaymentId,
        });
      }

      await paymentRepository.fulfillPaymentAndEnrolment({
        paymentId: payment.id,
        orderId: payment.orderId,
        userId: payment.userId,
        gatewayPaymentId: params.gatewayPaymentId,
        gatewaySignature: params.gatewaySignature,
        eventId: params.eventId,
      });
    } catch (err) {
      // The webhook and the browser callback can confirm the same order at the same moment.
      const latest = await paymentRepository.findByOrderId(orderId);
      if (latest?.status === PaymentStatus.PAID) {
        return { status: "already_paid", orderId };
      }
      throw err;
    }

    await this.notifyPaymentConfirmed(orderId);
    return { status: "confirmed", orderId };
  }

  /**
   * Cashfree Webhook Handler
   * Verifies signature against raw body and timestamp header.
   */
  async handleCashfreeWebhook(
    rawBody: Buffer | string,
    signatureHeader: string,
    timestampHeader: string
  ) {
    // Unsigned webhooks are only tolerated in local mock mode (no real credentials, not production).
    if (!isCashfreeMockMode()) {
      const isValid = CashfreeService.verifyWebhookSignature(
        rawBody,
        timestampHeader,
        signatureHeader
      );
      if (!isValid) {
        await AlertService.notifyWebhookForgery({
          provider: "CASHFREE",
          receivedSignature: signatureHeader
            ? `${String(signatureHeader).slice(0, 12)}…`
            : "(missing)",
        }).catch(() => null);
        throw AppError.badRequest(
          "Invalid Cashfree webhook signature.",
          "INVALID_SIGNATURE"
        );
      }
    }

    const bodyText = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody;
    let payload: CashfreeWebhookPayload;
    try {
      payload = (
        typeof bodyText === "string" ? JSON.parse(bodyText) : bodyText
      ) as CashfreeWebhookPayload;
    } catch {
      throw AppError.badRequest("Malformed Cashfree webhook payload.");
    }

    const eventType: string | undefined = payload?.type || payload?.event;
    const orderData = payload?.data?.order || payload?.order;
    const paymentData = payload?.data?.payment || payload?.payment;
    const orderId: string | undefined =
      orderData?.order_id || payload?.order_id || payload?.orderId;

    if (!orderId) {
      return { status: "ignored_missing_order", eventType };
    }

    const cfPaymentId: string | undefined =
      paymentData?.cf_payment_id?.toString() || paymentData?.payment_id?.toString();
    // One id per (order, gateway payment, event type) so replays are deduplicated safely.
    const eventId = `cf_${orderId}_${cfPaymentId || "na"}_${eventType || "unknown"}`;

    if (eventType === "PAYMENT_SUCCESS_WEBHOOK" || eventType === "ORDER_PAID") {
      if (paymentData?.payment_status && paymentData.payment_status !== "SUCCESS") {
        return { status: "ignored_non_success_payment", orderId };
      }

      const payment = await paymentRepository.findByOrderId(orderId);
      if (!payment) {
        return { status: "ignored_unknown_order", orderId };
      }

      const paidAmount = orderData?.order_amount ?? paymentData?.payment_amount;
      const result = await this.confirmCashfreePayment({
        orderId,
        gatewayPaymentId: cfPaymentId || `cf_order_${orderId}`,
        gatewaySignature: signatureHeader || "cashfree_webhook",
        eventId,
        paidAmountMajor: paidAmount !== undefined ? Number(paidAmount) : undefined,
        paidCurrency: orderData?.order_currency || paymentData?.payment_currency,
      });

      return { status: result.status, orderId };
    }

    if (
      eventType === "PAYMENT_FAILED_WEBHOOK" ||
      eventType === "PAYMENT_USER_DROPPED_WEBHOOK"
    ) {
      // A failed or abandoned *attempt* does not close the order: Cashfree lets the student
      // retry inside the same order. The seat is released when the 15-minute hold expires.
      logger.info(
        { orderId, eventType, reason: paymentData?.payment_message },
        "Cashfree payment attempt did not complete"
      );
      return { status: "payment_attempt_failed_noted", orderId };
    }

    return { status: "ignored_event_type", eventType };
  }

  /**
   * Cashfree Client Callback Verification
   * Called by the browser after the Cashfree checkout closes. The order state is always
   * re-read from Cashfree's API — nothing the browser says is trusted.
   */
  async verifyCashfreeClient(params: { orderId: string; requestingUserId?: string }) {
    const { orderId, requestingUserId } = params;
    if (!orderId || typeof orderId !== "string") {
      throw AppError.badRequest("orderId is required.");
    }

    const payment = await paymentRepository.findByOrderId(orderId);
    if (!payment) {
      throw AppError.notFound(`Payment order ${orderId} not found.`);
    }

    if (requestingUserId && payment.userId !== requestingUserId) {
      throw AppError.forbidden("Access denied: You cannot verify another user's order.");
    }

    if (payment.status === PaymentStatus.PAID) {
      return { status: "PAID", orderId };
    }

    if (payment.provider !== "CASHFREE") {
      return { status: payment.status, orderId };
    }

    let cfOrder: CashfreeOrderStatus;
    try {
      cfOrder = await CashfreeService.getOrder(orderId);
    } catch (err) {
      // Gateway unreachable: report the ledger state and let the client keep polling.
      logger.warn({ err, orderId }, "Could not read order status from Cashfree");
      return { status: payment.status, orderId, gatewayReachable: false };
    }

    if (cfOrder?.order_status === "PAID") {
      const isMock = cfOrder.mock === true && isCashfreeMockMode();
      await this.confirmCashfreePayment({
        orderId,
        gatewayPaymentId: isMock
          ? `cf_pay_mock_${Date.now()}`
          : cfOrder.cf_order_id?.toString() || `cf_order_${orderId}`,
        gatewaySignature: isMock ? "mock_mode_no_gateway" : "verified_via_cashfree_api",
        eventId: `cf_${orderId}_client_verify`,
        paidAmountMajor: isMock ? undefined : Number(cfOrder.order_amount),
        paidCurrency: isMock ? undefined : cfOrder.order_currency,
      });
      return { status: "PAID", orderId };
    }

    return { status: payment.status, orderId, gatewayStatus: cfOrder?.order_status };
  }

  /**
   * Lists the signed-in student's own payments (newest first).
   */
  async listUserPayments(userId: string) {
    const payments = await prisma.payment.findMany({
      where: { userId },
      include: {
        cohort: {
          select: {
            cohortCode: true,
            programme: { select: { title: true, slug: true } },
          },
        },
        application: {
          select: {
            id: true,
            internship: { select: { title: true, companyName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return payments.map((p) => ({
      id: p.id,
      orderId: p.orderId,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      provider: p.provider,
      createdAt: p.createdAt,
      kind: p.application ? ("INTERNSHIP_FEE" as const) : ("TRAINING" as const),
      applicationId: p.application?.id ?? null,
      programmeTitle: p.application
        ? `Registration fee: ${p.application.internship.title}`
        : p.cohort?.programme?.title || "Training Programme",
      cohortCode: p.cohort?.cohortCode || null,
    }));
  }

  /**
   * Client polls this endpoint to verify if the webhook confirmed the payment.
   */
  async getPaymentStatus(
    orderId: string,
    requestingUserId: string,
    requestingRole: string
  ) {
    const payment = await paymentRepository.findByOrderId(orderId);
    if (!payment) {
      throw AppError.notFound(`Payment order '${orderId}' not found.`);
    }

    // IDOR protection: only owner or admin can inspect
    if (payment.userId !== requestingUserId && requestingRole !== "ADMIN") {
      throw AppError.forbidden(
        "Access denied: You cannot inspect another student's payment."
      );
    }

    const enrollment = payment.cohortId
      ? await prisma.enrollment.findFirst({
          where: {
            userId: payment.userId,
            cohortId: payment.cohortId,
          },
        })
      : null;
    const feeFor = payment.application;

    let invoice: ReturnType<typeof generateInvoiceData> | null = null;
    if (payment.status === "PAID") {
      invoice = generateInvoiceData({
        paymentId: payment.id,
        orderId: payment.orderId,
        gatewayPaymentId: payment.gatewayPaymentId || undefined,
        studentName: payment.user.name,
        studentEmail: payment.user.email,
        programmeTitle: feeFor
          ? `Internship registration fee - ${feeFor.internship.title} (${feeFor.internship.companyName})`
          : payment.cohort?.programme?.title || "Training Programme",
        cohortCode: feeFor
          ? `Application ${feeFor.id.slice(-8).toUpperCase()}`
          : payment.cohort?.cohortCode || "COHORT",
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
      kind: feeFor ? ("INTERNSHIP_FEE" as const) : ("TRAINING" as const),
      itemTitle: feeFor
        ? feeFor.internship.title
        : payment.cohort?.programme?.title || "Training Programme",
      application: feeFor
        ? { id: feeFor.id, status: feeFor.status, internshipSlug: feeFor.internship.slug }
        : null,
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
  async downloadInvoicePdf(
    orderId: string,
    requestingUserId: string,
    requestingRole: string
  ) {
    const statusData = await this.getPaymentStatus(
      orderId,
      requestingUserId,
      requestingRole
    );
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

    if (!canRefund(payment.status)) {
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
   * Reconciliation job:
   * Re-checks every open (CREATED/PENDING) order against the gateway. Orders the gateway
   * reports as paid are confirmed (covers a missed webhook); orders still unpaid after an
   * hour are failed and their seat released.
   */
  async reconcileNightly() {
    const openPayments = await paymentRepository.findOpenPaymentsOlderThan(30);
    const report: Array<{
      orderId: string;
      provider: string;
      statusInDb: string;
      actionTaken: string;
    }> = [];

    for (const p of openPayments) {
      let actionTaken = "LEFT_OPEN";

      try {
        let confirmedFromGateway = false;
        const ageHours =
          (Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60);
        const madeIn = this.orderCashfreeEnv(p.metadata);

        // Made with the other Cashfree keys (e.g. a test order after switching to live): the
        // current keys can't see or charge it, so close it instead of asking the gateway.
        if (
          p.provider === "CASHFREE" &&
          !isCashfreeMockMode() &&
          madeIn &&
          madeIn !== this.cashfreeEnvironment()
        ) {
          if (ageHours > 1) {
            await paymentRepository.failPaymentAndReleaseSeat({
              paymentId: p.id,
              orderId: p.orderId,
              reason: `Reconciliation: order was created in Cashfree ${madeIn} mode, which is no longer in use.`,
            });
            actionTaken = "AUTO_FAILED_OTHER_CASHFREE_MODE";
          }
          report.push({
            orderId: p.orderId,
            provider: p.provider,
            statusInDb: p.status,
            actionTaken,
          });
          continue;
        }

        if (p.provider === "CASHFREE" && !isCashfreeMockMode()) {
          let cfOrder: CashfreeOrderStatus | null = null;
          try {
            cfOrder = await CashfreeService.getOrder(p.orderId);
          } catch (lookupErr) {
            // After a day, an unpaid order the gateway can't find (e.g. created with old keys)
            // is closed; before that, a lookup error just leaves it for the next run.
            if (ageHours <= 24) throw lookupErr;
            logger.warn(
              { err: lookupErr, orderId: p.orderId },
              "Gateway has no record of a day-old unpaid order; closing it"
            );
          }
          if (cfOrder?.order_status === "PAID") {
            const result = await this.confirmCashfreePayment({
              orderId: p.orderId,
              gatewayPaymentId:
                cfOrder.cf_order_id?.toString() || `cf_order_${p.orderId}`,
              gatewaySignature: "verified_via_reconciliation",
              eventId: `cf_${p.orderId}_reconcile`,
              paidAmountMajor: Number(cfOrder.order_amount),
              paidCurrency: cfOrder.order_currency,
            });
            actionTaken = `CONFIRMED_FROM_GATEWAY:${result.status}`;
            confirmedFromGateway = true;
          }
        }

        if (!confirmedFromGateway && ageHours > 1) {
          await paymentRepository.failPaymentAndReleaseSeat({
            paymentId: p.id,
            orderId: p.orderId,
            reason: "Reconciliation: order expired without gateway payment capture.",
          });
          actionTaken = "AUTO_FAILED_AND_SEAT_RELEASED";
        }
      } catch (err) {
        logger.error({ err, orderId: p.orderId }, "Reconciliation failed for order");
        actionTaken = `ERROR:${err instanceof Error ? err.message : "unknown"}`;
      }

      report.push({
        orderId: p.orderId,
        provider: p.provider,
        statusInDb: p.status,
        actionTaken,
      });
    }

    return {
      reconciledCount: openPayments.length,
      actions: report,
      timestamp: new Date().toISOString(),
    };
  }
}

export const paymentService = new PaymentService();
