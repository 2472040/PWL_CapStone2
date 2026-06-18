"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const crypto_1 = __importDefault(require("crypto"));
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const csrf_1 = __importDefault(require("../middleware/csrf"));
// A helper mock for Express Response
const createMockResponse = () => {
    const res = {
        statusCode: 200,
        headers: {},
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
(0, vitest_1.describe)('Security Middleware & Utilities', () => {
    (0, vitest_1.describe)('Role-based Access Control (RBAC)', () => {
        (0, vitest_1.it)('should permit authorized roles', () => {
            const middleware = (0, auth_1.authorize)('sysadmin', 'admin');
            const req = { user: { role: 'sysadmin' } };
            const res = createMockResponse();
            let nextCalled = false;
            middleware(req, res, () => {
                nextCalled = true;
            });
            (0, vitest_1.expect)(nextCalled).toBe(true);
            (0, vitest_1.expect)(res.statusCode).toBe(200);
        });
        (0, vitest_1.it)('should reject unauthorized roles with 403', () => {
            const middleware = (0, auth_1.authorize)('sysadmin');
            const req = { user: { role: 'staflab' } };
            const res = createMockResponse();
            let nextCalled = false;
            middleware(req, res, () => {
                nextCalled = true;
            });
            (0, vitest_1.expect)(nextCalled).toBe(false);
            (0, vitest_1.expect)(res.statusCode).toBe(403);
            (0, vitest_1.expect)(res.jsonData.error).toContain('Akses ditolak');
        });
        (0, vitest_1.it)('should reject unauthenticated requests with 401', () => {
            const middleware = (0, auth_1.authorize)('sysadmin');
            const req = {}; // No user object
            const res = createMockResponse();
            let nextCalled = false;
            middleware(req, res, () => {
                nextCalled = true;
            });
            (0, vitest_1.expect)(nextCalled).toBe(false);
            (0, vitest_1.expect)(res.statusCode).toBe(401);
        });
    });
    (0, vitest_1.describe)('JWT Authentication Middleware', () => {
        (0, vitest_1.it)('should reject request missing authorization header or cookies with 401', async () => {
            const req = { headers: {} };
            const res = createMockResponse();
            let nextCalled = false;
            await (0, auth_1.authenticate)(req, res, () => {
                nextCalled = true;
            });
            (0, vitest_1.expect)(nextCalled).toBe(false);
            (0, vitest_1.expect)(res.statusCode).toBe(401);
        });
        (0, vitest_1.it)('should reject request with invalid header format', async () => {
            const req = { headers: { authorization: 'Basic dXNlcjpwYXNz' } };
            const res = createMockResponse();
            let nextCalled = false;
            await (0, auth_1.authenticate)(req, res, () => {
                nextCalled = true;
            });
            (0, vitest_1.expect)(nextCalled).toBe(false);
            (0, vitest_1.expect)(res.statusCode).toBe(401);
        });
    });
    (0, vitest_1.describe)('Login Rate Limiter Middleware', () => {
        (0, vitest_1.beforeEach)(() => {
            vitest_1.vi.resetModules();
            (0, rateLimiter_1.clearLoginAttempts)('127.0.0.1');
        });
        (0, vitest_1.it)('should permit up to 5 repeated login attempts from same IP', async () => {
            const req = { ip: '127.0.0.1' };
            const res = createMockResponse();
            let allowedAttempts = 0;
            for (let i = 0; i < 5; i++) {
                let nextCalled = false;
                await (0, rateLimiter_1.loginRateLimiter)(req, res, () => {
                    nextCalled = true;
                });
                if (nextCalled)
                    allowedAttempts++;
            }
            (0, vitest_1.expect)(allowedAttempts).toBe(5);
        });
        (0, vitest_1.it)('should block 6th login attempt with 429 Too Many Requests', async () => {
            const req = { ip: '127.0.0.1' };
            const res = createMockResponse();
            // Consume first 5 attempts
            for (let i = 0; i < 5; i++) {
                await (0, rateLimiter_1.loginRateLimiter)(req, res, () => { });
            }
            let nextCalled = false;
            await (0, rateLimiter_1.loginRateLimiter)(req, res, () => {
                nextCalled = true;
            });
            (0, vitest_1.expect)(nextCalled).toBe(false);
            (0, vitest_1.expect)(res.statusCode).toBe(429);
            (0, vitest_1.expect)(res.jsonData.error).toContain('Terlalu banyak percobaan');
        });
    });
    (0, vitest_1.describe)('Database Backup Cryptography (AES-256-GCM)', () => {
        const secret = 'lokalab-backup-secret-key-for-testing-2026';
        const key = crypto_1.default.scryptSync(secret, 'loka-backup-salt-v2', 32);
        (0, vitest_1.it)('should possess 12-byte IV, encrypted data, 16-byte auth tag, and SHA-256 checksum', () => {
            const iv = crypto_1.default.randomBytes(12);
            const dbPayload = { users: [{ id: 1, name: 'Anindita' }] };
            const rawJson = JSON.stringify(dbPayload);
            const checksum = crypto_1.default.createHash('sha256').update(rawJson).digest('hex');
            const cipher = crypto_1.default.createCipheriv('aes-256-gcm', key, iv);
            let encrypted = cipher.update(rawJson, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            const tag = cipher.getAuthTag();
            (0, vitest_1.expect)(iv.length).toBe(12);
            (0, vitest_1.expect)(encrypted).toBeDefined();
            (0, vitest_1.expect)(tag.length).toBe(16);
            (0, vitest_1.expect)(checksum).toBeDefined();
        });
        (0, vitest_1.it)('should correctly decrypt valid payload and throw error on tampered data', () => {
            const iv = crypto_1.default.randomBytes(12);
            const dbPayload = { users: [{ id: 1, name: 'Anindita' }] };
            const rawJson = JSON.stringify(dbPayload);
            // Encrypt
            const cipher = crypto_1.default.createCipheriv('aes-256-gcm', key, iv);
            let encrypted = cipher.update(rawJson, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            const tag = cipher.getAuthTag();
            // Decrypt
            const decipher = crypto_1.default.createDecipheriv('aes-256-gcm', key, iv);
            decipher.setAuthTag(tag);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            (0, vitest_1.expect)(decrypted).toBe(rawJson);
            // Tamper ciphertext
            const tamperedEncrypted = encrypted.substring(0, encrypted.length - 2) + '00';
            const decipherTamper = crypto_1.default.createDecipheriv('aes-256-gcm', key, iv);
            decipherTamper.setAuthTag(tag);
            (0, vitest_1.expect)(() => {
                decipherTamper.update(tamperedEncrypted, 'hex', 'utf8');
                decipherTamper.final('utf8');
            }).toThrow();
        });
    });
    (0, vitest_1.describe)('Audit Log Hash Chaining (Anti-Tamper)', () => {
        const secret = 'lokalab-audit-secret-key-for-testing-2026';
        (0, vitest_1.it)('should verify chain correctly and fail validation when tampered', () => {
            const mockLogs = [];
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
                const hash = crypto_1.default.createHmac('sha256', secret).update(dataToHash).digest('hex');
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
            const verifyChain = (logs) => {
                let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
                for (let i = 0; i < logs.length; i++) {
                    const log = logs[i];
                    const dataToHash = `${prevHash}|${log.timeSecs}|${log.user_id}|${log.action}|${log.target}|${log.ip}|${log.details || ''}`;
                    const computed = crypto_1.default.createHmac('sha256', secret).update(dataToHash).digest('hex');
                    if (log.previous_hash !== prevHash)
                        return { valid: false, reason: 'linkage mismatch' };
                    if (log.hash !== computed)
                        return { valid: false, reason: 'data tampered' };
                    prevHash = log.hash;
                }
                return { valid: true };
            };
            // 1. Valid Check
            const firstCheck = verifyChain(mockLogs);
            (0, vitest_1.expect)(firstCheck.valid).toBe(true);
            // 2. Tampered Check
            const tamperedLogs = JSON.parse(JSON.stringify(mockLogs));
            tamperedLogs[1].action = 'inventory.delete';
            const secondCheck = verifyChain(tamperedLogs);
            (0, vitest_1.expect)(secondCheck.valid).toBe(false);
        });
    });
    (0, vitest_1.describe)('Double Submit CSRF Protection Middleware', () => {
        (0, vitest_1.it)('should bypass safe methods (GET, HEAD, OPTIONS)', () => {
            const req = {
                method: 'GET',
                path: '/api/v1/inventory',
                originalUrl: '/api/v1/inventory',
            };
            const res = createMockResponse();
            let nextCalled = false;
            (0, csrf_1.default)(req, res, () => {
                nextCalled = true;
            });
            (0, vitest_1.expect)(nextCalled).toBe(true);
            (0, vitest_1.expect)(res.statusCode).toBe(200);
        });
        (0, vitest_1.it)('should bypass whitelisted routes (login and refresh)', () => {
            const req = {
                method: 'POST',
                path: '/api/v1/auth/login',
                originalUrl: '/api/v1/auth/login',
            };
            const res = createMockResponse();
            let nextCalled = false;
            (0, csrf_1.default)(req, res, () => {
                nextCalled = true;
            });
            (0, vitest_1.expect)(nextCalled).toBe(true);
            (0, vitest_1.expect)(res.statusCode).toBe(200);
        });
        (0, vitest_1.it)('should reject request when Origin header is invalid', () => {
            const req = {
                method: 'POST',
                path: '/api/v1/inventory',
                originalUrl: '/api/v1/inventory',
                headers: {
                    origin: 'http://malicious.com',
                },
            };
            const res = createMockResponse();
            let nextCalled = false;
            (0, csrf_1.default)(req, res, () => {
                nextCalled = true;
            });
            (0, vitest_1.expect)(nextCalled).toBe(false);
            (0, vitest_1.expect)(res.statusCode).toBe(403);
            (0, vitest_1.expect)(res.jsonData.error).toContain('Origin header tidak sesuai');
        });
        (0, vitest_1.it)('should reject request when Referer header is invalid', () => {
            const req = {
                method: 'POST',
                path: '/api/v1/inventory',
                originalUrl: '/api/v1/inventory',
                headers: {
                    referer: 'http://malicious.com/attack',
                },
            };
            const res = createMockResponse();
            let nextCalled = false;
            (0, csrf_1.default)(req, res, () => {
                nextCalled = true;
            });
            (0, vitest_1.expect)(nextCalled).toBe(false);
            (0, vitest_1.expect)(res.statusCode).toBe(403);
            (0, vitest_1.expect)(res.jsonData.error).toContain('Referer header tidak sesuai');
        });
        (0, vitest_1.it)('should reject when CSRF token cookie is missing', () => {
            const req = {
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
            (0, csrf_1.default)(req, res, () => {
                nextCalled = true;
            });
            (0, vitest_1.expect)(nextCalled).toBe(false);
            (0, vitest_1.expect)(res.statusCode).toBe(403);
            (0, vitest_1.expect)(res.jsonData.error).toContain('CSRF token tidak ditemukan atau tidak cocok');
        });
        (0, vitest_1.it)('should reject when CSRF token header is missing', () => {
            const req = {
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
            (0, csrf_1.default)(req, res, () => {
                nextCalled = true;
            });
            (0, vitest_1.expect)(nextCalled).toBe(false);
            (0, vitest_1.expect)(res.statusCode).toBe(403);
            (0, vitest_1.expect)(res.jsonData.error).toContain('CSRF token tidak ditemukan atau tidak cocok');
        });
        (0, vitest_1.it)('should reject when cookie and header CSRF tokens mismatch', () => {
            const req = {
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
            (0, csrf_1.default)(req, res, () => {
                nextCalled = true;
            });
            (0, vitest_1.expect)(nextCalled).toBe(false);
            (0, vitest_1.expect)(res.statusCode).toBe(403);
            (0, vitest_1.expect)(res.jsonData.error).toContain('CSRF token tidak ditemukan atau tidak cocok');
        });
        (0, vitest_1.it)('should allow request when Origin and Double Submit Cookie CSRF token match', () => {
            const req = {
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
            (0, csrf_1.default)(req, res, () => {
                nextCalled = true;
            });
            (0, vitest_1.expect)(nextCalled).toBe(true);
            (0, vitest_1.expect)(res.statusCode).toBe(200);
        });
    });
});
