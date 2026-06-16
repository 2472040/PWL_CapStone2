// @ts-check
const crypto = require('crypto');
const { AuditLog } = require('../models');
const { logger } = require('../utils/logger');

// In-memory Promise-based sequential queue to completely eliminate audit log race conditions
let writeQueue = Promise.resolve();
/** @type {Promise<string>|null} */
let lastHashPromise = null;

/**
 * Lazy helper to load the latest hash from database or reuse the cached promise.
 * @returns {Promise<string>}
 */
const getLastHash = async () => {
  if (lastHashPromise) return lastHashPromise;
  lastHashPromise = (async () => {
    const lastLog = /** @type {any} */ (await AuditLog.findOne({
      order: [['id', 'DESC']],
    }));
    return lastLog && lastLog.hash
      ? lastLog.hash
      : '0000000000000000000000000000000000000000000000000000000000000000';
  })();
  return lastHashPromise;
};

/**
 * Helper to log user actions to audit_logs table with HMAC-SHA256 hash chaining.
 * Serialized via writeQueue to avoid race conditions during concurrent requests.
 * @param {number|string|undefined} userId
 * @param {string} action
 * @param {string} target
 * @param {string|undefined} ip
 * @param {string} [details]
 * @returns {Promise<void>}
 */
const logAudit = async (userId, action, target, ip, details = '') => {
  const resultPromise = new Promise((resolve, reject) => {
    writeQueue = writeQueue.then(async () => {
      try {
        const secret = process.env.AUDIT_LOG_SECRET;
        if (!secret && process.env.NODE_ENV === 'production') {
          throw new Error('AUDIT_LOG_SECRET wajib diatur di lingkungan produksi.');
        }
        const activeSecret = secret || 'lokalab-default-audit-secret-key-2026';

        // Retrieve cached or database last hash
        const previousHash = await getLastHash();

        // We use a deterministic timestamp in seconds for hash calculation
        // to avoid millisecond truncation mismatches with MySQL DATETIME type.
        const now = new Date();
        const timeSecs = Math.floor(now.getTime() / 1000).toString();

        const dataToHash = `${previousHash}|${timeSecs}|${userId || ''}|${action}|${target || ''}|${ip || ''}|${details || ''}`;
        const hash = crypto.createHmac('sha256', activeSecret).update(dataToHash).digest('hex');

        // Optimistically update the cache for subsequent queue items
        lastHashPromise = Promise.resolve(hash);

        await AuditLog.create({
          user_id: userId,
          action,
          target,
          ip: ip || null,
          details: details || null,
          hash,
          previous_hash: previousHash,
          created_at: now,
        });
        // @ts-ignore
        resolve();
      } catch (err) {
        // @ts-ignore
        logger.error(`[Audit Log Error] Failed to persist audit entry: ${err.message}`, {
          action,
          target,
          userId,
          // @ts-ignore
          stack: err.stack,
        });
        // Reset the cache to force refetching from database on next write since this one failed
        lastHashPromise = null;
        // @ts-ignore
        resolve(); // Always resolve the queue chain to prevent blocking subsequent logs
      }
    });
  });

  // @ts-ignore
  await resultPromise;
};

/**
 * Middleware that auto-logs POST/PUT/DELETE requests
 * @param {string} actionPrefix
 * @returns {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => void}
 */
const auditMiddleware = (actionPrefix) => {
  return (req, res, next) => {
    // Store original json method to intercept response
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      // Only log successful mutations
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const method = req.method.toLowerCase();
        let action = actionPrefix;
        if (method === 'post') action += '.create';
        else if (method === 'put' || method === 'patch') action += '.update';
        else if (method === 'delete') action += '.delete';

        const target =
          data?.data?.code || data?.data?.name || data?.data?.id || req.params.id || '';

        let details = '';
        if (req.body && (method === 'post' || method === 'put' || method === 'patch')) {
          const bodyCopy = { ...req.body };
          // Remove sensitive data
          delete bodyCopy.password;
          delete bodyCopy.currentPassword;
          delete bodyCopy.newPassword;
          delete bodyCopy.confirmPassword;
          details = JSON.stringify(bodyCopy);
        }

        logAudit(req.user.id, action, String(target), req.ip, details);
      }
      return originalJson(data);
    };
    next();
  };
};

/**
 * Resets the in-memory hash cache. Must be called after operations that
 * modify the audit_logs table outside of logAudit() (e.g. backup restore)
 * to prevent hash chain corruption.
 */
const resetAuditCache = () => {
  lastHashPromise = null;
};

module.exports = { logAudit, auditMiddleware, resetAuditCache };
