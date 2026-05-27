/**
 * CSRF Protection Middleware
 * Since we are using HttpOnly cookies for session storage,
 * we protect mutation endpoints (POST/PUT/DELETE/PATCH)
 * by requiring a custom request header ('X-Requested-With' or 'X-CSRF-Token').
 * Standard CSRF attacks (form submits, image tags) cannot set custom headers.
 */
const csrfProtection = (req, res, next) => {
  const method = req.method.toUpperCase();
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];

  if (safeMethods.includes(method)) {
    return next();
  }

  const customHeader = req.headers['x-requested-with'] || req.headers['x-csrf-token'];
  
  if (!customHeader) {
    return res.status(403).json({
      error: 'CSRF Protection: Permintaan ditolak karena header keamanan wajib (X-Requested-With) tidak ditemukan.'
    });
  }

  next();
};

module.exports = csrfProtection;
