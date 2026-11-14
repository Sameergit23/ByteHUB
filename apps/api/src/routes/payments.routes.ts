import { Router, raw } from "express";
import { PaymentController } from "../controllers/payment.controller.js";
import { authenticateJWT, requireRoles } from "../middleware/auth.js";
import { requirePermission, requireStaff, staffOnlyNeeds } from "../middleware/staff.js";
import { paymentRateLimiter } from "../middleware/rateLimiter.js";

export const paymentsRouter: Router = Router();

// ---------------------------------------------------------------------------
// 1. Webhooks (Mount express.raw for raw body verification; CSRF bypassed)
// ---------------------------------------------------------------------------
paymentsRouter.post(
  "/webhooks/cashfree",
  raw({ type: "*/*" }),
  PaymentController.cashfreeWebhook
);

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
// Order creation is the abuse-sensitive step, so it carries the strict per-user limit.
paymentsRouter.post(
  "/create-intent",
  authenticateJWT,
  paymentRateLimiter,
  PaymentController.createIntent
);

// Internship registration fee for one of the student's own applications.
paymentsRouter.post(
  "/internship-fee",
  authenticateJWT,
  requireRoles("STUDENT", "ADMIN"),
  paymentRateLimiter,
  PaymentController.createInternshipFeeIntent
);

paymentsRouter.post(
  "/cashfree/verify-client",
  authenticateJWT,
  PaymentController.verifyCashfreeClient
);

paymentsRouter.post(
  "/razorpay/verify-client",
  authenticateJWT,
  PaymentController.verifyClient
);

// ---------------------------------------------------------------------------
// 3. Status Polling & Invoices (Source of truth is polling our verified state)
// ---------------------------------------------------------------------------
paymentsRouter.get("/my", authenticateJWT, PaymentController.listMine);

paymentsRouter.get(
  "/status/:orderId",
  authenticateJWT,
  staffOnlyNeeds("payments.view"),
  PaymentController.getStatus
);

paymentsRouter.get(
  "/:orderId/invoice",
  authenticateJWT,
  staffOnlyNeeds("payments.view"),
  PaymentController.downloadInvoice
);

// ---------------------------------------------------------------------------
// 4. Admin Management (Refunds & Reconciliation)
// ---------------------------------------------------------------------------
paymentsRouter.post(
  "/refund",
  authenticateJWT,
  requireStaff(),
  requirePermission("payments.refund"),
  PaymentController.refund
);

paymentsRouter.post(
  "/jobs/reconcile",
  authenticateJWT,
  requireStaff(),
  requirePermission("payments.refund"),
  PaymentController.reconcile
);
