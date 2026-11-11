import { Router, Request, Response, NextFunction } from "express";
import { certificateService } from "../services/certificate.service.js";
import { AppError } from "../utils/apiError.js";

/**
 * Public certificate verification: anyone with a certificate ID (an employer, say) can check
 * that it is genuine. Only details printed on the certificate itself are returned.
 */
export const certificatesRouter: Router = Router();

const CODE_PATTERN = /^[A-Z0-9-]{6,40}$/i;

certificatesRouter.get(
  "/:code",
  (req: Request<{ code: string }>, res: Response, next: NextFunction): void => {
    const code = req.params.code.trim();
    if (!CODE_PATTERN.test(code)) {
      next(AppError.notFound("No certificate exists with this ID."));
      return;
    }
    certificateService
      .verify(code)
      .then((certificate) => {
        if (!certificate) throw AppError.notFound("No certificate exists with this ID.");
        res.setHeader("Cache-Control", "public, max-age=300");
        res.status(200).json({ status: "success", data: certificate });
      })
      .catch(next);
  }
);
