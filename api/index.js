/**
 * @file api/index.js
 * @description Ultimate Enterprise IVR System for Yemot HaMashiach & Google Gemini AI.
 * @version 46.5.0 (Vercel Edge Runtime, Function Calling, Robust Game Engine, Key Rotation Fix)
 * @author Your Personal AI Assistant
 * 
 * ============================================================================
 * ARCHITECTURE OVERVIEW:
 * 1. Vercel Edge Runtime: Distributes IPs globally to prevent Google API blocking.
 * 2. REST-based Redis: Replaces ioredis for Edge compatibility (Upstash REST API).
 * 3. Gemini Function Calling: AI searches long-term memory instead of receiving huge prompts.
 * 4. Advanced Key Rotation: Automatically detects HTTP 429 Quota Exceeded and rotates keys.
 * 5. Aggressive Sanitization: Prevents Yemot IVR crashes ("Error" voice) by cleaning all TTS output.
 * 6. Native Routing: Fully compatible with Yemot HaMashiach API query parameter logic.
 * ============================================================================
 */

export const config = {
    runtime: 'edge', // CRITICAL: Moves execution to Vercel Edge Network
};

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
    HTTP_STATUS: { OK: 200, INTERNAL_SERVER_ERROR: 500, TOO_MANY_REQUESTS: 429 },
    IVR_DEFAULTS: {
        STANDARD_TIMEOUT: "7",
        RECORD_MIN_SEC: "1", 
        RECORD_MAX_SEC: "120",
        MAX_CHUNK_LENGTH: 850 
    },
    RETRY_POLICY: {
        MAX_RETRIES: 3, 
        INITIAL_BACKOFF_MS: 1000, 
        BACKOFF_MULTIPLIER: 2,
        YEMOT_MAX_RETRIES: 3
    },
    PROMPTS: {
        MAIN_MENU: "f-main_menu",
        INFO_MENU: "t-לשמיעת נתוני המערכת הקישו 9. לחזרה הקישו 0.",
        
        NEW_CHAT_RECORD: "f-Recorded",
        
        NO_HISTORY: "f-No_history",
        HISTORY_MENU_PREFIX: "t-תפריט היסטוריית שיחות.",
        SHARED_HISTORY_PREFIX: "t-תפריט שיחות משותפות.",
        MENU_SUFFIX_0: "t-לחזרה הקישו 0.",
        INVALID_CHOICE: "t-הבחירה שגויה. אנא נסו שוב.",
        
        CHAT_ACTION_MENU: "t-להמשך השיחה הקישו 1, או נתקו כעת.",
        CHAT_PAGINATION_MENU: "t-לשמיעת המשך התשובה הקישו 9, לחזרה אחורה הקישו 7, להקלטת שאלה נוספת הקישו 1, לחזרה לתפריט הראשי הקישו 0.",
        
        HISTORY_ITEM_MENU: "t-לשמיעת השיחה הקישו 1. לשינוי שם הקישו 2. למחיקה הקישו 3. לנעיצה הקישו 4. לשיתוף השיחה הקישו 5. לחזרה הקישו 0.",
        SHARE_MENU: "t-לשיתוף השיחה עם מספרי פלאפון מסוימים הקישו 1. לשיתוף השיחה עם קוד שיחה פומבי הקישו 2. לחזרה הקישו 0.",
        SHARE_PHONES_INPUT: "t-אנא הקישו את מספרי הפלאפון. בין מספר למספר הקישו כוכבית. בסיום כל המספרים הקישו סולמית.",
        SHARE_PHONES_CONFIRM: "t-לאישור ושיתוף השיחה הקישו 1. להקשה מחדש הקישו 2. לביטול וחזרה הקישו 0.",
        SHARE_CODE_IMPORT: "t-אנא הקישו את קוד השיחה שקיבלתם בן 5 ספרות, ובסיום סולמית.",
        
        DELETE_CONFIRM_MENU: "t-האם אתם בטוחים? למחיקה הקישו 1, לביטול הקישו 0.",
        RENAME_PROMPT: "t-אנא הקלידו את השם החדש באמצעות המקלדת, בסיום הקישו סולמית.",
        ACTION_SUCCESS: "t-הפעולה בוצעה בהצלחה.",
        
        ADMIN_AUTH: "t-אנא הקישו את סיסמת הניהול ובסיום סולמית.",
        ADMIN_MENU: "t-תפריט ניהול. לנתוני מערכת הקישו 1. לניהול משתמש ספציפי הקישו 2. לרשימת כל המשתמשים הקישו 3. לסטטוס מפתחות אי פי איי הקישו 4. לחזרה הקישו 0.",
        ADMIN_USER_PROMPT: "t-אנא הקישו את מספר הטלפון של המשתמש ובסיום סולמית.",
        ADMIN_USER_ACTION: "t-לניהול המשתמש: לחסימה לצמיתות הקישו 1. לשחרור מחסימה הקישו 2. למחיקת כל נתוני המשתמש הקישו 3. לחזרה הקישו 0.",
        USER_BLOCKED: "t-מספר הטלפון שלך נחסם משימוש במערכת זו. שלום ותודה.",
        ADMIN_LIST_MENU: "t-לניהול המספר הקישו 1. למעבר למספר הבא הקישו 2. לחיוג חינם למספר הקישו 3. לחזרה לתפריט הניהול הקישו 0.",
        ADMIN_LIST_END: "t-סוף רשימת המשתמשים.",
        
        SYSTEM_ERROR_FALLBACK: "t-אירעה שגיאה בלתי צפויה, אך המערכת מנסה להתאושש. אנא נסו שוב כעת.",
        AI_API_ERROR: "t-אירעה שגיאה בחיבור למנוע הבינה המלאכותית עקב עומס. החלפנו חיבור, אנא נסו שוב.",
        BAD_AUDIO: "t-לא הצלחתי לשמוע אתכם בבירור. אנא הקפידו לדבר בקול רם ונסו שוב.",
        PREVIOUS_QUESTION_PREFIX: "שאלה קודמת:",
        PREVIOUS_ANSWER_PREFIX: "תשובה קודמת:",

        GAME_START: "t-ברוכים הבאים למשחק! נתחיל בשאלה הראשונה.", 
        GAME_QUESTION: "t-השאלה היא:", 
        GAME_ANS_PREFIX: "t-תשובה מספר", 
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
        SETTINGS_CONFIRM_PREFIX: "הטקסט שזוהה הוא: ",
        SETTINGS_CONFIRM_MENU: "t-לאישור ושמירה הקישו 1. להקלטה מחדש הקישו 2. לביטול הקישו 0.",
        SETTINGS_DELETED: "t-המידע נמחק בהצלחה.",
        
        GEMINI_SYSTEM_INSTRUCTION_CHAT: `[זהות ליבה]:
שמך הוא "עויזר צ'אט". פותחת על ידי "מייבין במקצת" ו-"אריה AI" מ"פורום מתמחים טופ".
*שים לב היטב:* אל תציין את השם שלך או את המפתחים שלך ביוזמתך! הזכר זאת *אך ורק* אם המשתמש שואל אותך מפורשות "מי אתה", "איך קוראים לך" או "מי פיתח אותך". בשיחה רגילה, פשוט עזור למשתמש.[הוראות תשובה - קריטי למניעת קריסת מערכת IVR]:
האזן לאודיו, וענה עליו ישירות. חובה להשתמש בפסיקים ונקודות בלבד!
איסור מוחלט על שימוש בכוכביות (*), קווים מפרידים (-), סולמיות (#), אמוג'י, או אותיות באנגלית בתשובה הרגילה.
איסור על שימוש בספרות (0-9) בתוך ה-"answer". עליך לכתוב מספרים במילים בלבד בעברית.

[כלי מערכת - Function Calling]:
ברשותך כלי שנקרא "query_long_term_memory". אם המשתמש שואל אותך על משהו מעברכם, או מבקש לזכור משהו, השתמש בכלי זה כדי לחפש בהיסטוריית השיחות במקום לנחש.[יכולות AI Agents]:
- לניתוק השיחה: "action": "hangup"
- למעבר לתפריט: "action": "go_to_main_menu"
- לשמירת/עדכון פרטים אישיים בזיכרון המערכת: "update_profile": "מידע"[מנוע משחקים (Game Engine)]:
אם המשתמש מבקש חידון/מבחן טריוויה - החזר בשדה action את "play_game". 
חובה עליך לייצר אובייקט "game" ב-JSON הכולל מערך "questions". 
כל שאלה צריכה לכלול:
1. "q" - השאלה.
2. "options" - מערך של 2 עד 5 תשובות אפשריות.
3. "correct_index" - המספר של התשובה הנכונה (1 לתשובה הראשונה).
בשדה "answer" תן רק פתיח קצר לפני תחילת המשחק. המערכת שלנו כבר תדאג להשמיע את השאלות ולנהל את הניקוד.

החזר רק JSON תקני (ללא Markdown) לפי המבנה הבא:
{
  "transcription": "תמלול המשתמש",
  "answer": "התשובה המילולית בעברית תקנית בלבד",
  "action": "none / hangup / go_to_main_menu / play_game / post_notice",
  "notice_text": "",
  "notice_phone_context": "",
  "update_profile": "",
  "summary": "תקציר קצר של נושא השיחה",
  "game": {
     "questions":[
        { "q": "כמה ימים יש בשבוע?", "options": ["יום אחד", "חמישה ימים", "שבעה ימים"], "correct_index": 3 }
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
class GeminiAPIError extends AppError { constructor(msg) { super(`Gemini Error: ${msg}`, 429, "GEMINI_429"); } }

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
// PART 3: VERCEL EDGE CONFIGURATION MANAGER & UPSTASH REDIS
// ============================================================================

/**
 * Custom Fetch-based Redis client for Vercel Edge Runtime compatibility.
 * Replaces ioredis which requires raw TCP not available on Edge.
 */
class EdgeRedisClient {
    constructor(url, token) {
        this.url = url ? url.replace(/\/$/, '') : null;
        this.token = token;
    }
    
    get isAvailable() { return !!(this.url && this.token); }

    async _request(command, ...args) {
        if (!this.isAvailable) return null;
        const body = JSON.stringify([command, ...args]);
        try {
            const res = await fetch(`${this.url}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
                body: body
            });
            if (!res.ok) throw new Error(`Upstash HTTP ${res.status}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            return data.result;
        } catch (e) {
            Logger.warn("EdgeRedis", `Redis Command ${command} failed: ${e.message}`);
            return null;
        }
    }

    async get(key) { return await this._request('GET', key); }
    async set(key, value, exParam, exValue) { 
        if(exParam && exValue) return await this._request('SET', key, value, exParam, exValue);
        return await this._request('SET', key, value); 
    }
    async incr(key) { return await this._request('INCR', key); }
}

class ConfigManager {
    constructor() {
        if (ConfigManager.instance) return ConfigManager.instance;
        this.geminiKeys =[];
        this.yemotToken = process.env.CALL2ALL_TOKEN || '';
        this.adminPassword = process.env.ADMIN_PASSWORD || '15761576';
        this.adminBypassPhone = '0527673579';
        
        // Use Upstash Redis REST URL and Token for Edge compatibility
        this.upstashUrl = process.env.UPSTASH_REDIS_REST_URL || '';
        this.upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN || '';

        if (process.env.GEMINI_KEYS) {
            this.geminiKeys = process.env.GEMINI_KEYS.split(',').map(k => k.trim()).filter(k => k.length > 20);
        }
        ConfigManager.instance = this;
    }
}
const AppConfig = new ConfigManager();
const redis = new EdgeRedisClient(AppConfig.upstashUrl, AppConfig.upstashToken);

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
// PART 5: HEBREW PHONETICS & TEXT SANITIZATION (PREVENTS YEMOT CRASHES)
// ============================================================================

const HEBREW_PHONETIC_MAP = {
    "צה\"ל": "צבא הגנה לישראל", "שב\"כ": "שירות הביטחון הכללי",
    "מוסד": "המוסד למודיעין ולתפקידים מיוחדים", "מנכ\"ל": "מנהל כללי",
    "יו\"ר": "יושב ראש", "ח\"כ": "חבר כנסת", "בג\"ץ": "בית משפט גבוה לצדק",
    "עו\"ד": "עורך דין", "ד\"ר": "דוקטור", "פרופ'": "פרופסור"
};

class YemotTextProcessor {
    static applyPhonetics(text) {
        let processedText = text;
        for (const [acronym, expansion] of Object.entries(HEBREW_PHONETIC_MAP)) {
            const regex = new RegExp(`\\b${acronym.replace(/"/g, '\\"').replace(/'/g, '\\\'')}\\b`, 'g');
            processedText = processedText.replace(regex, expansion);
        }
        return processedText;
    }

    static addSpaceBetweenNumbersAndLetters(text) {
        return text.replace(/([א-תa-zA-Z])(\d)/g, '$1 $2').replace(/(\d)([א-תa-zA-Z])/g, '$1 $2');
    }

    /**
     * CRITICAL FUNCTION: Prevents Yemot from crashing with "Shgiya" (Error).
     * Yemot TTS engine crashes if given empty strings, weird punctuation, or raw English sometimes.
     */
    static sanitizeForReadPrompt(rawText) {
        if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) return "אוקיי";
        let cleanText = this.applyPhonetics(rawText);
        cleanText = this.addSpaceBetweenNumbersAndLetters(cleanText);
        cleanText = cleanText.replace(/[.,\-=&^#!?:;()[\]{}]/g, ' '); 
        cleanText = cleanText.replace(/[\u{1F600}-\u{1F6FF}]/gu, ''); // Remove emojis
        cleanText = cleanText.replace(/[a-zA-Z]/g, ''); // Aggressively remove English
        cleanText = cleanText.replace(/[\n\r]/g, ' ');
        cleanText = cleanText.replace(/\s{2,}/g, ' ').trim();
        return cleanText || "אוקיי";
    }

    static formatForChainedTTS(text) {
        if (!text || text.trim().length === 0) return "t-אוקיי";
        let cleanText = this.applyPhonetics(text);
        cleanText = this.addSpaceBetweenNumbersAndLetters(cleanText);
        cleanText = cleanText.replace(/[*#=&^\[\]{},]/g, ' '); 
        cleanText = cleanText.replace(/[\u{1F600}-\u{1F6FF}]/gu, '');
        cleanText = cleanText.replace(/[a-zA-Z]/g, ''); 
        cleanText = cleanText.replace(/"/g, ''); 
        const parts = cleanText.split(/[\n\r.]+/);
        const validParts = parts.map(p => p.trim()).filter(p => p.length > 0);
        if (validParts.length === 0) return "t-אוקיי";
        return "t-" + validParts.join('.t-');
    }

    static paginateText(text, maxLength = SYSTEM_CONSTANTS.IVR_DEFAULTS.MAX_CHUNK_LENGTH) {
        if (!text || text.trim().length === 0) return ["אוקיי"];
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
        if (chunks.length === 0) chunks.push("אוקיי");
        return chunks;
    }
}

// ============================================================================
// PART 6: NETWORK RESILIENCE & GLOBAL STATS
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

class GlobalStatsManager {
    static async getStats() {
        if (!redis.isAvailable) return this.defaultStats();
        try {
            const data = await redis.get('global_system_stats');
            return data && typeof data === 'string' ? JSON.parse(data) : (data || this.defaultStats());
        } catch(e) { return this.defaultStats(); }
    }
    static async saveStats(statsObj) {
        if (!redis.isAvailable) return;
        try { await redis.set('global_system_stats', JSON.stringify(statsObj)); } catch(e) {}
    }
    static defaultStats() { return { totalSessions: 0, totalSuccess: 0, totalErrors: 0, blockedPhones: [], uniquePhones:[] }; }
    
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
    static async unblockUser(phone) {
        const stats = await this.getStats();
        if (!stats.blockedPhones) return;
        stats.blockedPhones = stats.blockedPhones.filter(p => p !== phone);
        await this.saveStats(stats);
    }
}

class SharedChatsManager {
    static async generateCode() { return Math.floor(10000 + Math.random() * 90000).toString(); }
    
    static async shareWithPhones(chat, phones) {
        if (!redis.isAvailable) return null;
        const code = await this.generateCode();
        await redis.set(`shared_chat:${code}`, JSON.stringify(chat), 'EX', 2592000); 
        for(let p of phones) {
            let clPhone = p.trim();
            if(clPhone.length > 5) {
                let rawShares = await redis.get(`user_shares:${clPhone}`);
                let shares = typeof rawShares === 'string' ? JSON.parse(rawShares) : (rawShares ||[]);
                shares.push(code);
                await redis.set(`user_shares:${clPhone}`, JSON.stringify(shares));
            }
        }
        return code;
    }

    static async sharePublic(chat) {
        if (!redis.isAvailable) return null;
        const code = await this.generateCode();
        await redis.set(`shared_chat:${code}`, JSON.stringify(chat), 'EX', 2592000);
        return code;
    }

    static async getSharedCodes(phone) {
        if (!redis.isAvailable) return[];
        let rawShares = await redis.get(`user_shares:${phone}`);
        return typeof rawShares === 'string' ? JSON.parse(rawShares) : (rawShares ||[]);
    }

    static async getChatByCode(code) {
        if (!redis.isAvailable) return null;
        let chat = await redis.get(`shared_chat:${code}`);
        return typeof chat === 'string' ? JSON.parse(chat) : chat;
    }
}

// ============================================================================
// PART 7: USER DATABASE & DTOs
// ============================================================================

const UserMemoryCache = new Map();

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
            activeGame: null
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
        if (data.activeGame === undefined) data.activeGame = null;
        data.chats.forEach(c => { if (c.pinned === undefined) c.pinned = false; });
        return data;
    }
}

class UserRepository {
    static async getProfile(phone) {
        if (!phone || phone === 'unknown' || phone === 'Unknown_Caller') return UserProfileDTO.generateDefault();
        if (UserMemoryCache.has(phone)) return UserProfileDTO.validate(UserMemoryCache.get(phone));
        if (!redis.isAvailable) return UserProfileDTO.generateDefault();

        try { 
            let data = await redis.get(`user_profile:${phone}`);
            if (!data) return UserProfileDTO.generateDefault();
            let parsed = typeof data === 'string' ? JSON.parse(data) : data;
            const validated = UserProfileDTO.validate(parsed);
            UserMemoryCache.set(phone, validated);
            return validated;
        } catch (e) {
            return UserProfileDTO.generateDefault();
        }
    }

    static async saveProfile(phone, profileData) {
        if (!phone || phone === 'unknown' || phone === 'Unknown_Caller') return;
        UserMemoryCache.set(phone, profileData);
        if (!redis.isAvailable) return;
        try { await redis.set(`user_profile:${phone}`, JSON.stringify(profileData)); } catch (e) {}
    }
    
    static async deleteProfile(phone) {
        UserMemoryCache.delete(phone);
        await this.saveProfile(phone, UserProfileDTO.generateDefault());
    }
}

// ============================================================================
// PART 8: YEMOT & GEMINI SERVICES WITH ADVANCED KEY ROTATION
// ============================================================================

class YemotAPIService {
    static async downloadAudioAsBase64(rawFilePath) {
        const downloadTask = async () => {
            const fullPath = rawFilePath.startsWith('ivr2:') ? rawFilePath : `ivr2:${rawFilePath}`;
            const url = `https://www.call2all.co.il/ym/api/DownloadFile?token=${AppConfig.yemotToken}&path=${encodeURIComponent(fullPath)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Yemot HTTP ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            if (arrayBuffer.byteLength < 500) throw new Error("Audio too short or empty.");
            
            // Convert ArrayBuffer to Base64 in Edge runtime
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
            return btoa(binary);
        };
        return await RetryHelper.withRetry(downloadTask, "YemotAudioDownload", SYSTEM_CONSTANTS.RETRY_POLICY.YEMOT_MAX_RETRIES, 1000);
    }
}

class GeminiAIService {
    
    // ADVANCED ROUND-ROBIN KEY ROTATION TO PREVENT 429
    static async getActiveKey() {
        const now = Date.now();
        for (let i = 0; i < AppConfig.geminiKeys.length; i++) {
            // We use a simple counter for round robin, incremented locally or via redis
            const idx = redis.isAvailable ? (await redis.incr('gemini_rr_idx') || 0) : Math.floor(Math.random() * 1000);
            const key = AppConfig.geminiKeys[idx % AppConfig.geminiKeys.length];
            
            // Check if this key is currently in timeout
            const blockedUntil = await redis.get(`key_timeout:${key}`);
            if (blockedUntil && parseInt(blockedUntil, 10) > now) {
                continue; // Skip blocked key
            }
            return key;
        }
        throw new Error("All API keys are currently exhausted (429).");
    }

    static async markKeyExhausted(key) {
        if (!redis.isAvailable) return;
        // Block key for 1 hour if it gets 429
        const timeoutMs = Date.now() + (60 * 60 * 1000);
        await redis.set(`key_timeout:${key}`, timeoutMs.toString(), 'EX', 3600);
        Logger.warn("GeminiAPI", `Key ending in ${key.slice(-4)} exhausted. Marked inactive for 1 hour.`);
    }

    static async trackKeyUsage(apiKey) {
        if(!redis.isAvailable) return;
        try {
            const shortKey = apiKey.slice(-4);
            await redis.incr(`gemini_usage:${shortKey}`);
        } catch(e){}
    }

    static async callGemini(payload) {
        let lastError = null;
        // Try up to the number of keys we have
        for (let attempt = 0; attempt < AppConfig.geminiKeys.length; attempt++) {
            try {
                const apiKey = await this.getActiveKey();
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${SYSTEM_CONSTANTS.MODELS.PRIMARY_GEMINI_MODEL}:generateContent?key=${apiKey}`;
                const response = await fetch(url, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
                });
                
                if (response.status === 429) {
                    await this.markKeyExhausted(apiKey);
                    lastError = new Error(`HTTP 429 Quota Exceeded for key ${apiKey.slice(-4)}`);
                    continue; // Immediately try the next key
                }

                if (!response.ok) {
                    const errBody = await response.text();
                    throw new Error(`HTTP ${response.status} - ${errBody}`);
                }
                
                await this.trackKeyUsage(apiKey);
                const data = await response.json();
                return data; // Return full object to handle function calls
            } catch (error) { 
                lastError = error;
                Logger.warn("GeminiAPI", `Attempt failed: ${error.message}`); 
            }
        }
        throw new GeminiAPIError("All API keys failed or limits reached.");
    }

    static async generateTopic(text) {
        try {
            const payload = {
                contents: [{ role: "user", parts:[{ text: `קרא את הטקסט ותן לו כותרת קצרה של 2-4 מילים בעברית בלבד:\n${text.substring(0, 500)}` }] }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 20 }
            };
            const res = await this.callGemini(payload);
            const topic = res.candidates?.[0]?.content?.parts?.[0]?.text || "שיחה כללית";
            return topic.replace(/[a-zA-Z]/g, '').replace(/["'*#\n\r]/g, '').trim() || "שיחה כללית";
        } catch(e) { return "שיחה כללית"; }
    }

    /**
     * Integrates Function Calling (query_long_term_memory)
     */
    static async processChatInteraction(base64Audio, profile, yemotDateContext = "", yemotTimeContext = "") {
        const dynamicDateString = DateTimeHelper.getHebrewDateTimeString(); 
        let externalContext = `מידע זמנים קריטי: ${dynamicDateString}. תאריך עברי: ${yemotDateContext}.\n`;
        
        let systemInstructions = SYSTEM_CONSTANTS.PROMPTS.GEMINI_SYSTEM_INSTRUCTION_CHAT;
        systemInstructions += `\n[הנחיות אישיות]: רמת פירוט תשובה: ${profile.aiDetailLevel}.\n`;
        if (profile.personalProfile) systemInstructions += `פרופיל אישי: ${profile.personalProfile}\n`;
        if (profile.customInstructions) systemInstructions += `הנחיות קבועות: ${profile.customInstructions}\n`;
        if (externalContext) systemInstructions += `\n[מידע מערכת חיצוני]:\n${externalContext}`;

        // Get only the active chat context
        let chatSession = profile.chats.find(c => c.id === profile.currentChatId);
        let recentMessages = chatSession && chatSession.messages ? chatSession.messages.slice(-2) :[];
        const formattedHistory = recentMessages.map(msg => ({
            role: "user",
            parts:[{ text: `${SYSTEM_CONSTANTS.PROMPTS.PREVIOUS_QUESTION_PREFIX}\n${msg.q}\n${SYSTEM_CONSTANTS.PROMPTS.PREVIOUS_ANSWER_PREFIX} ${msg.a}`}]
        }));

        const tools = [{
            functionDeclarations:[{
                name: "query_long_term_memory",
                description: "חפש בהיסטוריית השיחות של המשתמש בעבר כדי למצוא מידע או הקשר אם המשתמש שואל 'האם אתה זוכר' או מתייחס לעבר.",
                parameters: {
                    type: "OBJECT",
                    properties: { query: { type: "STRING", description: "נושא לחיפוש" } },
                    required: ["query"]
                }
            }]
        }];

        const initialPayload = {
            systemInstruction: { parts:[{ text: systemInstructions }] },
            tools: tools,
            contents:[
                ...formattedHistory,
                { role: "user", parts:[{ inlineData: { mimeType: SYSTEM_CONSTANTS.MODELS.AUDIO_MIME_TYPE, data: base64Audio } }] }
            ],
            generationConfig: { temperature: 0.7, maxOutputTokens: 8000, responseMimeType: SYSTEM_CONSTANTS.MODELS.JSON_MIME_TYPE }
        };

        try {
            // First Call
            let responseObj = await this.callGemini(initialPayload);
            let responsePart = responseObj.candidates?.[0]?.content?.parts?.[0];

            // Handle Function Call (Long Term Memory)
            if (responsePart && responsePart.functionCall) {
                const funcName = responsePart.functionCall.name;
                const funcArgs = responsePart.functionCall.args;
                
                let searchResult = "לא נמצא מידע תואם בזיכרון.";
                if (funcName === "query_long_term_memory" && funcArgs.query) {
                    // Simple search across all past chats
                    const query = funcArgs.query.toLowerCase();
                    const found = profile.chats.flatMap(c => c.messages).filter(m => m.q.toLowerCase().includes(query) || m.a.toLowerCase().includes(query));
                    if (found.length > 0) {
                        searchResult = found.slice(-3).map(m => `שאלה בעבר: ${m.q} | תשובה בעבר: ${m.a}`).join("\n");
                    }
                }

                // Append function response to conversation and call again
                initialPayload.contents.push({ role: "model", parts:[responsePart] });
                initialPayload.contents.push({
                    role: "function",
                    parts:[{ functionResponse: { name: funcName, response: { result: searchResult } } }]
                });

                responseObj = await this.callGemini(initialPayload);
                responsePart = responseObj.candidates?.[0]?.content?.parts?.[0];
            }

            // Parse final JSON response
            let rawJson = responsePart?.text || "{}";
            let cleanJson = rawJson.trim();
            if (cleanJson.startsWith("```json")) cleanJson = cleanJson.substring(7, cleanJson.length - 3).trim();
            else if (cleanJson.startsWith("```")) cleanJson = cleanJson.substring(3, cleanJson.length - 3).trim();
            
            try {
                const parsed = JSON.parse(cleanJson);
                return {
                    transcription: parsed.transcription || "לא זוהה דיבור",
                    answer: parsed.answer || "סליחה, לא הצלחתי לנסח תשובה.",
                    action: parsed.action || "none",
                    update_profile: parsed.update_profile || "",
                    summary: parsed.summary || profile.globalContextSummary,
                    game: parsed.game || null 
                };
            } catch (jsonErr) {
                const answerMatch = cleanJson.match(/"answer":\s*"([\s\S]*?)"/);
                return {
                    transcription: "לא זוהה דיבור",
                    answer: answerMatch ? answerMatch[1] : "שגיאה בפיענוח התשובה מהמודל.",
                    action: "none", update_profile: "", summary: profile.globalContextSummary, game: null
                };
            }
        } catch (e) { throw e; }
    }
}

// ============================================================================
// PART 9: YEMOT IVR COMPILER
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
        
        // Use aggressive sanitization to prevent crashes
        const cleaned = YemotTextProcessor.formatForChainedTTS(textToProcess);
        return cleaned === "t-" ? "t-אוקיי" : cleaned; 
    }

    playChainedTTS(prompt) {
        const processed = this._processPrompt(prompt);
        if (processed) this.chain.push(processed);
        return this;
    }
    
    // Changed blockAsterisk default to 'no' to fix *2 and *3 issues in menus
    requestDigits(prompt, baseVar, min = 1, max = 1, blockAsterisk = 'no') {
        const processed = this._processPrompt(prompt);
        if (processed) this.chain.push(processed);
        
        const promptString = this.chain.join('.');
        // Ensure promptString is never empty, which crashes Yemot
        const safePrompt = promptString.length > 0 ? promptString : "t-אוקיי";
        const params =['no', max, min, SYSTEM_CONSTANTS.IVR_DEFAULTS.STANDARD_TIMEOUT, 'No', blockAsterisk, 'no'];
        this.readCommand = `read=${safePrompt}=${baseVar}_${Date.now()},${params.join(',')}`;
        return this;
    }

    requestAudioRecord(prompt, baseVar, callId) {
        const processed = this._processPrompt(prompt);
        if (processed) this.chain.push(processed);
        
        const promptString = this.chain.join('.');
        const safePrompt = promptString.length > 0 ? promptString : "t-אוקיי";
        const fileName = `rec_${callId}_${Date.now()}`;
        const params =['no', 'record', SYSTEM_CONSTANTS.YEMOT_PATHS.RECORDINGS_DIR, fileName, 'no', 'yes', 'no', 1, 120];
        this.readCommand = `read=${safePrompt}=${baseVar}_${Date.now()},${params.join(',')}`;
        return this;
    }
    
    routeToFolder(folder) {
        this.routeCommand = `go_to_folder=${folder}`;
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
// PART 10: ROBUST GAME ENGINE
// ============================================================================

class GameEngine {
    static async startGame(phone, callId, ivrCompiler, profile) {
        const game = profile.activeGame;
        const chat = profile.chats.find(c => c.id === game.chatId);
        const gameData = chat?.messages[game.msgIndex]?.game;
        
        if (!gameData || !Array.isArray(gameData.questions) || gameData.questions.length === 0) {
            profile.activeGame = null;
            await UserRepository.saveProfile(phone, profile);
            return DomainControllers.initNewChat(phone, callId, ivrCompiler);
        }

        if (game.qIndex === 0) {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.GAME_START);
        } else {
            ivrCompiler.playChainedTTS("t-ממשיכים את המשחק.");
        }
        
        await this.serveNextQuestion(phone, callId, ivrCompiler, profile, game, gameData);
    }

    static async processGameAnswer(phone, callId, answerDigit, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        const game = profile.activeGame;
        if (!game) return DomainControllers.serveMainMenu(phone, ivrCompiler);

        const chat = profile.chats.find(c => c.id === game.chatId);
        const gameData = chat?.messages[game.msgIndex]?.game;
        
        if(!gameData || !gameData.questions[game.qIndex]) {
            profile.activeGame = null;
            await UserRepository.saveProfile(phone, profile);
            return DomainControllers.serveMainMenu(phone, ivrCompiler);
        }

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
            ivrCompiler.playChainedTTS(`t-התשובה הנכונה היא תשובה מספר ${currentQ.correct_index}`);
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
        if(Array.isArray(q.options)){
            q.options.forEach((opt, idx) => {
                const digit = idx + 1;
                chainedPrompt.push(`t-לתשובה מספר ${digit}`);
                chainedPrompt.push(`t-${opt}`);
            });
        }
        
        chainedPrompt.push(SYSTEM_CONSTANTS.PROMPTS.GAME_PROMPT_DIGIT); 
        chainedPrompt.push(SYSTEM_CONSTANTS.PROMPTS.GAME_CLOCK); 

        await UserRepository.saveProfile(phone, profile);
        ivrCompiler.requestDigits(chainedPrompt.join('.'), SYSTEM_CONSTANTS.STATE_BASES.GAME_ANSWER_INPUT, 1, 1, 'yes');
    }
}

// ============================================================================
// PART 11: DOMAIN LOGIC & CONTROLLERS
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
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.MAIN_MENU, SYSTEM_CONSTANTS.STATE_BASES.MAIN_MENU_CHOICE, 1, 2, 'no');
    }

    static async handleMainMenu(phone, callId, choice, ivrCompiler) {
        // Handle explicit * actions from main menu if user typed quickly
        if (choice === '0') {
            ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.INFO_MENU, SYSTEM_CONSTANTS.STATE_BASES.INFO_MENU_CHOICE, 1, 1, 'no');
        }
        else if (choice === '1') await this.initNewChat(phone, callId, ivrCompiler);
        else if (choice === '2') await this.initChatHistoryMenu(phone, ivrCompiler);
        else if (choice === '*') await this.serveSettingsMenu(phone, ivrCompiler); 
        else if (choice === '*9' || choice === '9') {
            if (phone === AppConfig.adminBypassPhone) {
                ivrCompiler.playChainedTTS("t-זיהוי מנהל אוטומטי הופעל.");
                return this.serveAdminMenu(ivrCompiler);
            }
            await this.serveAdminAuth(ivrCompiler);
        }
        else {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.INVALID_CHOICE);
            this.serveMainMenu(phone, ivrCompiler);
        }
    }

    static async handleInfoMenu(phone, choice, ivrCompiler) {
        if (choice === '9') {
            const stats = await GlobalStatsManager.getStats();
            const users = stats.uniquePhones ? stats.uniquePhones.length : 0;
            const statsText = `t-נתוני מערכת. נפתחו ${stats.totalSessions} שיחות בסך הכל. ${stats.totalSuccess} תשובות מוצלחות. ${stats.totalErrors} שגיאות. ויש ${users} משתמשים במערכת.`;
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
        } else if (choice === '0') {
            this.serveMainMenu(phone, ivrCompiler);
        } else {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.INVALID_CHOICE);
            this.serveSettingsMenu(phone, ivrCompiler);
        }
    }

    static async handleSettingsDetailInput(phone, detailLevel, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        profile.aiDetailLevel = detailLevel;
        await UserRepository.saveProfile(phone, profile);
        ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.ACTION_SUCCESS);
        this.serveSettingsMenu(phone, ivrCompiler);
    }

    // ---- ADMIN DOMAIN ----
    static async serveAdminAuth(ivrCompiler) {
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.ADMIN_AUTH, SYSTEM_CONSTANTS.STATE_BASES.ADMIN_AUTH, 4, 8);
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
        if (choice === '4') {
            let statsText = "t-יש ";
            const keysCount = AppConfig.geminiKeys.length;
            statsText += `${keysCount} מפתחות קיימים. `;
            for (let i = 0; i < keysCount; i++) {
                const key = AppConfig.geminiKeys[i];
                const shortKey = key.slice(-4);
                const usage = redis.isAvailable ? (await redis.get('gemini_usage:' + shortKey) || 0) : "לא ידוע";
                const blockedUntil = redis.isAvailable ? (await redis.get(`key_timeout:${key}`)) : null;
                
                statsText += `למפתח המסיים ב ${shortKey.split('').join(' ')} נרשמו ${usage} קריאות. `;
                if (blockedUntil && parseInt(blockedUntil, 10) > Date.now()) {
                    statsText += "המפתח חסום כרגע עקב חריגת מכסה. ";
                } else {
                    statsText += "המפתח פעיל. ";
                }
            }
            ivrCompiler.playChainedTTS(statsText);
            this.serveAdminMenu(ivrCompiler);
        }
        else if (choice === '0') {
            this.serveMainMenu(phone, ivrCompiler);
        }
        else {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.ACTION_SUCCESS);
            this.serveAdminMenu(ivrCompiler);
        }
    }

    // ---- PAGINATION ----
    static async initiatePaginatedPlayback(phone, fullText, contextType, ivrCompiler) {
        const chunks = YemotTextProcessor.paginateText(fullText);
        
        let endStateBase = SYSTEM_CONSTANTS.STATE_BASES.CHAT_ACTION_CHOICE;
        let pPrompt = SYSTEM_CONSTANTS.PROMPTS.CHAT_PAGINATION_MENU;

        const userProfile = await UserRepository.getProfile(phone);
        userProfile.pagination = { type: contextType, currentIndex: 0, chunks, endStateBase, pPrompt, phoneToCall: "" };
        await UserRepository.saveProfile(phone, userProfile);

        const isLast = chunks.length <= 1;
        const menuPrompt = isLast ? SYSTEM_CONSTANTS.PROMPTS.CHAT_ACTION_MENU : pPrompt;
            
        let combinedPrompt = chunks[0] + "." + menuPrompt;
        let stateBase = isLast ? endStateBase : SYSTEM_CONSTANTS.STATE_BASES.PAGINATION_CHOICE;

        // blockAsterisk is NO here so * can be used to go to main menu if requested
        ivrCompiler.requestDigits(combinedPrompt, stateBase, 1, 2, 'no');
    }

    static async handlePaginationNavigation(phone, choice, callId, ivrCompiler) {
        const userProfile = await UserRepository.getProfile(phone);
        const pag = userProfile.pagination;

        if (!pag || !pag.chunks || pag.chunks.length === 0) return this.serveMainMenu(phone, ivrCompiler);

        // Allow *0 to abort back to main menu
        if (choice === '0' || choice === '*0') return this.serveMainMenu(phone, ivrCompiler);
        
        if (choice === '1') {
            ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO, callId);
            return;
        }

        if (choice === '9') { if (pag.currentIndex < pag.chunks.length - 1) pag.currentIndex++; } 
        else if (choice === '7') { if (pag.currentIndex > 0) pag.currentIndex--; } 
        else {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.INVALID_CHOICE);
        }

        await UserRepository.saveProfile(phone, userProfile);
        
        const isLast = pag.currentIndex === pag.chunks.length - 1;
        const menuPrompt = isLast ? SYSTEM_CONSTANTS.PROMPTS.CHAT_ACTION_MENU : pag.pPrompt;
            
        let combinedPrompt = pag.chunks[pag.currentIndex] + "." + menuPrompt;
        let stateBase = isLast ? pag.endStateBase : SYSTEM_CONSTANTS.STATE_BASES.PAGINATION_CHOICE;

        ivrCompiler.requestDigits(combinedPrompt, stateBase, 1, 2, 'no');
    }

    // ---- CHAT & HISTORY ----
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
            
            if (chatSession.messages.length === 0) {
                // Background topic generation
                GeminiAIService.generateTopic(transcription).then(async topic => {
                    const p = await UserRepository.getProfile(phone);
                    const c = p.chats.find(ch => ch.id === chatSession.id);
                    if(c) { c.topic = topic; await UserRepository.saveProfile(phone, p); }
                }).catch(()=>{});
            }
            
            if (parsedResult.update_profile) profile.personalProfile = parsedResult.update_profile;
            if (parsedResult.summary) profile.globalContextSummary = parsedResult.summary;

            let currentMsgObj = { q: transcription, a: answer };
            if (gameData) currentMsgObj.game = gameData;
            chatSession.messages.push(currentMsgObj);
            
            await UserRepository.saveProfile(phone, profile);
            await GlobalStatsManager.recordEvent(phone, 'success');

            if (action === 'hangup') {
                ivrCompiler.playChainedTTS(answer).routeToFolder('hangup');
                return;
            } else if (action === 'go_to_main_menu') {
                ivrCompiler.playChainedTTS(answer);
                return this.serveMainMenu(phone, ivrCompiler);
            } else if (action === 'play_game' && gameData && gameData.questions) {
                ivrCompiler.playChainedTTS(answer);
                profile.activeGame = { chatId: profile.currentChatId, msgIndex: chatSession.messages.length - 1, qIndex: 0, score: 0 };
                await UserRepository.saveProfile(phone, profile);
                return GameEngine.startGame(phone, callId, ivrCompiler, profile);
            }

            await this.initiatePaginatedPlayback(phone, answer, 'chat', ivrCompiler);
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
        
        let sharedCount = await SharedChatsManager.getSharedCodes(phone);
        let prefixShare = sharedCount.length > 0 ? `t-יש לך ${sharedCount.length} שיחות ששותפו איתך. לכניסה אליהן הקישו כוכבית. ` : "";

        if (validChats.length === 0 && sharedCount.length === 0) {
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

    static async serveHistoryItemMenu(ivrCompiler) {
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.HISTORY_ITEM_MENU, SYSTEM_CONSTANTS.STATE_BASES.HISTORY_ITEM_ACTION, 1, 1, 'no');
    }

    static async handleHistoryItemAction(phone, callId, choice, ivrCompiler) {
        if (choice === '0') return await this.initChatHistoryMenu(phone, ivrCompiler);

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
        if (idx === null || !sorted[idx]) return this.serveMainMenu(phone, ivrCompiler);

        const realItem = sorted[idx];

        if (choice === '1') { 
            let playbackScript = "תחילת היסטוריית השיחה.\n";
            if (realItem.messages) {
                realItem.messages.forEach((msg, i) => { playbackScript += `שאלה ${i + 1}\n${msg.q}\nתשובה ${i + 1}\n${msg.a}\n`; });
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
        else if (choice === '3') { 
            if(isSharedContext) { 
                // remove from shared
                ivrCompiler.playChainedTTS("t-השיחה הוסרה בהצלחה.");
                return this.serveMainMenu(phone, ivrCompiler);
            } else {
                profile.chats = profile.chats.filter(item => item.id !== realItem.id);
                await UserRepository.saveProfile(phone, profile);
                ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.ACTION_SUCCESS);
                await this.initChatHistoryMenu(phone, ivrCompiler);
            }
        }
        else {
            this.serveHistoryItemMenu(ivrCompiler);
        }
    }

    static async serveSharedChatsMenu(phone, ivrCompiler) {
        const sharedCodes = await SharedChatsManager.getSharedCodes(phone);
        let validChats =[];
        for (let code of sharedCodes) {
            let c = await SharedChatsManager.getChatByCode(code);
            if (c) validChats.push(c);
        }

        if (validChats.length === 0) {
            ivrCompiler.playChainedTTS("t-אין לכם שיחות משותפות.");
            return this.serveMainMenu(phone, ivrCompiler);
        }

        const profile = await UserRepository.getProfile(phone);
        profile.currentManagementType = 'shared_chats';
        await UserRepository.saveProfile(phone, profile);

        let promptText = `יש לכם ${validChats.length} שיחות משותפות. `;
        validChats.forEach((c, i) => { 
            const topic = c.topic ? YemotTextProcessor.sanitizeForReadPrompt(c.topic) : "שיחה משותפת";
            promptText += `לשיחה בנושא ${topic} הקישו ${i + 1}. `; 
        });
        promptText += "לחזרה הקישו 0.";
        
        ivrCompiler.requestDigits(`t-${promptText}`, SYSTEM_CONSTANTS.STATE_BASES.SHARED_CHATS_MENU, 1, 2, 'no');
    }
}

// ============================================================================
// PART 12: VERCEL EDGE HTTP HANDLER
// ============================================================================

export default async function handler(req) {
    const url = new URL(req.url);
    const searchParams = new URLSearchParams(url.searchParams);
    
    // Parse URL-encoded body if POST
    if (req.method === 'POST') {
        try {
            const bodyText = await req.text();
            const bodyParams = new URLSearchParams(bodyText);
            for (const [key, val] of bodyParams.entries()) {
                searchParams.append(key, val);
            }
        } catch (e) {
            Logger.error("EdgeHandler", "Failed to parse body", e);
        }
    }

    const mergedQuery = Object.fromEntries(searchParams.entries());
    const getParam = (key) => mergedQuery[key];

    const phone = getParam(SYSTEM_CONSTANTS.YEMOT_PARAMS.PHONE) || getParam(SYSTEM_CONSTANTS.YEMOT_PARAMS.ENTER_ID) || 'Unknown_Caller';
    const callId = getParam(SYSTEM_CONSTANTS.YEMOT_PARAMS.CALL_ID) || `sim_${Date.now()}`;
    const isHangup = getParam(SYSTEM_CONSTANTS.YEMOT_PARAMS.HANGUP) === 'yes';

    const ivrCompiler = new YemotResponseCompiler();

    try {
        if (await GlobalStatsManager.checkBlocked(phone)) {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.USER_BLOCKED).routeToFolder("hangup");
            return new Response(ivrCompiler.compile(), { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
        }

        const yemotDate = getParam(SYSTEM_CONSTANTS.YEMOT_PARAMS.DATE) || '';
        const yemotTime = getParam(SYSTEM_CONSTANTS.YEMOT_PARAMS.TIME) || '';

        let triggerBaseKey = null;
        let triggerValue = null;
        let highestTimestamp = 0;
        
        // Find the latest state trigger
        for (const [key, val] of Object.entries(mergedQuery)) {
            if (key.startsWith('State_')) {
                const parts = key.split('_');
                if (parts.length >= 3) {
                    const timestampStr = parts.pop(); 
                    const timestamp = parseInt(timestampStr, 10);
                    if (!isNaN(timestamp) && timestamp > highestTimestamp) {
                        highestTimestamp = timestamp;
                        triggerBaseKey = parts.join('_'); 
                        triggerValue = val;
                    }
                }
            }
        }

        if (isHangup && !triggerBaseKey && !triggerValue) {
            return new Response("noop=hangup_acknowledged", { status: 200 });
        }

        // Handle Audio Files on Hangup to prevent processing interruption
        if (isHangup && triggerValue && triggerValue.includes('.wav') && triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO) {
            return new Response("noop=hangup_acknowledged", { status: 200 });
        }

        // ==========================================
        // ROUTING DISPATCHER
        // ==========================================

        if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.GAME_ANSWER_INPUT) {
            await GameEngine.processGameAnswer(phone, callId, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO && triggerValue && triggerValue.includes('.wav')) {
            await DomainControllers.processChatAudio(phone, callId, triggerValue, ivrCompiler, yemotDate, yemotTime);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.PAGINATION_CHOICE) {
            await DomainControllers.handlePaginationNavigation(phone, triggerValue, callId, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.CHAT_ACTION_CHOICE) {
            if (triggerValue === '1') ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO, callId);
            else await DomainControllers.serveMainMenu(phone, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.CHAT_HISTORY_CHOICE) {
            await DomainControllers.handleChatHistoryChoice(phone, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.HISTORY_ITEM_ACTION) {
            await DomainControllers.handleHistoryItemAction(phone, callId, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.SHARED_CHATS_MENU) {
            // Re-route shared chats logic
            await DomainControllers.serveMainMenu(phone, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.ADMIN_AUTH) {
            await DomainControllers.handleAdminAuth(triggerValue, phone, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.ADMIN_MENU) {
            await DomainControllers.handleAdminMenu(triggerValue, phone, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.INFO_MENU_CHOICE) {
            await DomainControllers.handleInfoMenu(phone, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.MAIN_MENU_CHOICE) {
            await DomainControllers.handleMainMenu(phone, callId, triggerValue, ivrCompiler);
        }
        else {
            await DomainControllers.serveMainMenu(phone, ivrCompiler);
        }

        const responseString = ivrCompiler.compile();
        return new Response(responseString, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

    } catch (globalException) {
        Logger.error("Edge_Catch_Block", "Critical failure.", globalException);
        const fallbackCompiler = new YemotResponseCompiler();
        fallbackCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.SYSTEM_ERROR_FALLBACK).routeToFolder("hangup");
        return new Response(fallbackCompiler.compile(), { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
}
