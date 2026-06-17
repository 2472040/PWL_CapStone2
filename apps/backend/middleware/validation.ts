import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Zod request body validation middleware helper
 * @param schema - The Zod schema to validate req.body against.
 */
export const validate = (schema: ZodSchema<any>): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse request body using the Zod schema
      const parsed = await schema.parseAsync(req.body);
      // Update req.body with sanitized and cast data from Zod
      req.body = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const issues = err.issues || [];
        const firstError = issues[0]?.message || 'Input data tidak valid.';
        return res.status(400).json({ error: firstError, details: issues });
      }
      next(err);
    }
  };
};
