import { Router, raw } from "express";
import { PaymentController } from "../controllers/payment.controller.js";
import { authenticateJWT, requireRole } from "../middleware/auth.js";

export const paymentsRouter = Router();

// ---------------------------------------------------------------------------
// 1. Webhooks (Mount express.raw for raw body verification; CSRF bypassed)
// ---------------------------------------------------------------------------
paymentsRouter.post(
  "/webhooks/razorpay",
  raw({ type: "*/*" }),
  PaymentController.razorpayWebhook
);

paymentsRouter.post(
  "/webhooks/stripe",
  raw({ type: "*/*" }),
  PaymentController.stripeWebhook
);

// ---------------------------------------------------------------------------
// 2. Client Payment Creation & Checkout
// ---------------------------------------------------------------------------
paymentsRouter.post(
  "/create-intent",
  authenticateJWT,
  PaymentController.createIntent
);

paymentsRouter.post(
  "/razorpay/verify-client",
  authenticateJWT,
  PaymentController.verifyClient
);

// ---------------------------------------------------------------------------
// 3. Status Polling & Invoices (Source of truth is polling our verified state)
// ---------------------------------------------------------------------------
paymentsRouter.get(
  "/status/:orderId",
  authenticateJWT,
  PaymentController.getStatus
);

paymentsRouter.get(
  "/:orderId/invoice",
  authenticateJWT,
  PaymentController.downloadInvoice
);

// ---------------------------------------------------------------------------
// 4. Admin Management (Refunds & Reconciliation)
// ---------------------------------------------------------------------------
paymentsRouter.post(
  "/refund",
  authenticateJWT,
  requireRole(["ADMIN"]),
  PaymentController.refund
);

paymentsRouter.post(
  "/jobs/reconcile",
  authenticateJWT,
  requireRole(["ADMIN"]),
  PaymentController.reconcile
);
