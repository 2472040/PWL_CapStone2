import RedisClient from 'ioredis';

let redisClient: RedisClient | null = null;

if (process.env.REDIS_URL || process.env.USE_REDIS === 'true') {
  try {
    redisClient = new RedisClient(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 200, 1000);
      },
    });

    redisClient.on('error', (err: any) => {
      console.warn('[Redis] Connection error, falling back to local storage:', err.message);
    });
  } catch (err: any) {
    console.error('[Redis] Failed to initialize client:', err.message);
  }
}

export = redisClient;
