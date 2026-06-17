"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const errors_1 = require("../utils/errors");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const logger_1 = require("../utils/logger");
(0, vitest_1.describe)('Utility Modules', () => {
    (0, vitest_1.describe)('Custom Error Hierarchy', () => {
        (0, vitest_1.it)('should correctly initialize base AppError with operational status', () => {
            const error = new errors_1.AppError('operational issue', 400);
            (0, vitest_1.expect)(error.message).toBe('operational issue');
            (0, vitest_1.expect)(error.statusCode).toBe(400);
            (0, vitest_1.expect)(error.status).toBe('fail');
            (0, vitest_1.expect)(error.isOperational).toBe(true);
        });
        (0, vitest_1.it)('should set status as error for 500 status codes', () => {
            const error = new errors_1.AppError('server issue', 500);
            (0, vitest_1.expect)(error.status).toBe('error');
        });
        (0, vitest_1.it)('should correctly instantiate error subclasses with default messages', () => {
            const badRequest = new errors_1.BadRequestError();
            (0, vitest_1.expect)(badRequest.statusCode).toBe(400);
            (0, vitest_1.expect)(badRequest.message).toBe('Permintaan tidak valid (Bad Request)');
            const unauthorized = new errors_1.UnauthorizedError();
            (0, vitest_1.expect)(unauthorized.statusCode).toBe(401);
            const forbidden = new errors_1.ForbiddenError();
            (0, vitest_1.expect)(forbidden.statusCode).toBe(403);
            const notFound = new errors_1.NotFoundError();
            (0, vitest_1.expect)(notFound.statusCode).toBe(404);
            const conflict = new errors_1.ConflictError();
            (0, vitest_1.expect)(conflict.statusCode).toBe(409);
            const internalServer = new errors_1.InternalServerError();
            (0, vitest_1.expect)(internalServer.statusCode).toBe(500);
            (0, vitest_1.expect)(internalServer.isOperational).toBe(false);
        });
    });
    (0, vitest_1.describe)('asyncHandler wrapper', () => {
        (0, vitest_1.it)('should run wrapped async function successfully', async () => {
            let run = false;
            const fn = async (req, res, next) => {
                run = true;
            };
            const wrapped = (0, asyncHandler_1.default)(fn);
            await wrapped({}, {}, () => { });
            (0, vitest_1.expect)(run).toBe(true);
        });
        (0, vitest_1.it)('should catch rejected promise and forward to next()', async () => {
            const error = new Error('async failure');
            const fn = async (req, res, next) => {
                throw error;
            };
            const wrapped = (0, asyncHandler_1.default)(fn);
            let forwardedError = null;
            const next = (err) => {
                forwardedError = err;
            };
            await wrapped({}, {}, next);
            (0, vitest_1.expect)(forwardedError).toBe(error);
        });
    });
    (0, vitest_1.describe)('Logger Utilities', () => {
        (0, vitest_1.it)('should export winston logger and requestLogger middleware', () => {
            (0, vitest_1.expect)(logger_1.logger.info).toBeDefined();
            (0, vitest_1.expect)(logger_1.logger.error).toBeDefined();
            (0, vitest_1.expect)(typeof logger_1.requestLogger).toBe('function');
        });
        (0, vitest_1.it)('requestLogger should execute next()', () => {
            const req = {
                method: 'GET',
                originalUrl: '/api/test',
                ip: '127.0.0.1',
                get: () => 'test-user-agent',
            };
            const res = {
                on: vitest_1.vi.fn(),
            };
            const next = vitest_1.vi.fn();
            (0, logger_1.requestLogger)(req, res, next);
            (0, vitest_1.expect)(next).toHaveBeenCalled();
        });
    });
});
