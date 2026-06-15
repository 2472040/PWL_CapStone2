const crypto = require('crypto');
const { AsyncLocalStorage } = require('async_hooks');

const asyncLocalStorage = new AsyncLocalStorage();

/**
 * Express middleware to assign/track a unique correlation ID per request.
 * Reads X-Request-ID or X-Correlation-ID headers, or generates a fresh UUID.
 * Binds the ID to AsyncLocalStorage context and appends it to response headers.
 */
const correlationMiddleware = (req, res, next) => {
  const correlationId =
    req.header('x-request-id') || req.header('x-correlation-id') || crypto.randomUUID();

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
const getCorrelationId = () => {
  const store = asyncLocalStorage.getStore();
  return store ? store.correlationId : null;
};

module.exports = {
  correlationMiddleware,
  getCorrelationId,
};
