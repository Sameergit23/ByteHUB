import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodObject } from "zod";
import { sanitizeDeep } from "../utils/sanitizer.js";

interface RequestValidators {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Enforces strict validation (rejects unknown fields) and sanitizes input data.
 */
function toStrictSchema(schema: ZodSchema): ZodSchema {
  if (schema instanceof ZodObject) {
    return schema.strict();
  }
  return schema;
}

export function validateRequest(schemas: RequestValidators) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.params) {
        const sanitizedParams = sanitizeDeep(req.params);
        req.params = await toStrictSchema(schemas.params).parseAsync(sanitizedParams);
      }
      if (schemas.query) {
        const sanitizedQuery = sanitizeDeep(req.query);
        req.query = await toStrictSchema(schemas.query).parseAsync(sanitizedQuery);
      }
      if (schemas.body) {
        const sanitizedBody = sanitizeDeep(req.body);
        req.body = await toStrictSchema(schemas.body).parseAsync(sanitizedBody);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
