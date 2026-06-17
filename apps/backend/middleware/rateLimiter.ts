import redisClient from '../utils/redis';
import { Request, Response, NextFunction, RequestHandler } from 'express';

const ipAttempts = new Map<string, number[]>();
const userAttempts = new Map<string, number[]>();

// Periodically prune stale entries every 15 minutes to prevent memory leaks in the local fallback
const CLEANUP_INTERVAL = 15 * 60 * 1000;
const ENTRY_TTL = 15 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of ipAttempts) {
    const fresh = timestamps.filter((t) => now - t < ENTRY_TTL);
    if (fresh.length === 0) ipAttempts.delete(key);
    else ipAttempts.set(key, fresh);
  }
  for (const [key, timestamps] of userAttempts) {
    const fresh = timestamps.filter((t) => now - t < ENTRY_TTL);
    if (fresh.length === 0) userAttempts.delete(key);
    else userAttempts.set(key, fresh);
  }
}, CLEANUP_INTERVAL).unref();

/**
 * Custom Rate Limiter and Progressive Delay Middleware for Login
 * 1. IP-based limit: 5 attempts per 15 minutes.
 * 2. Username/Email-based limit: 5 attempts per 15 minutes.
 * 3. Progressive Delay: introduces a delay (consecutive_failures * 1000ms, max 5000ms) for subsequent attempts.
 */
export const loginRateLimiter: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const ip = req.ip || 'unknown-ip';
  const email = req.body ? req.body.email : undefined;
  const now = Date.now();
  const timeframe = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  const cleanEmail = email ? String(email).trim().toLowerCase() : null;

  // Check if we should use Redis or local fallback
  const useRedis = redisClient && redisClient.status === 'ready';

  if (useRedis) {
    try {
      const ipKey = `rate:ip:${ip}`;
      const userKey = cleanEmail ? `rate:user:${cleanEmail}` : null;

      // 1. IP check
      await redisClient.zremrangebyscore(ipKey, 0, now - timeframe);
      const ipAttemptsCount = await redisClient.zcard(ipKey);

      if (ipAttemptsCount >= maxAttempts) {
        const oldestIpAttempt = await redisClient.zrange(ipKey, 0, 0);
        const oldestTime = oldestIpAttempt.length ? parseInt(oldestIpAttempt[0], 10) : now;
        const minutesLeft = Math.ceil((oldestTime + timeframe - now) / 60000);
        return res.status(429).json({
          error: `Terlalu banyak percobaan login dari IP ini. Silakan coba lagi dalam ${minutesLeft} menit.`,
        });
      }

      // 2. User check
      let userAttemptsCount = 0;
      if (userKey) {
        await redisClient.zremrangebyscore(userKey, 0, now - timeframe);
        userAttemptsCount = await redisClient.zcard(userKey);

        if (userAttemptsCount >= maxAttempts) {
          const oldestUserAttempt = await redisClient.zrange(userKey, 0, 0);
          const oldestTime = oldestUserAttempt.length ? parseInt(oldestUserAttempt[0], 10) : now;
          const minutesLeft = Math.ceil((oldestTime + timeframe - now) / 60000);
          return res.status(429).json({
            error: `Terlalu banyak percobaan login untuk akun ini. Silakan coba lagi dalam ${minutesLeft} menit.`,
          });
        }
      }

      // 3. Progressive delay (if there were previous attempts, introduce a delay)
      const recentAttemptsCount = Math.max(ipAttemptsCount, userAttemptsCount);
      if (recentAttemptsCount > 0 && process.env.NODE_ENV !== 'test') {
        const delayMs = Math.min(recentAttemptsCount * 1000, 5000);
        console.log(
          `[Rate Limiter - Redis] Introducing progressive delay of ${delayMs}ms for ${cleanEmail || 'unknown'} from ${ip}`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      // Track attempt
      const multi = redisClient.multi();
      multi.zadd(ipKey, now, now);
      multi.expire(ipKey, 900); // 15 mins
      if (userKey) {
        multi.zadd(userKey, now, now);
        multi.expire(userKey, 900);
      }
      await multi.exec();

      return next();
    } catch (err: any) {
      console.warn(
        '[Rate Limiter] Redis error in rate limiter, using in-memory fallback:',
        err.message
      );
      // Fall through to in-memory fallback logic
    }
  }

  // =============================================
  // In-Memory Fallback Logic (used if Redis is offline)
  // =============================================
  // 1. IP check
  if (!ipAttempts.has(ip)) {
    ipAttempts.set(ip, []);
  }
  const ipHistory = ipAttempts.get(ip)!.filter((t) => now - t < timeframe);
  ipAttempts.set(ip, ipHistory);

  if (ipHistory.length >= maxAttempts) {
    const minutesLeft = Math.ceil((ipHistory[0] + timeframe - now) / 60000);
    return res.status(429).json({
      error: `Terlalu banyak percobaan login dari IP ini. Silakan coba lagi dalam ${minutesLeft} menit.`,
    });
  }

  // 2. Username check
  let userHistory: number[] = [];
  if (cleanEmail) {
    if (!userAttempts.has(cleanEmail)) {
      userAttempts.set(cleanEmail, []);
    }
    userHistory = userAttempts.get(cleanEmail)!.filter((t) => now - t < timeframe);
    userAttempts.set(cleanEmail, userHistory);

    if (userHistory.length >= maxAttempts) {
      const minutesLeft = Math.ceil((userHistory[0] + timeframe - now) / 60000);
      return res.status(429).json({
        error: `Terlalu banyak percobaan login untuk akun ini. Silakan coba lagi dalam ${minutesLeft} menit.`,
      });
    }
  }

  // 3. Progressive delay
  const recentAttemptsCount = Math.max(ipHistory.length, userHistory.length);
  if (recentAttemptsCount > 0 && process.env.NODE_ENV !== 'test') {
    const delayMs = Math.min(recentAttemptsCount * 1000, 5000);
    console.log(
      `[Rate Limiter - Local Memory] Introducing progressive delay of ${delayMs}ms for ${cleanEmail || 'unknown'} from ${ip}`
    );
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  // Track attempt
  ipHistory.push(now);
  if (cleanEmail) {
    userAttempts.get(cleanEmail)!.push(now);
  }

  next();
};

/**
 * Clear tracking for successful logins
 */
export const clearLoginAttempts = (ip?: string, email?: string): void => {
  const cleanEmail = email ? String(email).trim().toLowerCase() : null;

  // Clear in memory
  if (ip) ipAttempts.delete(ip);
  if (cleanEmail) userAttempts.delete(cleanEmail);

  // Clear in Redis
  const useRedis = redisClient && redisClient.status === 'ready';
  if (useRedis) {
    try {
      const ipKey = `rate:ip:${ip}`;
      const userKey = cleanEmail ? `rate:user:${cleanEmail}` : null;
      if (ip) redisClient.del(ipKey).catch(() => {});
      if (userKey) redisClient.del(userKey).catch(() => {});
    } catch (err: any) {
      console.warn('[Rate Limiter] Redis error in clearLoginAttempts:', err.message);
    }
  }
};
