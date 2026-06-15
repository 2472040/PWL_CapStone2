const { logger } = require('../utils/logger');
const { AppError } = require('../utils/errors');

/**
 * Global Centralized Error Handler Middleware
 * Intercepts all rejected promises/errors and standardizes JSON responses
 */
const globalErrorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let status = err.status || 'error';
  let message = err.message || 'Terjadi kesalahan internal server.';
  let details = err.details || undefined;

  // Handle JWT Validation Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    status = 'fail';
    message = 'Token tidak valid. Silakan login kembali.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    status = 'fail';
    message = 'Token kadaluarsa. Silakan login kembali.';
  }

  // Handle Sequelize Validation Errors (DB constraints/validations)
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 400;
    status = 'fail';
    message = err.errors[0]?.message || 'Validasi basis data gagal.';
    details = err.errors.map((e) => ({ field: e.path, message: e.message }));
  }

  // Handle Zod Validation Errors
  if (err.name === 'ZodError') {
    statusCode = 400;
    status = 'fail';
    const issues = err.issues || err.errors || [];
    message = issues[0]?.message || 'Input data tidak valid.';
    details = issues;
  }

  // Log unexpected errors (500)
  if (statusCode === 500) {
    logger.error(`[500 Internal Error] ${req.method} ${req.originalUrl} - Stack:`, err);
  } else {
    // Log operational warnings
    logger.warn(
      `[${statusCode} Operational Warning] ${req.method} ${req.originalUrl} - ${message}`
    );
  }

  // Standar JSON response — guard against double-send if headers already flushed
  // (e.g. error during streaming). Without this check, res.status() throws and crashes the process.
  if (res.headersSent) {
    logger.error(
      `[${statusCode}] Headers already sent — cannot send error JSON for ${req.method} ${req.originalUrl}`
    );
    return next(err);
  }

  res.status(statusCode).json({
    status,
    error: message, // keep "error" key for backward compatibility with frontend
    ...(details && { details }),
  });
};

module.exports = globalErrorHandler;
