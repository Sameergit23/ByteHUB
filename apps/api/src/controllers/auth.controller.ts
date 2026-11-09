import { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service.js";

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({ status: "success", data: result });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body);
      res.status(200).json({ status: "success", data: result });
    } catch (err) {
      next(err);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.getProfile(req.user!.userId);
      res.status(200).json({ status: "success", data: user });
    } catch (err) {
      next(err);
    }
  }
}

