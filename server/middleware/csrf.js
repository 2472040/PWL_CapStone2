const parseCookies = (cookieHeader) => {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    list[parts.shift().trim()] = decodeURI(parts.join('='));
  });
  return list;
};

/**
 * CSRF Protection Middleware
 * Employs the Double Submit Cookie pattern.
 * Non-GET endpoints must supply an 'X-CSRF-Token' header matching the 'csrfToken' cookie.
 */
const csrfProtection = (req, res, next) => {
  const method = req.method.toUpperCase();
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];

  const cleanPath = req.path.replace(/\/$/, '');
  const cleanOriginalUrl = req.originalUrl.split('?')[0].replace(/\/$/, '');

  if (
    safeMethods.includes(method) || 
    cleanPath === '/api/auth/login' || 
    cleanPath === '/auth/login' ||
    cleanOriginalUrl === '/api/auth/login' ||
    cleanOriginalUrl === '/auth/login'
  ) {
    return next();
  }

  // Extract cookies
  const cookies = req.headers.cookie ? parseCookies(req.headers.cookie) : {};
  const cookieCsrfToken = cookies.csrfToken;
  const headerCsrfToken = req.headers['x-csrf-token'];

  // Check for presence and exact match
  if (!cookieCsrfToken || !headerCsrfToken || cookieCsrfToken !== headerCsrfToken) {
    return res.status(403).json({
      error: 'CSRF Protection: Permintaan ditolak karena CSRF token tidak ditemukan atau tidak cocok.'
    });
  }

  next();
};

module.exports = csrfProtection;
