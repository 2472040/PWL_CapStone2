// @ts-check
const { ZodError } = require('zod');

/**
 * Zod request body validation middleware helper
 * @param {import('zod').ZodSchema<any>} schema
 * @returns {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => Promise<any>}
 */
const validate = (schema) => {
  return async (req, res, next) => {
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

module.exports = { validate };
