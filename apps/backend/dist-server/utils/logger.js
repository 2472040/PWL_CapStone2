"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const path_1 = __importDefault(require("path"));
const correlation_1 = require("../middleware/correlation");
const logDir = path_1.default.join(__dirname, '../logs');
// Custom winston format to append the active correlation ID
const addCorrelationId = winston_1.default.format((info) => {
    const correlationId = (0, correlation_1.getCorrelationId)();
    if (correlationId) {
        info.correlationId = correlationId;
    }
    return info;
});
// Define custom format for console (readable/colorized) and files (structured JSON)
const customFormat = winston_1.default.format.combine(addCorrelationId(), winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.splat(), winston_1.default.format.json());
const consoleFormat = winston_1.default.format.combine(addCorrelationId(), winston_1.default.format.colorize(), winston_1.default.format.printf(({ timestamp, level, message, stack, correlationId, ...meta }) => {
    const correlationStr = correlationId ? ` [ReqID: ${correlationId}]` : '';
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}]${correlationStr} ${level}: ${message}${stack ? `\n${stack}` : ''}${metaStr}`;
}));
const transports = [
    // 1. Console transport (always present)
    new winston_1.default.transports.Console({
        format: process.env.NODE_ENV === 'production' ? customFormat : consoleFormat,
        handleExceptions: true,
        handleRejections: true,
    }),
];
// Add rolling file transports only in development environment to prevent disk pollution in production/test
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    transports.push(
    // 2. Rolling File for all logs
    new winston_daily_rotate_file_1.default({
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
    new winston_daily_rotate_file_1.default({
        dirname: logDir,
        filename: 'error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        level: 'error',
    }));
}
exports.logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: customFormat,
    defaultMeta: { service: 'lokalab-api' },
    transports,
});
// Middleware for Express request logging
const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        exports.logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`, {
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
exports.requestLogger = requestLogger;
