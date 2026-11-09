import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";
import { validateBody } from "../middleware/validate.js";
import { authenticateJWT } from "../middleware/auth.js";
import { paymentService } from "../services/paymentService.js";
import {
  CreateOrderRequestSchema,
  VerifyRazorpayPaymentSchema,
  VerifyStripePaymentSchema,
} from "@bytehub/shared";

export const paymentsRouter = Router();

paymentsRouter.post(
  "/create-order",
  authenticateJWT,
  validateBody(CreateOrderRequestSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const order = await paymentService.createPaymentOrder(
        req.user!.userId,
        req.body
      );
      res.status(201).json({
        status: "success",
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }
);

paymentsRouter.post(
  "/razorpay/verify",
  authenticateJWT,
  validateBody(VerifyRazorpayPaymentSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await paymentService.verifyAndFulfillRazorpay(
        req.user!.userId,
        req.body
      );
      res.status(200).json({
        status: "success",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

paymentsRouter.post(
  "/stripe/verify",
  authenticateJWT,
  validateBody(VerifyStripePaymentSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await paymentService.verifyAndFulfillStripe(
        req.user!.userId,
        req.body
      );
      res.status(200).json({
        status: "success",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

paymentsRouter.get(
  "/history",
  authenticateJWT,
  async (req: Request, res: Response): Promise<void> => {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user!.userId },
      include: {
        program: {
          select: {
            title: true,
            track: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      status: "success",
      data: payments,
    });
  }
);
