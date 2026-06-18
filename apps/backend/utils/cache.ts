import redisClient from './redis';

export const clearDashboardCache = async (): Promise<void> => {
  if (redisClient && redisClient.status === 'ready') {
    const roles = ['sysadmin', 'kalab', 'kaprodi', 'admin', 'staflab'];
    const keys = roles.map((role) => `dashboard:stats:${role}`);
    try {
      await redisClient.del(...keys);
    } catch (err: any) {
      console.warn('[Redis] Failed to clear dashboard cache:', err.message);
    }
  }
};
