import { Router } from "express";
import { PaymentController } from "../controllers/payment.controller.js";
import { validateRequest } from "../validators/validate.middleware.js";
import { authenticateJWT } from "../middleware/auth.js";
import {
  CreateOrderRequestSchema,
  VerifyRazorpayPaymentSchema,
  VerifyStripePaymentSchema,
} from "@bytehub/shared";

export const paymentsRouter = Router();

paymentsRouter.post(
  "/create-order",
  authenticateJWT,
  validateRequest({ body: CreateOrderRequestSchema }),
  PaymentController.createOrder
);

paymentsRouter.post(
  "/razorpay/verify",
  authenticateJWT,
  validateRequest({ body: VerifyRazorpayPaymentSchema }),
  PaymentController.verifyRazorpay
);

paymentsRouter.post(
  "/stripe/verify",
  authenticateJWT,
  validateRequest({ body: VerifyStripePaymentSchema }),
  PaymentController.verifyStripe
);

paymentsRouter.get(
  "/history",
  authenticateJWT,
  PaymentController.getHistory
);
