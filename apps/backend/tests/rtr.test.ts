import { describe, it, expect, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Setup mock environment variables if not set
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

// Mock Databases
let mockRefreshTokensDb: any[] = [];
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
  create: async (data: any) => {
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
  findOne: async ({ where }: any) => {
    return mockRefreshTokensDb.find((r) => r.token === where.token) || null;
  },
  destroy: async ({ where }: any) => {
    let deletedCount = 0;
    if (where.token) {
      const idx = mockRefreshTokensDb.findIndex((r) => r.token === where.token);
      if (idx !== -1) {
        mockRefreshTokensDb.splice(idx, 1);
        deletedCount = 1;
      }
    } else if (where.user_id) {
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
  findByPk: async (id: any) => {
    const user: any = mockUsersDb.find((u) => u.id === id);
    if (user) {
      user.destroy = async () => {};
    }
    return user || null;
  },
};

// Helper for Mock request and response
const createMockResponse = () => {
  const res: any = {
    statusCode: 200,
    cookies: {},
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
  res.cookie = (name: string, val: any, options: any) => {
    res.cookies[name] = { value: val, options };
    return res;
  };
  res.clearCookie = (name: string, options: any) => {
    delete res.cookies[name];
    return res;
  };
  return res;
};

describe('Refresh Token Rotation (RTR)', () => {
  beforeEach(() => {
    mockRefreshTokensDb = [];
    mockUsersDb[0].token_version = 0;
  });

  it('should rotate refresh token and return new access token', async () => {
    const user = mockUsersDb[0];
    const refreshJti = crypto.randomUUID();
    const mockRefreshToken = jwt.sign(
      { id: user.id, jti: refreshJti, type: 'refresh' },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Save refresh token to mock DB
    const hashed = crypto.createHash('sha256').update(mockRefreshToken).digest('hex');
    await mockRefreshTokenModel.create({
      token: hashed,
      user_id: user.id,
      jti: refreshJti,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const res = createMockResponse();

    // Simulate RTR Logic
    const decoded: any = jwt.verify(mockRefreshToken, process.env.JWT_SECRET!);
    const hashedCheck = crypto.createHash('sha256').update(mockRefreshToken).digest('hex');
    const tokenRecord = await mockRefreshTokenModel.findOne({ where: { token: hashedCheck } });

    expect(tokenRecord).toBeDefined();
    await tokenRecord.destroy(); // Rotate token

    const newJti = crypto.randomUUID();
    const newAccessToken = jwt.sign(
      { id: user.id, role: user.role, tokenVersion: user.token_version, jti: newJti },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );

    const newRefreshJti = crypto.randomUUID();
    const newRefreshToken = jwt.sign(
      { id: user.id, jti: newRefreshJti, type: 'refresh' },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    const hashedNew = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
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

    expect(res.cookies.token).toBeDefined();
    expect(res.cookies.refreshToken).toBeDefined();

    const decodedAccess: any = jwt.verify(res.cookies.token.value, process.env.JWT_SECRET!);
    const decodedRefresh: any = jwt.verify(res.cookies.refreshToken.value, process.env.JWT_SECRET!);

    expect(decodedAccess.id).toBe(user.id);
    expect(decodedRefresh.jti).not.toBe(refreshJti);
  });

  it('should detect reuse of refresh token and invalidate all sessions', async () => {
    const user = mockUsersDb[0];
    const originalTokenVersion = user.token_version;
    const oldRefreshJti = crypto.randomUUID();
    const oldRefreshToken = jwt.sign(
      { id: user.id, jti: oldRefreshJti, type: 'refresh' },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Old token is not in DB because it was already rotated
    const decoded: any = jwt.verify(oldRefreshToken, process.env.JWT_SECRET!);
    const hashedCheck = crypto.createHash('sha256').update(oldRefreshToken).digest('hex');
    const tokenRecord = await mockRefreshTokenModel.findOne({ where: { token: hashedCheck } });

    expect(tokenRecord).toBeNull();

    if (!tokenRecord) {
      // REUSE DETECTED!
      const userRecord = await mockUserModel.findByPk(decoded.id);
      if (userRecord) {
        userRecord.token_version = (userRecord.token_version || 0) + 1;
        await mockRefreshTokenModel.destroy({ where: { user_id: userRecord.id } });
      }
    }

    expect(user.token_version).toBe(originalTokenVersion + 1);
    expect(mockRefreshTokensDb.filter((r) => r.user_id === user.id).length).toBe(0);
  });
});
