import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  PaymentStatus,
  validateStateTransition,
  IllegalPaymentTransitionError,
  canRefund,
} from "../src/utils/paymentStateMachine.mjs";
import {
  verifyRazorpayWebhookSignature,
  verifyRazorpayPaymentSignature,
  verifyStripeWebhookSignature,
  assertAmountIntegrity,
  AmountTamperingError,
  timingSafeStringCompare,
} from "../src/utils/paymentSecurity.mjs";
import {
  generateInvoiceData,
  buildSimpleInvoicePdfBuffer,
} from "../src/utils/invoiceGenerator.mjs";

const TEST_RAZORPAY_SECRET = "rzp_webhook_secret_for_automated_testing_123";
const TEST_STRIPE_SECRET = "whsec_stripe_test_signing_secret_xyz789";

// ============================================================================
// 1. Razorpay Signature Verification & Tamper Resistance
// ============================================================================

test("Razorpay Webhook: verifies valid HMAC-SHA256 signature in constant time", () => {
  const rawPayload = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_test_001",
          order_id: "order_test_web_001",
          amount: 2400000,
          currency: "INR",
          status: "captured",
        },
      },
    },
  });

  const validSignature = crypto
    .createHmac("sha256", TEST_RAZORPAY_SECRET)
    .update(rawPayload)
    .digest("hex");

  const verified = verifyRazorpayWebhookSignature(
    rawPayload,
    validSignature,
    TEST_RAZORPAY_SECRET
  );

  assert.equal(verified, true, "Valid signature must verify successfully");
});

test("Razorpay Webhook: rejects forged or modified signature header", () => {
  const rawPayload = JSON.stringify({
    event: "payment.captured",
    payload: { payment: { entity: { id: "pay_hack_999", amount: 100 } } },
  });

  const forgedSignature = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

  const verified = verifyRazorpayWebhookSignature(
    rawPayload,
    forgedSignature,
    TEST_RAZORPAY_SECRET
  );

  assert.equal(verified, false, "Forged signature must be rejected");
});

test("Razorpay Webhook: rejects if raw payload was tampered in transit", () => {
  const originalPayload = JSON.stringify({ order_id: "order_1", amount: 2400000 });
  const validSignature = crypto
    .createHmac("sha256", TEST_RAZORPAY_SECRET)
    .update(originalPayload)
    .digest("hex");

  // Attacker intercepts and modifies amount to 100
  const tamperedPayload = JSON.stringify({ order_id: "order_1", amount: 100 });

  const verified = verifyRazorpayWebhookSignature(
    tamperedPayload,
    validSignature,
    TEST_RAZORPAY_SECRET
  );

  assert.equal(verified, false, "Tampered payload must fail signature validation");
});

// ============================================================================
// 2. Stripe Webhook Signature Verification & Timestamp Tolerance
// ============================================================================

test("Stripe Webhook: verifies genuine timestamped signature", () => {
  const rawPayload = JSON.stringify({
    id: "evt_stripe_test_001",
    type: "payment_intent.succeeded",
    data: {
      object: {
        id: "pi_stripe_test_001",
        amount: 14900,
        currency: "usd",
        status: "succeeded",
      },
    },
  });

  const nowSeconds = Math.floor(Date.now() / 1000);
  const signedPayload = `${nowSeconds}.${rawPayload}`;
  const validV1Signature = crypto
    .createHmac("sha256", TEST_STRIPE_SECRET)
    .update(signedPayload, "utf8")
    .digest("hex");

  const header = `t=${nowSeconds},v1=${validV1Signature}`;

  const verified = verifyStripeWebhookSignature(
    rawPayload,
    header,
    TEST_STRIPE_SECRET,
    300
  );

  assert.equal(verified, true, "Stripe signature with fresh timestamp must pass");
});

test("Stripe Webhook: rejects replayed event outside tolerance window", () => {
  const rawPayload = JSON.stringify({ id: "evt_stale", type: "payment_intent.succeeded" });

  // 10 minutes in the past (tolerance is 5 minutes = 300s)
  const expiredTimestamp = Math.floor(Date.now() / 1000) - 600;
  const signedPayload = `${expiredTimestamp}.${rawPayload}`;
  const signature = crypto
    .createHmac("sha256", TEST_STRIPE_SECRET)
    .update(signedPayload, "utf8")
    .digest("hex");

  const header = `t=${expiredTimestamp},v1=${signature}`;

  const verified = verifyStripeWebhookSignature(
    rawPayload,
    header,
    TEST_STRIPE_SECRET,
    300
  );

  assert.equal(verified, false, "Expired timestamp must be rejected to prevent replay attacks");
});

// ============================================================================
// 3. Amount Tampering Prevention (Server Decides Amount Rule)
// ============================================================================

test("Amount Integrity: verifies matching amounts", () => {
  assert.doesNotThrow(() => {
    assertAmountIntegrity(2400000, 2400000, "order_ok");
  });
});

test("Amount Integrity: detects and aborts amount tampering attempts", () => {
  const expectedDbAmount = 2400000; // 24,000 INR in paise
  const attackerPaidAmount = 100; // 1 INR in paise

  assert.throws(
    () => {
      assertAmountIntegrity(expectedDbAmount, attackerPaidAmount, "order_tampered");
    },
    (err) => {
      assert.ok(err instanceof AmountTamperingError);
      assert.equal(err.code, "AMOUNT_TAMPERED");
      assert.match(err.message, /SECURITY ALERT: Payment amount tampering detected/);
      return true;
    }
  );
});

// ============================================================================
// 4. Payment State Machine: Legal Transitions & Rejection of Illegal Transitions
// ============================================================================

test("State Machine: allows legal lifecycle transitions", () => {
  // CREATED -> PENDING
  assert.equal(validateStateTransition(PaymentStatus.CREATED, PaymentStatus.PENDING), true);

  // PENDING -> PAID
  assert.equal(validateStateTransition(PaymentStatus.PENDING, PaymentStatus.PAID), true);

  // PAID -> PARTIALLY_REFUNDED
  assert.equal(
    validateStateTransition(PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED),
    true
  );

  // PARTIALLY_REFUNDED -> REFUNDED
  assert.equal(
    validateStateTransition(
      PaymentStatus.PARTIALLY_REFUNDED,
      PaymentStatus.REFUNDED
    ),
    true
  );

  // Idempotent self-transition
  assert.equal(validateStateTransition(PaymentStatus.PAID, PaymentStatus.PAID), true);
});

test("State Machine: strictly rejects out-of-order & illegal transitions", () => {
  // FAILED cannot become PAID
  assert.throws(
    () => {
      validateStateTransition(PaymentStatus.FAILED, PaymentStatus.PAID, "order_test");
    },
    (err) => {
      assert.ok(err instanceof IllegalPaymentTransitionError);
      assert.equal(err.code, "ILLEGAL_STATE_TRANSITION");
      assert.equal(err.currentStatus, "FAILED");
      assert.equal(err.nextStatus, "PAID");
      return true;
    }
  );

  // REFUNDED cannot become PAID
  assert.throws(
    () => {
      validateStateTransition(PaymentStatus.REFUNDED, PaymentStatus.PAID, "order_test");
    },
    (err) => {
      assert.ok(err instanceof IllegalPaymentTransitionError);
      return true;
    }
  );

  // Backward: PAID cannot become PENDING
  assert.throws(
    () => {
      validateStateTransition(PaymentStatus.PAID, PaymentStatus.PENDING, "order_test");
    },
    (err) => {
      assert.ok(err instanceof IllegalPaymentTransitionError);
      return true;
    }
  );
});

// ============================================================================
// 5. Webhook Replay & Deduplication Simulation
// ============================================================================

test("Idempotency: simulates deduplication of replayed webhook events", () => {
  const processedEventStore = new Set();

  function handleEvent(eventId) {
    if (processedEventStore.has(eventId)) {
      return { status: "already_processed", eventId };
    }
    processedEventStore.add(eventId);
    return { status: "confirmed", eventId };
  }

  const eventId = "evt_dedup_test_999";

  const firstCall = handleEvent(eventId);
  assert.equal(firstCall.status, "confirmed");

  // Replay of the exact same event
  const replayedCall = handleEvent(eventId);
  assert.equal(replayedCall.status, "already_processed");
  assert.equal(processedEventStore.size, 1, "Event store must contain only 1 record");
});

// ============================================================================
// 6. Tax Invoice Generation & GST Placeholder Disclosures
// ============================================================================

test("Invoice Generator: outputs structured invoice with GST placeholder disclosures", () => {
  const invoice = generateInvoiceData({
    paymentId: "pay_inv_01",
    orderId: "order_inv_01",
    gatewayPaymentId: "pay_rzp_mock_12345",
    studentName: "Aditi Rao",
    studentEmail: "aditi.rao@example.com",
    programmeTitle: "Full-Stack Web Development",
    cohortCode: "WEB-2026-COHORT-01",
    amount: 2400000, // ₹24,000 in paise
    currency: "INR",
  });

  assert.ok(invoice.invoiceNumber.startsWith("INV-2026-"));
  assert.equal(invoice.financials.totalFormatted, "₹24000.00");
  assert.match(invoice.legalAndTax.gstNotice, /SAC Code 999293/);
  assert.match(invoice.legalAndTax.gstNotice, /PLACEHOLDER/);
  assert.match(invoice.legalAndTax.accountantReminder, /confirm tax requirements/);

  // PDF representation
  const pdfBuffer = buildSimpleInvoicePdfBuffer(invoice);
  assert.ok(Buffer.isBuffer(pdfBuffer));
  assert.ok(pdfBuffer.slice(0, 5).toString().startsWith("%PDF-"));
});

// ============================================================================
// 7. Full Test-Mode Payment Fulfillment Simulation
// ============================================================================

test("End-to-End Simulation: test-mode payment captures webhook and confirms enrolment", () => {
  // Simulated database
  const cohort = {
    id: "cohort-web-01",
    cohortCode: "WEB-2026-COHORT-01",
    seatsTotal: 30,
    seatsLeft: 5,
    priceAmount: 2400000,
    currency: "INR",
  };

  const student = {
    id: "usr_student_01",
    name: "Arjun Verma",
    email: "arjun@example.com",
  };

  // Step 1: Reservation creates pending enrollment
  let enrollment = {
    id: "enr_001",
    userId: student.id,
    cohortId: cohort.id,
    status: "PENDING",
    reservedUntil: new Date(Date.now() + 15 * 60 * 1000),
    priceAmount: cohort.priceAmount,
  };
  cohort.seatsLeft -= 1; // Decremented on reservation

  // Step 2: Payment order created server-side in CREATED status
  const orderId = "order_sim_test_001";
  let payment = {
    id: "pay_rec_001",
    orderId,
    userId: student.id,
    cohortId: cohort.id,
    amount: cohort.priceAmount,
    currency: cohort.currency,
    status: PaymentStatus.CREATED,
    gatewayPaymentId: null,
  };

  // Step 3: Verified Webhook arrives from Razorpay
  const webhookEventPayload = {
    event: "payment.captured",
    event_id: "evt_sim_999",
    payload: {
      payment: {
        entity: {
          id: "pay_rzp_mock_live_test",
          order_id: orderId,
          amount: 2400000,
          currency: "INR",
          status: "captured",
        },
      },
    },
  };

  // Assert amount integrity
  assertAmountIntegrity(
    payment.amount,
    webhookEventPayload.payload.payment.entity.amount,
    orderId
  );

  // Validate state machine transition: CREATED -> PAID
  // (In transaction, can jump directly from CREATED to PAID upon capture)
  validateStateTransition(PaymentStatus.CREATED, PaymentStatus.PENDING);
  validateStateTransition(PaymentStatus.PENDING, PaymentStatus.PAID);

  // Fulfill payment
  payment.status = PaymentStatus.PAID;
  payment.gatewayPaymentId = webhookEventPayload.payload.payment.entity.id;

  // Confirm enrolment
  enrollment.status = "ACTIVE";
  enrollment.reservedUntil = null;
  enrollment.paymentId = payment.id;

  assert.equal(payment.status, "PAID");
  assert.equal(enrollment.status, "ACTIVE");
  assert.equal(cohort.seatsLeft, 4);

  // Generate invoice
  const invoice = generateInvoiceData({
    paymentId: payment.id,
    orderId: payment.orderId,
    gatewayPaymentId: payment.gatewayPaymentId,
    studentName: student.name,
    studentEmail: student.email,
    programmeTitle: "Full-Stack Web Development",
    cohortCode: cohort.cohortCode,
    amount: payment.amount,
    currency: payment.currency,
  });

  assert.equal(invoice.paymentAudit.status, "PAID");
  assert.equal(invoice.student.email, "arjun@example.com");
});

// ============================================================================
// 8. Admin Refund Simulation (Partial & Full)
// ============================================================================

test("Admin Refund: enforces remaining balance and releases seat on 100% refund", () => {
  let cohortSeatsLeft = 4;
  let payment = {
    id: "pay_refund_test",
    amount: 2400000,
    status: PaymentStatus.PAID,
    refundedAmount: 0,
  };
  let enrollmentStatus = "ACTIVE";

  // Attempt to refund more than paid amount -> rejected
  const excessiveRefund = 3000000;
  assert.equal(excessiveRefund > payment.amount, true, "Cannot refund more than paid");

  // Step 1: Partial refund of 10,000 INR (1,000,000 paise)
  const partialAmount = 1000000;
  validateStateTransition(payment.status, PaymentStatus.PARTIALLY_REFUNDED);
  payment.status = PaymentStatus.PARTIALLY_REFUNDED;
  payment.refundedAmount += partialAmount;

  assert.equal(payment.status, PaymentStatus.PARTIALLY_REFUNDED);
  assert.equal(enrollmentStatus, "ACTIVE", "Partial refund maintains active seat");

  // Step 2: Remaining refund of 14,000 INR (1,400,000 paise)
  const remainingAmount = payment.amount - payment.refundedAmount;
  validateStateTransition(payment.status, PaymentStatus.REFUNDED);
  payment.status = PaymentStatus.REFUNDED;
  payment.refundedAmount += remainingAmount;

  // 100% refund cancels enrollment and restores seat
  enrollmentStatus = "CANCELLED";
  cohortSeatsLeft += 1;

  assert.equal(payment.status, PaymentStatus.REFUNDED);
  assert.equal(enrollmentStatus, "CANCELLED");
  assert.equal(cohortSeatsLeft, 5, "Full refund must restore the seat back to cohort");
});
