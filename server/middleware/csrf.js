const { parseCookies } = require('../utils/cookies');

/**
 * CSRF Protection Middleware
 * Employs the Double Submit Cookie pattern with Origin validation.
 * Non-GET endpoints must supply an 'X-CSRF-Token' header matching the 'csrfToken' cookie,
 * AND the request Origin/Referer must match the allowed origin.
 */
const csrfProtection = (req, res, next) => {
  const method = req.method.toUpperCase();
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];

  const cleanPath = req.path.replace(/\/$/, '');
  const cleanOriginalUrl = req.originalUrl.split('?')[0].replace(/\/$/, '');

  if (
    safeMethods.includes(method) ||
    cleanPath === '/api/v1/auth/login' ||
    cleanPath === '/auth/login' ||
    cleanOriginalUrl === '/api/v1/auth/login' ||
    cleanOriginalUrl === '/auth/login' ||
    cleanPath === '/api/v1/auth/refresh' ||
    cleanPath === '/auth/refresh' ||
    cleanOriginalUrl === '/api/v1/auth/refresh' ||
    cleanOriginalUrl === '/auth/refresh'
  ) {
    return next();
  }

  // Origin / Referer validation — blocks cross-origin CSRF attack vectors
  const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  const origin = req.headers.origin;
  const referer = req.headers.referer;

  if (origin) {
    // Exact match against allowed origin
    if (origin !== allowedOrigin) {
      return res.status(403).json({
        error: 'CSRF Protection: Origin header tidak sesuai dengan origin yang diizinkan.',
      });
    }
  } else if (referer) {
    // If no Origin header (e.g., form submissions), validate Referer
    try {
      const refererOrigin = new URL(referer).origin;
      if (refererOrigin !== allowedOrigin) {
        return res.status(403).json({
          error: 'CSRF Protection: Referer header tidak sesuai dengan origin yang diizinkan.',
        });
      }
    } catch (e) {
      return res.status(403).json({
        error: 'CSRF Protection: Referer header tidak valid.',
      });
    }
  }
  // Note: if neither Origin nor Referer is present (e.g., same-origin XHR in some browsers),
  // we still fall through to the double-submit cookie check below.

  // Extract cookies
  const cookies = req.headers.cookie ? parseCookies(req.headers.cookie) : {};
  const cookieCsrfToken = cookies.csrfToken;
  const headerCsrfToken = req.headers['x-csrf-token'];

  // Check for presence and exact match
  if (!cookieCsrfToken || !headerCsrfToken || cookieCsrfToken !== headerCsrfToken) {
    return res.status(403).json({
      error:
        'CSRF Protection: Permintaan ditolak karena CSRF token tidak ditemukan atau tidak cocok.',
    });
  }

  next();
};

module.exports = csrfProtection;
