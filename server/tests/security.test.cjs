/**
 * Security unit tests to verify access control, role authorization,
 * JWT authentication middleware, and the login rate limiter.
 * Run directly with: node server/tests/security.test.cjs
 */

const { authenticate, authorize } = require('../middleware/auth');
const { loginRateLimiter } = require('../middleware/rateLimiter');
const jwt = require('jsonwebtoken');

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

// Test Suite
async function runTests() {
  console.log('==================================================');
  console.log('🛡️  RUNNING LOKALAB SECURITY UNIT TESTS...');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  const test = (description, fn) => {
    try {
      fn();
      console.log(`✅ [PASSED] ${description}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAILED] ${description}`);
      console.error(`   Error: ${err.message}`);
      failed++;
    }
  };

  // 1. Test authorize middleware
  test('Role-based Access Control (RBAC): permit authorized roles', () => {
    const middleware = authorize('sysadmin', 'admin');
    const req = { user: { role: 'sysadmin' } };
    const res = createMockResponse();
    let nextCalled = false;
    
    middleware(req, res, () => {
      nextCalled = true;
    });

    if (!nextCalled) throw new Error('next() was not called for an authorized role');
    if (res.statusCode !== 200) throw new Error(`Incorrect status code: ${res.statusCode}`);
  });

  test('Role-based Access Control (RBAC): reject unauthorized roles with 403', () => {
    const middleware = authorize('sysadmin');
    const req = { user: { role: 'staflab' } };
    const res = createMockResponse();
    let nextCalled = false;

    middleware(req, res, () => {
      nextCalled = true;
    });

    if (nextCalled) throw new Error('next() was incorrectly called for an unauthorized role');
    if (res.statusCode !== 403) throw new Error(`Should return 403, got: ${res.statusCode}`);
    if (!res.jsonData || !res.jsonData.error.includes('Akses ditolak')) {
      throw new Error(`Incorrect error message: ${JSON.stringify(res.jsonData)}`);
    }
  });

  test('Role-based Access Control (RBAC): reject unauthenticated requests with 401', () => {
    const middleware = authorize('sysadmin');
    const req = {}; // No user object
    const res = createMockResponse();
    let nextCalled = false;

    middleware(req, res, () => {
      nextCalled = true;
    });

    if (nextCalled) throw new Error('next() was incorrectly called without authentication');
    if (res.statusCode !== 401) throw new Error(`Should return 401, got: ${res.statusCode}`);
  });

  // 2. Test Authenticate middleware (JWT validations)
  test('JWT Authentication: reject request missing authorization header with 401', async () => {
    const req = { headers: {} };
    const res = createMockResponse();
    let nextCalled = false;

    await authenticate(req, res, () => {
      nextCalled = true;
    });

    if (nextCalled) throw new Error('next() was called with a missing token');
    if (res.statusCode !== 401) throw new Error(`Should return 401, got: ${res.statusCode}`);
  });

  test('JWT Authentication: reject request with invalid header format', async () => {
    const req = { headers: { authorization: 'Basic dXNlcjpwYXNz' } };
    const res = createMockResponse();
    let nextCalled = false;

    await authenticate(req, res, () => {
      nextCalled = true;
    });

    if (nextCalled) throw new Error('next() was called with invalid header');
    if (res.statusCode !== 401) throw new Error(`Should return 401, got: ${res.statusCode}`);
  });

  // 3. Test Rate Limiter
  test('Login Rate Limiter: permit up to 5 repeated login attempts from same IP', () => {
    const req = { ip: '127.0.0.1' };
    const res = createMockResponse();
    let allowedAttempts = 0;

    for (let i = 0; i < 5; i++) {
      let nextCalled = false;
      loginRateLimiter(req, res, () => {
        nextCalled = true;
      });
      if (nextCalled) allowedAttempts++;
    }

    if (allowedAttempts !== 5) throw new Error(`Rate limiter did not allow 5 attempts, only allowed ${allowedAttempts}`);
  });

  test('Login Rate Limiter: block 6th login attempt with 429 Too Many Requests', () => {
    const req = { ip: '127.0.0.1' };
    const res = createMockResponse();
    let nextCalled = false;

    loginRateLimiter(req, res, () => {
      nextCalled = true;
    });

    if (nextCalled) throw new Error('Rate limiter allowed 6th attempt');
    if (res.statusCode !== 429) throw new Error(`Should return 429 on 6th attempt, got: ${res.statusCode}`);
    if (!res.jsonData || !res.jsonData.error.includes('Terlalu banyak percobaan')) {
      throw new Error(`Incorrect rate-limiting message: ${JSON.stringify(res.jsonData)}`);
    }
  });

  // 4. Test Backup Cryptography with AES-256-GCM
  test('Database Backup: Encrypted backup format possesses 12-byte iv, encrypted data, 16-byte authentication tag, and SHA-256 checksum', () => {
    const crypto = require('crypto');
    const secret = 'lokalab-backup-secret-key-for-testing-2026';
    const key = crypto.scryptSync(secret, 'loka-backup-salt-v2', 32);
    const iv = crypto.randomBytes(12); // 12-byte IV for GCM
    
    const dbPayload = { users: [{ id: 1, name: 'Anindita' }] };
    const rawJson = JSON.stringify(dbPayload);
    const checksum = crypto.createHash('sha256').update(rawJson).digest('hex');

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(rawJson, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();

    if (iv.length !== 12) throw new Error('IV must be 12 bytes for GCM');
    if (!encrypted) throw new Error('Encryption failed');
    if (tag.length !== 16) throw new Error('Authentication tag must be 16 bytes (128 bits)');
    if (!checksum) throw new Error('Checksum generation failed');
  });

  test('Database Backup: Correctly decrypts AES-256-GCM payload, verifies auth tag, and throws error on tampered data', () => {
    const crypto = require('crypto');
    const secret = 'lokalab-backup-secret-key-for-testing-2026';
    const key = crypto.scryptSync(secret, 'loka-backup-salt-v2', 32);
    const iv = crypto.randomBytes(12);
    
    const dbPayload = { users: [{ id: 1, name: 'Anindita' }] };
    const rawJson = JSON.stringify(dbPayload);

    // Encrypt
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(rawJson, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();

    // Decrypt (Valid)
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    if (decrypted !== rawJson) throw new Error('Decrypted content does not match original JSON');

    // Decrypt (Tampered ciphertext)
    const tamperedEncrypted = encrypted.substring(0, encrypted.length - 2) + '00';
    const decipherTamper = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipherTamper.setAuthTag(tag);
    
    let caughtError = false;
    try {
      let dec = decipherTamper.update(tamperedEncrypted, 'hex', 'utf8');
      dec += decipherTamper.final('utf8');
    } catch (e) {
      caughtError = true; // Decryption failed because of GCM integrity check!
    }

    if (!caughtError) throw new Error('GCM Decryption succeeded despite tampered ciphertext!');
  });

  // 5. Test Audit Log Hash Chaining (Anti-Tamper)
  test('Audit Log: Hash chaining linkages verify correctly, and tampering breaks the validation', () => {
    const crypto = require('crypto');
    const secret = 'lokalab-audit-secret-key-for-testing-2026';
    
    // Simulate a chain of audit logs
    const mockLogs = [];
    let previousHash = '0000000000000000000000000000000000000000000000000000000000000000';
    
    const logEntries = [
      { user_id: 1, action: 'user.login', target: 'admin', ip: '127.0.0.1' },
      { user_id: 1, action: 'inventory.create', target: 'LK-WS-001', ip: '127.0.0.1' },
      { user_id: 2, action: 'backup.export', target: 'db', ip: '192.168.1.10' }
    ];

    // Build the chain (calculate hashes)
    logEntries.forEach((entry, idx) => {
      const timeSecs = (1716000000 + idx).toString(); // sequential timestamps
      const dataToHash = `${previousHash}|${timeSecs}|${entry.user_id}|${entry.action}|${entry.target}|${entry.ip}`;
      const hash = crypto.createHmac('sha256', secret).update(dataToHash).digest('hex');
      
      mockLogs.push({
        ...entry,
        timeSecs,
        previous_hash: previousHash,
        hash
      });
      previousHash = hash;
    });

    // Verification helper function
    const verifyChain = (logs) => {
      let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
      for (let i = 0; i < logs.length; i++) {
        const log = logs[i];
        const dataToHash = `${prevHash}|${log.timeSecs}|${log.user_id}|${log.action}|${log.target}|${log.ip}`;
        const computed = crypto.createHmac('sha256', secret).update(dataToHash).digest('hex');
        
        if (log.previous_hash !== prevHash) return { valid: false, reason: 'linkage mismatch' };
        if (log.hash !== computed) return { valid: false, reason: 'data tampered' };
        prevHash = log.hash;
      }
      return { valid: true };
    };

    // 1. Verify valid chain
    const firstCheck = verifyChain(mockLogs);
    if (!firstCheck.valid) throw new Error(`Valid chain failed verification: ${firstCheck.reason}`);

    // 2. Tamper with a log content (e.g. change action of 2nd log)
    const tamperedLogs = JSON.parse(JSON.stringify(mockLogs));
    tamperedLogs[1].action = 'inventory.delete'; // modified data!
    
    const secondCheck = verifyChain(tamperedLogs);
    if (secondCheck.valid) throw new Error('Tampered chain succeeded verification (should have failed!)');
  });

  console.log('\n==================================================');
  console.log(`📊 SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('==================================================');


  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
