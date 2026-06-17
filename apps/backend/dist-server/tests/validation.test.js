"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const zod_1 = require("zod");
const validation_1 = require("../middleware/validation");
(0, vitest_1.describe)('Validation Middleware', () => {
    const schema = zod_1.z.object({
        name: zod_1.z.string().min(3, { message: 'Name must be at least 3 chars' }),
        age: zod_1.z.number().int().positive(),
    });
    const createMockResponse = () => {
        const res = {
            statusCode: 200,
            jsonData: null,
        };
        res.status = (code) => {
            res.statusCode = code;
            return res;
        };
        res.json = (data) => {
            res.jsonData = data;
            return res;
        };
        return res;
    };
    (0, vitest_1.it)('should call next() and update req.body when validation passes', async () => {
        const middleware = (0, validation_1.validate)(schema);
        const req = {
            body: {
                name: 'Maharani',
                age: 21,
                ignoredField: 'extra',
            },
        };
        const res = createMockResponse();
        let nextCalled = false;
        let errorPassedToNext = null;
        await middleware(req, res, (err) => {
            nextCalled = true;
            errorPassedToNext = err;
        });
        (0, vitest_1.expect)(nextCalled).toBe(true);
        (0, vitest_1.expect)(errorPassedToNext).toBeUndefined();
        (0, vitest_1.expect)(req.body.name).toBe('Maharani');
        (0, vitest_1.expect)(req.body.age).toBe(21);
        // Zod strip unrecognized keys by default, check if extra keys are removed or kept depending on schema strictness
        // (By default, z.object strips unknown keys during parsing)
        (0, vitest_1.expect)(req.body.ignoredField).toBeUndefined();
    });
    (0, vitest_1.it)('should return 400 when validation fails due to schema mismatch', async () => {
        const middleware = (0, validation_1.validate)(schema);
        const req = {
            body: {
                name: 'ML', // Too short
                age: -5, // Negative
            },
        };
        const res = createMockResponse();
        let nextCalled = false;
        await middleware(req, res, () => {
            nextCalled = true;
        });
        (0, vitest_1.expect)(nextCalled).toBe(false);
        (0, vitest_1.expect)(res.statusCode).toBe(400);
        (0, vitest_1.expect)(res.jsonData.error).toBeDefined();
        (0, vitest_1.expect)(res.jsonData.details).toBeDefined();
        (0, vitest_1.expect)(res.jsonData.details.length).toBeGreaterThanOrEqual(1);
    });
});
