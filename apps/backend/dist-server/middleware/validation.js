"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
/**
 * Zod request body validation middleware helper
 * @param schema - The Zod schema to validate req.body against.
 */
const validate = (schema) => {
    return async (req, res, next) => {
        try {
            // Parse request body using the Zod schema
            const parsed = await schema.parseAsync(req.body);
            // Update req.body with sanitized and cast data from Zod
            req.body = parsed;
            next();
        }
        catch (err) {
            if (err instanceof zod_1.ZodError) {
                const issues = err.issues || [];
                const firstError = issues[0]?.message || 'Input data tidak valid.';
                return res.status(400).json({ error: firstError, details: issues });
            }
            next(err);
        }
    };
};
exports.validate = validate;
