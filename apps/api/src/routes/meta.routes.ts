import { Router, Request, Response, NextFunction } from "express";
import { AppError } from "../utils/apiError.js";
import { logger } from "../utils/logger.js";

/**
 * Small public lookups used by forms.
 *
 * GET /api/meta/pincode/:pin — city, state and localities for an Indian PIN code, from India
 * Post's free public directory (api.postalpincode.in). Called through our server so the browser
 * only talks to ByteHUB, and cached because PIN codes almost never change.
 */
export const metaRouter: Router = Router();

interface PincodeInfo {
  pincode: string;
  city: string;
  state: string;
  country: "India";
  localities: string[];
}

interface IndiaPostOffice {
  Name?: string;
  District?: string;
  State?: string;
}

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_MAX = 5000;
const cache = new Map<string, { at: number; info: PincodeInfo | null }>();

async function lookupPincode(pin: string): Promise<PincodeInfo | null> {
  const hit = cache.get(pin);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.info;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  let body: unknown;
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`India Post lookup returned ${res.status}`);
    body = await res.json();
  } finally {
    clearTimeout(timer);
  }

  const first = Array.isArray(body)
    ? (body[0] as { Status?: string; PostOffice?: IndiaPostOffice[] | null })
    : null;
  const offices =
    first?.Status === "Success" && Array.isArray(first.PostOffice)
      ? first.PostOffice
      : [];
  const info: PincodeInfo | null = offices.length
    ? {
        pincode: pin,
        city: (offices[0]!.District || "").trim(),
        state: (offices[0]!.State || "").trim(),
        country: "India",
        localities: Array.from(
          new Set(offices.map((o) => (o.Name || "").trim()).filter(Boolean))
        ).sort((a, b) => a.localeCompare(b)),
      }
    : null;

  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
  cache.set(pin, { at: Date.now(), info });
  return info;
}

metaRouter.get(
  "/pincode/:pin",
  (req: Request<{ pin: string }>, res: Response, next: NextFunction): void => {
    const pin = String(req.params.pin || "").trim();
    if (!/^[1-9][0-9]{5}$/.test(pin)) {
      next(AppError.badRequest("Enter a 6-digit Indian PIN code."));
      return;
    }
    lookupPincode(pin)
      .then((info) => {
        if (!info)
          throw AppError.notFound(
            "We couldn't find this PIN code. Check it, or type your city and state."
          );
        res.setHeader("Cache-Control", "public, max-age=86400");
        res.status(200).json({ status: "success", data: info });
      })
      .catch((err) => {
        if (err instanceof AppError) return next(err);
        logger.warn({ err, pin }, "PIN code lookup failed");
        next(
          new AppError(
            "PIN code lookup is not available right now. Type your city and state instead.",
            503,
            "GATEWAY_UNAVAILABLE"
          )
        );
      });
  }
);
