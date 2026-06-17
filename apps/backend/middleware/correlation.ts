import crypto from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';
import { Request, Response, NextFunction } from 'express';

interface CorrelationStore {
  correlationId: string;
}

const asyncLocalStorage = new AsyncLocalStorage<CorrelationStore>();

/**
 * Express middleware to assign/track a unique correlation ID per request.
 * Reads X-Request-ID or X-Correlation-ID headers, or generates a fresh UUID.
 * Binds the ID to AsyncLocalStorage context and appends it to response headers.
 */
export const correlationMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const correlationId = (req.header('x-request-id') ||
    req.header('x-correlation-id') ||
    crypto.randomUUID()) as string;

  // Attach to response so client can trace it
  res.setHeader('x-request-id', correlationId);

  // Run subsequent middleware and handlers within the context of asyncLocalStorage
  asyncLocalStorage.run({ correlationId }, () => {
    next();
  });
};

/**
 * Retrieves the current request's correlation ID from AsyncLocalStorage.
 * Returns null if executed outside of a request context.
 */
export const getCorrelationId = (): string | null => {
  const store = asyncLocalStorage.getStore();
  return store ? store.correlationId : null;
};
