/**
 * @file api/index.js
 * @description Ultimate Enterprise IVR System for Yemot HaMashiach & Google Gemini AI.
 * @version 44.0.0 (Nitoviya Free Routing, Round-Robin AI Keys, Menu 0 Info, Admin Bypass)
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
    YEMOT_PATHS: {
        RECORDINGS_DIR: "/ApiRecords"
    },
    HTTP_STATUS: { OK: 200, INTERNAL_SERVER_ERROR: 500 },
    IVR_DEFAULTS: {
        STANDARD_TIMEOUT: "7",
        RECORD_MIN_SEC: "1", RECORD_MAX_SEC: "120",
        MAX_CHUNK_LENGTH: 850 
    },
    RETRY_POLICY: {
        MAX_RETRIES: 3, INITIAL_BACKOFF_MS: 1000, BACKOFF_MULTIPLIER: 2,
        DB_MAX_RETRIES: 3, GEMINI_MAX_RETRIES: 3
    },
    PROMPTS: {
        MAIN_MENU: "t-לשיחת צ'אט הקישו 1. להיסטוריית שיחות הקישו 2. למידע על המערכת הקישו 0. לתפריט הגדרות הקישו כוכבית.",
        INFO_MENU: "t-לשמיעת נתוני המערכת הקישו 9. לחזרה הקישו 0.",
        
        NEW_CHAT_RECORD: "f-Recorded",
        
        NO_HISTORY: "f-No_history",
        HISTORY_MENU_PREFIX: "t-תפריט היסטוריית שיחות.",
        MENU_SUFFIX_0: "f-return",
        INVALID_CHOICE: "f-Wrong",
        
        CHAT_ACTION_MENU: "f-Chat_menu",
        CHAT_PAGINATION_MENU: "f-Full_chat_menu",
        
        HISTORY_ITEM_MENU: "f-history_item_menu",
        DELETE_CONFIRM_MENU: "f-delete_confirm_menu",
        RENAME_PROMPT: "t-אנא הקלידו את השם החדש באמצעות המקלדת, בסיום הקישו סולמית.",
        ACTION_SUCCESS: "t-הפעולה בוצעה בהצלחה.",
        
        ADMIN_AUTH: "t-אנא הקישו את סיסמת הניהול ובסיום סולמית.",
        ADMIN_MENU: "t-תפריט ניהול. לנתוני מערכת הקישו 1. לניהול משתמשים הקישו 2. לסטטוס מפתחות אי פי איי הקישו 4. לחזרה הקישו 0.",
        ADMIN_USER_PROMPT: "t-אנא הקישו את מספר הטלפון של המשתמש ובסיום סולמית.",
        ADMIN_USER_ACTION: "t-לניהול המשתמש: לחסימה לצמיתות הקישו 1. לשחרור מחסימה הקישו 2. למחיקת כל נתוני המשתמש הקישו 3. לחזרה הקישו 0.",
        USER_BLOCKED: "t-מספר הטלפון שלך נחסם משימוש במערכת זו. שלום ותודה.",
        
        SYSTEM_ERROR_FALLBACK: "t-אירעה שגיאה בלתי צפויה, אך ננסה להמשיך. אנא נסו שוב.",
        AI_API_ERROR: "t-אירעה שגיאה בחיבור למנוע הבינה המלאכותית. אנא נסו שוב מאוחר יותר.",
        BAD_AUDIO: "t-לא הצלחתי לשמוע אתכם בבירור. אנא הקפידו לדבר בקול רם ונסו שוב.",
        PREVIOUS_QUESTION_PREFIX: "שאלה קודמת:",
        PREVIOUS_ANSWER_PREFIX: "תשובה קודמת:",

        GAME_START: "m-1203", 
        GAME_QUESTION: "m-1207", 
        GAME_ANS_PREFIX: "m-121", 
        GAME_PROMPT_DIGIT: "m-1208", 
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
        SETTINGS_CONFIRM_PREFIX: "הטקסט שזוהה הוא: ",
        SETTINGS_CONFIRM_MENU: "לאישור ושמירה הקישו 1. להקלטה מחדש הקישו 2. לביטול הקישו 0.",
        SETTINGS_DELETED: "t-המידע נמחק בהצלחה.",
        
        ADMIN_PHONE_CONFIRM_PREFIX: "t-המספר שהוקש הוא",
        ADMIN_PHONE_CONFIRM_MENU: "t-לאישור הקישו 1, לביטול וחזרה לתפריט הניהול הקישו 2.",
        ADMIN_LIST_MENU: "t-לניהול מספר זה הקישו 1. למעבר למספר הבא הקישו 2. לחיוג חינם למספר הקישו 3. לחזרה הקישו 0.",
        ADMIN_LIST_END: "t-סוף רשימת המשתמשים.",
        
        GEMINI_SYSTEM_INSTRUCTION_CHAT: `[זהות ליבה]:
שמך הוא "עויזר צ'אט". פותחת על ידי "מייבין במקצת" ו-"אריה AI" מ"פורום מתמחים טופ".
*שים לב היטב:* אל תציין את השם שלך או את המפתחים שלך ביוזמתך! הזכר זאת *אך ורק* אם המשתמש שואל אותך מפורשות "מי אתה", "איך קוראים לך" או "מי פיתח אותך". בשיחה רגילה, פשוט עזור למשתמש ואל תחפור על הזהות שלך.[הוראות תשובה]:
האזן לאודיו, וענה עליו ישירות לעניין. השתמש בסימני פיסוק (פסיקים ונקודות) במקומות הנכונים.
חובה! אל תשתמש כלל בכוכביות (*), קווים מפרידים (-), סולמיות (#) אמוג'י או אותיות באנגלית.
איסור חמור על שימוש בספרות (0-9) בתשובה שלך! עליך לכתוב מספרים במילים בלבד בעברית.[יכולות המערכת (AI Agents)]:
- לניתוק השיחה: "action": "hangup"
- למעבר לתפריט הראשי: "action": "go_to_main_menu"
- לשמירת/עדכון פרטים אישיים: "update_profile": "מידע"
- ליצירת משחק/חידון: "action": "play_game"

[לוח מודעות קהילתי (Notice Board)]:
המשתמשים יכולים לפרסם ולקרוא מודעות בלוח הקהילתי.
- לפרסום מודעה חדשה: אם המשתמש מבקש לפרסם/להעלות מודעה ללוח, החזר בשדה action את הערך "post_notice" ואת תוכן המודעה בשדה "notice_text". (המערכת כבר תדאג לבקש ממנו את הטלפון לאחר מכן, אל תבקש זאת בעצמך בטקסט). תאשר לו שהמודעה בדרך לפרסום בשדה ה-answer.
- שמיעת מודעות: אם המשתמש שואל מה חדש בלוח או מבקש לשמוע מודעות, קרא את המודעות מתוך המידע החיצוני (Context) שיועבר אליך למטה, ותקריא לו אותן בצורה נעימה וברורה.
- חיוג למפרסם: חשוב מאוד! אם אתה מקריא למשתמש מודעה ויש בה מספר טלפון ליצירת קשר, חובה עליך להוסיף ל-JSON שדה בשם "notice_phone_context" עם מספר הטלפון המדויק (ללא מקפים או רווחים) מתוך אותה מודעה. זה יאפשר למערכת לחבר את השיחה אל מפרסם המודעה בלחיצת כפתור חינמית!

החזר אך ורק אובייקט JSON תקני עם השדות הבאים (חלקם יכולים להישאר ריקים אם אינם רלוונטיים):
{
  "transcription": "...",
  "answer": "...",
  "action": "none / hangup / go_to_main_menu / play_game / post_notice",
  "notice_text": "טקסט המודעה (רק אם התבקשת לפרסם)",
  "notice_phone_context": "מספר הטלפון מתוך המודעה שאתה מקריא כעת למשתמש",
  "update_profile": "...",
  "summary": "...",
  "game": {...}
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
        CALL_ID: 'ApiCallId', HANGUP: 'hangup',
        DATE: 'Date', TIME: 'Time', HEBREW_DATE: 'HebrewDate'
    }
};

// ============================================================================
// PART 2: ADVANCED ERROR HANDLING & LOGGER SYSTEM
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

        this.currentGeminiKeyIndex = 0;
        if (process.env.GEMINI_KEYS) {
            this.geminiKeys = process.env.GEMINI_KEYS.split(',').map(k => k.trim()).filter(k => k.length > 20);
        }
        ConfigManager.instance = this;
    }
    
    // סבב מחזורי חכם למניעת חסימות IP ועומס מפתחות
    getNextGeminiKey() {
        if (this.geminiKeys.length === 0) throw new Error("No Gemini API keys configured.");
        const key = this.geminiKeys[this.currentGeminiKeyIndex];
        this.currentGeminiKeyIndex = (this.currentGeminiKeyIndex + 1) % this.geminiKeys.length;
        return key;
    }
}
const AppConfig = new ConfigManager();

// INIT IOREDIS CLIENT
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

            const dayName = days[jerusalemTime.getDay()];
            const dayNum = jerusalemTime.getDate();
            const monthName = months[jerusalemTime.getMonth()];
            const year = jerusalemTime.getFullYear();
            
            const hours = jerusalemTime.getHours().toString().padStart(2, '0');
            const minutes = jerusalemTime.getMinutes().toString().padStart(2, '0');

            return `יום ${dayName}, ${dayNum} ב${monthName} ${year}, שעה ${hours}:${minutes} (שעון ישראל).`;
        } catch (e) {
            Logger.warn("DateTimeHelper", "Failed to generate dynamic Hebrew date.");
            return "תאריך ושעה נוכחיים לא ידועים";
        }
    }
}

// ============================================================================
// PART 5: HEBREW PHONETICS, SANITIZATION & PACING ENGINE
// ============================================================================

const HEBREW_PHONETIC_MAP = {
    "צה\"ל": "צבא הגנה לישראל", "שב\"כ": "שירות הביטחון הכללי",
    "מוסד": "המוסד למודיעין ולתפקידים מיוחדים", "מנכ\"ל": "מנהל כללי",
    "יו\"ר": "יושב ראש", "ח\"כ": "חבר כנסת", "בג\"ץ": "בית משפט גבוה לצדק",
    "עו\"ד": "דוקטור עורך דין", "ד\"ר": "דוקטור", "פרופ'": "פרופסור"
};

class YemotTextProcessor {
    static applyPhonetics(text) {
        let processedText = text;
        for (const[acronym, expansion] of Object.entries(HEBREW_PHONETIC_MAP)) {
            const regex = new RegExp(`\\b${acronym.replace(/"/g, '\\"').replace(/'/g, '\\\'')}\\b`, 'g');
            processedText = processedText.replace(regex, expansion);
        }
        return processedText;
    }

    static addSpaceBetweenNumbersAndLetters(text) {
        return text.replace(/([א-תa-zA-Z])(\d)/g, '$1 $2').replace(/(\d)([א-תa-zA-Z])/g, '$1 $2');
    }

    static sanitizeForReadPrompt(rawText) {
        if (!rawText || typeof rawText !== 'string') return "שגיאת טקסט";
        let cleanText = this.applyPhonetics(rawText);
        cleanText = this.addSpaceBetweenNumbersAndLetters(cleanText);
        cleanText = cleanText.replace(/[.,\-=\&^#!?:;()[\]{}]/g, ' '); 
        cleanText = cleanText.replace(/[\u{1F600}-\u{1F6FF}]/gu, ''); 
        cleanText = cleanText.replace(/[a-zA-Z]/g, ''); // מסיר כל אות באנגלית!
        cleanText = cleanText.replace(/[\n\r]/g, ' ');
        return cleanText.replace(/\s{2,}/g, ' ').trim() || "התקבל טקסט ריק";
    }

    static formatForChainedTTS(text) {
        if (!text) return "t-טקסט ריק";
        let cleanText = this.applyPhonetics(text);
        cleanText = this.addSpaceBetweenNumbersAndLetters(cleanText);
        cleanText = cleanText.replace(/[*#=\&^\[\]{},]/g, ' '); 
        cleanText = cleanText.replace(/[\u{1F600}-\u{1F6FF}]/gu, '');
        cleanText = cleanText.replace(/[a-zA-Z]/g, ''); // מסיר כל אות באנגלית למניעת שגיאת S!
        cleanText = cleanText.replace(/"/g, ''); 
        const parts = cleanText.split(/[\n\r.]+/);
        const validParts = parts.map(p => p.trim()).filter(p => p.length > 0);
        if (validParts.length === 0) return "t-טקסט ריק";
        return "t-" + validParts.join('.t-');
    }

    static paginateText(text, maxLength = SYSTEM_CONSTANTS.IVR_DEFAULTS.MAX_CHUNK_LENGTH) {
        if (!text) return["טקסט ריק"];
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
            try {
                return await asyncTask();
            } catch (error) {
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
// PART 7: GLOBAL STATS, NOTICES & REDIS STORAGE
// ============================================================================

class GlobalStatsManager {
    static async getStats() {
        if (!redis) return this.defaultStats();
        try {
            const statsStr = await redis.get('global_system_stats');
            if (typeof statsStr === 'object' && statsStr !== null) return statsStr;
            return statsStr ? JSON.parse(statsStr) : this.defaultStats();
        } catch (error) {
            Logger.warn("GlobalStats", "Redis Fetch failed, using default.");
            return this.defaultStats();
        }
    }

    static async saveStats(statsObj) {
        if (!redis) return;
        try {
            await redis.set('global_system_stats', JSON.stringify(statsObj));
        } catch (error) {
            Logger.warn("GlobalStats", "Failed to save stats to Redis.");
        }
    }

    static defaultStats() {
        return { totalSessions: 0, totalSuccess: 0, totalErrors: 0, blockedPhones:[], uniquePhones:[] };
    }

    static async recordEvent(phone, type) {
        const stats = await this.getStats();
        if (!stats.uniquePhones) stats.uniquePhones =[];
        if (!stats.uniquePhones.includes(phone) && phone !== 'Unknown_Caller') {
            stats.uniquePhones.push(phone);
        }
        if (type === 'session') stats.totalSessions++;
        else if (type === 'success') stats.totalSuccess++;
        else if (type === 'error') stats.totalErrors++;
        
        await this.saveStats(stats);
    }
    
    static async checkBlocked(phone) {
        const stats = await this.getStats();
        if (!stats.blockedPhones) return false;
        return stats.blockedPhones.includes(phone);
    }
    
    static async blockUser(phone) {
        const stats = await this.getStats();
        if (!stats.blockedPhones) stats.blockedPhones =[];
        if (!stats.blockedPhones.includes(phone)) {
            stats.blockedPhones.push(phone);
            await this.saveStats(stats);
        }
    }
    
    static async unblockUser(phone) {
        const stats = await this.getStats();
        if (!stats.blockedPhones) stats.blockedPhones =[];
        stats.blockedPhones = stats.blockedPhones.filter(p => p !== phone);
        await this.saveStats(stats);
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
        } catch(e) { Logger.error("NoticeBoard", "Failed to add notice", e); }
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

        try {
            return await RetryHelper.withRetry(fetchOperation, "FetchUserDB", 2, 500);
        } catch (error) {
            Logger.warn("UserRepository", `DB Fetch failed. Using fresh profile.`);
            const newProfile = UserProfileDTO.generateDefault();
            UserMemoryCache.set(phone, newProfile);
            return newProfile;
        }
    }

    static async saveProfile(phone, profileData) {
        if (!phone || phone === 'unknown') return;
        
        UserMemoryCache.set(phone, profileData);
        if (!redis) return;
        
        const saveOperation = async () => {
            await redis.set(`user_profile:${phone}`, JSON.stringify(profileData));
        };

        try {
            await RetryHelper.withRetry(saveOperation, "SaveUserDB", 3, 500);
        } catch (error) {
            Logger.error("Storage", `DB save failed for ${phone}. Relying on RAM Cache.`, error);
        }
    }
    
    static async deleteProfile(phone) {
        UserMemoryCache.delete(phone);
        const newProfile = UserProfileDTO.generateDefault();
        await this.saveProfile(phone, newProfile);
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
        if (!data.tempSettingsTranscription) data.tempSettingsTranscription = "";
        if (!data.settingsActionType) data.settingsActionType = "overwrite";
        if (!data.globalContextSummary) data.globalContextSummary = "";
        if (data.adminListIndex === undefined) data.adminListIndex = 0;
        if (data.activeGame === undefined) data.activeGame = null;
        if (data.tempNoticeText === undefined) data.tempNoticeText = "";
        if (data.tempNoticePhone === undefined) data.tempNoticePhone = "";
        
        data.chats.forEach(c => { if (c.pinned === undefined) c.pinned = false; });
        return data;
    }
}

// ============================================================================
// PART 9: EXTERNAL DATA SERVICES
// ============================================================================

class ExternalDataService {
    static async getWeather() {
        try {
            const url = "https://api.open-meteo.com/v1/forecast?latitude=31.769&longitude=35.216&current_weather=true&timezone=auto";
            const res = await fetch(url, { cache: 'no-store' });
            if (!res.ok) return "";
            const data = await res.json();
            return `מזג האוויר הנוכחי בירושלים הוא ${data.current_weather.temperature} מעלות צלזיוס. `;
        } catch (e) { return ""; }
    }

    static async getHarediNews() {
        try {
            const url = "https://www.jdn.co.il/feed/";
            const res = await fetch(url, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
            if (!res.ok) return "";
            const xml = await res.text();
            const items =[...xml.matchAll(/<item>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>/g)];
            if (items.length < 1) return "";
            const titles = items.slice(0, 4).map(match => match[1].trim());
            return `כותרות החדשות המעודכנות ביותר מאתר JDN לעכשיו הן: 1. ${titles[0] || ''}. 2. ${titles[1] || ''}. 3. ${titles[2] || ''}. `;
        } catch (e) { return ""; }
    }

    static async searchWikipedia(query) {
        try {
            const searchUrl = `https://he.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&srlimit=1`;
            const searchRes = await fetch(searchUrl, { cache: 'no-store' });
            const searchData = await searchRes.json();
            if (searchData.query && searchData.query.search && searchData.query.search.length > 0) {
                const pageId = searchData.query.search[0].pageid;
                const extractUrl = `https://he.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=1&explaintext=1&pageids=${pageId}`;
                const extractRes = await fetch(extractUrl, { cache: 'no-store' });
                const extractData = await extractRes.json();
                if (extractData.query && extractData.query.pages && extractData.query.pages[pageId]) {
                    return extractData.query.pages[pageId].extract.substring(0, 1000); 
                }
            }
            return "";
        } catch (e) { return ""; }
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
        const keys = AppConfig.geminiKeys;
        let lastError = null;
        for (let i = 0; i < keys.length; i++) {
            const apiKey = AppConfig.getNextGeminiKey(); // Round Robin
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${SYSTEM_CONSTANTS.MODELS.PRIMARY_GEMINI_MODEL}:generateContent?key=${apiKey}`;
                const response = await fetch(url, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    const errBody = await response.text();
                    throw new Error(`HTTP ${response.status} - ${errBody}`);
                }
                const data = await response.json();
                if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    return data.candidates[0].content.parts[0].text;
                }
                throw new Error("Empty AI response.");
            } catch (error) { 
                lastError = error;
                Logger.warn("GeminiAPI", `Key rotated due to error: ${error.message}. Applying anti-throttling delay.`); 
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        throw new GeminiAPIError("All API keys failed. Check Model Name and Key Validity.", lastError);
    }

    static async generateTopic(text) {
        try {
            const payload = {
                contents:[{ role: "user", parts:[{ text: `קרא את הטקסט הבא ותן לו כותרת קצרה מאוד של 2 עד 4 מילים (ללא מרכאות, אמוג'י או תווים מיוחדים כלל) שמתארת את הנושא המרכזי שלו:\n\n${text.substring(0, 1000)}` }] }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 20 }
            };
            const topic = await this.callGemini(payload);
            return topic.replace(/["'*#\n\r]/g, '').trim();
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
                transcriptText = typeof tr === 'string' ? tr : tr.transcription;
            } catch(e) { Logger.warn("GeminiChat", "Pre-transcription failed"); }
            
            const dynamicDateString = DateTimeHelper.getHebrewDateTimeString(); 
            let externalContext = `מידע זמנים קריטי: התאריך והשעה הנוכחיים עכשיו ממש הם: ${dynamicDateString}. תאריך עברי: ${yemotDateContext}.\n`;
            
            if (transcriptText) {
                if (transcriptText.includes("מזג") || transcriptText.includes("אוויר")) {
                    externalContext += await ExternalDataService.getWeather() + "\n";
                }
                if (transcriptText.includes("חדשות") || transcriptText.includes("עדכונים") || transcriptText.includes("קרה היום")) {
                    externalContext += await ExternalDataService.getHarediNews() + "\n";
                }
                if (transcriptText.length > 6) {
                    const wiki = await ExternalDataService.searchWikipedia(transcriptText);
                    if (wiki) externalContext += `\nמידע מויקיפדיה: ${wiki}\n`;
                }
            }
            
            const notices = await NoticeBoardManager.getNotices();
            if (notices && notices.length > 0) {
                let boardText = "\n\n[מודעות עדכניות בלוח המודעות]:\n";
                notices.forEach((n, idx) => {
                    boardText += `מודעה ${idx+1}: "${n.text}". מספר טלפון ליצירת קשר: ${n.phone}\n`;
                });
                externalContext += boardText;
            }
            
            let systemInstructions = SYSTEM_CONSTANTS.PROMPTS.GEMINI_SYSTEM_INSTRUCTION_CHAT;
            
            systemInstructions += `\n\n[הנחיות אישיות מהמשתמש (ציית להן לחלוטין!)]:\n`;
            systemInstructions += `רמת פירוט התשובה (מ-1 עד 10): ${profile.aiDetailLevel}.\n`;
            
            if (profile.personalProfile) {
                systemInstructions += `פרופיל המשתמש האישי: ${profile.personalProfile}\n`;
            }
            if (profile.customInstructions) {
                systemInstructions += `הנחיות מערכת שהוגדרו ע"י המשתמש: ${profile.customInstructions}\n`;
            }
            
            if (profile.globalContextSummary) {
                systemInstructions += `\n[זיכרון מצטבר משיחות היסטוריות עם המשתמש (קרא בעיון כדי לשמור על קשר אישי!)]:\n${profile.globalContextSummary}\n`;
            }

            if (externalContext) {
                systemInstructions += `\nמידע חיצוני עדכני ששאבתי מהאינטרנט כעת (הסתמך עליו במידת הצורך):\n${externalContext}`;
            }

            let chatSession = profile.chats.find(c => c.id === profile.currentChatId);
            let historyContext =[];
            // חוסך בטוקנים: שולח רק את השאלה/תשובה האחרונה
            if (chatSession && chatSession.messages && chatSession.messages.length > 0) {
                historyContext = chatSession.messages.slice(-1);
            }

            const formattedHistory = historyContext.map(msg => ({
                role: "user",
                parts:[{ text: `${SYSTEM_CONSTANTS.PROMPTS.PREVIOUS_QUESTION_PREFIX}\n${msg.q}\n${SYSTEM_CONSTANTS.PROMPTS.PREVIOUS_ANSWER_PREFIX} ${msg.a}`}]
            }));

            const payload = {
                systemInstruction: { parts:[{ text: systemInstructions }] },
                contents:[
                    ...formattedHistory,
                    { role: "user", parts:[{ inlineData: { mimeType: SYSTEM_CONSTANTS.MODELS.AUDIO_MIME_TYPE, data: base64Audio } }] }
                ],
                generationConfig: { temperature: 0.7, maxOutputTokens: 8000, responseMimeType: SYSTEM_CONSTANTS.MODELS.JSON_MIME_TYPE }
            };

            const rawJson = await this.callGemini(payload);
            let cleanJson = rawJson.trim();
            if (cleanJson.startsWith("```json")) cleanJson = cleanJson.substring(7, cleanJson.length - 3).trim();
            else if (cleanJson.startsWith("```")) cleanJson = cleanJson.substring(3, cleanJson.length - 3).trim();
            
            try {
                const parsed = JSON.parse(cleanJson);
                return {
                    transcription: parsed.transcription || transcriptText || "לא זוהה דיבור",
                    answer: parsed.answer || "לא הצלחתי לגבש תשובה",
                    action: parsed.action || "none",
                    notice_text: parsed.notice_text || "",
                    notice_phone_context: parsed.notice_phone_context || "",
                    update_profile: parsed.update_profile || "",
                    update_instructions: parsed.update_instructions || "",
                    summary: parsed.summary || profile.globalContextSummary,
                    game: parsed.game || null 
                };
            } catch (jsonErr) {
                Logger.error("GeminiParse", "Failed to parse JSON", jsonErr);
                const answerMatch = cleanJson.match(/"answer":\s*"([\s\S]*)"/);
                return {
                    transcription: transcriptText || "לא זוהה דיבור",
                    answer: answerMatch ? answerMatch[1] : cleanJson,
                    action: "none",
                    notice_text: "",
                    notice_phone_context: "",
                    update_profile: "",
                    update_instructions: "",
                    summary: profile.globalContextSummary,
                    game: null
                };
            }
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
    }
    
    _processPrompt(prompt) {
        if (!prompt) return null;
        if (prompt.startsWith('f-') || prompt.startsWith('d-') || prompt.startsWith('m-')) return prompt; 
        
        let textToProcess = prompt;
        if (textToProcess.startsWith('t-')) textToProcess = textToProcess.substring(2);
        
        const fmt = YemotTextProcessor.formatForChainedTTS(textToProcess);
        return fmt;
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
        this.routeCommand = `type=nitoviya&nitoviya_dial_to=${phone}`;
        return this;
    }
    
    compile() {
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
            Logger.warn("GameEngine", "Invalid game data. Aborting game.");
            profile.activeGame = null;
            await UserRepository.saveProfile(phone, profile);
            return DomainControllers.initNewChat(phone, callId, ivrCompiler);
        }

        ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.GAME_START);
        await this.serveNextQuestion(phone, callId, ivrCompiler, profile, game, gameData);
    }

    static async processGameAnswer(phone, callId, answerDigit, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        const game = profile.activeGame;
        
        if (!game) return DomainControllers.serveMainMenu(ivrCompiler);

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
            if (digit <= 4) {
                chainedPrompt.push(SYSTEM_CONSTANTS.PROMPTS.GAME_ANS_PREFIX + digit); 
            } else {
                chainedPrompt.push(`t-תשובה מספר ${digit}`);
            }
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
            
            const playbackPrompt = `t-${SYSTEM_CONSTANTS.PROMPTS.SETTINGS_CONFIRM_PREFIX} ${text}. ${SYSTEM_CONSTANTS.PROMPTS.SETTINGS_CONFIRM_MENU}`;
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
        else if (choice === '4') {
            const keys = AppConfig.geminiKeys.length;
            ivrCompiler.playChainedTTS(`t-סטטוס מערכת אי פי איי. ישנם ${keys} מפתחות מוגדרים וזמינים לפעולה במערכת.`);
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
        if (phoneToManage === '*') {
            const profile = await UserRepository.getProfile(originalPhone);
            profile.adminListIndex = 0;
            await UserRepository.saveProfile(originalPhone, profile);
            return this.serveAdminListUsers(originalPhone, ivrCompiler);
        } else {
            const profile = await UserRepository.getProfile(originalPhone);
            profile.adminTargetPhone = phoneToManage;
            await UserRepository.saveProfile(originalPhone, profile);
            
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.ADMIN_PHONE_CONFIRM_PREFIX);
            ivrCompiler.playChainedTTS(`d-${phoneToManage}`); 
            ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.ADMIN_PHONE_CONFIRM_MENU, SYSTEM_CONSTANTS.STATE_BASES.ADMIN_USER_CONFIRM, 1, 1);
        }
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
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.ADMIN_LIST_MENU, SYSTEM_CONSTANTS.STATE_BASES.ADMIN_LIST_USERS, 1, 1, 'no');
    }
    
    static async handleAdminListUsers(phone, choice, ivrCompiler) {
        if (choice === '0') {
            return this.serveAdminMenu(ivrCompiler);
        }
        
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
        
        let endStateBase, pPrompt;
        if (contextType === 'chat') {
            endStateBase = SYSTEM_CONSTANTS.STATE_BASES.CHAT_ACTION_CHOICE;
            pPrompt = SYSTEM_CONSTANTS.PROMPTS.CHAT_PAGINATION_MENU;
        } else if (contextType === 'trans_draft') {
            endStateBase = SYSTEM_CONSTANTS.STATE_BASES.TRANS_DRAFT_MENU;
            pPrompt = SYSTEM_CONSTANTS.PROMPTS.TRANS_PAGINATION_MENU;
        } else {
            endStateBase = SYSTEM_CONSTANTS.STATE_BASES.TRANS_ACTION_CHOICE;
            pPrompt = SYSTEM_CONSTANTS.PROMPTS.TRANS_PAGINATION_MENU;
        }

        const userProfile = await UserRepository.getProfile(phone);
        userProfile.pagination = { type: contextType, currentIndex: 0, chunks, endStateBase, pPrompt, phoneToCall };
        await UserRepository.saveProfile(phone, userProfile);

        const isLast = chunks.length <= 1;
        const menuPrompt = isLast ? 
            ((contextType === 'chat') ? SYSTEM_CONSTANTS.PROMPTS.CHAT_ACTION_MENU : 
            (contextType === 'trans_draft') ? SYSTEM_CONSTANTS.PROMPTS.TRANS_MENU : SYSTEM_CONSTANTS.PROMPTS.TRANS_ACTION_MENU) 
            : pPrompt;
            
        let combinedPrompt = chunks[0] + "." + menuPrompt;
        let blockAsterisk = 'yes';
        let stateBase = isLast ? endStateBase : SYSTEM_CONSTANTS.STATE_BASES.PAGINATION_CHOICE;

        if (phoneToCall && phoneToCall.length >= 9) {
            combinedPrompt = `t-ליצירת קשר עם מפרסם המודעה, הקישו כוכבית בכל עת..` + combinedPrompt;
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
                ivrCompiler.routeToNitoviya(pag.phoneToCall);
                return;
            }
        }

        if (choice === '0') {
            if (pag.type === 'chat') return this.serveMainMenu(phone, ivrCompiler);
            else return this.serveMainMenu(phone, ivrCompiler);
        }
        
        if (choice === '1') {
            if (pag.type === 'chat') ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO, callId);
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
                combinedPrompt = `t-ליצירת קשר עם מפרסם המודעה, הקישו כוכבית בכל עת..` + combinedPrompt;
                blockAsterisk = 'no';
            }
            ivrCompiler.requestDigits(combinedPrompt, SYSTEM_CONSTANTS.STATE_BASES.PAGINATION_CHOICE, 1, 1, blockAsterisk);
            return;
        }

        await UserRepository.saveProfile(phone, userProfile);
        
        const isLast = pag.currentIndex === pag.chunks.length - 1;
        const menuPrompt = isLast ? 
            ((pag.type === 'chat') ? SYSTEM_CONSTANTS.PROMPTS.CHAT_ACTION_MENU : 
            (pag.type === 'trans_draft') ? SYSTEM_CONSTANTS.PROMPTS.TRANS_MENU : SYSTEM_CONSTANTS.PROMPTS.TRANS_ACTION_MENU) 
            : pag.pPrompt;
            
        let combinedPrompt = pag.chunks[pag.currentIndex] + "." + menuPrompt;
        let blockAsterisk = 'yes';
        let stateBase = isLast ? pag.endStateBase : SYSTEM_CONSTANTS.STATE_BASES.PAGINATION_CHOICE;

        if (pag.phoneToCall && pag.phoneToCall.length >= 9) {
            combinedPrompt = `t-ליצירת קשר עם מפרסם המודעה, הקישו כוכבית בכל עת..` + combinedPrompt;
            blockAsterisk = 'no';
        }

        ivrCompiler.requestDigits(combinedPrompt, stateBase, 1, 1, blockAsterisk);
    }

    // ---- HISTORY ITEM MANAGEMENT ----
    static async serveHistoryItemMenu(ivrCompiler) {
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.HISTORY_ITEM_MENU, SYSTEM_CONSTANTS.STATE_BASES.HISTORY_ITEM_ACTION, 1, 1, 'no');
    }

    static async handleHistoryItemAction(phone, callId, choice, ivrCompiler) {
        if (choice === '0') {
            return await this.initChatHistoryMenu(phone, ivrCompiler);
        }

        const profile = await UserRepository.getProfile(phone);
        const list = profile.chats;
        const sorted = this.getSortedHistory(list);
        const idx = profile.currentTransIndex;
        
        if (idx === null || idx === undefined || !sorted[idx]) return this.serveMainMenu(phone, ivrCompiler);

        const realItem = list.find(item => item.id === sorted[idx].id);

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
                 profile.currentChatId = realItem.id;
                 await UserRepository.saveProfile(phone, profile);
                 return GameEngine.startGame(phone, callId, ivrCompiler, profile);
            }

            playbackScript = "היסטוריית שיחה מתחילה\n";
            if (realItem.messages && Array.isArray(realItem.messages)) {
                realItem.messages.forEach((msg, i) => {
                    playbackScript += `שאלה ${i + 1}\n${msg.q}\nתשובה ${i + 1}\n${msg.a}\n`;
                });
            }
            await this.initiatePaginatedPlayback(phone, playbackScript, 'chat', ivrCompiler);
        } 
        else if (choice === '2') { 
            ivrCompiler.requestHebrewKeyboard(SYSTEM_CONSTANTS.PROMPTS.RENAME_PROMPT, SYSTEM_CONSTANTS.STATE_BASES.HISTORY_RENAME_INPUT);
        }
        else if (choice === '3') { 
            ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.DELETE_CONFIRM_MENU, SYSTEM_CONSTANTS.STATE_BASES.HISTORY_DELETE_CONFIRM, 1, 1);
        }
        else if (choice === '4') { 
            realItem.pinned = !realItem.pinned;
            await UserRepository.saveProfile(phone, profile);
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.ACTION_SUCCESS);
            await this.initChatHistoryMenu(phone, ivrCompiler);
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
            const list = profile.chats;
            const sorted = this.getSortedHistory(list);
            const idx = profile.currentTransIndex;
            
            if (idx !== null && sorted[idx]) {
                profile.chats = profile.chats.filter(item => item.id !== sorted[idx].id);
                await UserRepository.saveProfile(phone, profile);
                ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.ACTION_SUCCESS);
            }
        }
        
        await this.initChatHistoryMenu(phone, ivrCompiler);
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
            if (parsedResult.update_instructions && parsedResult.update_instructions.length > 2) {
                profile.customInstructions = parsedResult.update_instructions;
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
            } else if (action === 'go_to_settings') {
                ivrCompiler.playChainedTTS(answer);
                return this.serveSettingsMenu(phone, ivrCompiler);
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
        
        if (validChats.length === 0) {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.NO_HISTORY);
            return this.serveMainMenu(phone, ivrCompiler);
        }
        
        profile.currentManagementType = 'chat';
        await UserRepository.saveProfile(phone, profile);

        let promptText = "תפריט היסטוריית שיחות. ";
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
        
        const profile = await UserRepository.getProfile(phone);
        const validChats = profile.chats.filter(c => c.messages && c.messages.length > 0);
        const sorted = this.getSortedHistory(validChats);
        const idx = parseInt(choice, 10) - 1;

        if (isNaN(idx) || idx < 0 || idx >= sorted.length) {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.INVALID_CHOICE);
            return this.serveMainMenu(phone, ivrCompiler);
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
