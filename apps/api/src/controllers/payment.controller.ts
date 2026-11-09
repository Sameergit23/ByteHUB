import { Request, Response, NextFunction } from "express";
import { paymentService } from "../services/paymentService.js";
import { paymentRepository } from "../repositories/payment.repository.js";

export class PaymentController {
  static async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await paymentService.createPaymentOrder(req.user!.userId, req.body);
      res.status(201).json({ status: "success", data });
    } catch (err) {
      next(err);
    }
  }

  static async verifyRazorpay(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await paymentService.verifyAndFulfillRazorpay(req.user!.userId, req.body);
      res.status(200).json({ status: "success", data });
    } catch (err) {
      next(err);
    }
  }

  static async verifyStripe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await paymentService.verifyAndFulfillStripe(req.user!.userId, req.body);
      res.status(200).json({ status: "success", data });
    } catch (err) {
      next(err);
    }
  }

  static async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await paymentRepository.findUserHistory(req.user!.userId);
      res.status(200).json({ status: "success", data });
    } catch (err) {
      next(err);
    }
  }
}

