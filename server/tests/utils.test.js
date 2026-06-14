import { describe, it, expect, vi } from 'vitest';

const {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
} = require('../utils/errors');
const asyncHandler = require('../utils/asyncHandler');
const { logger, requestLogger } = require('../utils/logger');

describe('Utility Modules', () => {
  describe('Custom Error Hierarchy', () => {
    it('should correctly initialize base AppError with operational status', () => {
      const error = new AppError('operational issue', 400);
      expect(error.message).toBe('operational issue');
      expect(error.statusCode).toBe(400);
      expect(error.status).toBe('fail');
      expect(error.isOperational).toBe(true);
    });

    it('should set status as error for 500 status codes', () => {
      const error = new AppError('server issue', 500);
      expect(error.status).toBe('error');
    });

    it('should correctly instantiate error subclasses with default messages', () => {
      const badRequest = new BadRequestError();
      expect(badRequest.statusCode).toBe(400);
      expect(badRequest.message).toBe('Permintaan tidak valid (Bad Request)');

      const unauthorized = new UnauthorizedError();
      expect(unauthorized.statusCode).toBe(401);

      const forbidden = new ForbiddenError();
      expect(forbidden.statusCode).toBe(403);

      const notFound = new NotFoundError();
      expect(notFound.statusCode).toBe(404);

      const conflict = new ConflictError();
      expect(conflict.statusCode).toBe(409);

      const internalServer = new InternalServerError();
      expect(internalServer.statusCode).toBe(500);
      expect(internalServer.isOperational).toBe(false);
    });
  });

  describe('asyncHandler wrapper', () => {
    it('should run wrapped async function successfully', async () => {
      let run = false;
      const fn = async (req, res, next) => {
        run = true;
      };

      const wrapped = asyncHandler(fn);
      await wrapped({}, {}, () => {});

      expect(run).toBe(true);
    });

    it('should catch rejected promise and forward to next()', async () => {
      const error = new Error('async failure');
      const fn = async (req, res, next) => {
        throw error;
      };

      const wrapped = asyncHandler(fn);
      let forwardedError = null;
      const next = (err) => {
        forwardedError = err;
      };

      await wrapped({}, {}, next);
      expect(forwardedError).toBe(error);
    });
  });

  describe('Logger Utilities', () => {
    it('should export winston logger and requestLogger middleware', () => {
      expect(logger.info).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(typeof requestLogger).toBe('function');
    });

    it('requestLogger should execute next()', () => {
      const req = {
        method: 'GET',
        originalUrl: '/api/test',
        ip: '127.0.0.1',
        get: () => 'test-user-agent',
      };
      const res = {
        on: vi.fn(),
      };
      const next = vi.fn();

      requestLogger(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});
