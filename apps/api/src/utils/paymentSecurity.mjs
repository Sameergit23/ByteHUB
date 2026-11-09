import crypto from "node:crypto";

export class AmountTamperingError extends Error {
  constructor(expectedAmount, receivedAmount, orderId) {
    super(
      `SECURITY ALERT: Payment amount tampering detected for order '${orderId}'. Expected ${expectedAmount}, received ${receivedAmount}. Transaction aborted.`
    );
    this.name = "AmountTamperingError";
    this.code = "AMOUNT_TAMPERED";
    this.statusCode = 400;
    this.expectedAmount = expectedAmount;
    this.receivedAmount = receivedAmount;
  }
}

/**
 * Constant-time comparison between two strings to avoid timing attack leakage.
 */
export function timingSafeStringCompare(a, b) {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");

  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verifies Razorpay Webhook signature against raw request body
 * Header: X-Razorpay-Signature
 */
export function verifyRazorpayWebhookSignature(rawBody, signatureHeader, webhookSecret) {
  if (!rawBody || !signatureHeader || !webhookSecret) {
    return false;
  }

  const payload = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, "utf8");
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(payload)
    .digest("hex");

  return timingSafeStringCompare(expectedSignature, signatureHeader.trim());
}

/**
 * Verifies Razorpay payment signature from client checkout modal
 * Signature is computed from orderId|paymentId
 */
export function verifyRazorpayPaymentSignature(orderId, razorpayPaymentId, razorpaySignature, keySecret) {
  if (!orderId || !razorpayPaymentId || !razorpaySignature || !keySecret) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${razorpayPaymentId}`)
    .digest("hex");

  return timingSafeStringCompare(expectedSignature, razorpaySignature.trim());
}

/**
 * Verifies Stripe Webhook signature header
 * Header: Stripe-Signature: t=1614562000,v1=5257a869e7eceefe...
 */
export function verifyStripeWebhookSignature(rawBody, signatureHeader, webhookSecret, toleranceSeconds = 300) {
  if (!rawBody || !signatureHeader || !webhookSecret) {
    return false;
  }

  // Parse header
  const parts = signatureHeader.split(",");
  let timestamp = "";
  const signatures = [];

  for (const part of parts) {
    const [key, value] = part.trim().split("=");
    if (key === "t") timestamp = value;
    if (key === "v1") signatures.push(value);
  }

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  // Check tolerance against replay attack
  const eventTime = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (isNaN(eventTime) || Math.abs(now - eventTime) > toleranceSeconds) {
    return false;
  }

  const payload = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody;
  const signedPayload = `${timestamp}.${payload}`;

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(signedPayload, "utf8")
    .digest("hex");

  return signatures.some((sig) => timingSafeStringCompare(expectedSignature, sig));
}

/**
 * Validates that the amount received in a payment webhook matches the database order amount.
 * Never trust the amount sent from outside.
 */
export function assertAmountIntegrity(expectedAmount, receivedAmount, orderId) {
  if (Number(expectedAmount) !== Number(receivedAmount)) {
    throw new AmountTamperingError(expectedAmount, receivedAmount, orderId);
  }
  return true;
}
