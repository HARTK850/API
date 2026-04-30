/**
 * @file api/index.js
 * @description Ultimate Enterprise IVR System for Yemot HaMashiach & Google Gemini AI.
 * @version 46.0.0 (Function Calling Memory, Smart Key Manager, Nitoviya, Pure OOP)
 * @author Custom AI Assistant
 */

import Redis from 'ioredis';

export const maxDuration = 60;

// ============================================================================
// PART 1: SYSTEM CONSTANTS, ENUMS & CONFIGURATION DEFAULTS
// ============================================================================

const SYSTEM_CONSTANTS = {
    MODELS: {
        PRIMARY_GEMINI_MODEL: "gemini-3.1-flash-lite-preview", 
        JSON_MIME_TYPE: "application/json",
        AUDIO_MIME_TYPE: "audio/wav"
    },
    YEMOT_PATHS: { RECORDINGS_DIR: "/ApiRecords" },
    HTTP_STATUS: { OK: 200, INTERNAL_SERVER_ERROR: 500 },
    IVR_DEFAULTS: { STANDARD_TIMEOUT: "7", RECORD_MIN_SEC: "1", RECORD_MAX_SEC: "120", MAX_CHUNK_LENGTH: 850 },
    RETRY_POLICY: { MAX_RETRIES: 3, INITIAL_BACKOFF_MS: 1000, BACKOFF_MULTIPLIER: 2 },
    PROMPTS: {
        MAIN_MENU: "t-לשיחת צ'אט הקישו 1. להיסטוריית שיחות הקישו 2. למידע על המערכת הקישו 0. לתפריט הגדרות הקישו כוכבית.",
        INFO_MENU: "t-לשמיעת נתוני המערכת הקישו 9. לחזרה הקישו 0.",
        NEW_CHAT_RECORD: "f-Recorded",
        NO_HISTORY: "t-אין לכם היסטוריית שיחות במערכת.",
        HISTORY_MENU_PREFIX: "t-תפריט היסטוריית שיחות.",
        MENU_SUFFIX_0: "t-לחזרה לתפריט הראשי הקישו 0.",
        INVALID_CHOICE: "t-הבחירה שגויה. אנא נסו שוב.",
        
        CHAT_ACTION_MENU: "f-Chat_menu",
        CHAT_PAGINATION_MENU: "f-Full_chat_menu",
        
        HISTORY_ITEM_MENU: "t-לשמיעת השיחה הקישו 1. לשינוי שם הקישו 2. למחיקה הקישו 3. לנעיצה הקישו 4. לשיתוף השיחה הקישו 5. לחזרה הקישו 0.",
        SHARE_MENU: "t-לשיתוף השיחה עם מספרי פלאפון מסוימים הקישו 1. לשיתוף השיחה עם קוד שיחה פומבי הקישו 2. לחזרה הקישו 0.",
        SHARE_PHONES_INPUT: "t-אנא הקישו את מספרי הפלאפון. בין מספר למספר הקישו כוכבית. בסיום כל המספרים הקישו סולמית.",
        SHARE_PHONES_CONFIRM: "t-לאישור ושיתוף השיחה הקישו 1. להקשה מחדש הקישו 2. לביטול וחזרה הקישו 0.",
        SHARE_CODE_IMPORT: "t-אנא הקישו את קוד השיחה שקיבלתם בן 5 ספרות, ובסיום סולמית.",
        
        DELETE_CONFIRM_MENU: "f-delete_confirm_menu",
        RENAME_PROMPT: "t-אנא הקלידו את השם החדש באמצעות המקלדת, בסיום הקישו סולמית.",
        ACTION_SUCCESS: "t-הפעולה בוצעה בהצלחה.",
        
        ADMIN_AUTH: "t-אנא הקישו את סיסמת הניהול ובסיום סולמית.",
        ADMIN_MENU: "t-תפריט ניהול. לנתוני מערכת הקישו 1. לניהול משתמש ספציפי הקישו 2. לרשימת כל המשתמשים הקישו 3. לסטטוס מפתחות אי פי איי הקישו 4. לחזרה הקישו 0.",
        ADMIN_USER_PROMPT: "t-אנא הקישו את מספר הטלפון של המשתמש ובסיום סולמית.",
        ADMIN_USER_ACTION: "t-לניהול המשתמש: לחסימה לצמיתות הקישו 1. לשחרור מחסימה הקישו 2. למחיקת כל נתוני המשתמש הקישו 3. לחזרה הקישו 0.",
        USER_BLOCKED: "t-מספר הטלפון שלך נחסם משימוש במערכת זו. שלום ותודה.",
        ADMIN_LIST_MENU: "t-לניהול המספר הקישו 1. למעבר למספר הבא הקישו 2. לחיוג חינם למספר הקישו 3. לחזרה לתפריט הניהול הקישו 0.",
        ADMIN_LIST_END: "t-סוף רשימת המשתמשים.",
        
        SYSTEM_ERROR_FALLBACK: "t-אירעה שגיאה בלתי צפויה, אך ננסה להמשיך. אנא נסו שוב.",
        AI_API_ERROR: "t-אירעה שגיאה בחיבור למנוע הבינה המלאכותית. אנא נסו שוב מאוחר יותר.",
        BAD_AUDIO: "t-לא הצלחתי לשמוע אתכם בבירור. אנא הקפידו לדבר בקול רם ונסו שוב.",
        PREVIOUS_QUESTION_PREFIX: "שאלה קודמת:",
        PREVIOUS_ANSWER_PREFIX: "תשובה קודמת:",

        GAME_START: "t-ברוכים הבאים למשחק שיצרתי עבורכם. נתחיל בשאלה הראשונה.", 
        GAME_QUESTION: "t-השאלה היא.", 
        GAME_ANS_PREFIX: "t-אפשרות.", 
        GAME_PROMPT_DIGIT: "t-אנא הקישו את מספר התשובה הנכונה כעת.", 
        GAME_CLOCK: "m-1209", 
        GAME_CORRECT: "m-1200", 
        GAME_WRONG: "m-1210", 
        GAME_GET_POINT: "m-1017", 
        GAME_POINT_WORD: "m-1014", 
        GAME_NEXT_Q: "m-1206", 
        GAME_END_SCORE: "m-1229", 
        GAME_AWESOME: "m-1230", 

        SETTINGS_MENU: "t-תפריט הגדרות אישיות. להגדרת רמת פירוט התשובה הקישו 1. להקלטת הנחיות מערכת קבועות הקישו 2. להקלטת פרופיל אישי והעדפות הקישו 3. לחזרה לתפריט הראשי הקישו 0.",
        SETTINGS_DETAIL: "t-אנא הקישו את רמת פירוט התשובה מ-1 עד 10, כאשר 1 זה תשובות קצרות מאוד ו-10 זה תשובות ארוכות ומפורטות מאוד. בסיום הקישו סולמית.",
        SETTINGS_EXISTING_PROMPT: "t-המערכת זיהתה שקיים מידע שמור. להחלפת המידע הקישו 1. להוספת מידע על הקיים הקישו 2. למחיקת המידע הקישו 3. לחזרה לתפריט ההגדרות הקישו 0.",
        SETTINGS_INSTRUCTIONS_RECORD: "t-אנא הקליטו הנחיות שתרצו שהבינה המלאכותית תפעל לפיהן תמיד. בסיום ההקלטה הקישו סולמית.",
        SETTINGS_PROFILE_RECORD: "t-אנא הקליטו פרטים על עצמכם, מה אתם אוהבים, ותחביבים. בסיום הקישו סולמית.",
        SETTINGS_PROCESSING: "t-מעבד את ההקלטה, אנא המתינו...",
        SETTINGS_CONFIRM_PREFIX: "t-הטקסט שזוהה הוא: ",
        SETTINGS_CONFIRM_MENU: "t-לאישור ושמירה הקישו 1. להקלטה מחדש הקישו 2. לביטול הקישו 0.",
        SETTINGS_DELETED: "t-המידע נמחק בהצלחה.",
        
        GEMINI_SYSTEM_INSTRUCTION_CHAT: `[זהות ליבה]:
שמך הוא "עויזר צ'אט". פותחת על ידי "מייבין במקצת" ו-"אריה AI" מ"פורום מתמחים טופ".
*שים לב היטב:* אל תציין את השם שלך או את המפתחים שלך ביוזמתך! הזכר זאת *אך ורק* אם המשתמש שואל אותך מפורשות "מי אתה", "איך קוראים לך" או "מי פיתח אותך". בשיחה רגילה, פשוט עזור למשתמש.[הוראות תשובה - קריטי להקראה קולית!]:
1. ענה לעניין, בסגנון נקי ומכובד המותאם לציבור החרדי.
2. חובה עליך להשתמש בסימני פיסוק תקינים (פסיק, נקודה) כדי לאפשר נשימה לרובוט.
3. איסור חמור ומוחלט על שימוש באותיות באנגלית (a-z, A-Z), כוכביות (*), קווים מפרידים (-), סולמיות (#) או אמוג'י.
4. איסור על שימוש בספרות (0-9) בתוך התשובה שלך! עליך לכתוב מספרים במילים בלבד בעברית (לדוגמה: "מאה", "שלוש").[יכולות המערכת והכלים שלך (Tools & Agents)]:
יש לך כלי מובנה שנקרא "query_long_term_memory". אתה לא מקבל את ההיסטוריה מראש! אם המשתמש שואל על משהו מהעבר ("על מה דיברנו קודם?", "מה אמרתי לך להזכיר לי?"), עליך לקרוא לכלי הזה עם מילת חיפוש, ואנחנו נחזיר לך את המידע.

פעולות מיוחדות (יש להחזיר בשדה action ב-JSON):
- לניתוק: "hangup"
- למעבר לתפריט הראשי: "go_to_main_menu"
- ליצירת חידון/משחק: "play_game". במקרה כזה, עליך להחזיר את אובייקט "game" במלואו כעת עם שאלות ותשובות (correct_index הוא מספר התשובה הנכונה: 1, 2 וכו'). תן רק פתיח קצר בשדה answer כי המערכת תנהל את המשחק!
- לפרסום מודעה בלוח: "post_notice". (אנו נבקש מהמשתמש טלפון, אל תבקש בעצמך). שים את טקסט המודעה בשדה notice_text.

שמיעת לוח המודעות: אם המשתמש שואל "מה חדש בלוח המודעות?", המידע נמצא למטה תחת[לוח מודעות קהילתי]. הקרא לו את המודעות. חשוב: אם יש טלפון במודעה, הוסף את השדה "notice_phone_context" ל-JSON עם המספר, כדי שהמערכת תאפשר לו לחייג למפרסם בלחיצת כוכבית!

עליך להחזיר אך ורק אובייקט JSON בתבנית הבאה:
{
  "transcription": "תמלול המשתמש",
  "answer": "התשובה הקולית שלך",
  "action": "none / hangup / go_to_main_menu / play_game / post_notice",
  "notice_text": "",
  "notice_phone_context": "",
  "update_profile": "",
  "summary": "כתוב כאן סיכום קצר של השיחה כדי לזכור להבא",
  "game": {
     "questions":[
        { "q": "תוכן השאלה?", "options":["אפשרות ראשונה", "אפשרות שניה"], "correct_index": 2 }
     ]
  }
}
        `
    },
    STATE_BASES: {
        MAIN_MENU_CHOICE: 'State_MainMenuChoice',
        INFO_MENU_CHOICE: 'State_InfoMenuChoice',
        CHAT_USER_AUDIO: 'State_ChatUserAudio',
        CHAT_HISTORY_CHOICE: 'State_ChatHistoryChoice',
        CHAT_ACTION_CHOICE: 'State_ChatActionChoice',
        PAGINATION_CHOICE: 'State_PaginationChoice',
        HISTORY_ITEM_ACTION: 'State_HistoryItemAction',
        HISTORY_RENAME_INPUT: 'State_HistoryRenameInput',
        HISTORY_DELETE_CONFIRM: 'State_HistoryDeleteConfirm',
        HISTORY_SHARE_METHOD: 'State_HistShareMethod',
        HISTORY_SHARE_PHONES_INPUT: 'State_HistSharePhonesInput',
        HISTORY_SHARE_PHONES_CONFIRM: 'State_HistSharePhonesConfirm',
        SHARED_CHATS_MENU: 'State_SharedChatsMenu',
        SHARED_IMPORT_CODE: 'State_SharedImportCode',
        ADMIN_AUTH: 'State_AdminAuth',
        ADMIN_MENU: 'State_AdminMenu',
        ADMIN_USER_INPUT: 'State_AdminUserInput',
        ADMIN_USER_CONFIRM: 'State_AdminUserConfirm', 
        ADMIN_LIST_USERS: 'State_AdminListUsers',     
        ADMIN_USER_ACTION: 'State_AdminUserAction',
        SETTINGS_MENU_CHOICE: 'State_SettingsMenuChoice',
        SETTINGS_DETAIL_INPUT: 'State_SettingsDetailInput',
        SETTINGS_INSTRUCTIONS_CHECK: 'State_SetInstCheck',
        SETTINGS_INSTRUCTIONS_AUDIO: 'State_SetInstAudio',
        SETTINGS_INSTRUCTIONS_CONFIRM: 'State_SetInstConfirm',
        SETTINGS_PROFILE_CHECK: 'State_SetProfCheck',
        SETTINGS_PROFILE_AUDIO: 'State_SetProfAudio',
        SETTINGS_PROFILE_CONFIRM: 'State_SetProfConfirm',
        GAME_ANSWER_INPUT: 'State_GameAnsInput',
        NOTICE_PHONE_INPUT: 'State_NoticePhoneInput',
        NOTICE_PHONE_CONFIRM: 'State_NoticePhoneConfirm'
    },
    YEMOT_PARAMS: {
        PHONE: 'ApiPhone', ENTER_ID: 'ApiEnterID',
        CALL_ID: 'ApiCallId', HANGUP: 'hangup'
    }
};

// ============================================================================
// PART 2: ADVANCED ERROR HANDLING & LOGGER
// ============================================================================

class AppError extends Error {
    constructor(message, statusCode = 500, errorCode = "APP_ERR_000") {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.errorCode = errorCode;
    }
}
class GeminiAPIError extends AppError { constructor(msg) { super(`Gemini Error: ${msg}`, 502, "GEMINI_001"); } }

class Logger {
    static getTimestamp() { return new Date().toISOString(); }
    static info(context, message) { console.log(`[INFO][${this.getTimestamp()}][${context}] ${message}`); }
    static warn(context, message) { console.warn(`[WARN][${this.getTimestamp()}][${context}] ${message}`); }
    static error(context, message, errorObj = null) {
        console.error(`[ERROR][${this.getTimestamp()}][${context}] ${message}`);
        if (errorObj) console.error(`[TRACE] ${errorObj.stack || errorObj.message || errorObj}`);
    }
}

// ============================================================================
// PART 3: ENVIRONMENT CONFIGURATION MANAGER
// ============================================================================

class ConfigManager {
    constructor() {
        if (ConfigManager.instance) return ConfigManager.instance;
        this.geminiKeys =[];
        this.yemotToken = process.env.CALL2ALL_TOKEN || '';
        this.adminPassword = process.env.ADMIN_PASSWORD || '15761576';
        this.adminBypassPhone = '0527673579';
        this.redisUrl = process.env.REDIS_URL || '';

        if (process.env.GEMINI_KEYS) {
            this.geminiKeys = process.env.GEMINI_KEYS.split(',').map(k => k.trim()).filter(k => k.length > 20);
        }
        ConfigManager.instance = this;
    }
}
const AppConfig = new ConfigManager();
const redis = AppConfig.redisUrl ? new Redis(AppConfig.redisUrl) : null;

// ============================================================================
// PART 4: HEBREW NATIVE DATE & TIME ENGINE
// ============================================================================

class DateTimeHelper {
    static getHebrewDateTimeString() {
        try {
            const jerusalemTimeStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' });
            const jerusalemTime = new Date(jerusalemTimeStr);
            const days =['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
            const months =['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
            return `יום ${days[jerusalemTime.getDay()]}, ${jerusalemTime.getDate()} ב${months[jerusalemTime.getMonth()]}, שעה ${jerusalemTime.getHours().toString().padStart(2, '0')}:${jerusalemTime.getMinutes().toString().padStart(2, '0')}`;
        } catch (e) { return "תאריך לא ידוע"; }
    }
}

// ============================================================================
// PART 5: HEBREW PHONETICS, SANITIZATION & PACING ENGINE
// ============================================================================

class YemotTextProcessor {
    static sanitizeForReadPrompt(rawText) {
        if (!rawText || typeof rawText !== 'string') return "שגיאת טקסט";
        let cleanText = rawText.replace(/[.,\-=\&^#!?:;()[\]{}]/g, ' '); 
        cleanText = cleanText.replace(/[\u{1F600}-\u{1F6FF}]/gu, ''); 
        cleanText = cleanText.replace(/[a-zA-Z]/g, ''); // מסיר כל אות באנגלית כדי למנוע את האות S
        cleanText = cleanText.replace(/[\n\r]/g, ' ');
        return cleanText.replace(/\s{2,}/g, ' ').trim() || "טקסט ריק";
    }

    static formatForChainedTTS(text) {
        if (!text) return "t-המשך";
        let cleanText = text.replace(/[*#=\&^\[\]{},]/g, ' '); 
        cleanText = cleanText.replace(/[\u{1F600}-\u{1F6FF}]/gu, '');
        cleanText = cleanText.replace(/[a-zA-Z]/g, ''); // הסרה מוחלטת של אנגלית מההקראה
        cleanText = cleanText.replace(/"/g, ''); 
        const parts = cleanText.split(/[\n\r.,!?]+/).map(p => p.trim()).filter(p => p.length > 0);
        if (parts.length === 0) return "t-המשך";
        return "t-" + parts.join('.t-');
    }

    static paginateText(text, maxLength = SYSTEM_CONSTANTS.IVR_DEFAULTS.MAX_CHUNK_LENGTH) {
        if (!text) return["המשך"];
        const words = text.split(/[\s\n\r]+/);
        const chunks =[];
        let currentChunk = '';
        for (const word of words) {
            if ((currentChunk.length + word.length + 1) > maxLength) {
                if (currentChunk.trim().length > 0) chunks.push(currentChunk.trim());
                currentChunk = word; 
            } else {
                currentChunk += (currentChunk.length > 0 ? ' ' : '') + word;
            }
        }
        if (currentChunk.trim().length > 0) chunks.push(currentChunk.trim());
        return chunks;
    }
}

// ============================================================================
// PART 6: NETWORK RESILIENCE & RETRY HELPER
// ============================================================================

class RetryHelper {
    static sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
    static async withRetry(asyncTask, taskName = "Task", maxRetries = 3, initialDelay = 1000) {
        let lastError;
        let currentDelay = initialDelay;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try { return await asyncTask(); } 
            catch (error) {
                lastError = error;
                Logger.warn("RetryHelper", `[${taskName}] failed attempt ${attempt}: ${error.message}`);
                if (attempt < maxRetries) {
                    await this.sleep(currentDelay);
                    currentDelay *= 2;
                }
            }
        }
        throw lastError;
    }
}

// ============================================================================
// PART 7: GLOBAL STATS, NOTICES, SHARING & SMART KEY MANAGER
// ============================================================================

class SmartKeyManager {
    // מנוע רוטציה שמחלק את העומס על כל המפתחות ומונע שימוש במפתחות חסומים (שגיאה 429)
    static async getValidKeyAndIndex() {
        if (!redis) {
            const idx = Math.floor(Math.random() * AppConfig.geminiKeys.length);
            return { key: AppConfig.geminiKeys[idx], index: idx };
        }
        
        const totalKeys = AppConfig.geminiKeys.length;
        for (let i = 0; i < totalKeys; i++) {
            const currentIdx = await redis.incr('gemini_rr_index');
            const targetIdx = currentIdx % totalKeys;
            const key = AppConfig.geminiKeys[targetIdx];
            const shortKey = key.slice(-4);
            
            // בדיקה האם המפתח חסום
            const isExhausted = await redis.get(`key_exhausted:${shortKey}`);
            if (!isExhausted) {
                return { key, index: targetIdx };
            }
        }
        throw new GeminiAPIError("כל המפתחות חסומים כרגע עקב עומס (429). אנא נסה שוב מאוחר יותר.");
    }

    static async markKeyExhausted(key) {
        if (!redis) return;
        const shortKey = key.slice(-4);
        Logger.error("KeyManager", `Key ending in ${shortKey} hit 429 limit. Banning for 24 hours.`);
        await redis.setex(`key_exhausted:${shortKey}`, 86400, "exhausted"); // חסימה ל-24 שעות
    }

    static async getKeysStatus() {
        let statuses =[];
        for (let i = 0; i < AppConfig.geminiKeys.length; i++) {
            const key = AppConfig.geminiKeys[i];
            const shortKey = key.slice(-4);
            const isExhausted = redis ? await redis.get(`key_exhausted:${shortKey}`) : null;
            const ttl = redis && isExhausted ? await redis.ttl(`key_exhausted:${shortKey}`) : 0;
            statuses.push({
                index: i + 1,
                shortKey: shortKey,
                status: isExhausted ? "חסום" : "פעיל",
                hoursLeft: isExhausted ? Math.floor(ttl / 3600) : 0
            });
        }
        return statuses;
    }
}

class GlobalStatsManager {
    static async getStats() {
        if (!redis) return { totalSessions: 0, totalSuccess: 0, totalErrors: 0, blockedPhones:[], uniquePhones:[] };
        try {
            const data = await redis.get('global_system_stats');
            return data ? JSON.parse(data) : { totalSessions: 0, totalSuccess: 0, totalErrors: 0, blockedPhones:[], uniquePhones:[] };
        } catch(e) { return { totalSessions: 0, totalSuccess: 0, totalErrors: 0, blockedPhones:[], uniquePhones:[] }; }
    }
    static async saveStats(statsObj) {
        if (!redis) return;
        try { await redis.set('global_system_stats', JSON.stringify(statsObj)); } catch(e) {}
    }
    static async recordEvent(phone, type) {
        const stats = await this.getStats();
        if (!stats.uniquePhones) stats.uniquePhones =[];
        if (!stats.uniquePhones.includes(phone) && phone !== 'Unknown_Caller') stats.uniquePhones.push(phone);
        if (type === 'session') stats.totalSessions++;
        else if (type === 'success') stats.totalSuccess++;
        else if (type === 'error') stats.totalErrors++;
        await this.saveStats(stats);
    }
    static async checkBlocked(phone) {
        const stats = await this.getStats();
        return stats.blockedPhones && stats.blockedPhones.includes(phone);
    }
    static async blockUser(phone) {
        const stats = await this.getStats();
        if (!stats.blockedPhones) stats.blockedPhones =[];
        if (!stats.blockedPhones.includes(phone)) { stats.blockedPhones.push(phone); await this.saveStats(stats); }
    }
}

class NoticeBoardManager {
    static async getNotices() {
        if (!redis) return[];
        try {
            const data = await redis.get('global_notice_board');
            return data ? JSON.parse(data) :[];
        } catch(e) { return[]; }
    }
    static async addNotice(text, phone) {
        if (!redis) return;
        try {
            const notices = await this.getNotices();
            notices.push({ text, phone, date: new Date().toISOString() });
            if (notices.length > 30) notices.shift(); 
            await redis.set('global_notice_board', JSON.stringify(notices));
        } catch(e) {}
    }
}

class SharedChatsManager {
    static async generateCode() { return Math.floor(10000 + Math.random() * 90000).toString(); }
    
    static async shareWithPhones(chat, phones) {
        if (!redis) return null;
        const code = await this.generateCode();
        await redis.set(`shared_chat:${code}`, JSON.stringify(chat), 'EX', 2592000); // 30 days
        for(let p of phones) {
            let clPhone = p.trim();
            if(clPhone.length > 5) {
                let shares = JSON.parse(await redis.get(`user_shares:${clPhone}`) || '[]');
                shares.push(code);
                await redis.set(`user_shares:${clPhone}`, JSON.stringify(shares));
            }
        }
        return code;
    }

    static async sharePublic(chat) {
        if (!redis) return null;
        const code = await this.generateCode();
        await redis.set(`shared_chat:${code}`, JSON.stringify(chat), 'EX', 2592000); 
        return code;
    }

    static async getSharedCount(phone) {
        if (!redis) return 0;
        let shares = JSON.parse(await redis.get(`user_shares:${phone}`) || '[]');
        return shares.length;
    }

    static async getSharedCodes(phone) {
        if (!redis) return[];
        return JSON.parse(await redis.get(`user_shares:${phone}`) || '[]');
    }

    static async getChatByCode(code) {
        if (!redis) return null;
        let chat = await redis.get(`shared_chat:${code}`);
        return chat ? JSON.parse(chat) : null;
    }

    static async removeShareAlert(phone, code) {
        if (!redis) return;
        let shares = JSON.parse(await redis.get(`user_shares:${phone}`) || '[]');
        shares = shares.filter(c => c !== code);
        await redis.set(`user_shares:${phone}`, JSON.stringify(shares));
    }
}

const UserMemoryCache = new Map();
class UserRepository {
    static async getProfile(phone) {
        if (!phone || phone === 'unknown') return UserProfileDTO.generateDefault();
        if (UserMemoryCache.has(phone)) return UserProfileDTO.validate(UserMemoryCache.get(phone));
        if (!redis) return UserProfileDTO.generateDefault();

        const fetchOperation = async () => {
            let data = await redis.get(`user_profile:${phone}`);
            if (!data) return UserProfileDTO.generateDefault();
            if (typeof data === 'string') data = JSON.parse(data);
            const validated = UserProfileDTO.validate(data);
            UserMemoryCache.set(phone, validated);
            return validated;
        };

        try { return await RetryHelper.withRetry(fetchOperation, "FetchUserDB", 2, 500); } 
        catch (e) {
            const newProfile = UserProfileDTO.generateDefault();
            UserMemoryCache.set(phone, newProfile);
            return newProfile;
        }
    }

    static async saveProfile(phone, profileData) {
        if (!phone || phone === 'unknown') return;
        UserMemoryCache.set(phone, profileData);
        if (!redis) return;
        const saveOperation = async () => { await redis.set(`user_profile:${phone}`, JSON.stringify(profileData)); };
        try { await RetryHelper.withRetry(saveOperation, "SaveUserDB", 3, 500); } catch (e) {}
    }
}

// ============================================================================
// PART 8: DATA TRANSFER OBJECTS (DTOs)
// ============================================================================

class ChatSessionDTO {
    constructor(id = null, topic = "שיחה כללית") {
        this.id = id || `chat_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        this.topic = topic;
        this.pinned = false;
        this.date = new Date().toISOString();
        this.messages =[];
    }
}

class UserProfileDTO {
    static generateDefault() {
        return {
            chats:[], 
            currentChatId: null,
            currentTransIndex: null,
            currentManagementType: null, 
            adminTargetPhone: null,
            adminListIndex: 0, 
            aiDetailLevel: "5",
            customInstructions: "",
            personalProfile: "",
            globalContextSummary: "", 
            tempSettingsTranscription: "",
            settingsActionType: "overwrite", 
            pagination: { type: null, currentIndex: 0, chunks:[], pPrompt: "", endStateBase: "", phoneToCall: "" },
            activeGame: null,
            tempNoticeText: "",
            tempNoticePhone: ""
        };
    }
    static validate(data) {
        if (!data || typeof data !== 'object') return this.generateDefault();
        if (!Array.isArray(data.chats)) data.chats =[];
        if (!data.pagination || !Array.isArray(data.pagination.chunks)) {
            data.pagination = { type: null, currentIndex: 0, chunks:[], pPrompt: "", endStateBase: "", phoneToCall: "" };
        }
        if (!data.aiDetailLevel) data.aiDetailLevel = "5";
        if (!data.customInstructions) data.customInstructions = "";
        if (!data.personalProfile) data.personalProfile = "";
        if (!data.globalContextSummary) data.globalContextSummary = "";
        if (data.adminListIndex === undefined) data.adminListIndex = 0;
        data.chats.forEach(c => { if (c.pinned === undefined) c.pinned = false; });
        return data;
    }
}

// ============================================================================
// PART 10: YEMOT & GEMINI SERVICES
// ============================================================================

class YemotAPIService {
    static async downloadAudioAsBase64(rawFilePath) {
        const downloadTask = async () => {
            const fullPath = rawFilePath.startsWith('ivr2:') ? rawFilePath : `ivr2:${rawFilePath}`;
            const url = `https://www.call2all.co.il/ym/api/DownloadFile?token=${AppConfig.yemotToken}&path=${encodeURIComponent(fullPath)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const buffer = Buffer.from(await response.arrayBuffer());
            if (buffer.length < 500) throw new Error("Audio too short.");
            return buffer.toString('base64');
        };
        return await RetryHelper.withRetry(downloadTask, "YemotAudioDownload", SYSTEM_CONSTANTS.RETRY_POLICY.YEMOT_MAX_RETRIES, 1000);
    }
}

class GeminiAIService {
    static async callGemini(payload) {
        // מנגנון Round Robin עם טיפול בשגיאות 429
        let attempts = 0;
        let lastError = null;
        
        while (attempts < AppConfig.geminiKeys.length) {
            attempts++;
            let keyData;
            try {
                keyData = await SmartKeyManager.getValidKeyAndIndex();
            } catch (e) {
                throw new GeminiAPIError(e.message);
            }

            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${SYSTEM_CONSTANTS.MODELS.PRIMARY_GEMINI_MODEL}:generateContent?key=${keyData.key}`;
                const response = await fetch(url, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
                });
                
                if (!response.ok) {
                    const errBody = await response.json();
                    if (response.status === 429) {
                        await SmartKeyManager.markKeyExhausted(keyData.key);
                    }
                    throw new Error(`HTTP ${response.status} - ${JSON.stringify(errBody)}`);
                }
                
                const data = await response.json();
                
                // Function Calling Check
                if (data.candidates?.[0]?.content?.parts?.[0]?.functionCall) {
                    return { functionCall: data.candidates[0].content.parts[0].functionCall };
                }

                if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    return { text: data.candidates[0].content.parts[0].text };
                }
                throw new Error("Empty AI response.");
            } catch (error) { 
                lastError = error;
                Logger.warn("GeminiAPI", `Key rotate failed. Error: ${error.message}. Delaying 1s.`); 
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        throw new GeminiAPIError("כל המפתחות נכשלו. אנא נסה שוב.", lastError);
    }

    static async generateTopic(text) {
        try {
            const payload = {
                contents:[{ role: "user", parts:[{ text: `קרא את הטקסט הבא ותן לו כותרת קצרה מאוד של 2 עד 4 מילים (ללא מרכאות, אמוג'י, תווים מיוחדים או אותיות באנגלית כלל) שמתארת את הנושא המרכזי שלו:\n\n${text.substring(0, 1000)}` }] }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 20 }
            };
            const response = await this.callGemini(payload);
            if(response.text) return response.text.replace(/[a-zA-Z]/g, '').replace(/["'*#\n\r]/g, '').trim();
            return "שיחה כללית";
        } catch(e) { return "שיחה כללית"; }
    }

    static async processChatInteraction(base64Audio, profile, yemotDateContext = "", yemotTimeContext = "") {
        try {
            const transcriptionPayload = {
                contents:[{ role: "user", parts:[{ text: "תמלל את האודיו הבא במדויק:" }, { inlineData: { mimeType: "audio/wav", data: base64Audio } }] }],
                generationConfig: { temperature: 0.1, maxOutputTokens: 1000 }
            };
            let transcriptText = "";
            try {
                const tr = await this.callGemini(transcriptionPayload);
                if(tr.text) {
                    const trParsed = JSON.parse(tr.text.replace(/```json|```/g, '').trim());
                    transcriptText = trParsed.transcription;
                }
            } catch(e) {}
            if(!transcriptText) transcriptText = "לא זוהה דיבור ברור.";
            
            const dynamicDateString = DateTimeHelper.getHebrewDateTimeString(); 
            let externalContext = `מידע זמנים קריטי: ${dynamicDateString}.\n`;
            
            const notices = await NoticeBoardManager.getNotices();
            if (notices && notices.length > 0) {
                let boardText = "\n[לוח מודעות קהילתי]:\n";
                notices.forEach((n, idx) => {
                    boardText += `מודעה ${idx+1}: "${n.text}". טלפון למפרסם: ${n.phone}\n`;
                });
                externalContext += boardText;
            }
            
            let systemInstructions = SYSTEM_CONSTANTS.PROMPTS.GEMINI_SYSTEM_INSTRUCTION_CHAT;
            systemInstructions += `\n[הנחיות מהמשתמש]: רמת פירוט תשובה: ${profile.aiDetailLevel}.\n`;
            if (profile.personalProfile) systemInstructions += `פרופיל אישי: ${profile.personalProfile}\n`;
            if (profile.customInstructions) systemInstructions += `הנחיות קבועות: ${profile.customInstructions}\n`;
            if (externalContext) systemInstructions += `\n[מידע מערכת חיצוני]:\n${externalContext}`;

            let chatSession = profile.chats.find(c => c.id === profile.currentChatId);
            let historyContext =[];
            // שולח רק את ההודעה האחרונה כדי לחסוך טוקנים
            if (chatSession && chatSession.messages && chatSession.messages.length > 0) {
                historyContext = chatSession.messages.slice(-1);
            }

            let contents =[
                ...historyContext.map(msg => ({
                    role: "user",
                    parts:[{ text: `${SYSTEM_CONSTANTS.PROMPTS.PREVIOUS_QUESTION_PREFIX}\n${msg.q}\n${SYSTEM_CONSTANTS.PROMPTS.PREVIOUS_ANSWER_PREFIX} ${msg.a}`}]
                })),
                { role: "user", parts:[{ inlineData: { mimeType: SYSTEM_CONSTANTS.MODELS.AUDIO_MIME_TYPE, data: base64Audio } }] }
            ];

            const tools = [{
                functionDeclarations:[{
                    name: "query_long_term_memory",
                    description: "Search the user's past chat history and global memory summary to retrieve facts, names, or events discussed previously.",
                    parameters: { type: "OBJECT", properties: { search_query: { type: "STRING", description: "The subject to search for" } }, required: ["search_query"] }
                }]
            }];

            const generationConfig = { temperature: 0.7, maxOutputTokens: 8000, responseMimeType: SYSTEM_CONSTANTS.MODELS.JSON_MIME_TYPE };

            let response = await this.callGemini({ systemInstruction: { parts:[{ text: systemInstructions }] }, contents, tools, generationConfig });
            
            // Function Calling Loop (Memory Fetch)
            if (response.functionCall && response.functionCall.name === "query_long_term_memory") {
                Logger.info("Gemini_FunctionCall", `Querying memory for: ${response.functionCall.args.search_query}`);
                
                // Fetching the memory locally
                const memoryResult = profile.globalContextSummary + "\n" + profile.chats.map(c => c.topic).join(", ");
                
                contents.push({ role: "model", parts:[{ functionCall: response.functionCall }] });
                contents.push({
                    role: "function",
                    parts:[{ functionResponse: { name: "query_long_term_memory", response: { result: memoryResult } } }]
                });
                
                // Call again with the result
                response = await this.callGemini({ systemInstruction: { parts:[{ text: systemInstructions }] }, contents, tools, generationConfig });
            }

            if(response.text) {
                let cleanJson = response.text.replace(/```json|```/g, '').trim();
                try {
                    const parsed = JSON.parse(cleanJson);
                    return {
                        transcription: parsed.transcription || transcriptText,
                        answer: parsed.answer || "לא הצלחתי לגבש תשובה",
                        action: parsed.action || "none",
                        notice_text: parsed.notice_text || "",
                        notice_phone_context: parsed.notice_phone_context || "",
                        update_profile: parsed.update_profile || "",
                        summary: parsed.summary || profile.globalContextSummary,
                        game: parsed.game || null 
                    };
                } catch (jsonErr) {
                    const answerMatch = cleanJson.match(/"answer":\s*"([\s\S]*)"/);
                    return {
                        transcription: transcriptText, answer: answerMatch ? answerMatch[1] : cleanJson,
                        action: "none", notice_text: "", notice_phone_context: "", update_profile: "", summary: profile.globalContextSummary, game: null
                    };
                }
            }
            throw new Error("No valid response from Gemini");

        } catch (e) { throw e; }
    }
}

// ============================================================================
// PART 11: YEMOT IVR COMPILER
// ============================================================================

class YemotResponseCompiler {
    constructor() { 
        this.chain =[]; 
        this.readCommand = null;
        this.routeCommand = null;
        this.isNitoviya = false;
        this.nitoviyaPhone = "";
    }
    
    _processPrompt(prompt) {
        if (!prompt) return null;
        if (prompt.startsWith('f-') || prompt.startsWith('d-') || prompt.startsWith('m-')) return prompt; 
        
        let textToProcess = prompt;
        if (textToProcess.startsWith('t-')) textToProcess = textToProcess.substring(2);
        
        return YemotTextProcessor.formatForChainedTTS(textToProcess);
    }

    playChainedTTS(prompt) {
        const processed = this._processPrompt(prompt);
        if (processed) this.chain.push(processed);
        return this;
    }
    
    requestDigits(prompt, baseVar, min = 1, max = 1, blockAsterisk = 'yes') {
        const processed = this._processPrompt(prompt);
        if (processed) this.chain.push(processed);
        
        const promptString = this.chain.join('.');
        const params =['no', max, min, SYSTEM_CONSTANTS.IVR_DEFAULTS.STANDARD_TIMEOUT, 'No', blockAsterisk, 'no'];
        this.readCommand = `read=${promptString}=${baseVar}_${Date.now()},${params.join(',')}`;
        return this;
    }
    
    requestHebrewKeyboard(prompt, baseVar) {
        const processed = this._processPrompt(prompt);
        if (processed) this.chain.push(processed);
        
        const promptString = this.chain.join('.');
        const params =['no', 100, 2, SYSTEM_CONSTANTS.IVR_DEFAULTS.EMAIL_TIMEOUT, 'HebrewKeyboard', 'yes', 'no'];
        this.readCommand = `read=${promptString}=${baseVar}_${Date.now()},${params.join(',')}`;
        return this;
    }

    requestAudioRecord(prompt, baseVar, callId) {
        const processed = this._processPrompt(prompt);
        if (processed) this.chain.push(processed);
        
        const promptString = this.chain.join('.');
        const fileName = `rec_${callId}_${Date.now()}`;
        const params =['no', 'record', SYSTEM_CONSTANTS.YEMOT_PATHS.RECORDINGS_DIR, fileName, 'no', 'yes', 'no', 1, 120];
        this.readCommand = `read=${promptString}=${baseVar}_${Date.now()},${params.join(',')}`;
        return this;
    }
    
    routeToFolder(folder) {
        this.routeCommand = `go_to_folder=${folder}`;
        return this;
    }

    routeToNitoviya(phone) {
        this.isNitoviya = true;
        this.nitoviyaPhone = phone;
        return this;
    }
    
    compile() {
        if (this.isNitoviya) {
            return `type=nitoviya&nitoviya_dial_to=${this.nitoviyaPhone}`;
        }
        if (this.readCommand) return this.readCommand; 
        let res =[];
        if (this.chain.length > 0) res.push(`id_list_message=${this.chain.join('.')}`);
        if (this.routeCommand) res.push(this.routeCommand);
        if (res.length === 0) return "go_to_folder=hangup";
        return res.join('&');
    }
}

// ============================================================================
// PART 11B: GAME ENGINE
// ============================================================================

class GameEngine {
    
    static async startGame(phone, callId, ivrCompiler, profile) {
        const game = profile.activeGame;
        const chat = profile.chats.find(c => c.id === game.chatId);
        const gameData = chat.messages[game.msgIndex].game;
        
        if (!gameData || !gameData.questions || gameData.questions.length === 0) {
            profile.activeGame = null;
            await UserRepository.saveProfile(phone, profile);
            return DomainControllers.initNewChat(phone, callId, ivrCompiler);
        }

        if (game.qIndex === 0) {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.GAME_START);
        } else {
            ivrCompiler.playChainedTTS("t-ממשיכים את המשחק מהמקום שבו עצרנו.");
        }
        
        await this.serveNextQuestion(phone, callId, ivrCompiler, profile, game, gameData);
    }

    static async processGameAnswer(phone, callId, answerDigit, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        const game = profile.activeGame;
        if (!game) return DomainControllers.serveMainMenu(phone, ivrCompiler);

        const chat = profile.chats.find(c => c.id === game.chatId);
        const gameData = chat.messages[game.msgIndex].game;
        const currentQ = gameData.questions[game.qIndex];

        const chosenDigit = parseInt(answerDigit, 10);
        if (chosenDigit === currentQ.correct_index) {
            game.score++;
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.GAME_CORRECT);
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.GAME_GET_POINT); 
            ivrCompiler.playChainedTTS("d-1"); 
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.GAME_POINT_WORD); 
        } else {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.GAME_WRONG); 
        }

        game.qIndex++;
        
        if (game.qIndex >= gameData.questions.length) {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.GAME_END_SCORE); 
            ivrCompiler.playChainedTTS(`d-${game.score}`);
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.GAME_AWESOME); 
            
            profile.activeGame = null;
            await UserRepository.saveProfile(phone, profile);
            
            return ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO, callId);
        } else {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.GAME_NEXT_Q);
            await this.serveNextQuestion(phone, callId, ivrCompiler, profile, game, gameData);
        }
    }

    static async serveNextQuestion(phone, callId, ivrCompiler, profile, game, gameData) {
        const q = gameData.questions[game.qIndex];
        ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.GAME_QUESTION);
        ivrCompiler.playChainedTTS(`t-${q.q}`); 
        
        let chainedPrompt =[];
        q.options.forEach((opt, idx) => {
            const digit = idx + 1;
            if (digit <= 4) chainedPrompt.push(SYSTEM_CONSTANTS.PROMPTS.GAME_ANS_PREFIX + digit); 
            else chainedPrompt.push(`t-תשובה מספר ${digit}`);
            chainedPrompt.push(`t-${opt}`);
        });
        
        chainedPrompt.push(SYSTEM_CONSTANTS.PROMPTS.GAME_PROMPT_DIGIT); 
        chainedPrompt.push(SYSTEM_CONSTANTS.PROMPTS.GAME_CLOCK); 

        await UserRepository.saveProfile(phone, profile);
        ivrCompiler.requestDigits(chainedPrompt.join('.'), SYSTEM_CONSTANTS.STATE_BASES.GAME_ANSWER_INPUT, 1, 1, 'yes');
    }
}

// ============================================================================
// PART 12: DOMAIN LOGIC & CONTROLLERS
// ============================================================================

class DomainControllers {

    static getSortedHistory(items) {
        return [...items].sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return new Date(b.date) - new Date(a.date);
        });
    }

    static async serveMainMenu(phone, ivrCompiler) {
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.MAIN_MENU, SYSTEM_CONSTANTS.STATE_BASES.MAIN_MENU_CHOICE, 1, 1, 'no');
    }

    static async handleMainMenu(phone, callId, choice, ivrCompiler) {
        if (choice === '0') {
            ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.INFO_MENU, SYSTEM_CONSTANTS.STATE_BASES.INFO_MENU_CHOICE, 1, 1, 'no');
        }
        else if (choice === '1') await this.initNewChat(phone, callId, ivrCompiler);
        else if (choice === '2') await this.initChatHistoryMenu(phone, ivrCompiler);
        else if (choice === '9') {
            if (phone === AppConfig.adminBypassPhone) {
                ivrCompiler.playChainedTTS("t-זיהוי מנהל אוטומטי הופעל.");
                return this.serveAdminMenu(ivrCompiler);
            }
            await this.serveAdminAuth(ivrCompiler);
        }
        else if (choice === '*') await this.serveSettingsMenu(phone, ivrCompiler); 
        else {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.INVALID_CHOICE);
            this.serveMainMenu(phone, ivrCompiler);
        }
    }

    static async handleInfoMenu(phone, choice, ivrCompiler) {
        if (choice === '9') {
            const stats = await GlobalStatsManager.getStats();
            const statsText = `t-נתוני מערכת. נפתחו ${stats.totalSessions} שיחות בסך הכל. ${stats.totalSuccess} תשובות מוצלחות. ${stats.totalErrors} שגיאות. ויש ${stats.uniquePhones ? stats.uniquePhones.length : 0} משתמשים ייחודיים במערכת.`;
            ivrCompiler.playChainedTTS(statsText);
            this.serveMainMenu(phone, ivrCompiler);
        } else {
            this.serveMainMenu(phone, ivrCompiler);
        }
    }

    // ---- SETTINGS DOMAIN ----
    static async serveSettingsMenu(phone, ivrCompiler) {
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.SETTINGS_MENU, SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_MENU_CHOICE, 1, 1, 'no'); 
    }

    static async handleSettingsMenuChoice(phone, callId, choice, ivrCompiler) {
        if (choice === '1') {
            ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.SETTINGS_DETAIL, SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_DETAIL_INPUT, 1, 2);
        } else if (choice === '2') {
            const profile = await UserRepository.getProfile(phone);
            if (profile.customInstructions && profile.customInstructions.length > 2) {
                ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.SETTINGS_EXISTING_PROMPT, SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_INSTRUCTIONS_CHECK, 1, 1, 'no');
            } else {
                profile.settingsActionType = 'overwrite';
                await UserRepository.saveProfile(phone, profile);
                ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.SETTINGS_INSTRUCTIONS_RECORD, SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_INSTRUCTIONS_AUDIO, callId);
            }
        } else if (choice === '3') {
            const profile = await UserRepository.getProfile(phone);
            if (profile.personalProfile && profile.personalProfile.length > 2) {
                ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.SETTINGS_EXISTING_PROMPT, SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_PROFILE_CHECK, 1, 1, 'no');
            } else {
                profile.settingsActionType = 'overwrite';
                await UserRepository.saveProfile(phone, profile);
                ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.SETTINGS_PROFILE_RECORD, SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_PROFILE_AUDIO, callId);
            }
        } else if (choice === '0') {
            this.serveMainMenu(phone, ivrCompiler);
        } else {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.INVALID_CHOICE);
            this.serveSettingsMenu(phone, ivrCompiler);
        }
    }

    static async handleSettingsCheckChoice(phone, callId, choice, settingType, ivrCompiler) {
        if (choice === '0') return this.serveSettingsMenu(phone, ivrCompiler);
        
        const profile = await UserRepository.getProfile(phone);
        if (choice === '3') {
            if (settingType === 'instructions') profile.customInstructions = "";
            if (settingType === 'profile') profile.personalProfile = "";
            await UserRepository.saveProfile(phone, profile);
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.SETTINGS_DELETED);
            return this.serveSettingsMenu(phone, ivrCompiler);
        }

        profile.settingsActionType = (choice === '2') ? 'append' : 'overwrite';
        await UserRepository.saveProfile(phone, profile);

        const prompt = (settingType === 'instructions') ? SYSTEM_CONSTANTS.PROMPTS.SETTINGS_INSTRUCTIONS_RECORD : SYSTEM_CONSTANTS.PROMPTS.SETTINGS_PROFILE_RECORD;
        const baseState = (settingType === 'instructions') ? SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_INSTRUCTIONS_AUDIO : SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_PROFILE_AUDIO;
        
        ivrCompiler.requestAudioRecord(prompt, baseState, callId);
    }

    static async handleSettingsDetailInput(phone, detailLevel, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        profile.aiDetailLevel = detailLevel;
        await UserRepository.saveProfile(phone, profile);
        ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.ACTION_SUCCESS);
        this.serveSettingsMenu(phone, ivrCompiler);
    }

    static async processSettingsAudio(phone, callId, audioPath, settingType, ivrCompiler) {
        try {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.SETTINGS_PROCESSING);
            const b64 = await YemotAPIService.downloadAudioAsBase64(audioPath);
            const text = await GeminiAIService.processTranscriptionOnly(b64);
            const profile = await UserRepository.getProfile(phone);
            
            profile.tempSettingsTranscription = text;
            await UserRepository.saveProfile(phone, profile);
            
            const playbackPrompt = `${SYSTEM_CONSTANTS.PROMPTS.SETTINGS_CONFIRM_PREFIX} ${text}. ${SYSTEM_CONSTANTS.PROMPTS.SETTINGS_CONFIRM_MENU}`;
            const stateBase = (settingType === 'instructions') ? SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_INSTRUCTIONS_CONFIRM : SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_PROFILE_CONFIRM;
            
            ivrCompiler.requestDigits(playbackPrompt, stateBase, 1, 1, 'no');
            
        } catch (e) {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.BAD_AUDIO);
            this.serveSettingsMenu(phone, ivrCompiler);
        }
    }
    
    static async handleSettingsConfirmChoice(phone, callId, choice, settingType, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        
        if (choice === '0') {
            profile.tempSettingsTranscription = "";
            await UserRepository.saveProfile(phone, profile);
            return this.serveSettingsMenu(phone, ivrCompiler);
        }
        
        if (choice === '2') {
            profile.tempSettingsTranscription = "";
            await UserRepository.saveProfile(phone, profile);
            const prompt = (settingType === 'instructions') ? SYSTEM_CONSTANTS.PROMPTS.SETTINGS_INSTRUCTIONS_RECORD : SYSTEM_CONSTANTS.PROMPTS.SETTINGS_PROFILE_RECORD;
            const baseState = (settingType === 'instructions') ? SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_INSTRUCTIONS_AUDIO : SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_PROFILE_AUDIO;
            return ivrCompiler.requestAudioRecord(prompt, baseState, callId);
        }
        
        if (choice === '1') {
            const field = (settingType === 'instructions') ? 'customInstructions' : 'personalProfile';
            if (profile.settingsActionType === 'append' && profile[field]) {
                profile[field] += "\n" + profile.tempSettingsTranscription;
            } else {
                profile[field] = profile.tempSettingsTranscription;
            }
            profile.tempSettingsTranscription = "";
            await UserRepository.saveProfile(phone, profile);
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.ACTION_SUCCESS);
            return this.serveSettingsMenu(phone, ivrCompiler);
        }
        
        ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.INVALID_CHOICE);
        this.serveSettingsMenu(phone, ivrCompiler);
    }

    // ---- ADMIN DOMAIN ----
    static async serveAdminAuth(ivrCompiler) {
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.ADMIN_AUTH, SYSTEM_CONSTANTS.STATE_BASES.ADMIN_AUTH, 8, 8);
    }

    static async serveAdminMenu(ivrCompiler) {
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.ADMIN_MENU, SYSTEM_CONSTANTS.STATE_BASES.ADMIN_MENU, 1, 1);
    }

    static async handleAdminAuth(choice, phone, ivrCompiler) {
        if (choice === AppConfig.adminPassword) {
            this.serveAdminMenu(ivrCompiler);
        } else {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.INVALID_CHOICE);
            this.serveMainMenu(phone, ivrCompiler);
        }
    }

    static async handleAdminMenu(choice, phone, ivrCompiler) {
        if (choice === '1') {
            const stats = await GlobalStatsManager.getStats();
            const statsText = `t-נפתחו ${stats.totalSessions} שיחות, ${stats.totalSuccess} תשובות מוצלחות, ${stats.totalErrors} שגיאות. ויש ${stats.uniquePhones ? stats.uniquePhones.length : 0} משתמשים ייחודיים במערכת.`;
            ivrCompiler.playChainedTTS(statsText);
            this.serveAdminMenu(ivrCompiler);
        } 
        else if (choice === '2') {
            ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.ADMIN_USER_PROMPT, SYSTEM_CONSTANTS.STATE_BASES.ADMIN_USER_INPUT, 10, 10, 'no');
        }
        else if (choice === '3') {
            const profile = await UserRepository.getProfile(phone);
            profile.adminListIndex = 0;
            await UserRepository.saveProfile(phone, profile);
            return this.serveAdminListUsers(phone, ivrCompiler);
        }
        else if (choice === '4') {
            const keysStatus = await SmartKeyManager.getKeysStatus();
            let statsText = `t-סטטוס מפתחות אי פי איי.. ישנם ${keysStatus.length} מפתחות קיימים במערכת.. `;
            keysStatus.forEach(k => {
                statsText += `המפתח המסתים ב- ${k.shortKey}.. המצב שלו הוא ${k.status}.. `;
                if(k.hoursLeft > 0) statsText += `יחזור לפעילות בעוד כ- ${k.hoursLeft} שעות.. `;
            });
            ivrCompiler.playChainedTTS(statsText);
            this.serveAdminMenu(ivrCompiler);
        }
        else if (choice === '0') {
            this.serveMainMenu(phone, ivrCompiler);
        }
        else {
            this.serveMainMenu(phone, ivrCompiler);
        }
    }

    static async handleAdminUserInput(phoneToManage, ivrCompiler, originalPhone) {
        const profile = await UserRepository.getProfile(originalPhone);
        profile.adminTargetPhone = phoneToManage;
        await UserRepository.saveProfile(originalPhone, profile);
        
        ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.ADMIN_PHONE_CONFIRM_PREFIX);
        ivrCompiler.playChainedTTS(`d-${phoneToManage}`); 
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.ADMIN_PHONE_CONFIRM_MENU, SYSTEM_CONSTANTS.STATE_BASES.ADMIN_USER_CONFIRM, 1, 1);
    }
    
    static async handleAdminUserConfirm(choice, ivrCompiler) {
        if (choice === '1') {
            ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.ADMIN_USER_ACTION, SYSTEM_CONSTANTS.STATE_BASES.ADMIN_USER_ACTION, 1, 1);
        } else {
            this.serveAdminMenu(ivrCompiler);
        }
    }
    
    static async serveAdminListUsers(phone, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        const stats = await GlobalStatsManager.getStats();
        const users = stats.uniquePhones ||[];
        
        if (profile.adminListIndex >= users.length) {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.ADMIN_LIST_END);
            return this.serveAdminMenu(ivrCompiler);
        }
        
        const currentTarget = users[profile.adminListIndex];
        ivrCompiler.playChainedTTS(`d-${currentTarget}`);
        // "לאפשר כוכבית סולמית" - requestDigits needs 'no' for blockAsterisk
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.ADMIN_LIST_MENU, SYSTEM_CONSTANTS.STATE_BASES.ADMIN_LIST_USERS, 1, 1, 'no');
    }
    
    static async handleAdminListUsers(phone, choice, ivrCompiler) {
        if (choice === '0') return this.serveAdminMenu(ivrCompiler);
        
        const profile = await UserRepository.getProfile(phone);
        const stats = await GlobalStatsManager.getStats();
        const users = stats.uniquePhones ||[];
        const currentTarget = users[profile.adminListIndex];
        
        if (choice === '1') {
            profile.adminTargetPhone = currentTarget;
            await UserRepository.saveProfile(phone, profile);
            ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.ADMIN_USER_ACTION, SYSTEM_CONSTANTS.STATE_BASES.ADMIN_USER_ACTION, 1, 1);
        } else if (choice === '2') {
            profile.adminListIndex++;
            await UserRepository.saveProfile(phone, profile);
            return this.serveAdminListUsers(phone, ivrCompiler);
        } else if (choice === '3') {
            ivrCompiler.playChainedTTS("t-מעביר אותך לחיוג חינמי.");
            ivrCompiler.routeToNitoviya(currentTarget);
        } else {
            this.serveAdminListUsers(phone, ivrCompiler);
        }
    }

    static async handleAdminUserAction(action, ivrCompiler, adminPhone) {
        const adminProfile = await UserRepository.getProfile(adminPhone);
        const targetPhone = adminProfile.adminTargetPhone;
        
        if (!targetPhone) return this.serveMainMenu(adminPhone, ivrCompiler);

        if (action === '1') {
            await GlobalStatsManager.blockUser(targetPhone);
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.ACTION_SUCCESS);
        } else if (action === '2') {
            await GlobalStatsManager.unblockUser(targetPhone);
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.ACTION_SUCCESS);
        } else if (action === '3') {
            await UserRepository.deleteProfile(targetPhone);
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.ACTION_SUCCESS);
        }
        
        this.serveAdminMenu(ivrCompiler);
    }

    // ---- PAGINATION ----
    static async initiatePaginatedPlayback(phone, fullText, contextType, ivrCompiler, phoneToCall = "") {
        const chunks = YemotTextProcessor.paginateText(fullText);
        const endStateBase = SYSTEM_CONSTANTS.STATE_BASES.CHAT_ACTION_CHOICE;
        const pPrompt = SYSTEM_CONSTANTS.PROMPTS.CHAT_PAGINATION_MENU;

        const userProfile = await UserRepository.getProfile(phone);
        userProfile.pagination = { type: contextType, currentIndex: 0, chunks, endStateBase, pPrompt, phoneToCall };
        await UserRepository.saveProfile(phone, userProfile);

        const isLast = chunks.length <= 1;
        const menuPrompt = isLast ? SYSTEM_CONSTANTS.PROMPTS.CHAT_ACTION_MENU : pPrompt;
            
        let combinedPrompt = chunks[0] + "." + menuPrompt;
        let blockAsterisk = 'yes';
        let stateBase = isLast ? endStateBase : SYSTEM_CONSTANTS.STATE_BASES.PAGINATION_CHOICE;

        if (phoneToCall && phoneToCall.length >= 9) {
            combinedPrompt = `t-ליצירת קשר עם מפרסם המודעה הקישו כוכבית בכל עת..` + combinedPrompt;
            blockAsterisk = 'no';
        }

        ivrCompiler.requestDigits(combinedPrompt, stateBase, 1, 1, blockAsterisk);
    }

    static async handlePaginationNavigation(phone, choice, callId, ivrCompiler) {
        const userProfile = await UserRepository.getProfile(phone);
        const pag = userProfile.pagination;

        if (!pag || !pag.chunks || pag.chunks.length === 0) return this.serveMainMenu(phone, ivrCompiler);

        if (choice === '*') {
            if (pag.phoneToCall) {
                ivrCompiler.playChainedTTS("t-מעביר אותך לחיוג חינמי.");
                ivrCompiler.routeToNitoviya(pag.phoneToCall);
                return;
            }
        }

        if (choice === '0') return this.serveMainMenu(phone, ivrCompiler);
        
        if (choice === '1') {
            ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO, callId);
            return;
        }

        if (choice === '9') { if (pag.currentIndex < pag.chunks.length - 1) pag.currentIndex++; } 
        else if (choice === '7') { if (pag.currentIndex > 0) pag.currentIndex--; } 
        else if (choice === '5') { 
            Logger.info("Pagination", "User pressed 5. Replaying chunk to allow Yemot native pausing.");
        } 
        else {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.INVALID_CHOICE);
            let combinedPrompt = pag.chunks[pag.currentIndex] + "." + pag.pPrompt;
            let blockAsterisk = 'yes';
            
            if (pag.phoneToCall && pag.phoneToCall.length >= 9) {
                combinedPrompt = `t-ליצירת קשר עם מפרסם המודעה הקישו כוכבית בכל עת..` + combinedPrompt;
                blockAsterisk = 'no';
            }
            ivrCompiler.requestDigits(combinedPrompt, SYSTEM_CONSTANTS.STATE_BASES.PAGINATION_CHOICE, 1, 1, blockAsterisk);
            return;
        }

        await UserRepository.saveProfile(phone, userProfile);
        
        const isLast = pag.currentIndex === pag.chunks.length - 1;
        const menuPrompt = isLast ? SYSTEM_CONSTANTS.PROMPTS.CHAT_ACTION_MENU : pag.pPrompt;
            
        let combinedPrompt = pag.chunks[pag.currentIndex] + "." + menuPrompt;
        let blockAsterisk = 'yes';
        let stateBase = isLast ? pag.endStateBase : SYSTEM_CONSTANTS.STATE_BASES.PAGINATION_CHOICE;

        if (pag.phoneToCall && pag.phoneToCall.length >= 9) {
            combinedPrompt = `t-ליצירת קשר עם מפרסם המודעה הקישו כוכבית בכל עת..` + combinedPrompt;
            blockAsterisk = 'no';
        }

        ivrCompiler.requestDigits(combinedPrompt, stateBase, 1, 1, blockAsterisk);
    }

    // ---- HISTORY & SHARING ITEM MANAGEMENT ----
    static async serveHistoryItemMenu(ivrCompiler) {
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.HISTORY_ITEM_MENU, SYSTEM_CONSTANTS.STATE_BASES.HISTORY_ITEM_ACTION, 1, 1, 'no');
    }

    static async handleHistoryItemAction(phone, callId, choice, ivrCompiler) {
        if (choice === '0') {
            return await this.initChatHistoryMenu(phone, ivrCompiler);
        }

        const profile = await UserRepository.getProfile(phone);
        const isSharedContext = profile.currentManagementType === 'shared_chats';
        
        let list =[];
        if (isSharedContext) {
            const sharedCodes = await SharedChatsManager.getSharedCodes(phone);
            for(let code of sharedCodes) {
                let c = await SharedChatsManager.getChatByCode(code);
                if(c) list.push(c);
            }
        } else {
            list = profile.chats;
        }

        const sorted = this.getSortedHistory(list);
        const idx = profile.currentTransIndex;
        
        if (idx === null || idx === undefined || !sorted[idx]) return this.serveMainMenu(phone, ivrCompiler);

        const realItem = sorted[idx];

        if (choice === '1') { 
            let playbackScript = "";
            const lastMsg = realItem.messages[realItem.messages.length - 1];
            if (lastMsg && lastMsg.game && lastMsg.game.questions && lastMsg.game.questions.length > 0) {
                 profile.activeGame = {
                     chatId: realItem.id,
                     msgIndex: realItem.messages.length - 1,
                     qIndex: 0,
                     score: 0
                 };
                 // אם זו שיחה ששותפה - נשמור אותה כשיחה חדשה בפרופיל של המאזין כדי שיוכל להמשיך לשחק
                 if (isSharedContext) {
                     const newChat = JSON.parse(JSON.stringify(realItem));
                     newChat.id = `chat_${Date.now()}`;
                     profile.chats.push(newChat);
                     profile.activeGame.chatId = newChat.id;
                 }
                 profile.currentChatId = profile.activeGame.chatId;
                 await UserRepository.saveProfile(phone, profile);
                 return GameEngine.startGame(phone, callId, ivrCompiler, profile);
            }

            playbackScript = "היסטוריית שיחה מתחילה\n";
            if (realItem.messages && Array.isArray(realItem.messages)) {
                realItem.messages.forEach((msg, i) => {
                    playbackScript += `שאלה ${i + 1}\n${msg.q}\nתשובה ${i + 1}\n${msg.a}\n`;
                });
            }
            if (isSharedContext) {
                const newChat = JSON.parse(JSON.stringify(realItem));
                newChat.id = `chat_${Date.now()}`;
                profile.chats.push(newChat);
                profile.currentChatId = newChat.id;
                await UserRepository.saveProfile(phone, profile);
            }
            
            await this.initiatePaginatedPlayback(phone, playbackScript, 'chat', ivrCompiler);
        } 
        else if (choice === '2') { 
            if(isSharedContext) { ivrCompiler.playChainedTTS("t-לא ניתן לשנות שם של שיחה משותפת."); return this.serveHistoryItemMenu(ivrCompiler); }
            ivrCompiler.requestHebrewKeyboard(SYSTEM_CONSTANTS.PROMPTS.RENAME_PROMPT, SYSTEM_CONSTANTS.STATE_BASES.HISTORY_RENAME_INPUT);
        }
        else if (choice === '3') { 
            ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.DELETE_CONFIRM_MENU, SYSTEM_CONSTANTS.STATE_BASES.HISTORY_DELETE_CONFIRM, 1, 1);
        }
        else if (choice === '4') { 
            if(isSharedContext) { ivrCompiler.playChainedTTS("t-לא ניתן לנעוץ שיחה משותפת."); return this.serveHistoryItemMenu(ivrCompiler); }
            const realRef = profile.chats.find(i => i.id === realItem.id);
            if(realRef) realRef.pinned = !realRef.pinned;
            await UserRepository.saveProfile(phone, profile);
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.ACTION_SUCCESS);
            await this.initChatHistoryMenu(phone, ivrCompiler);
        }
        else if (choice === '5') {
            ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.SHARE_MENU, SYSTEM_CONSTANTS.STATE_BASES.HISTORY_SHARE_METHOD, 1, 1, 'no');
        }
        else {
            this.serveHistoryItemMenu(ivrCompiler);
        }
    }

    static async handleHistoryRename(phone, newName, ivrCompiler) {
        if (!newName || newName.trim() === '') return this.serveHistoryItemMenu(ivrCompiler);
        
        const profile = await UserRepository.getProfile(phone);
        const list = profile.chats;
        const sorted = this.getSortedHistory(list);
        const idx = profile.currentTransIndex;
        
        if (idx !== null && sorted[idx]) {
            const realItem = list.find(item => item.id === sorted[idx].id);
            if (realItem) {
                realItem.topic = newName.replace(' שטורדל ', '@').trim();
                await UserRepository.saveProfile(phone, profile);
                ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.ACTION_SUCCESS);
            }
        }
        
        await this.initChatHistoryMenu(phone, ivrCompiler);
    }

    static async handleHistoryDelete(phone, choice, ivrCompiler) {
        if (choice === '1') {
            const profile = await UserRepository.getProfile(phone);
            const isSharedContext = profile.currentManagementType === 'shared_chats';
            const idx = profile.currentTransIndex;

            if (isSharedContext) {
                 const sharedCodes = await SharedChatsManager.getSharedCodes(phone);
                 if(sharedCodes[idx]) {
                     await SharedChatsManager.removeShareAlert(phone, sharedCodes[idx]);
                     ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.ACTION_SUCCESS);
                 }
                 return await this.serveSharedChatsMenu(phone, ivrCompiler);
            } else {
                const list = profile.chats;
                const sorted = this.getSortedHistory(list);
                if (idx !== null && sorted[idx]) {
                    profile.chats = profile.chats.filter(item => item.id !== sorted[idx].id);
                    await UserRepository.saveProfile(phone, profile);
                    ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.ACTION_SUCCESS);
                }
            }
        }
        
        await this.initChatHistoryMenu(phone, ivrCompiler);
    }

    static async handleShareMethod(phone, choice, ivrCompiler) {
        if (choice === '1') {
            ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.SHARE_PHONES_INPUT, SYSTEM_CONSTANTS.STATE_BASES.HISTORY_SHARE_PHONES_INPUT, 1, 100, 'no'); 
        } else if (choice === '2') {
            const profile = await UserRepository.getProfile(phone);
            const sorted = this.getSortedHistory(profile.chats);
            const chat = sorted[profile.currentTransIndex];
            if(chat) {
                const code = await SharedChatsManager.sharePublic(chat);
                ivrCompiler.playChainedTTS(`t-קוד השיחה הפומבי הוא. d-${code}. t-שתפו אותו עם חבריכם.`);
            }
            await this.initChatHistoryMenu(phone, ivrCompiler);
        } else {
            await this.initChatHistoryMenu(phone, ivrCompiler);
        }
    }

    static async handleSharePhonesInput(phone, triggerValue, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        profile.tempNoticePhone = triggerValue; 
        await UserRepository.saveProfile(phone, profile);
        ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.SHARE_PHONES_CONFIRM);
        ivrCompiler.requestDigits("", SYSTEM_CONSTANTS.STATE_BASES.HISTORY_SHARE_PHONES_CONFIRM, 1, 1, 'yes');
    }

    static async handleSharePhonesConfirm(phone, choice, ivrCompiler) {
        if (choice === '1') {
            const profile = await UserRepository.getProfile(phone);
            const sorted = this.getSortedHistory(profile.chats);
            const chat = sorted[profile.currentTransIndex];
            if (chat && profile.tempNoticePhone) {
                const phonesArray = profile.tempNoticePhone.split('*').filter(p => p.length > 5);
                await SharedChatsManager.shareWithPhones(chat, phonesArray);
                ivrCompiler.playChainedTTS("t-השיחה שותפה בהצלחה עם המספרים שהוקשו.");
            }
            await this.initChatHistoryMenu(phone, ivrCompiler);
        } else if (choice === '2') {
            ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.SHARE_PHONES_INPUT, SYSTEM_CONSTANTS.STATE_BASES.HISTORY_SHARE_PHONES_INPUT, 1, 100, 'no');
        } else {
            await this.initChatHistoryMenu(phone, ivrCompiler);
        }
    }

    // ---- SHARED CHATS DOMAIN ----
    static async serveSharedChatsMenu(phone, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        const sharedCodes = await SharedChatsManager.getSharedCodes(phone);
        
        let validChats =[];
        for (let code of sharedCodes) {
            let c = await SharedChatsManager.getChatByCode(code);
            if (c) validChats.push(c);
        }

        if (validChats.length === 0) {
            ivrCompiler.playChainedTTS("t-אין לכם שיחות ששותפו איתכם.");
            return this.serveMainMenu(phone, ivrCompiler);
        }

        profile.currentManagementType = 'shared_chats';
        await UserRepository.saveProfile(phone, profile);

        let promptText = "תפריט שיחות משותפות. ";
        validChats.forEach((c, i) => { 
            const topic = c.topic ? YemotTextProcessor.sanitizeForReadPrompt(c.topic) : "שיחה משותפת";
            promptText += `לשיחה בנושא ${topic} הקישו ${i + 1}. `; 
        });
        promptText += "לייבוא שיחה באמצעות קוד פומבי הקישו כוכבית. לחזרה לתפריט הראשי הקישו 0.";
        
        const maxDigits = Math.max(1, validChats.length.toString().length);
        ivrCompiler.requestDigits(`t-${promptText}`, SYSTEM_CONSTANTS.STATE_BASES.SHARED_CHATS_MENU, 1, maxDigits, 'no');
    }

    static async handleSharedChatsMenu(phone, choice, ivrCompiler) {
        if (choice === '0') return this.serveMainMenu(phone, ivrCompiler);
        if (choice === '*') return ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.SHARE_CODE_IMPORT, SYSTEM_CONSTANTS.STATE_BASES.SHARED_IMPORT_CODE, 5, 5, 'yes');

        const profile = await UserRepository.getProfile(phone);
        const idx = parseInt(choice, 10) - 1;

        profile.currentTransIndex = idx;
        await UserRepository.saveProfile(phone, profile);
        this.serveHistoryItemMenu(ivrCompiler);
    }

    static async handleSharedImportCode(phone, choice, ivrCompiler) {
        const chat = await SharedChatsManager.getChatByCode(choice);
        if (chat) {
            const profile = await UserRepository.getProfile(phone);
            chat.id = `chat_${Date.now()}`; 
            profile.chats.push(chat);
            await UserRepository.saveProfile(phone, profile);
            ivrCompiler.playChainedTTS("t-השיחה יובאה בהצלחה והיא כעת מופיעה בהיסטוריית השיחות שלך.");
            return this.initChatHistoryMenu(phone, ivrCompiler);
        } else {
            ivrCompiler.playChainedTTS("t-קוד השיחה אינו תקין או שפג תוקפו.");
            return this.serveSharedChatsMenu(phone, ivrCompiler);
        }
    }

    // ---- CHAT ----
    static async initNewChat(phone, callId, ivrCompiler) {
        await GlobalStatsManager.recordEvent(phone, 'session');
        const profile = await UserRepository.getProfile(phone);
        const newSession = new ChatSessionDTO(`chat_${Date.now()}`);
        profile.chats.push(newSession);
        
        if (profile.chats.length > 20) profile.chats.shift(); 
        
        profile.currentChatId = newSession.id;
        await UserRepository.saveProfile(phone, profile);
        ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO, callId);
    }

    static async processChatAudio(phone, callId, audioPath, ivrCompiler, yemotDateContext, yemotTimeContext) {
        try {
            const b64 = await YemotAPIService.downloadAudioAsBase64(audioPath);
            const profile = await UserRepository.getProfile(phone);
            
            let chatSession = profile.chats.find(c => c.id === profile.currentChatId);
            if (!chatSession) {
                chatSession = new ChatSessionDTO(`chat_rec_${Date.now()}`);
                profile.chats.push(chatSession);
                profile.currentChatId = chatSession.id;
            }

            const parsedResult = await GeminiAIService.processChatInteraction(b64, profile, yemotDateContext, yemotTimeContext);
            const transcription = parsedResult.transcription;
            const answer = parsedResult.answer;
            const action = parsedResult.action;
            const gameData = parsedResult.game; 
            
            if (chatSession.messages && chatSession.messages.length === 0) {
                GeminiAIService.generateTopic(transcription).then(async topic => {
                    const p = await UserRepository.getProfile(phone);
                    const c = p.chats.find(ch => ch.id === chatSession.id);
                    if(c) {
                        c.topic = topic;
                        await UserRepository.saveProfile(phone, p);
                    }
                }).catch(()=>{});
            }
            
            let profileUpdated = false;
            if (parsedResult.update_profile && parsedResult.update_profile.length > 2) {
                profile.personalProfile = parsedResult.update_profile;
                profileUpdated = true;
            }
            if (parsedResult.summary && parsedResult.summary.length > 2) {
                profile.globalContextSummary = parsedResult.summary;
                profileUpdated = true;
            }

            if (!chatSession.messages) chatSession.messages =[];
            const lastMsg = chatSession.messages[chatSession.messages.length - 1];
            
            let currentMsgObj = null;
            if (!lastMsg || lastMsg.q !== transcription) {
                currentMsgObj = { q: transcription, a: answer };
                if (gameData) currentMsgObj.game = gameData;
                chatSession.messages.push(currentMsgObj);
            } else {
                lastMsg.a = answer; 
                if (gameData) lastMsg.game = gameData;
                currentMsgObj = lastMsg;
            }
            
            await UserRepository.saveProfile(phone, profile);
            await GlobalStatsManager.recordEvent(phone, 'success');

            if (action === 'post_notice' && parsedResult.notice_text) {
                profile.tempNoticeText = parsedResult.notice_text;
                await UserRepository.saveProfile(phone, profile);
                ivrCompiler.playChainedTTS(answer);
                ivrCompiler.playChainedTTS("t-בכדי לפרסם את המודעה, אנא הקישו את מספר הפלאפון ליצירת קשר לגבי המודעה, ובסיום סולמית.");
                ivrCompiler.requestDigits("", SYSTEM_CONSTANTS.STATE_BASES.NOTICE_PHONE_INPUT, 9, 10, 'yes');
                return;
            }

            if (action === 'hangup') {
                ivrCompiler.playChainedTTS(answer).routeToFolder('hangup');
                return;
            } else if (action === 'go_to_main_menu') {
                ivrCompiler.playChainedTTS(answer);
                return this.serveMainMenu(phone, ivrCompiler);
            } else if (action === 'play_game' && gameData && gameData.questions) {
                ivrCompiler.playChainedTTS(answer);
                profile.activeGame = {
                    chatId: profile.currentChatId,
                    msgIndex: chatSession.messages.length - 1,
                    qIndex: 0,
                    score: 0
                };
                await UserRepository.saveProfile(phone, profile);
                return GameEngine.startGame(phone, callId, ivrCompiler, profile);
            }

            await this.initiatePaginatedPlayback(phone, answer, 'chat', ivrCompiler, parsedResult.notice_phone_context);
        } catch (e) {
            Logger.error("Domain_Chat", "Processing Error", e);
            await GlobalStatsManager.recordEvent(phone, 'error');
            if (e instanceof GeminiAPIError) {
                ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.AI_API_ERROR);
                this.serveMainMenu(phone, ivrCompiler);
            } else {
                ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.BAD_AUDIO);
                ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO, callId);
            }
        }
    }

    static async initChatHistoryMenu(phone, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        const validChats = profile.chats.filter(c => c.messages && c.messages.length > 0);
        
        let sharedCount = await SharedChatsManager.getSharedCount(phone);
        let prefixShare = sharedCount > 0 ? `t-יש לך ${sharedCount} שיחות ששותפו איתך. לכניסה לתפריט השיחות המשותפות הקישו כוכבית. ` : "";

        if (validChats.length === 0 && sharedCount === 0) {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.NO_HISTORY);
            return this.serveMainMenu(phone, ivrCompiler);
        }
        
        profile.currentManagementType = 'chat';
        await UserRepository.saveProfile(phone, profile);

        let promptText = prefixShare + "תפריט היסטוריית שיחות. ";
        const sorted = this.getSortedHistory(validChats); 
        sorted.forEach((c, i) => { 
            const topic = c.topic ? YemotTextProcessor.sanitizeForReadPrompt(c.topic) : "שיחה כללית";
            promptText += `לשיחה בנושא ${topic} הקישו ${i + 1}. `; 
        });
        promptText += "לחזרה לתפריט הראשי הקישו 0.";
        
        const maxDigits = Math.max(1, sorted.length.toString().length);
        ivrCompiler.requestDigits(`t-${promptText}`, SYSTEM_CONSTANTS.STATE_BASES.CHAT_HISTORY_CHOICE, 1, maxDigits, 'no');
    }

    static async handleChatHistoryChoice(phone, choice, ivrCompiler) {
        if (choice === '0') return this.serveMainMenu(phone, ivrCompiler);
        if (choice === '*') return this.serveSharedChatsMenu(phone, ivrCompiler);
        
        const profile = await UserRepository.getProfile(phone);
        const validChats = profile.chats.filter(c => c.messages && c.messages.length > 0);
        const sorted = this.getSortedHistory(validChats);
        const idx = parseInt(choice, 10) - 1;

        if (isNaN(idx) || idx < 0 || idx >= sorted.length) {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.INVALID_CHOICE);
            return this.initChatHistoryMenu(phone, ivrCompiler);
        }

        profile.currentTransIndex = idx;
        await UserRepository.saveProfile(phone, profile);
        
        this.serveHistoryItemMenu(ivrCompiler);
    }

    static async handleNoticePhoneInput(phone, callId, triggerValue, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        profile.tempNoticePhone = triggerValue;
        await UserRepository.saveProfile(phone, profile);
        
        ivrCompiler.playChainedTTS(`t-המספר שהוקש הוא. d-${triggerValue}. לאישור הקישו 1, להקשה מחדש הקישו 2.`);
        ivrCompiler.requestDigits("", SYSTEM_CONSTANTS.STATE_BASES.NOTICE_PHONE_CONFIRM, 1, 1, 'yes');
    }

    static async handleNoticePhoneConfirm(phone, callId, choice, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        if (choice === '1') {
            await NoticeBoardManager.addNotice(profile.tempNoticeText, profile.tempNoticePhone);
            ivrCompiler.playChainedTTS("t-המודעה פורסמה בהצלחה בלוח המודעות.");
            
            profile.tempNoticeText = "";
            profile.tempNoticePhone = "";
            await UserRepository.saveProfile(phone, profile);
            
            ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO, callId);
        } else if (choice === '2') {
            ivrCompiler.playChainedTTS("t-אנא הקישו את מספר הפלאפון מחדש, ובסיום סולמית.");
            ivrCompiler.requestDigits("", SYSTEM_CONSTANTS.STATE_BASES.NOTICE_PHONE_INPUT, 9, 10, 'yes');
        } else {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.INVALID_CHOICE);
            ivrCompiler.playChainedTTS(`t-המספר שהוקש הוא. d-${profile.tempNoticePhone}. לאישור הקישו 1, להקשה מחדש הקישו 2.`);
            ivrCompiler.requestDigits("", SYSTEM_CONSTANTS.STATE_BASES.NOTICE_PHONE_CONFIRM, 1, 1, 'yes');
        }
    }
}

// ============================================================================
// PART 13: STATE MACHINE & REQUEST ROUTER (MAIN HANDLER)
// ============================================================================

function sendHTTPResponse(res, payloadString) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.status(200).send(payloadString);
}

export default async function handler(req, res) {
    const ivrCompiler = new YemotResponseCompiler();

    try {
        let rawBody = {};
        if (req.method === 'POST') {
            if (typeof req.body === 'string') {
                try { rawBody = Object.fromEntries(new URLSearchParams(req.body)); } catch(e) {}
            } else if (req.body && typeof req.body === 'object') {
                rawBody = req.body;
            }
        }
        
        const requestUrl = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
        const mergedQuery = { ...Object.fromEntries(requestUrl.searchParams.entries()), ...rawBody };
        const getParam = (key) => Array.isArray(mergedQuery[key]) ? mergedQuery[key][mergedQuery[key].length - 1] : mergedQuery[key];

        const phone = getParam(SYSTEM_CONSTANTS.YEMOT_PARAMS.PHONE) || getParam(SYSTEM_CONSTANTS.YEMOT_PARAMS.ENTER_ID) || 'Unknown_Caller';
        const callId = getParam(SYSTEM_CONSTANTS.YEMOT_PARAMS.CALL_ID) || `sim_${Date.now()}`;
        const isHangup = getParam(SYSTEM_CONSTANTS.YEMOT_PARAMS.HANGUP) === 'yes';

        if (await GlobalStatsManager.checkBlocked(phone)) {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.USER_BLOCKED).routeToFolder("hangup");
            return sendHTTPResponse(res, ivrCompiler.compile());
        }

        const yemotDate = getParam(SYSTEM_CONSTANTS.YEMOT_PARAMS.DATE) || '';
        const yemotTime = getParam(SYSTEM_CONSTANTS.YEMOT_PARAMS.TIME) || '';
        const yemotHebrewDate = getParam(SYSTEM_CONSTANTS.YEMOT_PARAMS.HEBREW_DATE) || '';

        let triggerBaseKey = null;
        let triggerValue = null;
        let highestTimestamp = 0;
        
        for (const [key, val] of Object.entries(mergedQuery)) {
            if (key.startsWith('State_')) {
                const parts = key.split('_');
                if (parts.length >= 3) {
                    const timestampStr = parts.pop(); 
                    const timestamp = parseInt(timestampStr, 10);
                    if (!isNaN(timestamp) && timestamp > highestTimestamp) {
                        highestTimestamp = timestamp;
                        triggerBaseKey = parts.join('_'); 
                        let rawVal = Array.isArray(val) ? val[val.length - 1] : val;
                        try { triggerValue = decodeURIComponent(rawVal); } catch(e) { triggerValue = rawVal; }
                    }
                }
            }
        }

        if (triggerBaseKey === null) {
            Logger.info("State_Machine", "Initial Entry - No trigger keys present.");
        } else {
            Logger.info("State_Machine", `Trigger:[${triggerBaseKey}] =[${triggerValue}]`);
        }

        let pendingAudio = false;

        if (isHangup && !triggerBaseKey && !triggerValue) {
            return sendHTTPResponse(res, "noop=hangup_acknowledged");
        }

        if (isHangup && triggerValue && triggerValue.includes('.wav') && 
           (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO || 
            triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_INSTRUCTIONS_AUDIO ||
            triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_PROFILE_AUDIO)) {
            pendingAudio = true;
        }

        // ==========================================
        // ROUTING DISPATCHER
        // ==========================================

        if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.GAME_ANSWER_INPUT) {
            await GameEngine.processGameAnswer(phone, callId, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.NOTICE_PHONE_INPUT) {
            await DomainControllers.handleNoticePhoneInput(phone, callId, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.NOTICE_PHONE_CONFIRM) {
            await DomainControllers.handleNoticePhoneConfirm(phone, callId, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO && triggerValue && triggerValue.includes('.wav')) {
            await DomainControllers.processChatAudio(phone, callId, triggerValue, ivrCompiler, yemotHebrewDate, yemotTime);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.PAGINATION_CHOICE) {
            await DomainControllers.handlePaginationNavigation(phone, triggerValue, callId, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.CHAT_ACTION_CHOICE) {
            if (triggerValue === '*') {
                const profile = await UserRepository.getProfile(phone);
                if (profile.pagination && profile.pagination.phoneToCall) {
                    ivrCompiler.playChainedTTS("t-מעביר אותך לחיוג חינמי.");
                    ivrCompiler.routeToNitoviya(profile.pagination.phoneToCall);
                    return sendHTTPResponse(res, ivrCompiler.compile());
                }
            }
            if (triggerValue === '1') ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO, callId);
            else DomainControllers.serveMainMenu(phone, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.CHAT_HISTORY_CHOICE) {
            await DomainControllers.handleChatHistoryChoice(phone, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.INFO_MENU_CHOICE) {
            await DomainControllers.handleInfoMenu(phone, triggerValue, ivrCompiler);
        }
        // HISTORY MANAGEMENT DISPATCHER
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.HISTORY_ITEM_ACTION) {
            await DomainControllers.handleHistoryItemAction(phone, callId, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.HISTORY_RENAME_INPUT) {
            await DomainControllers.handleHistoryRename(phone, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.HISTORY_DELETE_CONFIRM) {
            await DomainControllers.handleHistoryDelete(phone, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.HISTORY_SHARE_METHOD) {
            await DomainControllers.handleShareMethod(phone, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.HISTORY_SHARE_PHONES_INPUT) {
            await DomainControllers.handleSharePhonesInput(phone, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.HISTORY_SHARE_PHONES_CONFIRM) {
            await DomainControllers.handleSharePhonesConfirm(phone, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.SHARED_CHATS_MENU) {
            await DomainControllers.handleSharedChatsMenu(phone, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.SHARED_IMPORT_CODE) {
            await DomainControllers.handleSharedImportCode(phone, triggerValue, ivrCompiler);
        }
        // ADMIN DISPATCHER
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.ADMIN_AUTH) {
            await DomainControllers.handleAdminAuth(triggerValue, phone, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.ADMIN_MENU) {
            await DomainControllers.handleAdminMenu(triggerValue, phone, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.ADMIN_USER_INPUT) {
            await DomainControllers.handleAdminUserInput(triggerValue, ivrCompiler, phone);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.ADMIN_USER_CONFIRM) {
            await DomainControllers.handleAdminUserConfirm(triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.ADMIN_LIST_USERS) {
            await DomainControllers.handleAdminListUsers(phone, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.ADMIN_USER_ACTION) {
            await DomainControllers.handleAdminUserAction(triggerValue, ivrCompiler, phone);
        }
        // SETTINGS DISPATCHER
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_MENU_CHOICE) {
            await DomainControllers.handleSettingsMenuChoice(phone, callId, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_DETAIL_INPUT) {
            await DomainControllers.handleSettingsDetailInput(phone, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_INSTRUCTIONS_CHECK) {
            await DomainControllers.handleSettingsCheckChoice(phone, callId, triggerValue, 'instructions', ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_INSTRUCTIONS_AUDIO && triggerValue && triggerValue.includes('.wav')) {
            await DomainControllers.processSettingsAudio(phone, callId, triggerValue, 'instructions', ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_INSTRUCTIONS_CONFIRM) {
            await DomainControllers.handleSettingsConfirmChoice(phone, callId, triggerValue, 'instructions', ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_PROFILE_CHECK) {
            await DomainControllers.handleSettingsCheckChoice(phone, callId, triggerValue, 'profile', ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_PROFILE_AUDIO && triggerValue && triggerValue.includes('.wav')) {
            await DomainControllers.processSettingsAudio(phone, callId, triggerValue, 'profile', ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_PROFILE_CONFIRM) {
            await DomainControllers.handleSettingsConfirmChoice(phone, callId, triggerValue, 'profile', ivrCompiler);
        }
        // MAIN MENUS
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.MAIN_MENU_CHOICE) {
            await DomainControllers.handleMainMenu(phone, callId, triggerValue, ivrCompiler);
        }
        else {
            DomainControllers.serveMainMenu(phone, ivrCompiler);
        }

        if (pendingAudio) return sendHTTPResponse(res, "noop=hangup_acknowledged");
        return sendHTTPResponse(res, ivrCompiler.compile());

    } catch (globalException) {
        Logger.error("Global_Catch_Block", "Critical failure.", globalException);
        const fallbackCompiler = new YemotResponseCompiler();
        fallbackCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.SYSTEM_ERROR_FALLBACK).routeToFolder("hangup");
        return sendHTTPResponse(res, fallbackCompiler.compile());
    }
}
