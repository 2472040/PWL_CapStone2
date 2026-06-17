import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { getCorrelationId } from '../middleware/correlation';

const logDir = path.join(__dirname, '../logs');

// Custom winston format to append the active correlation ID
const addCorrelationId = winston.format((info) => {
  const correlationId = getCorrelationId();
  if (correlationId) {
    info.correlationId = correlationId;
  }
  return info;
});

// Define custom format for console (readable/colorized) and files (structured JSON)
const customFormat = winston.format.combine(
  addCorrelationId(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  addCorrelationId(),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, stack, correlationId, ...meta }) => {
    const correlationStr = correlationId ? ` [ReqID: ${correlationId}]` : '';
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}]${correlationStr} ${level}: ${message}${stack ? `\n${stack}` : ''}${metaStr}`;
  })
);

const transports: winston.transport[] = [
  // 1. Console transport (always present)
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? customFormat : consoleFormat,
    handleExceptions: true,
    handleRejections: true,
  }),
];

// Add rolling file transports only in development environment to prevent disk pollution in production/test
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  transports.push(
    // 2. Rolling File for all logs
    new DailyRotateFile({
      dirname: logDir,
      filename: 'app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'info',
      handleExceptions: true,
      handleRejections: true,
    }),
    // 3. Rolling File for error logs only
    new DailyRotateFile({
      dirname: logDir,
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'error',
    })
  );
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: { service: 'lokalab-api' },
  transports,
});

// Middleware for Express request logging
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`, {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user ? req.user.id : null,
      userRole: req.user ? req.user.role : null,
    });
  });
  next();
};
