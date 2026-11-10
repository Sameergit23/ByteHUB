import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { validateRequest } from "../validators/validate.middleware.js";
import { contactRateLimiter } from "../middleware/rateLimiter.js";

/**
 * Public contact endpoints (no sign-in required, rate limited).
 * Both forms land in the ContactMessage table that the admin panel reads.
 */

export const ContactMessageSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(100),
  email: z.string().trim().email("Valid email address is required").max(200),
  topic: z.string().trim().min(2).max(80),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(4000),
});

export const CompanyInquirySchema = z.object({
  companyName: z.string().trim().min(2, "Company name is required").max(120),
  contactName: z.string().trim().min(2, "Contact name is required").max(100),
  workEmail: z.string().trim().email("Valid work email is required").max(200),
  roleTitle: z.string().trim().min(2, "Role title is required").max(120),
  track: z.string().trim().max(60).optional().default(""),
  mode: z.string().trim().max(40).optional().default(""),
  openings: z
    .union([z.string().trim().max(10), z.number()])
    .optional()
    .default("1"),
  techStack: z.string().trim().max(500).optional().default(""),
  notes: z.string().trim().max(3000).optional().default(""),
});

export const contactRouter: Router = Router();
export const inquiriesRouter: Router = Router();

contactRouter.post(
  "/",
  contactRateLimiter,
  validateRequest({ body: ContactMessageSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fullName, email, topic, message } = req.body as z.infer<
        typeof ContactMessageSchema
      >;

      const saved = await prisma.contactMessage.create({
        data: { fullName, email: email.toLowerCase(), topic, message },
        select: { id: true, createdAt: true },
      });

      res.status(201).json({
        status: "success",
        data: { id: saved.id, receivedAt: saved.createdAt },
      });
    } catch (err) {
      next(err);
    }
  }
);

inquiriesRouter.post(
  "/",
  contactRateLimiter,
  validateRequest({ body: CompanyInquirySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as z.infer<typeof CompanyInquirySchema>;

      const message = [
        `Company: ${body.companyName}`,
        `Role: ${body.roleTitle}`,
        `Track: ${body.track || "—"}`,
        `Mode: ${body.mode || "—"}`,
        `Openings: ${body.openings || "1"}`,
        `Tech stack: ${body.techStack || "—"}`,
        "",
        body.notes || "(no additional notes)",
      ].join("\n");

      const saved = await prisma.contactMessage.create({
        data: {
          fullName: `${body.contactName} (${body.companyName})`.slice(0, 200),
          email: body.workEmail.toLowerCase(),
          topic: "Company Hiring Inquiry",
          message,
        },
        select: { id: true, createdAt: true },
      });

      res.status(201).json({
        status: "success",
        data: { id: saved.id, receivedAt: saved.createdAt },
      });
    } catch (err) {
      next(err);
    }
  }
);
