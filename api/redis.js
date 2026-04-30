import { AppConfig } from './config.js';

export class RedisService {
    static async request(command, ...args) {
        if (!AppConfig.upstashRedisRestUrl || !AppConfig.upstashRedisRestToken) return null;
        try {
            const url = `${AppConfig.upstashRedisRestUrl}/${command}/${args.join('/')}`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${AppConfig.upstashRedisRestToken}` } });
            const data = await res.json();
            return data.result;
        } catch (e) { return null; }
    }

    static async get(key) { return await this.request('get', key); }
    static async set(key, value, ex, seconds) { 
        if(ex && seconds) return await this.request('set', key, encodeURIComponent(value), ex, seconds);
        return await this.request('set', key, encodeURIComponent(value)); 
    }
    static async incr(key) { return await this.request('incr', key); }
    static async expire(key, seconds) { return await this.request('expire', key, seconds); }
}

export class GlobalStatsManager {
    static async getStats() {
        const data = await RedisService.get('global_system_stats');
        return data ? JSON.parse(decodeURIComponent(data)) : { totalSessions: 0, uniquePhones:[] };
    }
    static async recordEvent(phone) {
        const stats = await this.getStats();
        if (!stats.uniquePhones) stats.uniquePhones =[];
        if (!stats.uniquePhones.includes(phone) && phone !== 'Unknown_Caller') stats.uniquePhones.push(phone);
        stats.totalSessions++;
        await RedisService.set('global_system_stats', JSON.stringify(stats));
    }
    static async checkBlocked(phone) {
        const stats = await this.getStats();
        return stats.blockedPhones && stats.blockedPhones.includes(phone);
    }
}
