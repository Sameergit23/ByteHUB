import { Request, Response, NextFunction } from "express";
import { ZodType, ZodObject } from "zod";
import { sanitizeDeep } from "../utils/sanitizer.js";

interface RequestValidators {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

/**
 * Enforces strict validation (rejects unknown fields) and sanitizes input data.
 */
function toStrictSchema(schema: ZodType): ZodType {
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
        req.params = (await toStrictSchema(schemas.params).parseAsync(
          sanitizedParams
        )) as Request["params"];
      }
      if (schemas.query) {
        const sanitizedQuery = sanitizeDeep(req.query);
        req.query = (await toStrictSchema(schemas.query).parseAsync(
          sanitizedQuery
        )) as Request["query"];
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
