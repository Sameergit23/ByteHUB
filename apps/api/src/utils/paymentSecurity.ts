import crypto from "node:crypto";
import { AppError } from "./apiError.js";

export class AmountTamperingError extends AppError {
  constructor(expectedAmount: number, receivedAmount: number, orderId?: string) {
    super(
      `SECURITY ALERT: Payment amount tampering detected for order '${orderId}'. Expected ${expectedAmount}, received ${receivedAmount}. Transaction aborted.`,
      400,
      "AMOUNT_TAMPERED"
    );
  }
}

export function timingSafeStringCompare(a: string, b: string): boolean {
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

export function verifyRazorpayWebhookSignature(
  rawBody: Buffer | string,
  signatureHeader: string,
  webhookSecret: string
): boolean {
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

export function verifyRazorpayPaymentSignature(
  orderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
  keySecret: string
): boolean {
  if (!orderId || !razorpayPaymentId || !razorpaySignature || !keySecret) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${razorpayPaymentId}`)
    .digest("hex");

  return timingSafeStringCompare(expectedSignature, razorpaySignature.trim());
}

export function verifyStripeWebhookSignature(
  rawBody: Buffer | string,
  signatureHeader: string,
  webhookSecret: string,
  toleranceSeconds = 300
): boolean {
  if (!rawBody || !signatureHeader || !webhookSecret) {
    return false;
  }

  const parts = signatureHeader.split(",");
  let timestamp = "";
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.trim().split("=");
    if (key === "t") timestamp = value;
    if (key === "v1") signatures.push(value);
  }

  if (!timestamp || signatures.length === 0) {
    return false;
  }

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

export function assertAmountIntegrity(
  expectedAmount: number,
  receivedAmount: number,
  orderId?: string
): boolean {
  if (Number(expectedAmount) !== Number(receivedAmount)) {
    throw new AmountTamperingError(expectedAmount, receivedAmount, orderId);
  }
  return true;
}
