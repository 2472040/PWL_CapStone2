const { AuditLog } = require('../models');

/**
 * Helper to log user actions to audit_logs table
 */
const logAudit = async (userId, action, target, ip) => {
  try {
    await AuditLog.create({
      user_id: userId,
      action,
      target,
      ip: ip || null,
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
