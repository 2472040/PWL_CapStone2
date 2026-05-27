const loginAttempts = new Map();

/**
 * Custom in-memory rate limiter middleware to protect the login endpoint
 * against brute force attacks. Limits to 5 attempts per 15 minutes per IP.
 */
const loginRateLimiter = (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const timeframe = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  if (!loginAttempts.has(ip)) {
    loginAttempts.set(ip, []);
  }

  // Filter out attempts older than the timeframe
  const attempts = loginAttempts.get(ip).filter(timestamp => now - timestamp < timeframe);
  attempts.push(now);
  loginAttempts.set(ip, attempts);

  if (attempts.length > maxAttempts) {
    const minutesLeft = Math.ceil((attempts[0] + timeframe - now) / 60000);
    return res.status(429).json({
      error: `Terlalu banyak percobaan login dari IP ini. Silakan coba lagi dalam ${minutesLeft} menit.`
    });
  }

  next();
};

module.exports = { loginRateLimiter };
