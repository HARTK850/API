import { Redis } from '@upstash/redis';
import { Logger } from './utils.js';

let redisClient = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redisClient = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
} else {
    Logger.warn("Redis", "UPSTASH_REDIS_REST_URL missing. Using in-memory fallback.");
}

export const redis = redisClient;
