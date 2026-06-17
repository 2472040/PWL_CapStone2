"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const ioredis_1 = __importDefault(require("ioredis"));
let redisClient = null;
if (process.env.REDIS_URL || process.env.USE_REDIS === 'true') {
    try {
        redisClient = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379', {
            maxRetriesPerRequest: 1,
            retryStrategy: (times) => {
                if (times > 3)
                    return null;
                return Math.min(times * 200, 1000);
            },
        });
        redisClient.on('error', (err) => {
            console.warn('[Redis] Connection error, falling back to local storage:', err.message);
        });
    }
    catch (err) {
        console.error('[Redis] Failed to initialize client:', err.message);
    }
}
module.exports = redisClient;
