import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { validate } from '../middleware/validation';

describe('Validation Middleware', () => {
  const schema = z.object({
    name: z.string().min(3, { message: 'Name must be at least 3 chars' }),
    age: z.number().int().positive(),
  });

  const createMockResponse = () => {
    const res: any = {
      statusCode: 200,
      jsonData: null,
    };
    res.status = (code: number) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data: any) => {
      res.jsonData = data;
      return res;
    };
    return res;
  };

  it('should call next() and update req.body when validation passes', async () => {
    const middleware = validate(schema);
    const req: any = {
      body: {
        name: 'Maharani',
        age: 21,
        ignoredField: 'extra',
      },
    };
    const res = createMockResponse();
    let nextCalled = false;
    let errorPassedToNext = null;

    await middleware(req, res, (err: any) => {
      nextCalled = true;
      errorPassedToNext = err;
    });

    expect(nextCalled).toBe(true);
    expect(errorPassedToNext).toBeUndefined();
    expect(req.body.name).toBe('Maharani');
    expect(req.body.age).toBe(21);
    // Zod strip unrecognized keys by default, check if extra keys are removed or kept depending on schema strictness
    // (By default, z.object strips unknown keys during parsing)
    expect(req.body.ignoredField).toBeUndefined();
  });

  it('should return 400 when validation fails due to schema mismatch', async () => {
    const middleware = validate(schema);
    const req: any = {
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

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(400);
    expect(res.jsonData.error).toBeDefined();
    expect(res.jsonData.details).toBeDefined();
    expect(res.jsonData.details.length).toBeGreaterThanOrEqual(1);
  });
});
