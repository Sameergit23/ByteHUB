import { z } from "zod";

export const PaymentProviderSchema = z.enum(["RAZORPAY", "STRIPE"]);
export type PaymentProvider = z.infer<typeof PaymentProviderSchema>;

export const PaymentStatusSchema = z.enum([
  "PENDING",
  "SUCCESS",
  "FAILED",
  "REFUNDED",
]);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

export const CreateOrderRequestSchema = z.object({
  programId: z.string().min(1, "Program ID is required"),
  provider: PaymentProviderSchema,
  currency: z.enum(["INR", "USD"]),
  idempotencyKey: z.string().min(8, "Idempotency key required"),
});
export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;

export const VerifyRazorpayPaymentSchema = z.object({
  orderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
  programId: z.string().min(1),
});
export type VerifyRazorpayPaymentInput = z.infer<typeof VerifyRazorpayPaymentSchema>;

export const VerifyStripePaymentSchema = z.object({
  paymentIntentId: z.string().min(1),
  programId: z.string().min(1),
});
export type VerifyStripePaymentInput = z.infer<typeof VerifyStripePaymentSchema>;

export const PaymentRecordSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  userId: z.string(),
  programId: z.string(),
  provider: PaymentProviderSchema,
  amount: z.number().int().positive(),
  currency: z.enum(["INR", "USD"]),
  status: PaymentStatusSchema,
  gatewayTransactionId: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type PaymentRecord = z.infer<typeof PaymentRecordSchema>;
