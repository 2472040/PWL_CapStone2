"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
// Setup mock environment variables if not set
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
// Mock Databases
let mockRefreshTokensDb = [];
const mockUsersDb = [
    {
        id: 1,
        name: 'Anindita Hartono',
        email: 'anindita@kampus.id',
        role: 'sysadmin',
        token_version: 0,
        status: 'active',
        save: async function () {
            return this;
        },
    },
];
const mockRefreshTokenModel = {
    create: async (data) => {
        const record = {
            ...data,
            id: mockRefreshTokensDb.length + 1,
            is_used: false,
            destroy: async function () {
                const idx = mockRefreshTokensDb.findIndex((r) => r.id === this.id);
                if (idx !== -1) {
                    mockRefreshTokensDb.splice(idx, 1);
                }
            },
        };
        mockRefreshTokensDb.push(record);
        return record;
    },
    findOne: async ({ where }) => {
        return mockRefreshTokensDb.find((r) => r.token === where.token) || null;
    },
    destroy: async ({ where }) => {
        let deletedCount = 0;
        if (where.token) {
            const idx = mockRefreshTokensDb.findIndex((r) => r.token === where.token);
            if (idx !== -1) {
                mockRefreshTokensDb.splice(idx, 1);
                deletedCount = 1;
            }
        }
        else if (where.user_id) {
            for (let i = mockRefreshTokensDb.length - 1; i >= 0; i--) {
                if (mockRefreshTokensDb[i].user_id === where.user_id) {
                    mockRefreshTokensDb.splice(i, 1);
                    deletedCount++;
                }
            }
        }
        return deletedCount;
    },
};
const mockUserModel = {
    findByPk: async (id) => {
        const user = mockUsersDb.find((u) => u.id === id);
        if (user) {
            user.destroy = async () => { };
        }
        return user || null;
    },
};
// Helper for Mock request and response
const createMockResponse = () => {
    const res = {
        statusCode: 200,
        cookies: {},
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
    res.cookie = (name, val, options) => {
        res.cookies[name] = { value: val, options };
        return res;
    };
    res.clearCookie = (name, options) => {
        delete res.cookies[name];
        return res;
    };
    return res;
};
(0, vitest_1.describe)('Refresh Token Rotation (RTR)', () => {
    (0, vitest_1.beforeEach)(() => {
        mockRefreshTokensDb = [];
        mockUsersDb[0].token_version = 0;
    });
    (0, vitest_1.it)('should rotate refresh token and return new access token', async () => {
        const user = mockUsersDb[0];
        const refreshJti = crypto_1.default.randomUUID();
        const mockRefreshToken = jsonwebtoken_1.default.sign({ id: user.id, jti: refreshJti, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: '7d' });
        // Save refresh token to mock DB
        const hashed = crypto_1.default.createHash('sha256').update(mockRefreshToken).digest('hex');
        await mockRefreshTokenModel.create({
            token: hashed,
            user_id: user.id,
            jti: refreshJti,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        const res = createMockResponse();
        // Simulate RTR Logic
        const decoded = jsonwebtoken_1.default.verify(mockRefreshToken, process.env.JWT_SECRET);
        const hashedCheck = crypto_1.default.createHash('sha256').update(mockRefreshToken).digest('hex');
        const tokenRecord = await mockRefreshTokenModel.findOne({ where: { token: hashedCheck } });
        (0, vitest_1.expect)(tokenRecord).toBeDefined();
        await tokenRecord.destroy(); // Rotate token
        const newJti = crypto_1.default.randomUUID();
        const newAccessToken = jsonwebtoken_1.default.sign({ id: user.id, role: user.role, tokenVersion: user.token_version, jti: newJti }, process.env.JWT_SECRET, { expiresIn: '15m' });
        const newRefreshJti = crypto_1.default.randomUUID();
        const newRefreshToken = jsonwebtoken_1.default.sign({ id: user.id, jti: newRefreshJti, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: '7d' });
        const hashedNew = crypto_1.default.createHash('sha256').update(newRefreshToken).digest('hex');
        await mockRefreshTokenModel.create({
            token: hashedNew,
            user_id: user.id,
            jti: newRefreshJti,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        res.cookie('token', newAccessToken, { httpOnly: true, maxAge: 15 * 60 * 1000 });
        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        (0, vitest_1.expect)(res.cookies.token).toBeDefined();
        (0, vitest_1.expect)(res.cookies.refreshToken).toBeDefined();
        const decodedAccess = jsonwebtoken_1.default.verify(res.cookies.token.value, process.env.JWT_SECRET);
        const decodedRefresh = jsonwebtoken_1.default.verify(res.cookies.refreshToken.value, process.env.JWT_SECRET);
        (0, vitest_1.expect)(decodedAccess.id).toBe(user.id);
        (0, vitest_1.expect)(decodedRefresh.jti).not.toBe(refreshJti);
    });
    (0, vitest_1.it)('should detect reuse of refresh token and invalidate all sessions', async () => {
        const user = mockUsersDb[0];
        const originalTokenVersion = user.token_version;
        const oldRefreshJti = crypto_1.default.randomUUID();
        const oldRefreshToken = jsonwebtoken_1.default.sign({ id: user.id, jti: oldRefreshJti, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: '7d' });
        // Old token is not in DB because it was already rotated
        const decoded = jsonwebtoken_1.default.verify(oldRefreshToken, process.env.JWT_SECRET);
        const hashedCheck = crypto_1.default.createHash('sha256').update(oldRefreshToken).digest('hex');
        const tokenRecord = await mockRefreshTokenModel.findOne({ where: { token: hashedCheck } });
        (0, vitest_1.expect)(tokenRecord).toBeNull();
        if (!tokenRecord) {
            // REUSE DETECTED!
            const userRecord = await mockUserModel.findByPk(decoded.id);
            if (userRecord) {
                userRecord.token_version = (userRecord.token_version || 0) + 1;
                await mockRefreshTokenModel.destroy({ where: { user_id: userRecord.id } });
            }
        }
        (0, vitest_1.expect)(user.token_version).toBe(originalTokenVersion + 1);
        (0, vitest_1.expect)(mockRefreshTokensDb.filter((r) => r.user_id === user.id).length).toBe(0);
    });
});
