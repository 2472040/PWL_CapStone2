const crypto = require('crypto');
const { AuditLog } = require('../models');

/**
 * Helper to log user actions to audit_logs table with HMAC-SHA256 hash chaining
 */
const logAudit = async (userId, action, target, ip) => {
  try {
    const secret = process.env.AUDIT_LOG_SECRET || 'lokalab-default-audit-secret-key-2026';
    
    // Find the latest audit log to chain hashes
    const lastLog = await AuditLog.findOne({
      order: [['id', 'DESC']],
    });

    const previousHash = lastLog && lastLog.hash
      ? lastLog.hash
      : '0000000000000000000000000000000000000000000000000000000000000000';

    // We use a deterministic timestamp in seconds for hash calculation
    // to avoid millisecond truncation mismatches with MySQL DATETIME type.
    const now = new Date();
    const timeSecs = Math.floor(now.getTime() / 1000).toString();

    const dataToHash = `${previousHash}|${timeSecs}|${userId || ''}|${action}|${target || ''}|${ip || ''}`;
    const hash = crypto.createHmac('sha256', secret).update(dataToHash).digest('hex');

    await AuditLog.create({
      user_id: userId,
      action,
      target,
      ip: ip || null,
      hash,
      previous_hash: previousHash,
      created_at: now,
    });
  } catch (err) {
    console.error('[Audit Log Error]', err.message);
  }
};

/**
 * Middleware that auto-logs POST/PUT/DELETE requests
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

        const target = data?.data?.code || data?.data?.name || data?.data?.id || req.params.id || '';
        logAudit(req.user.id, action, String(target), req.ip);
      }
      return originalJson(data);
    };
    next();
  };
};

module.exports = { logAudit, auditMiddleware };
