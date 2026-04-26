/**
 * @file api/index.js
 * @description Ultimate Enterprise IVR System for Yemot HaMashiach & Google Gemini AI.
 * @version 34.0.0 (Supabase Database, Internal Web Scraper Restored, Settings & Deep Memory)
 * @author Custom AI Assistant
 */

import { kv } from '@vercel/kv';

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
        // --- USER LOCKED PROMPTS (DO NOT CHANGE) ---
        MAIN_MENU: "f-main_menu",
        TRANS_MAIN_MENU: "f-trans_main_menu",
        
        NEW_CHAT_RECORD: "f-Recorded",
        NEW_TRANSCRIPTION_INITIAL: "f-Record_transcription",
        APPEND_TRANSCRIPTION_RECORD: "f-Record_Continue",
        
        NO_HISTORY: "f-No_history",
        NO_TRANS_HISTORY: "f-No_transcription_history",
        HISTORY_MENU_PREFIX: "f-History_Menu ",
        TRANS_HISTORY_PREFIX: "f- ",
        MENU_SUFFIX_0: "f-return",
        INVALID_CHOICE: "f-Wrong",
        
        CHAT_ACTION_MENU: "f-Chat_menu",
        CHAT_PAGINATION_MENU: "f-Full_chat_menu",
        
        TRANS_MENU: "t-לשמיעה חוזרת הקישו 1. להקלטה מחדש הקישו 2. להקלטת המשך הקישו 3. לחזרה לתפריט הקודם הקישו 0.",
        TRANS_PAGINATION_MENU: "t-לשמיעת המשך התמלול הקישו 9. לחלק הקודם הקישו 7. להשהייה הקישו 5. למעבר לאפשרויות התמלול הקישו 1. לחזרה לתפריט הקודם הקישו 0.",
        
        HISTORY_ITEM_MENU: "f-history_item_menu",
        DELETE_CONFIRM_MENU: "f-delete_confirm_menu",
        RENAME_PROMPT: "t-אנא הקלידו את השם החדש באמצעות המקלדת, בסיום הקישו סולמית.",
        ACTION_SUCCESS: "t-הפעולה בוצעה בהצלחה.",
        
        ADMIN_AUTH: "t-אנא הקישו את סיסמת הניהול ובסיום סולמית.",
        ADMIN_MENU: "t-תפריט ניהול. לשמיעת נתוני המערכת הקישו 1. לניהול משתמשים הקישו 2. לחזרה לתפריט הראשי הקישו 0.",
        ADMIN_USER_PROMPT: "t-אנא הקישו את מספר הטלפון של המשתמש ובסיום סולמית.",
        ADMIN_USER_ACTION: "t-לניהול המשתמש: לחסימה לצמיתות הקישו 1. לשחרור מחסימה הקישו 2. למחיקת כל נתוני המשתמש הקישו 3. לחזרה הקישו 0.",
        USER_BLOCKED: "t-מספר הטלפון שלך נחסם משימוש במערכת זו. שלום ותודה.",
        
        SYSTEM_ERROR_FALLBACK: "t-אירעה שגיאה בלתי צפויה, אך ננסה להמשיך. אנא נסו שוב.",
        AI_API_ERROR: "t-אירעה שגיאה בחיבור למנוע הבינה המלאכותית. אנא נסו שוב מאוחר יותר.",
        BAD_AUDIO: "t-לא הצלחתי לשמוע אתכם בבירור. אנא הקפידו לדבר בקול רם ונסו שוב.",
        PREVIOUS_QUESTION_PREFIX: "שאלה קודמת:",
        PREVIOUS_ANSWER_PREFIX: "תשובה קודמת:",
        // --------------------------------------------

        // --- NEW SETTINGS PROMPTS ---
        SETTINGS_MENU: "t-תפריט הגדרות אישיות. להגדרת מהירות ההקראה הקישו 1. להגדרת רמת פירוט התשובה הקישו 2. להקלטת הנחיות מערכת קבועות הקישו 3. להקלטת פרופיל אישי והעדפות הקישו 4. לחזרה לתפריט הראשי הקישו כוכבית.",
        SETTINGS_SPEED: "t-אנא הקישו את רמת מהירות ההקראה. הקישו 1 למהירות איטית, 2 לרגילה, או 3 למהירה. בסיום הקישו סולמית.",
        SETTINGS_DETAIL: "t-אנא הקישו את רמת פירוט התשובה מ-1 עד 10, כאשר 1 זה תשובות קצרות מאוד ו-10 זה תשובות ארוכות ומפורטות מאוד. בסיום הקישו סולמית.",
        SETTINGS_INSTRUCTIONS_RECORD: "t-אנא הקליטו הנחיות שתרצו שהבינה המלאכותית תפעל לפיהן תמיד. למשל, סגנון דיבור או כללים. בסיום ההקלטה הקישו סולמית.",
        SETTINGS_PROFILE_RECORD: "t-אנא הקליטו פרטים על עצמכם, מה אתם אוהבים, תחביבים וכל מידע שתרצו שהבינה המלאכותית תזכור עליכם בשיחות הבאות. בסיום הקישו סולמית.",
        SETTINGS_PROCESSING: "t-מעבד את ההקלטה ושומר את ההגדרות, אנא המתינו...",
        
        GEMINI_SYSTEM_INSTRUCTION_CHAT: `
אתה עוזר קולי וירטואלי חכם בשפה העברית.
האזן לאודיו המצורף או לטקסט המצורף, וענה עליו.
חשוב מאוד:
1. ענה ישירות לעניין. אל תסטה לנושאים אחרים (אל תדבר על סרטים, קולנוע או תרבות פופולרית אלא אם נשאלת עליהם מפורשות). תהיה ענייני וממוקד!
2. ענה תשובות מקיפות ומפורטות, אך רלוונטיות בלבד.
3. השתמש בסימני פיסוק (פסיקים ונקודות) במקומות הנכונים כדי לייצר הפסקות נשימה לקריאה טבעית עבור רובוט הקראה.
4. השתמש בניקוד חלקי במילים שעלולות להיות מבוטאות לא נכון.
5. חובה! אל תשתמש כלל בכוכביות (*), קווים מפרידים (-), סולמיות (#) או אמוג'י.
6. חובה עליך להחזיר אובייקט JSON תקני בלבד עם שני שדות: transcription (התמלול המדויק של שאלת המשתמש) ו-answer (התשובה שלך).
        `,
        GEMINI_SYSTEM_INSTRUCTION_TRANSCRIPTION: "תמלל את הנאמר בקובץ האודיו המצורף בעברית במדויק מילה במילה. החזר אך ורק את הטקסט המתומלל ללא שום תוספת. השתמש בסימני פיסוק. אל תשתמש בתווים מיוחדים."
    },
    STATE_BASES: {
        MAIN_MENU_CHOICE: 'State_MainMenuChoice',
        TRANS_MAIN_MENU_CHOICE: 'State_TransMainMenuChoice',
        CHAT_USER_AUDIO: 'State_ChatUserAudio',
        CHAT_HISTORY_CHOICE: 'State_ChatHistoryChoice',
        CHAT_ACTION_CHOICE: 'State_ChatActionChoice',
        PAGINATION_CHOICE: 'State_PaginationChoice',
        TRANS_AUDIO: 'State_TransAudio',
        TRANS_APPEND_AUDIO: 'State_TransAppendAudio',
        TRANS_DRAFT_MENU: 'State_TransDraftMenu',
        TRANS_HISTORY_CHOICE: 'State_TransHistoryChoice',
        TRANS_ACTION_CHOICE: 'State_TransActionChoice',
        HISTORY_ITEM_ACTION: 'State_HistoryItemAction',
        HISTORY_RENAME_INPUT: 'State_HistoryRenameInput',
        HISTORY_DELETE_CONFIRM: 'State_HistoryDeleteConfirm',
        ADMIN_AUTH: 'State_AdminAuth',
        ADMIN_MENU: 'State_AdminMenu',
        ADMIN_USER_INPUT: 'State_AdminUserInput',
        ADMIN_USER_ACTION: 'State_AdminUserAction',
        
        // SETTINGS MENU STATES
        SETTINGS_MENU_CHOICE: 'State_SettingsMenuChoice',
        SETTINGS_SPEED_INPUT: 'State_SettingsSpeedInput',
        SETTINGS_DETAIL_INPUT: 'State_SettingsDetailInput',
        SETTINGS_INSTRUCTIONS_AUDIO: 'State_SettingsInstructionsAudio',
        SETTINGS_PROFILE_AUDIO: 'State_SettingsProfileAudio'
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
        
        // SUPABASE CREDENTIALS
        this.supabaseUrl = process.env.SUPABASE_URL || '';
        this.supabaseKey = process.env.SUPABASE_ANON_KEY || '';

        this.currentGeminiKeyIndex = 0;
        if (process.env.GEMINI_KEYS) {
            this.geminiKeys = process.env.GEMINI_KEYS.split(',').map(k => k.trim()).filter(k => k.length > 20);
        }
        ConfigManager.instance = this;
    }
    getNextGeminiKey() {
        if (this.geminiKeys.length === 0) throw new Error("No Gemini API keys configured.");
        const key = this.geminiKeys[this.currentGeminiKeyIndex];
        this.currentGeminiKeyIndex = (this.currentGeminiKeyIndex + 1) % this.geminiKeys.length;
        return key;
    }
}
const AppConfig = new ConfigManager();

// INIT SUPABASE CLIENT

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
        cleanText = cleanText.replace(/[\n\r]/g, ' ');
        return cleanText.replace(/\s{2,}/g, ' ').trim() || "התקבל טקסט ריק";
    }

    static formatForChainedTTS(text) {
        if (!text) return "t-טקסט ריק";
        let cleanText = this.applyPhonetics(text);
        cleanText = this.addSpaceBetweenNumbersAndLetters(cleanText);
        cleanText = cleanText.replace(/[*#=\&^\[\]{}]/g, ' ');
        cleanText = cleanText.replace(/[\u{1F600}-\u{1F6FF}]/gu, '');
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
// PART 7: GLOBAL STATS & SUPABASE STORAGE 
// ============================================================================

class GlobalStatsManager {
    static async getStats() {
        try {
            return (await kv.get('global_system_stats')) || this.defaultStats();
        } catch {
            return this.defaultStats();
        }
    }

    static async saveStats(statsObj) {
        try {
            await kv.set('global_system_stats', statsObj);
        } catch {}
    }

    static defaultStats() {
        return {
            totalSessions: 0,
            totalSuccess: 0,
            totalErrors: 0,
            blockedPhones: [],
            uniquePhones: []
        };
    }

    static async recordEvent(phone, type) {
        const stats = await this.getStats();

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
        return stats.blockedPhones.includes(phone);
    }

    static async blockUser(phone) {
        const stats = await this.getStats();
        if (!stats.blockedPhones.includes(phone)) {
            stats.blockedPhones.push(phone);
            await this.saveStats(stats);
        }
    }

    static async unblockUser(phone) {
        const stats = await this.getStats();
        stats.blockedPhones = stats.blockedPhones.filter(p => p !== phone);
        await this.saveStats(stats);
    }
}

const UserMemoryCache = new Map();

const UserMemoryCache = new Map();

class UserRepository {
    static async getProfile(phone) {
        if (!phone || phone === 'unknown') return UserProfileDTO.generateDefault();

        if (UserMemoryCache.has(phone)) {
            return UserProfileDTO.validate(UserMemoryCache.get(phone));
        }

        try {
            const data = await kv.get(`user_${phone}`);

            if (!data) {
                const fresh = UserProfileDTO.generateDefault();
                UserMemoryCache.set(phone, fresh);
                return fresh;
            }

            const validated = UserProfileDTO.validate(data);
            UserMemoryCache.set(phone, validated);
            return validated;

        } catch (err) {
            console.warn("KV Fetch failed, using fallback");
            const fresh = UserProfileDTO.generateDefault();
            UserMemoryCache.set(phone, fresh);
            return fresh;
        }
    }

    static async saveProfile(phone, profileData) {
        if (!phone || phone === 'unknown') return;

        UserMemoryCache.set(phone, profileData);

        try {
            await kv.set(`user_${phone}`, profileData);
        } catch (err) {
            console.error("KV Save failed:", err.message);
        }
    }

    static async deleteProfile(phone) {
        UserMemoryCache.delete(phone);
        try {
            await kv.del(`user_${phone}`);
        } catch {}
    }
}

// ============================================================================
// PART 8: DATA TRANSFER OBJECTS (DTOs)
// ============================================================================

class ChatMessageDTO {
    constructor(question, answer) {
        this.q = question || "";
        this.a = answer || "";
    }
}

class ChatSessionDTO {
    constructor(id = null, topic = "שיחה כללית") {
        this.id = id || `chat_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        this.topic = topic;
        this.pinned = false;
        this.date = new Date().toISOString();
        this.messages =[];
    }
    addMessage(question, answer) { this.messages.push(new ChatMessageDTO(question, answer)); }
}

class TranscriptionEntryDTO {
    constructor(text, topic = "תמלול כללי") {
        this.id = `trans_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        this.topic = topic;
        this.pinned = false;
        this.date = new Date().toISOString();
        this.text = text || "";
    }
}

class UserProfileDTO {
    static generateDefault() {
        return {
            chats:[], 
            transcriptions:[], 
            currentChatId: null,
            tempTranscription: "", 
            currentTransIndex: null,
            currentManagementType: null, 
            adminTargetPhone: null,
            
            // PERSONAL SETTINGS
            aiDetailLevel: "5",
            customInstructions: "",
            personalProfile: "",
            ttsSpeed: "2", // 1=Slow, 2=Normal, 3=Fast
            
            pagination: { type: null, currentIndex: 0, chunks:[], pPrompt: "", endStateBase: "" }
        };
    }
    static validate(data) {
        if (!data || typeof data !== 'object') return this.generateDefault();
        if (!Array.isArray(data.chats)) data.chats =[];
        if (!Array.isArray(data.transcriptions)) data.transcriptions =[];
        if (!data.pagination || !Array.isArray(data.pagination.chunks)) {
            data.pagination = { type: null, currentIndex: 0, chunks:[], pPrompt: "", endStateBase: "" };
        }
        
        // Ensure new settings fields exist
        if (!data.aiDetailLevel) data.aiDetailLevel = "5";
        if (!data.customInstructions) data.customInstructions = "";
        if (!data.personalProfile) data.personalProfile = "";
        if (!data.ttsSpeed) data.ttsSpeed = "2";
        
        data.chats.forEach(c => { if (c.pinned === undefined) c.pinned = false; });
        data.transcriptions.forEach(t => { if (t.pinned === undefined) t.pinned = false; });
        return data;
    }
}

// ============================================================================
// PART 9: EXTERNAL DATA SERVICES (INTERNAL SCRAPERS FOR LIVE DATA)
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
            Logger.info("ExternalData", "Fetching JDN RSS news");
            const url = "https://www.jdn.co.il/feed/";
            const res = await fetch(url, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
            if (!res.ok) return "";
            const xml = await res.text();
            
            // STRICT REGEX: Extract items only, bypassing the main site title.
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
                    const extract = extractData.query.pages[pageId].extract;
                    return extract.substring(0, 1000); 
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
            const apiKey = AppConfig.getNextGeminiKey();
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
                Logger.warn("GeminiAPI", `Key rotated due to error.`); 
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
            // First, quick transcription to detect intent
            const transcriptionPayload = {
                contents:[{ role: "user", parts:[{ text: "תמלל את האודיו הבא במדויק:" }, { inlineData: { mimeType: "audio/wav", data: base64Audio } }] }],
                generationConfig: { temperature: 0.1, maxOutputTokens: 1000 }
            };
            let transcriptText = "";
            try {
                const tr = await this.callGemini(transcriptionPayload);
                transcriptText = typeof tr === 'string' ? tr : tr.transcription;
            } catch(e) { Logger.warn("GeminiChat", "Pre-transcription failed"); }
            
            // Build Context using robust internal functions (No Google Tool required)
            const dynamicDateString = DateTimeHelper.getHebrewDateTimeString(); 
            let externalContext = `מידע זמנים קריטי: התאריך והשעה הנוכחיים עכשיו ממש הם: ${dynamicDateString}. תאריך עברי (המעודכן לפי ימות המשיח): ${yemotDateContext}. עליך להתייחס לזמן זה כתאריך הנוכחי לכל דבר ועניין ואין להמציא תאריכים אחרים!\n`;
            
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
            
            let systemInstructions = SYSTEM_CONSTANTS.PROMPTS.GEMINI_SYSTEM_INSTRUCTION_CHAT;
            
            // INJECT PERSONALITY & SETTINGS
            systemInstructions += `\n\n[הנחיות אישיות מהמשתמש (ציית להן לחלוטין!)]:\n`;
            systemInstructions += `רמת פירוט התשובה (מ-1 עד 10, 10 הכי מפורט): ${profile.aiDetailLevel}.\n`;
            
            if (profile.ttsSpeed === "1") systemInstructions += `המשתמש אוהב הקראה איטית. ענה במשפטים קצרים מאוד ובמילים פשוטות.\n`;
            if (profile.ttsSpeed === "3") systemInstructions += `המשתמש אוהב הקראה מהירה. ענה ברצף זורם ומהיר.\n`;
            
            if (profile.personalProfile) {
                systemInstructions += `פרופיל המשתמש (זכור זאת כדי לפתח קשר אישי אמיתי! התייחס לזה בתשובותיך): ${profile.personalProfile}\n`;
            }
            if (profile.customInstructions) {
                systemInstructions += `הנחיות מערכת קבועות שהמשתמש הגדיר לך (ציית להן!): ${profile.customInstructions}\n`;
            }
            if (externalContext) {
                systemInstructions += `\nמידע חיצוני עדכני ששאבתי מהאינטרנט כעת (הסתמך עליו במידת הצורך):\n${externalContext}`;
            }

            // DEEP MEMORY: Inject ALL past chats (up to 30 messages total) to build strong context
            let deepHistoryContext = [];
            const allChats = profile.chats ||[];
            allChats.forEach(chat => {
                chat.messages.forEach(msg => {
                    deepHistoryContext.push({
                        role: "user", 
                        parts:[{ text: `${SYSTEM_CONSTANTS.PROMPTS.PREVIOUS_QUESTION_PREFIX} ${msg.q}\n${SYSTEM_CONSTANTS.PROMPTS.PREVIOUS_ANSWER_PREFIX} ${msg.a}` }]
                    });
                });
            });
            // Keep only the last 30 interactions to prevent token overflow
            deepHistoryContext = deepHistoryContext.slice(-30);

            // Payload WITHOUT Google Search Tool
            const payload = {
                contents:[
                    ...deepHistoryContext,
                    { role: "user", parts:[{ text: systemInstructions }, { inlineData: { mimeType: SYSTEM_CONSTANTS.MODELS.AUDIO_MIME_TYPE, data: base64Audio } }] }
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
                    answer: parsed.answer || "לא הצלחתי לגבש תשובה"
                };
            } catch (jsonErr) {
                const answerMatch = cleanJson.match(/"answer":\s*"([\s\S]*)"/);
                return {
                    transcription: transcriptText || "לא זוהה דיבור",
                    answer: answerMatch ? answerMatch[1] : cleanJson
                };
            }
        } catch (e) { throw e; }
    }

    static async processTranscriptionOnly(base64Audio) {
        const payload = {
            contents:[{ role: "user", parts:[{ text: SYSTEM_CONSTANTS.PROMPTS.GEMINI_SYSTEM_INSTRUCTION_TRANSCRIPTION }, { inlineData: { mimeType: SYSTEM_CONSTANTS.MODELS.AUDIO_MIME_TYPE, data: base64Audio } }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 8000 }
        };
        return await this.callGemini(payload);
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
        if (prompt.startsWith('f-')) return prompt; 
        
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
    
    // ALLOW ASTERISK IN MAIN MENUS by setting blockAsterisk='no'
    requestDigits(prompt, baseVar, min = 1, max = 1, blockAsterisk = 'no') {
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
// PART 12: DOMAIN LOGIC & PAGINATION CONTROLLERS
// ============================================================================

class DomainControllers {

    static getSortedHistory(items) {
        return [...items].sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return new Date(b.date) - new Date(a.date);
        });
    }

    static serveMainMenu(ivrCompiler) {
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.MAIN_MENU, SYSTEM_CONSTANTS.STATE_BASES.MAIN_MENU_CHOICE, 1, 1, 'no');
    }

    static serveTransMainMenu(ivrCompiler) {
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.TRANS_MAIN_MENU, SYSTEM_CONSTANTS.STATE_BASES.TRANS_MAIN_MENU_CHOICE, 1, 1);
    }

    static async handleMainMenu(phone, callId, choice, ivrCompiler) {
        if (choice === '0') this.serveTransMainMenu(ivrCompiler);
        else if (choice === '1') await this.initNewChat(phone, callId, ivrCompiler);
        else if (choice === '2') await this.initChatHistoryMenu(phone, ivrCompiler);
        else if (choice === '9') await this.serveAdminAuth(ivrCompiler);
        else if (choice === '*') await this.serveSettingsMenu(phone, ivrCompiler); // SETTINGS MENU
        else {
            ivrCompiler.routeToFolder(choice);
        }
    }

    static async handleTransMainMenu(phone, callId, choice, ivrCompiler) {
        if (choice === '1') await this.initNewTranscription(phone, callId, ivrCompiler);
        else if (choice === '2') await this.initTransHistoryMenu(phone, ivrCompiler);
        else if (choice === '0') this.serveMainMenu(ivrCompiler);
        else {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.INVALID_CHOICE);
            this.serveTransMainMenu(ivrCompiler);
        }
    }

    // ---- SETTINGS DOMAIN ----
    static async serveSettingsMenu(phone, ivrCompiler) {
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.SETTINGS_MENU, SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_MENU_CHOICE, 1, 1, 'no');
    }

    static async handleSettingsMenuChoice(phone, callId, choice, ivrCompiler) {
        if (choice === '1') {
            ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.SETTINGS_SPEED, SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_SPEED_INPUT, 1, 1);
        } else if (choice === '2') {
            ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.SETTINGS_DETAIL, SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_DETAIL_INPUT, 1, 2);
        } else if (choice === '3') {
            ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.SETTINGS_INSTRUCTIONS_RECORD, SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_INSTRUCTIONS_AUDIO, callId);
        } else if (choice === '4') {
            ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.SETTINGS_PROFILE_RECORD, SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_PROFILE_AUDIO, callId);
        } else if (choice === '*') {
            this.serveMainMenu(ivrCompiler);
        } else {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.INVALID_CHOICE);
            this.serveSettingsMenu(phone, ivrCompiler);
        }
    }

    static async handleSettingsSpeedInput(phone, speed, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        profile.ttsSpeed = speed;
        await UserRepository.saveProfile(phone, profile);
        ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.ACTION_SUCCESS);
        this.serveSettingsMenu(phone, ivrCompiler);
    }

    static async handleSettingsDetailInput(phone, detailLevel, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        profile.aiDetailLevel = detailLevel;
        await UserRepository.saveProfile(phone, profile);
        ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.ACTION_SUCCESS);
        this.serveSettingsMenu(phone, ivrCompiler);
    }

    static async processSettingsAudio(phone, audioPath, settingType, ivrCompiler) {
        try {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.SETTINGS_PROCESSING);
            const b64 = await YemotAPIService.downloadAudioAsBase64(audioPath);
            const text = await GeminiAIService.processTranscriptionOnly(b64);
            const profile = await UserRepository.getProfile(phone);
            
            if (settingType === 'instructions') {
                profile.customInstructions = text;
            } else if (settingType === 'profile') {
                profile.personalProfile = text;
            }
            
            await UserRepository.saveProfile(phone, profile);
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.ACTION_SUCCESS);
        } catch (e) {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.BAD_AUDIO);
        }
        this.serveSettingsMenu(phone, ivrCompiler);
    }


    // ---- ADMIN DOMAIN ----
    static async serveAdminAuth(ivrCompiler) {
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.ADMIN_AUTH, SYSTEM_CONSTANTS.STATE_BASES.ADMIN_AUTH, 8, 8);
    }

    static async handleAdminAuth(choice, ivrCompiler) {
        if (choice === AppConfig.adminPassword) {
            ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.ADMIN_MENU, SYSTEM_CONSTANTS.STATE_BASES.ADMIN_MENU, 1, 1);
        } else {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.INVALID_CHOICE);
            this.serveMainMenu(ivrCompiler);
        }
    }

    static async handleAdminMenu(choice, ivrCompiler) {
        if (choice === '1') {
            const stats = await GlobalStatsManager.getStats();
            const statsText = `t-נפתחו ${stats.totalSessions} שיחות, ${stats.totalSuccess} תשובות מוצלחות, ${stats.totalErrors} שגיאות. ויש ${stats.uniquePhones.length} משתמשים ייחודיים במערכת.`;
            ivrCompiler.playChainedTTS(statsText);
            ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.ADMIN_MENU, SYSTEM_CONSTANTS.STATE_BASES.ADMIN_MENU, 1, 1);
        } 
        else if (choice === '2') {
            ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.ADMIN_USER_PROMPT, SYSTEM_CONSTANTS.STATE_BASES.ADMIN_USER_INPUT, 9, 10);
        }
        else {
            this.serveMainMenu(ivrCompiler);
        }
    }

    static async handleAdminUserInput(phoneToManage, ivrCompiler, originalPhone) {
        const profile = await UserRepository.getProfile(originalPhone);
        profile.adminTargetPhone = phoneToManage;
        await UserRepository.saveProfile(originalPhone, profile);
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.ADMIN_USER_ACTION, SYSTEM_CONSTANTS.STATE_BASES.ADMIN_USER_ACTION, 1, 1);
    }

    static async handleAdminUserAction(action, ivrCompiler, adminPhone) {
        const adminProfile = await UserRepository.getProfile(adminPhone);
        const targetPhone = adminProfile.adminTargetPhone;
        
        if (!targetPhone) return this.serveMainMenu(ivrCompiler);

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
        
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.ADMIN_MENU, SYSTEM_CONSTANTS.STATE_BASES.ADMIN_MENU, 1, 1);
    }

    // ---- PAGINATION ----
    static async initiatePaginatedPlayback(phone, fullText, contextType, ivrCompiler) {
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
        userProfile.pagination = { type: contextType, currentIndex: 0, chunks, endStateBase, pPrompt };
        await UserRepository.saveProfile(phone, userProfile);

        ivrCompiler.playChainedTTS(chunks[0]);
        
        if (chunks.length <= 1) {
            const finalPrompt = (contextType === 'chat') ? SYSTEM_CONSTANTS.PROMPTS.CHAT_ACTION_MENU : 
                                (contextType === 'trans_draft') ? SYSTEM_CONSTANTS.PROMPTS.TRANS_MENU : SYSTEM_CONSTANTS.PROMPTS.TRANS_ACTION_MENU;
            ivrCompiler.requestDigits(finalPrompt, endStateBase, 1, 1);
        } else {
            ivrCompiler.requestDigits(pPrompt, SYSTEM_CONSTANTS.STATE_BASES.PAGINATION_CHOICE, 1, 1);
        }
    }

    static async handlePaginationNavigation(phone, choice, callId, ivrCompiler) {
        const userProfile = await UserRepository.getProfile(phone);
        const pag = userProfile.pagination;

        if (!pag || !pag.chunks || pag.chunks.length === 0) return this.serveMainMenu(ivrCompiler);

        if (choice === '0') {
            if (pag.type === 'chat') return this.serveMainMenu(ivrCompiler);
            else return this.serveTransMainMenu(ivrCompiler);
        }
        
        if (choice === '1') {
            if (pag.type === 'chat') ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO, callId);
            else if (pag.type === 'trans_draft') ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.TRANS_MENU, SYSTEM_CONSTANTS.STATE_BASES.TRANS_DRAFT_MENU, 1, 1);
            else ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.TRANS_ACTION_MENU, SYSTEM_CONSTANTS.STATE_BASES.TRANS_ACTION_CHOICE, 1, 1);
            return;
        }

        if (choice === '9') { if (pag.currentIndex < pag.chunks.length - 1) pag.currentIndex++; } 
        else if (choice === '7') { if (pag.currentIndex > 0) pag.currentIndex--; } 
        else if (choice === '5') { 
            Logger.info("Pagination", "User pressed 5. Replaying chunk to allow Yemot native pausing.");
        } 
        else {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.INVALID_CHOICE);
            if (pag.currentIndex === pag.chunks.length - 1) {
                const finalPrompt = (pag.type === 'chat') ? SYSTEM_CONSTANTS.PROMPTS.CHAT_ACTION_MENU : 
                                    (pag.type === 'trans_draft') ? SYSTEM_CONSTANTS.PROMPTS.TRANS_MENU : SYSTEM_CONSTANTS.PROMPTS.TRANS_ACTION_MENU;
                ivrCompiler.requestDigits(finalPrompt, pag.endStateBase, 1, 1);
            } else {
                ivrCompiler.requestDigits(pag.pPrompt, SYSTEM_CONSTANTS.STATE_BASES.PAGINATION_CHOICE, 1, 1);
            }
            return;
        }

        await UserRepository.saveProfile(phone, userProfile);
        ivrCompiler.playChainedTTS(pag.chunks[pag.currentIndex]);
        
        if (pag.currentIndex === pag.chunks.length - 1) {
            const finalPrompt = (pag.type === 'chat') ? SYSTEM_CONSTANTS.PROMPTS.CHAT_ACTION_MENU : 
                                (pag.type === 'trans_draft') ? SYSTEM_CONSTANTS.PROMPTS.TRANS_MENU : SYSTEM_CONSTANTS.PROMPTS.TRANS_ACTION_MENU;
            ivrCompiler.requestDigits(finalPrompt, pag.endStateBase, 1, 1);
        } else {
            ivrCompiler.requestDigits(pag.pPrompt, SYSTEM_CONSTANTS.STATE_BASES.PAGINATION_CHOICE, 1, 1);
        }
    }

    // ---- HISTORY ITEM MANAGEMENT ----
    static async serveHistoryItemMenu(ivrCompiler) {
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.HISTORY_ITEM_MENU, SYSTEM_CONSTANTS.STATE_BASES.HISTORY_ITEM_ACTION, 1, 1);
    }

    static async handleHistoryItemAction(phone, choice, ivrCompiler) {
        if (choice === '0') {
            const p = await UserRepository.getProfile(phone);
            if (p.currentManagementType === 'chat') return this.initChatHistoryMenu(phone, ivrCompiler);
            return this.initTransHistoryMenu(phone, ivrCompiler);
        }

        const profile = await UserRepository.getProfile(phone);
        const isChat = profile.currentManagementType === 'chat';
        const list = isChat ? profile.chats : profile.transcriptions;
        const sorted = this.getSortedHistory(list);
        const idx = profile.currentTransIndex;
        
        if (idx === null || idx === undefined || !sorted[idx]) return this.serveMainMenu(ivrCompiler);

        const realItem = list.find(item => item.id === sorted[idx].id);

        if (choice === '1') { 
            let playbackScript = "";
            if (isChat) {
                playbackScript = "היסטוריית שיחה מתחילה\n";
                realItem.messages.forEach((msg, i) => {
                    playbackScript += `שאלה ${i + 1}\n${msg.q}\nתשובה ${i + 1}\n${msg.a}\n`;
                });
            } else {
                playbackScript = `תוכן התמלול הוא\n${realItem.text}`;
            }
            await this.initiatePaginatedPlayback(phone, playbackScript, isChat ? 'chat' : 'trans_hist', ivrCompiler);
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
            if (isChat) this.initChatHistoryMenu(phone, ivrCompiler);
            else this.initTransHistoryMenu(phone, ivrCompiler);
        }
        else {
            this.serveHistoryItemMenu(ivrCompiler);
        }
    }

    static async handleHistoryRename(phone, newName, ivrCompiler) {
        if (!newName || newName.trim() === '') return this.serveHistoryItemMenu(ivrCompiler);
        
        const profile = await UserRepository.getProfile(phone);
        const isChat = profile.currentManagementType === 'chat';
        const list = isChat ? profile.chats : profile.transcriptions;
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
        
        if (isChat) this.initChatHistoryMenu(phone, ivrCompiler);
        else this.initTransHistoryMenu(phone, ivrCompiler);
    }

    static async handleHistoryDelete(phone, choice, ivrCompiler) {
        if (choice === '1') {
            const profile = await UserRepository.getProfile(phone);
            const isChat = profile.currentManagementType === 'chat';
            const list = isChat ? profile.chats : profile.transcriptions;
            const sorted = this.getSortedHistory(list);
            const idx = profile.currentTransIndex;
            
            if (idx !== null && sorted[idx]) {
                if (isChat) {
                    profile.chats = profile.chats.filter(item => item.id !== sorted[idx].id);
                } else {
                    profile.transcriptions = profile.transcriptions.filter(item => item.id !== sorted[idx].id);
                }
                await UserRepository.saveProfile(phone, profile);
                ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.ACTION_SUCCESS);
            }
        }
        
        const profile = await UserRepository.getProfile(phone);
        const isChat = profile.currentManagementType === 'chat';
        if (isChat) this.initChatHistoryMenu(phone, ivrCompiler);
        else this.initTransHistoryMenu(phone, ivrCompiler);
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

            const { transcription, answer } = await GeminiAIService.processChatInteraction(b64, profile, yemotDateContext, yemotTimeContext);
            
            // ANTI DUPLICATE FIX
            const lastMsg = chatSession.messages[chatSession.messages.length - 1];
            if (!lastMsg || lastMsg.q !== transcription) {
                chatSession.addMessage(transcription, answer);
            } else {
                lastMsg.a = answer; 
            }
            
            if (chatSession.messages.length === 1) {
                chatSession.topic = await GeminiAIService.generateTopic(`שאלה: ${transcription}\nתשובה: ${answer}`);
            }

            await UserRepository.saveProfile(phone, profile);
            await GlobalStatsManager.recordEvent(phone, 'success');
            await this.initiatePaginatedPlayback(phone, answer, 'chat', ivrCompiler);
        } catch (e) {
            Logger.error("Domain_Chat", "Processing Error", e);
            await GlobalStatsManager.recordEvent(phone, 'error');
            if (e instanceof GeminiAPIError) {
                ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.AI_API_ERROR);
                this.serveMainMenu(ivrCompiler);
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
            return this.serveMainMenu(ivrCompiler);
        }
        
        profile.currentManagementType = 'chat';
        await UserRepository.saveProfile(phone, profile);

        let promptText = SYSTEM_CONSTANTS.PROMPTS.HISTORY_MENU_PREFIX;
        const sorted = this.getSortedHistory(validChats); 
        sorted.forEach((c, i) => { 
            const topic = c.topic ? YemotTextProcessor.sanitizeForReadPrompt(c.topic) : "שיחה כללית";
            promptText += `t-לשיחה בנושא ${topic}, הקישו ${i + 1}. `; 
        });
        promptText += "t-לחזרה לתפריט הראשי הקישו 0.";
        ivrCompiler.requestDigits(promptText, SYSTEM_CONSTANTS.STATE_BASES.CHAT_HISTORY_CHOICE, 1, 2);
    }

    static async handleChatHistoryChoice(phone, choice, ivrCompiler) {
        if (choice === '0') return this.serveMainMenu(ivrCompiler);
        
        const profile = await UserRepository.getProfile(phone);
        const validChats = profile.chats.filter(c => c.messages && c.messages.length > 0);
        const sorted = this.getSortedHistory(validChats);
        const idx = parseInt(choice, 10) - 1;

        if (isNaN(idx) || idx < 0 || idx >= sorted.length) {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.INVALID_CHOICE);
            return this.serveMainMenu(ivrCompiler);
        }

        profile.currentTransIndex = idx;
        await UserRepository.saveProfile(phone, profile);
        
        this.serveHistoryItemMenu(ivrCompiler);
    }

    // ---- TRANSCRIPTION ----
    static async initNewTranscription(phone, callId, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        profile.tempTranscription = "";
        await UserRepository.saveProfile(phone, profile);
        ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_TRANSCRIPTION_INITIAL, SYSTEM_CONSTANTS.STATE_BASES.TRANS_AUDIO, callId);
    }

    static async processTransAudio(phone, callId, audioPath, ivrCompiler, isAppend) {
        try {
            const b64 = await YemotAPIService.downloadAudioAsBase64(audioPath);
            const text = await GeminiAIService.processTranscriptionOnly(b64);
            
            const profile = await UserRepository.getProfile(phone);
            profile.tempTranscription = isAppend ? `${profile.tempTranscription}\n${text}` : text;
            await UserRepository.saveProfile(phone, profile);

            const announcement = `t-התמלול הוא:\n${profile.tempTranscription}`;
            await this.initiatePaginatedPlayback(phone, announcement, 'trans_draft', ivrCompiler);
        } catch (e) {
            Logger.error("Domain_Trans", "Trans error", e);
            if (e instanceof GeminiAPIError) {
                ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.AI_API_ERROR);
                this.serveTransMainMenu(ivrCompiler);
            } else {
                ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.BAD_AUDIO);
                const prompt = isAppend ? SYSTEM_CONSTANTS.PROMPTS.APPEND_TRANSCRIPTION_RECORD : SYSTEM_CONSTANTS.PROMPTS.NEW_TRANSCRIPTION_INITIAL;
                const state = isAppend ? SYSTEM_CONSTANTS.STATE_BASES.TRANS_APPEND_AUDIO : SYSTEM_CONSTANTS.STATE_BASES.TRANS_AUDIO;
                ivrCompiler.requestAudioRecord(prompt, state, callId);
            }
        }
    }

    static async handleTransDraftMenu(phone, callId, choice, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        switch(choice) {
            case '1': await this.initiatePaginatedPlayback(phone, profile.tempTranscription || "טקסט ריק", 'trans_draft', ivrCompiler); break;
            case '2': ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_TRANSCRIPTION_INITIAL, SYSTEM_CONSTANTS.STATE_BASES.TRANS_AUDIO, callId); break;
            case '3': ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.APPEND_TRANSCRIPTION_RECORD, SYSTEM_CONSTANTS.STATE_BASES.TRANS_APPEND_AUDIO, callId); break;
            case '4':
                if (profile.tempTranscription) {
                    const topic = await GeminiAIService.generateTopic(profile.tempTranscription);
                    profile.transcriptions.push(new TranscriptionEntryDTO(profile.tempTranscription, topic));
                    if (profile.transcriptions.length > 20) profile.transcriptions.shift(); 
                    profile.tempTranscription = ""; 
                    await UserRepository.saveProfile(phone, profile);
                    ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.TRANS_SAVED_SUCCESS);
                }
                this.serveTransMainMenu(ivrCompiler); break;
            case '0': this.serveTransMainMenu(ivrCompiler); break;
            default: this.serveTransMainMenu(ivrCompiler);
        }
    }

    static async initTransHistoryMenu(phone, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        if (profile.transcriptions.length === 0) {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.NO_TRANS_HISTORY);
            return this.serveTransMainMenu(ivrCompiler);
        }
        
        profile.currentManagementType = 'trans';
        await UserRepository.saveProfile(phone, profile);

        let promptText = SYSTEM_CONSTANTS.PROMPTS.TRANS_HISTORY_PREFIX;
        const sorted = this.getSortedHistory(profile.transcriptions);
        sorted.forEach((t, i) => { 
            const topic = t.topic ? YemotTextProcessor.sanitizeForReadPrompt(t.topic) : "תמלול כללי";
            promptText += `t-לתמלול בנושא ${topic}, הקישו ${i + 1}. `; 
        });
        promptText += "t-לחזרה לתפריט הקודם הקישו 0.";
        ivrCompiler.requestDigits(promptText, SYSTEM_CONSTANTS.STATE_BASES.TRANS_HISTORY_CHOICE, 1, 2);
    }

    static async handleTransHistoryChoice(phone, choice, ivrCompiler) {
        if (choice === '0') return this.serveTransMainMenu(ivrCompiler);
        
        const profile = await UserRepository.getProfile(phone);
        const sorted = this.getSortedHistory(profile.transcriptions);
        const idx = parseInt(choice, 10) - 1;

        if (isNaN(idx) || idx < 0 || idx >= sorted.length) {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.INVALID_CHOICE);
            return this.serveTransMainMenu(ivrCompiler);
        }

        profile.currentTransIndex = idx;
        await UserRepository.saveProfile(phone, profile);
        
        this.serveHistoryItemMenu(ivrCompiler);
    }
}

// ============================================================================
// PART 12: STATE MACHINE & REQUEST ROUTER (MAIN HANDLER)
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
        
        for (const[key, val] of Object.entries(mergedQuery)) {
            if (key.startsWith('State_')) {
                const parts = key.split('_');
                if (parts.length >= 3) {
                    const timestamp = parseInt(parts[parts.length - 1], 10);
                    if (!isNaN(timestamp) && timestamp > highestTimestamp) {
                        highestTimestamp = timestamp;
                        triggerBaseKey = parts.slice(0, parts.length - 1).join('_');
                        triggerValue = Array.isArray(val) ? val[val.length - 1] : val;
                    }
                }
            }
        }

        if (triggerBaseKey === null) {
            Logger.info("State_Machine", "Initial Entry - No trigger keys present.");
        } else {
            Logger.info("State_Machine", `Trigger:[${triggerBaseKey}] = [${triggerValue}]`);
        }

        let pendingAudio = false;
        if (isHangup) {
            if (triggerValue && triggerValue.includes('.wav') && 
               (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO || 
                triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.TRANS_AUDIO || 
                triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.TRANS_APPEND_AUDIO ||
                triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_INSTRUCTIONS_AUDIO ||
                triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_PROFILE_AUDIO)) {
                pendingAudio = true;
            } else {
                return sendHTTPResponse(res, "noop=hangup_acknowledged");
            }
        }

        // ==========================================
        // ROUTING DISPATCHER
        // ==========================================

        if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO && triggerValue && triggerValue.includes('.wav')) {
            await DomainControllers.processChatAudio(phone, callId, triggerValue, ivrCompiler, yemotHebrewDate, yemotTime);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.PAGINATION_CHOICE) {
            await DomainControllers.handlePaginationNavigation(phone, triggerValue, callId, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.CHAT_ACTION_CHOICE) {
            if (triggerValue === '1') ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO, callId);
            else DomainControllers.serveMainMenu(ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.CHAT_HISTORY_CHOICE) {
            await DomainControllers.handleChatHistoryChoice(phone, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.TRANS_AUDIO && triggerValue && triggerValue.includes('.wav')) {
            await DomainControllers.processTransAudio(phone, callId, triggerValue, ivrCompiler, false);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.TRANS_APPEND_AUDIO && triggerValue && triggerValue.includes('.wav')) {
            await DomainControllers.processTransAudio(phone, callId, triggerValue, ivrCompiler, true);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.TRANS_DRAFT_MENU) {
            await DomainControllers.handleTransDraftMenu(phone, callId, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.TRANS_HISTORY_CHOICE) {
            await DomainControllers.handleTransHistoryChoice(phone, triggerValue, ivrCompiler);
        }
        // HISTORY MANAGEMENT DISPATCHER
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.HISTORY_ITEM_ACTION) {
            await DomainControllers.handleHistoryItemAction(phone, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.HISTORY_RENAME_INPUT) {
            await DomainControllers.handleHistoryRename(phone, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.HISTORY_DELETE_CONFIRM) {
            await DomainControllers.handleHistoryDelete(phone, triggerValue, ivrCompiler);
        }
        // ADMIN DISPATCHER
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.ADMIN_AUTH) {
            await DomainControllers.handleAdminAuth(triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.ADMIN_MENU) {
            await DomainControllers.handleAdminMenu(triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.ADMIN_USER_INPUT) {
            await DomainControllers.handleAdminUserInput(triggerValue, ivrCompiler, phone);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.ADMIN_USER_ACTION) {
            await DomainControllers.handleAdminUserAction(triggerValue, ivrCompiler, phone);
        }
        // SETTINGS DISPATCHER
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_MENU_CHOICE) {
            await DomainControllers.handleSettingsMenuChoice(phone, callId, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_SPEED_INPUT) {
            await DomainControllers.handleSettingsSpeedInput(phone, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_DETAIL_INPUT) {
            await DomainControllers.handleSettingsDetailInput(phone, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_INSTRUCTIONS_AUDIO && triggerValue && triggerValue.includes('.wav')) {
            await DomainControllers.processSettingsAudio(phone, triggerValue, 'instructions', ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.SETTINGS_PROFILE_AUDIO && triggerValue && triggerValue.includes('.wav')) {
            await DomainControllers.processSettingsAudio(phone, triggerValue, 'profile', ivrCompiler);
        }
        // MAIN MENUS
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.MAIN_MENU_CHOICE) {
            await DomainControllers.handleMainMenu(phone, callId, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.TRANS_MAIN_MENU_CHOICE) {
            await DomainControllers.handleTransMainMenu(phone, callId, triggerValue, ivrCompiler);
        }
        else {
            DomainControllers.serveMainMenu(ivrCompiler);
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
