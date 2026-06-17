import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

import { authenticate, authorize } from '../middleware/auth';
import { loginRateLimiter, clearLoginAttempts } from '../middleware/rateLimiter';
import csrfProtection from '../middleware/csrf';

// A helper mock for Express Response
const createMockResponse = () => {
  const res: any = {
    statusCode: 200,
    headers: {},
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

describe('Security Middleware & Utilities', () => {
  describe('Role-based Access Control (RBAC)', () => {
    it('should permit authorized roles', () => {
      const middleware = authorize('sysadmin', 'admin');
      const req: any = { user: { role: 'sysadmin' } };
      const res = createMockResponse();
      let nextCalled = false;

      middleware(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
      expect(res.statusCode).toBe(200);
    });

    it('should reject unauthorized roles with 403', () => {
      const middleware = authorize('sysadmin');
      const req: any = { user: { role: 'staflab' } };
      const res = createMockResponse();
      let nextCalled = false;

      middleware(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.jsonData.error).toContain('Akses ditolak');
    });

    it('should reject unauthenticated requests with 401', () => {
      const middleware = authorize('sysadmin');
      const req: any = {}; // No user object
      const res = createMockResponse();
      let nextCalled = false;

      middleware(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(401);
    });
  });

  describe('JWT Authentication Middleware', () => {
    it('should reject request missing authorization header or cookies with 401', async () => {
      const req: any = { headers: {} };
      const res = createMockResponse();
      let nextCalled = false;

      await authenticate(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(401);
    });

    it('should reject request with invalid header format', async () => {
      const req: any = { headers: { authorization: 'Basic dXNlcjpwYXNz' } };
      const res = createMockResponse();
      let nextCalled = false;

      await authenticate(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(401);
    });
  });

  describe('Login Rate Limiter Middleware', () => {
    beforeEach(() => {
      vi.resetModules();
      clearLoginAttempts('127.0.0.1');
    });

    it('should permit up to 5 repeated login attempts from same IP', async () => {
      const req: any = { ip: '127.0.0.1' };
      const res = createMockResponse();
      let allowedAttempts = 0;

      for (let i = 0; i < 5; i++) {
        let nextCalled = false;
        await loginRateLimiter(req, res, () => {
          nextCalled = true;
        });
        if (nextCalled) allowedAttempts++;
      }

      expect(allowedAttempts).toBe(5);
    });

    it('should block 6th login attempt with 429 Too Many Requests', async () => {
      const req: any = { ip: '127.0.0.1' };
      const res = createMockResponse();

      // Consume first 5 attempts
      for (let i = 0; i < 5; i++) {
        await loginRateLimiter(req, res, () => {});
      }

      let nextCalled = false;
      await loginRateLimiter(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(429);
      expect(res.jsonData.error).toContain('Terlalu banyak percobaan');
    });
  });

  describe('Database Backup Cryptography (AES-256-GCM)', () => {
    const secret = 'lokalab-backup-secret-key-for-testing-2026';
    const key = crypto.scryptSync(secret, 'loka-backup-salt-v2', 32);

    it('should possess 12-byte IV, encrypted data, 16-byte auth tag, and SHA-256 checksum', () => {
      const iv = crypto.randomBytes(12);
      const dbPayload = { users: [{ id: 1, name: 'Anindita' }] };
      const rawJson = JSON.stringify(dbPayload);
      const checksum = crypto.createHash('sha256').update(rawJson).digest('hex');

      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      let encrypted = cipher.update(rawJson, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const tag = cipher.getAuthTag();

      expect(iv.length).toBe(12);
      expect(encrypted).toBeDefined();
      expect(tag.length).toBe(16);
      expect(checksum).toBeDefined();
    });

    it('should correctly decrypt valid payload and throw error on tampered data', () => {
      const iv = crypto.randomBytes(12);
      const dbPayload = { users: [{ id: 1, name: 'Anindita' }] };
      const rawJson = JSON.stringify(dbPayload);

      // Encrypt
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      let encrypted = cipher.update(rawJson, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const tag = cipher.getAuthTag();

      // Decrypt
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      expect(decrypted).toBe(rawJson);

      // Tamper ciphertext
      const tamperedEncrypted = encrypted.substring(0, encrypted.length - 2) + '00';
      const decipherTamper = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipherTamper.setAuthTag(tag);

      expect(() => {
        let dec = decipherTamper.update(tamperedEncrypted, 'hex', 'utf8');
        dec += decipherTamper.final('utf8');
      }).toThrow();
    });
  });

  describe('Audit Log Hash Chaining (Anti-Tamper)', () => {
    const secret = 'lokalab-audit-secret-key-for-testing-2026';

    it('should verify chain correctly and fail validation when tampered', () => {
      const mockLogs: any[] = [];
      let previousHash = '0000000000000000000000000000000000000000000000000000000000000000';

      const logEntries = [
        { user_id: 1, action: 'user.login', target: 'admin', ip: '127.0.0.1', details: '' },
        {
          user_id: 1,
          action: 'inventory.create',
          target: 'LK-WS-001',
          ip: '127.0.0.1',
          details: '',
        },
        { user_id: 2, action: 'backup.export', target: 'db', ip: '192.168.1.10', details: '' },
      ];

      // Build chain
      logEntries.forEach((entry, idx) => {
        const timeSecs = (1716000000 + idx).toString();
        const details = entry.details || '';
        const dataToHash = `${previousHash}|${timeSecs}|${entry.user_id}|${entry.action}|${entry.target}|${entry.ip}|${details}`;
        const hash = crypto.createHmac('sha256', secret).update(dataToHash).digest('hex');

        mockLogs.push({
          ...entry,
          details,
          timeSecs,
          previous_hash: previousHash,
          hash,
        });
        previousHash = hash;
      });

      // Verification function
      const verifyChain = (logs: any[]) => {
        let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
        for (let i = 0; i < logs.length; i++) {
          const log = logs[i];
          const dataToHash = `${prevHash}|${log.timeSecs}|${log.user_id}|${log.action}|${log.target}|${log.ip}|${log.details || ''}`;
          const computed = crypto.createHmac('sha256', secret).update(dataToHash).digest('hex');

          if (log.previous_hash !== prevHash) return { valid: false, reason: 'linkage mismatch' };
          if (log.hash !== computed) return { valid: false, reason: 'data tampered' };
          prevHash = log.hash;
        }
        return { valid: true };
      };

      // 1. Valid Check
      const firstCheck = verifyChain(mockLogs);
      expect(firstCheck.valid).toBe(true);

      // 2. Tampered Check
      const tamperedLogs = JSON.parse(JSON.stringify(mockLogs));
      tamperedLogs[1].action = 'inventory.delete';

      const secondCheck = verifyChain(tamperedLogs);
      expect(secondCheck.valid).toBe(false);
    });
  });

  describe('Double Submit CSRF Protection Middleware', () => {
    it('should bypass safe methods (GET, HEAD, OPTIONS)', () => {
      const req: any = {
        method: 'GET',
        path: '/api/v1/inventory',
        originalUrl: '/api/v1/inventory',
      };
      const res = createMockResponse();
      let nextCalled = false;

      csrfProtection(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
      expect(res.statusCode).toBe(200);
    });

    it('should bypass whitelisted routes (login and refresh)', () => {
      const req: any = {
        method: 'POST',
        path: '/api/v1/auth/login',
        originalUrl: '/api/v1/auth/login',
      };
      const res = createMockResponse();
      let nextCalled = false;

      csrfProtection(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
      expect(res.statusCode).toBe(200);
    });

    it('should reject request when Origin header is invalid', () => {
      const req: any = {
        method: 'POST',
        path: '/api/v1/inventory',
        originalUrl: '/api/v1/inventory',
        headers: {
          origin: 'http://malicious.com',
        },
      };
      const res = createMockResponse();
      let nextCalled = false;

      csrfProtection(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.jsonData.error).toContain('Origin header tidak sesuai');
    });

    it('should reject request when Referer header is invalid', () => {
      const req: any = {
        method: 'POST',
        path: '/api/v1/inventory',
        originalUrl: '/api/v1/inventory',
        headers: {
          referer: 'http://malicious.com/attack',
        },
      };
      const res = createMockResponse();
      let nextCalled = false;

      csrfProtection(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.jsonData.error).toContain('Referer header tidak sesuai');
    });

    it('should reject when CSRF token cookie is missing', () => {
      const req: any = {
        method: 'POST',
        path: '/api/v1/inventory',
        originalUrl: '/api/v1/inventory',
        headers: {
          origin: 'http://localhost:5173',
          'x-csrf-token': 'token123',
        },
      };
      const res = createMockResponse();
      let nextCalled = false;

      csrfProtection(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.jsonData.error).toContain('CSRF token tidak ditemukan atau tidak cocok');
    });

    it('should reject when CSRF token header is missing', () => {
      const req: any = {
        method: 'POST',
        path: '/api/v1/inventory',
        originalUrl: '/api/v1/inventory',
        headers: {
          origin: 'http://localhost:5173',
          cookie: 'csrfToken=token123',
        },
      };
      const res = createMockResponse();
      let nextCalled = false;

      csrfProtection(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.jsonData.error).toContain('CSRF token tidak ditemukan atau tidak cocok');
    });

    it('should reject when cookie and header CSRF tokens mismatch', () => {
      const req: any = {
        method: 'POST',
        path: '/api/v1/inventory',
        originalUrl: '/api/v1/inventory',
        headers: {
          origin: 'http://localhost:5173',
          cookie: 'csrfToken=token123',
          'x-csrf-token': 'token999',
        },
      };
      const res = createMockResponse();
      let nextCalled = false;

      csrfProtection(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.jsonData.error).toContain('CSRF token tidak ditemukan atau tidak cocok');
    });

    it('should allow request when Origin and Double Submit Cookie CSRF token match', () => {
      const req: any = {
        method: 'POST',
        path: '/api/v1/inventory',
        originalUrl: '/api/v1/inventory',
        headers: {
          origin: 'http://localhost:5173',
          cookie: 'csrfToken=token123',
          'x-csrf-token': 'token123',
        },
      };
      const res = createMockResponse();
      let nextCalled = false;

      csrfProtection(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
      expect(res.statusCode).toBe(200);
    });
  });
});
