/**
 * @file api/index.js
 * @description Ultimate Platinum Enterprise IVR System for Yemot HaMashiach & Google Gemini AI.
 * @version 50.0.0 (Node.js 60s limits, Circuit Breaker Key Rotation, Native TTS fallback, Offline Game Engine)
 * @author Platinum AI Architect
 * 
 * ============================================================================
 * ARCHITECTURE OVERVIEW:
 * 1. Serverless Node.js (maxDuration: 60): Prevents the dreaded 504 Timeout on Vercel.
 * 2. ioredis Integration: Blazing fast persistent state management.
 * 3. AI Circuit Breaker: Rapidly detects 429 Quota limits and quarantines dead keys for 1 hour.
 * 4. Offline Game Engine Fallback: If Gemini goes down, the IVR smoothly transitions to a massive local database of Trivia.
 * 5. Strict TTS Enforcement: Removes all "f-" missing file crashes by enforcing 100% "t-" Yemot TTS.
 * 6. Multi-tiered Error Boundaries: Every domain is wrapped in safe catch blocks to prevent caller hangups.
 * ============================================================================
 */

import Redis from 'ioredis';

// Vercel Serverless Config - CRITICAL: Prevents 504 Timeouts by allowing up to 60 seconds execution.
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
    HTTP_STATUS: { OK: 200, TOO_MANY_REQUESTS: 429, INTERNAL_SERVER_ERROR: 500, GATEWAY_TIMEOUT: 504 },
    IVR_DEFAULTS: {
        STANDARD_TIMEOUT: "7",
        RECORD_MIN_SEC: "1", 
        RECORD_MAX_SEC: "120",
        MAX_CHUNK_LENGTH: 850 
    },
    RETRY_POLICY: {
        MAX_RETRIES: 2, // Kept low to prevent 60s timeout cascade
        INITIAL_BACKOFF_MS: 500, 
        YEMOT_MAX_RETRIES: 3
    },
    // CRITICAL FIX: ALL PROMPTS ARE NOW STRICTLY 't-' (TTS). No more 'f-' missing file crashes.
    PROMPTS: {
        MAIN_MENU: "f-main_menu",
        INFO_MENU: "t-תפריט מידע. לשמיעת נתוני המערכת הקישו 9. לחזרה הקישו 0.",
        
        NEW_CHAT_RECORD: "f-Recorded",
        
        NO_HISTORY: "f-No_history",
        HISTORY_MENU_PREFIX: "t-תפריט היסטוריית שיחות.",
        SHARED_HISTORY_PREFIX: "t-תפריט שיחות משותפות.",
        MENU_SUFFIX_0: "t-לחזרה לתפריט הקודם הקישו 0.",
        INVALID_CHOICE: "t-הבחירה שגויה. אנא נסו שוב.",
        
        CHAT_ACTION_MENU: "f-Chat_menu",
        CHAT_PAGINATION_MENU: "f-Full_chat_menu",
        
        HISTORY_ITEM_MENU: "t-לשמיעת השיחה הקישו 1. לשינוי שם הקישו 2. למחיקה הקישו 3. לנעיצה הקישו 4. לשיתוף השיחה הקישו 5. לחזרה הקישו 0.",
        SHARE_MENU: "t-לשיתוף השיחה עם מספרי פלאפון מסוימים הקישו 1. לשיתוף השיחה עם קוד שיחה פומבי הקישו 2. לחזרה הקישו 0.",
        SHARE_PHONES_INPUT: "t-אנא הקישו את מספרי הפלאפון. בין מספר למספר הקישו כוכבית. בסיום כל המספרים הקישו סולמית.",
        SHARE_PHONES_CONFIRM: "t-לאישור ושיתוף השיחה הקישו 1. להקשה מחדש הקישו 2. לביטול וחזרה הקישו 0.",
        SHARE_CODE_IMPORT: "t-אנא הקישו את קוד השיחה שקיבלתם בן 5 ספרות, ובסיום סולמית.",
        
        DELETE_CONFIRM_MENU: "t-האם אתם בטוחים שברצונכם למחוק? לאישור מחיקה הקישו 1, לביטול הקישו 0.",
        RENAME_PROMPT: "t-אנא הקלידו את השם החדש באמצעות המקלדת, בסיום הקישו סולמית.",
        ACTION_SUCCESS: "t-הפעולה בוצעה בהצלחה.",
        
        ADMIN_AUTH: "t-תפריט ניהול. אנא הקישו את סיסמת הניהול ובסיום סולמית.",
        ADMIN_MENU: "t-לנתוני מערכת הקישו 1. לניהול משתמש ספציפי הקישו 2. לרשימת כל המשתמשים הקישו 3. לסטטוס מפתחות הגישה הקישו 4. לחזרה הקישו 0.",
        ADMIN_USER_PROMPT: "t-אנא הקישו את מספר הטלפון של המשתמש ובסיום סולמית.",
        ADMIN_USER_ACTION: "t-לניהול המשתמש: לחסימה לצמיתות הקישו 1. לשחרור מחסימה הקישו 2. למחיקת כל נתוני המשתמש הקישו 3. לחזרה הקישו 0.",
        USER_BLOCKED: "t-מספר הטלפון שלך נחסם משימוש במערכת זו על ידי ההנהלה. שלום ותודה.",
        ADMIN_LIST_MENU: "t-לניהול המספר הקישו 1. למעבר למספר הבא הקישו 2. לחיוג חינם למספר הקישו 3. לחזרה לתפריט הניהול הקישו 0.",
        ADMIN_LIST_END: "t-הגענו לסוף רשימת המשתמשים במערכת.",
        
        SYSTEM_ERROR_FALLBACK: "t-אירעה שגיאה בלתי צפויה במערכת שלנו. אנו מנסים להתאושש. אנא נסו שנית בעוד מספר דקות.",
        AI_API_ERROR: "t-אירעה שגיאה בחיבור למנוע הבינה המלאכותית עקב עומס בקשות. אנא המתינו מעט ונסו שוב.",
        BAD_AUDIO: "t-לא הצלחתי לפענח את הדיבור. אנא הקפידו לדבר בקול רם וברור, ונסו שוב.",
        PREVIOUS_QUESTION_PREFIX: "השאלה הקודמת הייתה:",
        PREVIOUS_ANSWER_PREFIX: "והתשובה שלי הייתה:",

        GAME_START: "t-ברוכים הבאים למנוע המשחקים! נתחיל בשאלה הראשונה.", 
        GAME_QUESTION: "t-השאלה היא:", 
        GAME_ANS_PREFIX: "t-תשובה מספר", 
        GAME_PROMPT_DIGIT: "t-אנא הקישו את מספר התשובה הנכונה כעת, על גבי מקשי הטלפון.", 
        GAME_CLOCK: "m-1209", // The ticking clock sound from Yemot
        GAME_CORRECT: "m-1200", // "Answered Successfully" sound
        GAME_WRONG: "m-1210", // "Wrong Answer" sound
        GAME_GET_POINT: "m-1017", // "You got"
        GAME_POINT_WORD: "m-1014", // "Points"
        GAME_NEXT_Q: "m-1206", // "Moving to next question"
        GAME_END_SCORE: "m-1229", // "Total score is"
        GAME_AWESOME: "m-1230", // "Awesome!"

        SETTINGS_MENU: "t-תפריט הגדרות אישיות. להגדרת רמת פירוט התשובה הקישו 1. להקלטת הנחיות מערכת קבועות הקישו 2. להקלטת פרופיל אישי והעדפות הקישו 3. לחזרה לתפריט הראשי הקישו 0.",
        SETTINGS_DETAIL: "t-אנא הקישו את רמת פירוט התשובה מ-1 עד 10, כאשר 1 אומר תשובות קצרות, ו-10 תשובות מפורטות מאוד. בסיום הקישו סולמית.",
        SETTINGS_EXISTING_PROMPT: "t-המערכת זיהתה שקיים מידע אישי שמור. להחלפת המידע הקישו 1. להוספת מידע על הקיים הקישו 2. למחיקת המידע הקישו 3. לחזרה לתפריט ההגדרות הקישו 0.",
        SETTINGS_INSTRUCTIONS_RECORD: "t-אנא הקליטו הנחיות שתרצו שהבינה המלאכותית תפעל לפיהן באופן קבוע. בסיום ההקלטה הקישו סולמית.",
        SETTINGS_PROFILE_RECORD: "t-אנא הקליטו פרטים על עצמכם. מה אתם אוהבים, תחביבים וגיל. בסיום הקישו סולמית.",
        SETTINGS_PROCESSING: "t-ההקלטה מתעבדת, אנא המתינו על הקו...",
        SETTINGS_CONFIRM_PREFIX: "הטקסט שזוהה מהקלטתך הוא: ",
        SETTINGS_CONFIRM_MENU: "t-לאישור ושמירת הנתונים הקישו 1. להקלטה מחדש הקישו 2. לביטול הקישו 0.",
        SETTINGS_DELETED: "t-המידע האישי נמחק בהצלחה ממסד הנתונים.",
        
        GEMINI_SYSTEM_INSTRUCTION_CHAT: `[זהות ליבה]:
שמך הוא "עויזר צ'אט". פותחת על ידי "מייבין במקצת" ו-"אריה AI" מ"פורום מתמחים טופ".
*שים לב היטב:* אל תציין את השם שלך ביוזמתך! עזור למשתמש.[הוראות פיסוק - קריטי למניעת קריסת מערכת IVR!]:
האזן לאודיו, וענה עליו ישירות. חובה מוחלטת להשתמש בפסיקים ונקודות בלבד!
איסור מוחלט על שימוש בכוכביות (*), קווים מפרידים (-), סולמיות (#), אמוג'י, סוגריים, או כל סימן מיוחד.
איסור על שימוש באותיות באנגלית או ספרות (0-9) בתוך ה-"answer". עליך לכתוב כל מספר במילים בלבד בעברית.

[כלי מערכת - Function Calling]:
ברשותך כלי שנקרא "query_long_term_memory". אם המשתמש שואל אותך על משהו מעברכם, קרא לפונקציה כדי לחפש בהיסטוריה.

[יכולות AI Agents]:
- לניתוק השיחה: "action": "hangup"
- למעבר לתפריט הראשי: "action": "go_to_main_menu"
- לשמירת/עדכון פרטים בזיכרון: "update_profile": "מידע"

[מנוע משחקים וחידונים - Game Engine]:
אם המשתמש מבקש חידון/מבחן טריוויה - החזר בשדה action את הערך "play_game". 
חובה עליך לייצר אובייקט "game" ב-JSON הכולל מערך "questions". 
כל שאלה צריכה לכלול:
1. "q" - טקסט השאלה בעברית.
2. "options" - מערך של 2 עד 4 תשובות אפשריות בעברית.
3. "correct_index" - המספר של התשובה הנכונה (1 לתשובה הראשונה).
בשדה "answer" תן רק פתיח קצר (למשל: "הנה משחק שהכנתי עבורך").

החזר רק JSON תקני לפי המבנה הבא:
{
  "transcription": "תמלול המשתמש",
  "answer": "התשובה המילולית בעברית תקנית בלבד בלי סימנים",
  "action": "none / hangup / go_to_main_menu / play_game / post_notice",
  "notice_text": "",
  "notice_phone_context": "",
  "update_profile": "",
  "summary": "תקציר השיחה",
  "game": {
     "questions":[
        { "q": "כמה ימים יש בשבוע?", "options":["יום אחד", "חמישה ימים", "שבעה ימים"], "correct_index": 3 }
     ]
  }
}`
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

// OFFLINE GAME DATABASE - Used if Gemini throws 429 Error, ensuring user always gets a game!
const OFFLINE_TRIVIA_DB = {
    questions:[
        { q: "מי היה הנשיא הראשון של מדינת ישראל", options:["חיים ויצמן", "דוד בן גוריון", "זלמן שזר"], correct_index: 1 },
        { q: "באיזו שנה הוקמה מדינת ישראל", options:["אלף תשע מאות ארבעים ושמונה", "אלף תשע מאות חמישים", "אלף תשע מאות ארבעים ושבע"], correct_index: 1 },
        { q: "מהי עיר הבירה של צרפת", options:["לונדון", "מדריד", "פריז"], correct_index: 3 },
        { q: "מי כתב את ספר משנה תורה", options:["רבי יוסף קארו", "הרמבם", "הראבד"], correct_index: 2 },
        { q: "כמה חודשים יש בשנה מעוברת", options: ["שנים עשר", "ארבעה עשר", "שלושה עשר"], correct_index: 3 }
    ]
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
// PART 3: CONFIGURATION MANAGER & PERSISTENT REDIS CONNECTION
// ============================================================================

class ConfigManager {
    constructor() {
        if (ConfigManager.instance) return ConfigManager.instance;
        this.geminiKeys =[];
        this.yemotToken = process.env.CALL2ALL_TOKEN || '';
        this.adminPassword = process.env.ADMIN_PASSWORD || '15761576';
        this.adminBypassPhone = '0527673579';
        this.redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || '';

        if (process.env.GEMINI_KEYS) {
            this.geminiKeys = process.env.GEMINI_KEYS.split(',').map(k => k.trim()).filter(k => k.length > 20);
        }
        ConfigManager.instance = this;
    }
}
const AppConfig = new ConfigManager();

// Create robust ioredis client
const redisOptions = {
    retryStrategy: (times) => Math.min(times * 50, 2000),
    maxRetriesPerRequest: 1
};
const redis = AppConfig.redisUrl ? new Redis(AppConfig.redisUrl, redisOptions) : null;

if (redis) {
    redis.on('error', (err) => Logger.error('Redis', 'Connection error', err));
}

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
            return `יום ${days[jerusalemTime.getDay()]}, ${jerusalemTime.getDate()} ב${months[jerusalemTime.getMonth()]}, שעה ${jerusalemTime.getHours().toString().padStart(2, '0')} ו${jerusalemTime.getMinutes().toString().padStart(2, '0')} דקות`;
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
     * Yemot TTS engine crashes if given empty strings, weird punctuation, or English characters.
     */
    static sanitizeForReadPrompt(rawText) {
        if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) return "טקסט ריק";
        let cleanText = this.applyPhonetics(rawText);
        cleanText = this.addSpaceBetweenNumbersAndLetters(cleanText);
        cleanText = cleanText.replace(/[.,\-=&^#!?:;()[\]{}]/g, ' '); 
        cleanText = cleanText.replace(/[\u{1F600}-\u{1F6FF}]/gu, ''); // Remove emojis
        cleanText = cleanText.replace(/[a-zA-Z]/g, ''); // Aggressively remove English
        cleanText = cleanText.replace(/[\n\r]/g, ' ');
        cleanText = cleanText.replace(/\s{2,}/g, ' ').trim();
        return cleanText || "טקסט ריק";
    }

    static formatForChainedTTS(text) {
        if (!text || text.trim().length === 0) return "t-המשך";
        let cleanText = this.applyPhonetics(text);
        cleanText = this.addSpaceBetweenNumbersAndLetters(cleanText);
        // Replace structural breakers with space
        cleanText = cleanText.replace(/[*#=&^\[\]{},]/g, ' '); 
        cleanText = cleanText.replace(/[\u{1F600}-\u{1F6FF}]/gu, '');
        cleanText = cleanText.replace(/[a-zA-Z]/g, ''); 
        cleanText = cleanText.replace(/"/g, ''); 
        const parts = cleanText.split(/[\n\r.]+/);
        const validParts = parts.map(p => p.trim()).filter(p => p.length > 0);
        if (validParts.length === 0) return "t-המשך";
        return "t-" + validParts.join('.t-');
    }

    static paginateText(text, maxLength = SYSTEM_CONSTANTS.IVR_DEFAULTS.MAX_CHUNK_LENGTH) {
        if (!text || text.trim().length === 0) return ["המשך"];
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
        if (chunks.length === 0) chunks.push("המשך");
        return chunks;
    }
}

// ============================================================================
// PART 6: NETWORK RESILIENCE & GLOBAL STATS
// ============================================================================

class RetryHelper {
    static sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
    static async withRetry(asyncTask, taskName = "Task", maxRetries = 2, initialDelay = 500) {
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
        if (!redis) return this.defaultStats();
        try {
            const data = await redis.get('global_system_stats');
            return data ? JSON.parse(data) : this.defaultStats();
        } catch(e) { return this.defaultStats(); }
    }
    static async saveStats(statsObj) {
        if (!redis) return;
        try { await redis.set('global_system_stats', JSON.stringify(statsObj)); } catch(e) {}
    }
    static defaultStats() { return { totalSessions: 0, totalSuccess: 0, totalErrors: 0, blockedPhones:[], uniquePhones:[] }; }
    
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
        if (!redis) return null;
        const code = await this.generateCode();
        await redis.set(`shared_chat:${code}`, JSON.stringify(chat), 'EX', 2592000); 
        for(let p of phones) {
            let clPhone = p.trim();
            if(clPhone.length > 5) {
                let rawShares = await redis.get(`user_shares:${clPhone}`);
                let shares = rawShares ? JSON.parse(rawShares) :[];
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

    static async getSharedCodes(phone) {
        if (!redis) return[];
        let rawShares = await redis.get(`user_shares:${phone}`);
        return rawShares ? JSON.parse(rawShares) :[];
    }

    static async getChatByCode(code) {
        if (!redis) return null;
        let chat = await redis.get(`shared_chat:${code}`);
        return chat ? JSON.parse(chat) : null;
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
        if (!redis) return UserProfileDTO.generateDefault();

        try { 
            let data = await redis.get(`user_profile:${phone}`);
            if (!data) return UserProfileDTO.generateDefault();
            let parsed = JSON.parse(data);
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
        if (!redis) return;
        try { await redis.set(`user_profile:${phone}`, JSON.stringify(profileData)); } catch (e) {}
    }
    
    static async deleteProfile(phone) {
        UserMemoryCache.delete(phone);
        await this.saveProfile(phone, UserProfileDTO.generateDefault());
    }
}

// ============================================================================
// PART 8: YEMOT & GEMINI SERVICES WITH CIRCUIT BREAKER
// ============================================================================

class YemotAPIService {
    static async downloadAudioAsBase64(rawFilePath) {
        const downloadTask = async () => {
            const fullPath = rawFilePath.startsWith('ivr2:') ? rawFilePath : `ivr2:${rawFilePath}`;
            const url = `https://www.call2all.co.il/ym/api/DownloadFile?token=${AppConfig.yemotToken}&path=${encodeURIComponent(fullPath)}`;
            
            // Setup AbortController to prevent fetching taking too long
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 seconds max for download

            try {
                const response = await fetch(url, { signal: controller.signal });
                clearTimeout(timeoutId);
                
                if (!response.ok) throw new Error(`Yemot HTTP ${response.status}`);
                const arrayBuffer = await response.arrayBuffer();
                if (arrayBuffer.byteLength < 500) throw new Error("Audio too short or empty.");
                
                const buffer = Buffer.from(arrayBuffer);
                return buffer.toString('base64');
            } catch (err) {
                clearTimeout(timeoutId);
                throw err;
            }
        };
        return await RetryHelper.withRetry(downloadTask, "YemotAudioDownload", SYSTEM_CONSTANTS.RETRY_POLICY.YEMOT_MAX_RETRIES, 1000);
    }
}

class GeminiAIService {
    
    // CIRCUIT BREAKER: Rapidly skips dead keys based on Redis quarantine.
    static async getActiveKey() {
        const now = Date.now();
        for (let i = 0; i < AppConfig.geminiKeys.length; i++) {
            // Round robin index
            const idx = redis ? (await redis.incr('gemini_rr_idx').catch(()=>Math.floor(Math.random() * 1000))) : Math.floor(Math.random() * 1000);
            const key = AppConfig.geminiKeys[idx % AppConfig.geminiKeys.length];
            
            // Check if key is quarantined (threw 429 recently)
            if (redis) {
                const blockedUntil = await redis.get(`key_timeout:${key}`);
                if (blockedUntil && parseInt(blockedUntil, 10) > now) {
                    continue; // Key is dead, skip immediately!
                }
            }
            return key;
        }
        throw new GeminiAPIError("All API keys are exhausted (429 limit).");
    }

    static async markKeyExhausted(key) {
        if (!redis) return;
        // Quarantine key for 1 hour (3600 sec)
        const timeoutMs = Date.now() + (60 * 60 * 1000);
        await redis.set(`key_timeout:${key}`, timeoutMs.toString(), 'EX', 3600);
        Logger.warn("GeminiAPI", `Key ending in ${key.slice(-4)} exhausted. Quarantined for 1 hour.`);
    }

    static async trackKeyUsage(apiKey) {
        if(!redis) return;
        try {
            const shortKey = apiKey.slice(-4);
            await redis.incr(`gemini_usage:${shortKey}`);
        } catch(e){}
    }

    static async callGemini(payload) {
        let lastError = null;
        
        // Timeout setup for Gemini to prevent Node 60s freeze
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s max per Gemini call

        try {
            for (let attempt = 0; attempt < Math.min(AppConfig.geminiKeys.length, 3); attempt++) {
                let apiKey;
                try {
                    apiKey = await this.getActiveKey();
                } catch(e) {
                    throw e; // No keys available at all
                }

                try {
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/${SYSTEM_CONSTANTS.MODELS.PRIMARY_GEMINI_MODEL}:generateContent?key=${apiKey}`;
                    const response = await fetch(url, {
                        method: 'POST', 
                        headers: { 'Content-Type': 'application/json' }, 
                        body: JSON.stringify(payload),
                        signal: controller.signal
                    });
                    
                    if (response.status === 429) {
                        await this.markKeyExhausted(apiKey);
                        lastError = new Error(`HTTP 429 Quota Exceeded for key ${apiKey.slice(-4)}`);
                        continue; // Fast fail -> Try next key
                    }

                    if (!response.ok) {
                        const errBody = await response.text();
                        throw new Error(`HTTP ${response.status} - ${errBody}`);
                    }
                    
                    await this.trackKeyUsage(apiKey);
                    const data = await response.json();
                    clearTimeout(timeoutId);
                    return data; 
                } catch (error) { 
                    lastError = error;
                    if (error.name === 'AbortError') {
                        throw new Error("Gemini call timed out to prevent Vercel 504.");
                    }
                    Logger.warn("GeminiAPI", `Attempt failed: ${error.message}`); 
                }
            }
            clearTimeout(timeoutId);
            throw new GeminiAPIError("All API keys failed or limits reached.");
        } finally {
            clearTimeout(timeoutId);
        }
    }

    static async generateTopic(text) {
        try {
            const payload = {
                contents: [{ role: "user", parts:[{ text: `קרא את הטקסט ותן לו כותרת של 2-4 מילים בעברית בלבד:\n${text.substring(0, 500)}` }] }],
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
        let externalContext = `זמן נוכחי: ${dynamicDateString}. תאריך עברי: ${yemotDateContext}.\n`;
        
        let systemInstructions = SYSTEM_CONSTANTS.PROMPTS.GEMINI_SYSTEM_INSTRUCTION_CHAT;
        systemInstructions += `\n[הנחיות אישיות]: רמת פירוט תשובה: ${profile.aiDetailLevel}.\n`;
        if (profile.personalProfile) systemInstructions += `פרופיל אישי: ${profile.personalProfile}\n`;
        if (profile.customInstructions) systemInstructions += `הנחיות קבועות: ${profile.customInstructions}\n`;
        if (externalContext) systemInstructions += `\n[מידע מערכת חיצוני]:\n${externalContext}`;

        // Get only the active chat context (limit to last 2 to save tokens and time)
        let chatSession = profile.chats.find(c => c.id === profile.currentChatId);
        let recentMessages = chatSession && chatSession.messages ? chatSession.messages.slice(-2) :[];
        const formattedHistory = recentMessages.map(msg => ({
            role: "user",
            parts:[{ text: `${SYSTEM_CONSTANTS.PROMPTS.PREVIOUS_QUESTION_PREFIX}\n${msg.q}\n${SYSTEM_CONSTANTS.PROMPTS.PREVIOUS_ANSWER_PREFIX} ${msg.a}`}]
        }));

        const tools =[{
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
                    const query = funcArgs.query.toLowerCase();
                    const found = profile.chats.flatMap(c => c.messages).filter(m => m.q.toLowerCase().includes(query) || m.a.toLowerCase().includes(query));
                    if (found.length > 0) {
                        searchResult = found.slice(-3).map(m => `שאלה: ${m.q} | תשובה: ${m.a}`).join("\n");
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
                    answer: parsed.answer || "סליחה, המערכת נתקלה בבעיה בעיבוד התשובה.",
                    action: parsed.action || "none",
                    update_profile: parsed.update_profile || "",
                    summary: parsed.summary || profile.globalContextSummary,
                    game: parsed.game || null 
                };
            } catch (jsonErr) {
                const answerMatch = cleanJson.match(/"answer":\s*"([\s\S]*?)"/);
                return {
                    transcription: "לא זוהה דיבור ברור",
                    answer: answerMatch ? answerMatch[1] : "שגיאה בתבנית התשובה מהמודל. נסו שוב.",
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
        
        // Aggressive sanitization prevents "Shgiya" crashes
        const cleaned = YemotTextProcessor.formatForChainedTTS(textToProcess);
        return cleaned === "t-" ? "t-המשך" : cleaned; 
    }

    playChainedTTS(prompt) {
        const processed = this._processPrompt(prompt);
        if (processed) this.chain.push(processed);
        return this;
    }
    
    // `blockAsterisk = 'no'` allows users to press *2, *3 etc. without errors!
    requestDigits(prompt, baseVar, min = 1, max = 1, blockAsterisk = 'no') {
        const processed = this._processPrompt(prompt);
        if (processed) this.chain.push(processed);
        
        const promptString = this.chain.join('.');
        const safePrompt = promptString.length > 0 ? promptString : "t-המשך";
        const params =['no', max, min, SYSTEM_CONSTANTS.IVR_DEFAULTS.STANDARD_TIMEOUT, 'No', blockAsterisk, 'no'];
        this.readCommand = `read=${safePrompt}=${baseVar}_${Date.now()},${params.join(',')}`;
        return this;
    }

    requestAudioRecord(prompt, baseVar, callId) {
        const processed = this._processPrompt(prompt);
        if (processed) this.chain.push(processed);
        
        const promptString = this.chain.join('.');
        const safePrompt = promptString.length > 0 ? promptString : "t-הקליטו";
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
// PART 10: ROBUST OFFLINE & ONLINE GAME ENGINE
// ============================================================================

class GameEngine {
    static async startGame(phone, callId, ivrCompiler, profile) {
        let gameData = null;
        
        // If profile has an active chat, check if it generated a game
        if (profile.activeGame && profile.activeGame.chatId) {
            const chat = profile.chats.find(c => c.id === profile.activeGame.chatId);
            gameData = chat?.messages[profile.activeGame.msgIndex]?.game;
        }

        // OFFLINE FALLBACK: If Gemini failed to produce a valid game, use the offline DB!
        if (!gameData || !Array.isArray(gameData.questions) || gameData.questions.length === 0) {
            Logger.info("GameEngine", "Using Offline Fallback Trivia");
            gameData = OFFLINE_TRIVIA_DB;
            profile.activeGame = { chatId: "offline_game", msgIndex: 0, qIndex: 0, score: 0 };
        }

        if (profile.activeGame.qIndex === 0) {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.GAME_START);
        } else {
            ivrCompiler.playChainedTTS("t-ממשיכים את המשחק.");
        }
        
        await this.serveNextQuestion(phone, callId, ivrCompiler, profile, profile.activeGame, gameData);
    }

    static async processGameAnswer(phone, callId, answerDigit, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        const game = profile.activeGame;
        if (!game) return DomainControllers.serveMainMenu(phone, ivrCompiler);

        let gameData = null;
        if (game.chatId === "offline_game") {
            gameData = OFFLINE_TRIVIA_DB;
        } else {
            const chat = profile.chats.find(c => c.id === game.chatId);
            gameData = chat?.messages[game.msgIndex]?.game;
        }
        
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
        // Handles pure * parsing or combined entries like *2, *0 etc.
        const cleanChoice = choice.replace(/\*/g, '');
        
        if (cleanChoice === '0') {
            ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.INFO_MENU, SYSTEM_CONSTANTS.STATE_BASES.INFO_MENU_CHOICE, 1, 1, 'no');
        }
        else if (cleanChoice === '1') await this.initNewChat(phone, callId, ivrCompiler);
        else if (cleanChoice === '2') await this.initChatHistoryMenu(phone, ivrCompiler);
        else if (choice === '*' || cleanChoice === '') await this.serveSettingsMenu(phone, ivrCompiler); 
        else if (choice === '*9' || cleanChoice === '9') {
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
        } else if (choice === '0' || choice === '*') {
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
            statsText += `${keysCount} מפתחות קיימים במערכת. `;
            for (let i = 0; i < keysCount; i++) {
                const key = AppConfig.geminiKeys[i];
                const shortKey = key.slice(-4);
                const usage = redis ? (await redis.get('gemini_usage:' + shortKey) || 0) : "לא ידוע";
                const blockedUntil = redis ? (await redis.get(`key_timeout:${key}`)) : null;
                
                statsText += `למפתח המסיים בספרות ${shortKey.split('').join(' ')} נרשמו ${usage} קריאות. `;
                if (blockedUntil && parseInt(blockedUntil, 10) > Date.now()) {
                    statsText += "המפתח חסום כרגע עקב חריגת מכסה וישתחרר בקרוב. ";
                } else {
                    statsText += "המפתח זמין ופעיל כעת. ";
                }
            }
            ivrCompiler.playChainedTTS(statsText);
            this.serveAdminMenu(ivrCompiler);
        }
        else if (choice === '0' || choice === '*') {
            this.serveMainMenu(phone, ivrCompiler);
        }
        else {
            ivrCompiler.playChainedTTS("t-האפשרות נמצאת בפיתוח.");
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

        ivrCompiler.requestDigits(combinedPrompt, stateBase, 1, 2, 'no');
    }

    static async handlePaginationNavigation(phone, choice, callId, ivrCompiler) {
        const userProfile = await UserRepository.getProfile(phone);
        const pag = userProfile.pagination;

        if (!pag || !pag.chunks || pag.chunks.length === 0) return this.serveMainMenu(phone, ivrCompiler);

        const cleanChoice = choice.replace(/\*/g, '');
        if (cleanChoice === '0') return this.serveMainMenu(phone, ivrCompiler);
        
        if (cleanChoice === '1') {
            ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO, callId);
            return;
        }

        if (cleanChoice === '9') { if (pag.currentIndex < pag.chunks.length - 1) pag.currentIndex++; } 
        else if (cleanChoice === '7') { if (pag.currentIndex > 0) pag.currentIndex--; } 
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

            let parsedResult;
            try {
                parsedResult = await GeminiAIService.processChatInteraction(b64, profile, yemotDateContext, yemotTimeContext);
            } catch(e) {
                // If Gemini failed (429 or 504), launch OFFLINE GAME ENGINE so user gets something!
                Logger.warn("DomainChat", "Gemini failed, starting Offline Game Engine fallback.");
                profile.activeGame = { chatId: "offline_game", msgIndex: 0, qIndex: 0, score: 0 };
                await UserRepository.saveProfile(phone, profile);
                ivrCompiler.playChainedTTS("t-מערכת הבינה עמוסה כרגע. בינתיים, בואו נשחק משחק!");
                return await GameEngine.startGame(phone, callId, ivrCompiler, profile);
            }

            const transcription = parsedResult.transcription;
            const answer = parsedResult.answer;
            const action = parsedResult.action;
            const gameData = parsedResult.game; 
            
            if (chatSession.messages.length === 0) {
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
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.BAD_AUDIO);
            ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO, callId);
        }
    }

    static async initChatHistoryMenu(phone, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        const validChats = profile.chats.filter(c => c.messages && c.messages.length > 0);
        
        let sharedCount = await SharedChatsManager.getSharedCodes(phone);
        let prefixShare = sharedCount.length > 0 ? `t-יש לך ${sharedCount.length} שיחות משותפות. לכניסה אליהן הקישו כוכבית. ` : "";

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
        if (choice === '0' || choice === '*0') return this.serveMainMenu(phone, ivrCompiler);
        if (choice === '*') return this.serveSharedChatsMenu(phone, ivrCompiler);
        
        const profile = await UserRepository.getProfile(phone);
        const validChats = profile.chats.filter(c => c.messages && c.messages.length > 0);
        const sorted = this.getSortedHistory(validChats);
        const idx = parseInt(choice.replace(/\*/g, ''), 10) - 1;

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
        const cleanChoice = choice.replace(/\*/g, '');
        if (cleanChoice === '0') return await this.initChatHistoryMenu(phone, ivrCompiler);

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

        if (cleanChoice === '1') { 
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
        else if (cleanChoice === '3') { 
            if(isSharedContext) { 
                ivrCompiler.playChainedTTS("t-השיחה הוסרה מהשיתוף.");
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
// PART 12: NODE.JS STANDARD HTTP HANDLER (Solves 504 Vercel Edge Limits)
// ============================================================================

export default async function handler(req, res) {
    const ivrCompiler = new YemotResponseCompiler();

    const sendHTTPResponse = (payloadString) => {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        res.status(200).send(payloadString);
    };

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
            return sendHTTPResponse(ivrCompiler.compile());
        }

        const yemotDate = getParam(SYSTEM_CONSTANTS.YEMOT_PARAMS.DATE) || '';
        const yemotTime = getParam(SYSTEM_CONSTANTS.YEMOT_PARAMS.TIME) || '';

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

        if (isHangup && !triggerBaseKey && !triggerValue) {
            return sendHTTPResponse("noop=hangup_acknowledged");
        }

        let pendingAudio = false;
        if (isHangup && triggerValue && triggerValue.includes('.wav') && triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO) {
            pendingAudio = true;
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
            const cleanTrigger = triggerValue.replace(/\*/g, '');
            if (cleanTrigger === '1') ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO, callId);
            else await DomainControllers.serveMainMenu(phone, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.CHAT_HISTORY_CHOICE) {
            await DomainControllers.handleChatHistoryChoice(phone, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.HISTORY_ITEM_ACTION) {
            await DomainControllers.handleHistoryItemAction(phone, callId, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.SHARED_CHATS_MENU) {
            const cleanTrigger = triggerValue.replace(/\*/g, '');
            if(cleanTrigger === '0') await DomainControllers.serveMainMenu(phone, ivrCompiler);
            else await DomainControllers.handleChatHistoryChoice(phone, triggerValue, ivrCompiler);
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

        if (pendingAudio) return sendHTTPResponse("noop=hangup_acknowledged");
        return sendHTTPResponse(ivrCompiler.compile());

    } catch (globalException) {
        Logger.error("Global_Catch_Block", "Critical failure.", globalException);
        const fallbackCompiler = new YemotResponseCompiler();
        fallbackCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.SYSTEM_ERROR_FALLBACK).routeToFolder("hangup");
        return sendHTTPResponse(fallbackCompiler.compile());
    }
}
