import { redis } from './redis.js';

export class GlobalStatsManager {
    static async getStats() {
        if (!redis) return { totalSessions: 0, uniquePhones:[] };
        return await redis.get('global_stats') || { totalSessions: 0, uniquePhones:[] };
    }
    static async recordEvent(phone, type) {
        if (!redis) return;
        const stats = await this.getStats();
        if (!stats.uniquePhones) stats.uniquePhones =[];
        if (!stats.uniquePhones.includes(phone) && phone !== 'unknown') stats.uniquePhones.push(phone);
        if (type === 'session') stats.totalSessions = (stats.totalSessions || 0) + 1;
        await redis.set('global_stats', stats);
    }
}

export class NoticeBoardManager {
    static async getNotices() {
        return redis ? (await redis.get('global_notice_board') ||[]) :[];
    }
    static async addNotice(text, phone) {
        if (!redis) return;
        const notices = await this.getNotices();
        notices.push({ text, phone, date: new Date().toISOString() });
        if (notices.length > 30) notices.shift(); 
        await redis.set('global_notice_board', notices);
    }
}

export class SharedChatsManager {
    static async getSharedCodes(phone) { return redis ? (await redis.get(`user_shares:${phone}`) || []) :[]; }
    static async getChatByCode(code) { return redis ? await redis.get(`shared_chat:${code}`) : null; }
}

const UserMemoryCache = new Map();
export class UserRepository {
    static async getProfile(phone) {
        if (!phone || phone === 'unknown') return this.defaultProfile();
        if (UserMemoryCache.has(phone)) return UserMemoryCache.get(phone);
        let data = redis ? await redis.get(`profile:${phone}`) : null;
        const profile = data || this.defaultProfile();
        UserMemoryCache.set(phone, profile);
        return profile;
    }
    static async saveProfile(phone, data) {
        if (!phone || phone === 'unknown') return;
        UserMemoryCache.set(phone, data);
        if (redis) await redis.set(`profile:${phone}`, data);
    }
    static defaultProfile() {
        return { chats:[], currentChatId: null, aiDetailLevel: "5", customInstructions: "", personalProfile: "", adminListIndex: 0, pagination: { chunks:[] } };
    }
}
