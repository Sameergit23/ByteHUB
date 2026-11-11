import { Request, Response, NextFunction } from "express";
import { paymentService } from "../services/paymentService.js";
import { AppError } from "../utils/apiError.js";

export class PaymentController {
  /**
   * POST /api/payments/create-intent
   * Creates a provider order or PaymentIntent with server-enforced pricing.
   */
  static async createIntent(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw AppError.unauthorized("Authentication required.");
      }

      const { cohortId, provider } = req.body;
      const idempotencyKey =
        (req.headers["x-idempotency-key"] as string) || req.body.idempotencyKey;

      if (!cohortId) {
        throw AppError.badRequest("cohortId is required.");
      }
      if (!idempotencyKey) {
        throw AppError.badRequest(
          "X-Idempotency-Key header or idempotencyKey body field is required."
        );
      }

      const data = await paymentService.createPaymentIntent(userId, {
        cohortId,
        provider,
        idempotencyKey,
      });

      res.status(201).json({ status: "success", data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/payments/internship-fee
   * Starts the checkout for an internship's registration fee. The amount comes from the database.
   */
  static async createInternshipFeeIntent(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw AppError.unauthorized("Authentication required.");
      }
      const applicationId = req.body?.applicationId;
      if (!applicationId || typeof applicationId !== "string") {
        throw AppError.badRequest("applicationId is required.");
      }
      const data = await paymentService.createApplicationFeeIntent(userId, applicationId);
      res.status(201).json({ status: "success", data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/payments/webhooks/cashfree
   * Raw request body verified against x-webhook-signature and x-webhook-timestamp.
   */
  static async cashfreeWebhook(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const signatureHeader = req.headers["x-webhook-signature"] as string;
      const timestampHeader = req.headers["x-webhook-timestamp"] as string;
      const rawBody = req.rawBody || req.body;

      const result = await paymentService.handleCashfreeWebhook(
        rawBody,
        signatureHeader,
        timestampHeader
      );
      res.status(200).json({ status: "success", data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/payments/webhooks/razorpay
   * Raw request body verified against X-Razorpay-Signature HMAC SHA256.
   */
  static async razorpayWebhook(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const signatureHeader = req.headers["x-razorpay-signature"] as string;
      if (!signatureHeader) {
        res.status(400).json({
          error: {
            code: "MISSING_SIGNATURE",
            message: "Missing X-Razorpay-Signature header.",
          },
        });
        return;
      }

      // Use rawBody buffer captured by express.raw or verify middleware
      const rawBody = req.rawBody || req.body;

      const result = await paymentService.handleRazorpayWebhook(rawBody, signatureHeader);
      res.status(200).json({ status: "success", data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/payments/webhooks/stripe
   * Raw request body verified against Stripe-Signature header.
   */
  static async stripeWebhook(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const signatureHeader = req.headers["stripe-signature"] as string;
      if (!signatureHeader) {
        res.status(400).json({
          error: {
            code: "MISSING_SIGNATURE",
            message: "Missing Stripe-Signature header.",
          },
        });
        return;
      }

      const rawBody = req.rawBody || req.body;

      const result = await paymentService.handleStripeWebhook(rawBody, signatureHeader);
      res.status(200).json({ status: "success", data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/payments/razorpay/verify-client
   * Immediate callback for client modal UI while webhook confirms in background.
   */
  static async verifyClient(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      const { orderId, razorpayPaymentId, razorpaySignature } = req.body;
      const data = await paymentService.verifyClientCheckout({
        orderId,
        razorpayPaymentId,
        razorpaySignature,
        requestingUserId: userId,
      });
      res.status(200).json({ status: "success", data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/payments/cashfree/verify-client
   * Instant confirmation callback after Cashfree checkout completion.
   */
  static async verifyCashfreeClient(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      const { orderId } = req.body;
      const data = await paymentService.verifyCashfreeClient({
        orderId,
        requestingUserId: userId,
      });
      res.status(200).json({ status: "success", data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/payments/my
   * The signed-in user's own payment history.
   */
  static async listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw AppError.unauthorized("Authentication required.");
      }
      const data = await paymentService.listUserPayments(userId);
      res.status(200).json({ status: "success", data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/payments/status/:orderId
   * Polled by client success page (source of truth is the verified webhook).
   */
  static async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const orderId = req.params.orderId;
      if (!orderId) {
        throw new AppError("Order ID is required", 400, "BAD_REQUEST");
      }

      const data = await paymentService.getPaymentStatus(orderId, userId, userRole);
      res.status(200).json({ status: "success", data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/payments/:orderId/invoice
   * Downloads tax receipt / invoice PDF with [GST DETAILS] placeholder.
   */
  static async downloadInvoice(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const orderId = req.params.orderId;
      if (!orderId) {
        throw new AppError("Order ID is required", 400, "BAD_REQUEST");
      }

      const pdfBuffer = await paymentService.downloadInvoicePdf(
        orderId,
        userId,
        userRole
      );

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="ByteHUB_Invoice_${orderId}.pdf"`
      );
      res.status(200).send(pdfBuffer);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/payments/refund (Admin Only)
   * Process partial or full refund with state transition enforcement and Audit Log.
   */
  static async refund(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminUserId = req.user!.id;
      const adminRole = req.user?.role;

      if (adminRole !== "ADMIN") {
        throw AppError.forbidden(
          "Access denied: Admin privileges required to issue refunds."
        );
      }

      const { paymentId, amount, reason } = req.body;
      const result = await paymentService.processRefund(adminUserId, {
        paymentId,
        amount,
        reason,
      });

      res.status(200).json({ status: "success", data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/payments/jobs/reconcile (Admin / Cron)
   * Nightly reconciliation comparing database state with provider records.
   */
  static async reconcile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminRole = req.user?.role;
      if (adminRole !== "ADMIN") {
        throw AppError.forbidden("Admin role required to trigger reconciliation.");
      }

      const report = await paymentService.reconcileNightly();
      res.status(200).json({ status: "success", data: report });
    } catch (err) {
      next(err);
    }
  }
}
