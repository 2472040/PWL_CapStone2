const ipAttempts = new Map();
const userAttempts = new Map();

/**
 * Custom Rate Limiter and Progressive Delay Middleware for Login
 * 1. IP-based limit: 5 attempts per 15 minutes.
 * 2. Username/Email-based limit: 5 attempts per 15 minutes.
 * 3. Progressive Delay: introduces a delay (consecutive_failures * 1000ms, max 5000ms) for subsequent attempts.
 */
const loginRateLimiter = async (req, res, next) => {
  const ip = req.ip;
  const email = req.body ? req.body.email : undefined;
  const now = Date.now();
  const timeframe = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  // 1. IP check
  if (!ipAttempts.has(ip)) {
    ipAttempts.set(ip, []);
  }
  const ipHistory = ipAttempts.get(ip).filter(t => now - t < timeframe);
  ipAttempts.set(ip, ipHistory);

  if (ipHistory.length >= maxAttempts) {
    const minutesLeft = Math.ceil((ipHistory[0] + timeframe - now) / 60000);
    return res.status(429).json({
      error: `Terlalu banyak percobaan login dari IP ini. Silakan coba lagi dalam ${minutesLeft} menit.`
    });
  }

  // 2. Username check
  if (email) {
    const cleanEmail = String(email).trim().toLowerCase();
    if (!userAttempts.has(cleanEmail)) {
      userAttempts.set(cleanEmail, []);
    }
    const userHistory = userAttempts.get(cleanEmail).filter(t => now - t < timeframe);
    userAttempts.set(cleanEmail, userHistory);

    if (userHistory.length >= maxAttempts) {
      const minutesLeft = Math.ceil((userHistory[0] + timeframe - now) / 60000);
      return res.status(429).json({
        error: `Terlalu banyak percobaan login untuk akun ini. Silakan coba lagi dalam ${minutesLeft} menit.`
      });
    }

    // 3. Progressive delay (if there were previous attempts, introduce a delay)
    // Delay = consecutive attempts * 1000ms (max 5000ms)
    const recentAttemptsCount = Math.max(ipHistory.length, userHistory.length);
    if (recentAttemptsCount > 0) {
      const delayMs = Math.min(recentAttemptsCount * 1000, 5000);
      console.log(`[Rate Limiter] Introducing progressive delay of ${delayMs}ms for ${cleanEmail} from ${ip}`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  // Track attempt
  ipHistory.push(now);
  if (email) {
    const cleanEmail = String(email).trim().toLowerCase();
    userAttempts.get(cleanEmail).push(now);
  }

  next();
};

/**
 * Clear tracking for successful logins
 */
const clearLoginAttempts = (ip, email) => {
  if (ip) ipAttempts.delete(ip);
  if (email) {
    const cleanEmail = String(email).trim().toLowerCase();
    userAttempts.delete(cleanEmail);
  }
};

module.exports = { loginRateLimiter, clearLoginAttempts };
