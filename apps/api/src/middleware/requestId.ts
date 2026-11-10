import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Express type augmentation
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const existingId = req.headers["x-request-id"] as string | undefined;
  const id = existingId || crypto.randomUUID();

  req.id = id;
  res.setHeader("X-Request-Id", id);
  next();
}
