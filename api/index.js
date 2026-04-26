/**
 * @file api/index.js
 * @description Ultimate Enterprise IVR System for Yemot HaMashiach & Google Gemini AI.
 * @version 29.0.0 (Titanium Core - Secret Admin, History Management (Pin/Rename/Del), Public Blob Fix, Dynamic Routing)
 * @author Custom AI Assistant
 */

import { put, list } from '@vercel/blob';

export const maxDuration = 60; // Prevents Vercel Serverless from timing out

// ============================================================================
// PART 1: SYSTEM CONSTANTS, ENUMS & CONFIGURATION DEFAULTS
// ============================================================================

const SYSTEM_CONSTANTS = {
    MODELS: {
        PRIMARY_GEMINI_MODEL: "gemini-3.1-flash-lite-preview", // LOCKED EXCLUSIVELY TO YOUR REQUEST
        JSON_MIME_TYPE: "application/json",
        AUDIO_MIME_TYPE: "audio/wav"
    },
    YEMOT_PATHS: {
        RECORDINGS_DIR: "/ApiRecords",
        USERS_DB_DIR: "users_v2/", // New directory to avoid conflicts with old corrupted files
        STATS_FILE: "global_system_stats.json"
    },
    HTTP_STATUS: { OK: 200, INTERNAL_SERVER_ERROR: 500 },
    IVR_DEFAULTS: {
        STANDARD_TIMEOUT: "7",
        RECORD_MIN_SEC: "1", RECORD_MAX_SEC: "120",
        MAX_CHUNK_LENGTH: 850 
    },
    RETRY_POLICY: {
        MAX_RETRIES: 3, INITIAL_BACKOFF_MS: 1000, BACKOFF_MULTIPLIER: 2,
        BLOB_MAX_RETRIES: 3, GEMINI_MAX_RETRIES: 3
    },
    // ========================================================================
    // TO USE NATIVE AUDIO FILES: REPLACE 't-...' WITH 'f-filename'
    // Example: MAIN_MENU: "f-main_menu" (and upload main_menu.wav to Yemot)
    // ========================================================================
    PROMPTS: {
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
        
        // HISTORY ITEM MANAGEMENT MENUS
        HISTORY_ITEM_MENU: "f-history_item_menu",
        DELETE_CONFIRM_MENU: "f-delete_confirm_menu",
        RENAME_PROMPT: "t-אנא הקלידו את השם החדש באמצעות המקלדת, בסיום הקישו סולמית.",
        ACTION_SUCCESS: "t-הפעולה בוצעה בהצלחה.",
        
        // ADMIN MENUS
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
        
        GEMINI_SYSTEM_INSTRUCTION_CHAT: `
אתה עוזר קולי וירטואלי חכם בשפה העברית.
האזן לאודיו המצורף או לטקסט המצורף, וענה עליו. יתכן ויסופק לך מידע מהאינטרנט או תאריך ושעה כהקשר - השתמש בהם כדי לענות תשובות מדויקות לעכשיו!
חשוב מאוד:
1. ענה תשובות ארוכות, מקיפות, מפורטות ומעמיקות ככל הנדרש.
2. השתמש בסימני פיסוק (פסיקים ונקודות) במקומות הנכונים כדי לייצר הפסקות נשימה לקריאה טבעית עבור רובוט הקראה.
3. השתמש בניקוד חלקי במילים שעלולות להיות מבוטאות לא נכון כדי למנוע טעויות הגייה.
4. חובה! אל תשתמש כלל בכוכביות (*), קווים מפרידים (-), סולמיות (#) או אמוג'י.
5. חובה עליך להחזיר אובייקט JSON תקני בלבד עם שני שדות: transcription (התמלול המדויק של שאלת המשתמש) ו-answer (התשובה המפורטת שלך).
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
        // HISTORY MANAGEMENT STATES
        HISTORY_ITEM_ACTION: 'State_HistoryItemAction',
        HISTORY_RENAME_INPUT: 'State_HistoryRenameInput',
        HISTORY_DELETE_CONFIRM: 'State_HistoryDeleteConfirm',
        // ADMIN STATES
        ADMIN_AUTH: 'State_AdminAuth',
        ADMIN_MENU: 'State_AdminMenu',
        ADMIN_USER_INPUT: 'State_AdminUserInput',
        ADMIN_USER_ACTION: 'State_AdminUserAction'
    },
    YEMOT_PARAMS: {
        PHONE: 'ApiPhone', ENTER_ID: 'ApiEnterID',
        CALL_ID: 'ApiCallId', HANGUP: 'hangup',
        DATE: 'Date', TIME: 'Time', HEBREW_DATE: 'HebrewDate'
    },
    VERCEL_BLOB: {
        REST_API_BASE_URL: "https://blob.vercel-storage.com"
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
    static warn(context, message) { console.warn(`[WARN][${this.getTimestamp()}] [${context}] ${message}`); }
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
        this.blobToken = process.env.BLOB_READ_WRITE_TOKEN || '';
        this.adminPassword = process.env.ADMIN_PASSWORD || '15761576';
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

// ============================================================================
// PART 4: HEBREW PHONETICS, SANITIZATION & PACING ENGINE
// ============================================================================

const HEBREW_PHONETIC_MAP = {
    "צה\"ל": "צבא הגנה לישראל", "שב\"כ": "שירות הביטחון הכללי",
    "מוסד": "המוסד למודיעין ולתפקידים מיוחדים", "מנכ\"ל": "מנהל כללי",
    "יו\"ר": "יושב ראש", "ח\"כ": "חבר כנסת", "בג\"ץ": "בית משפט גבוה לצדק",
    "עו\"ד": "דוקטור עורך דין", "ד\"ר": "דוקטור", "פרופ'": "פרופסור",
    "חז\"ל": "חכמינו זכרונם לברכה", "שליט\"א": "שיחיה לאורך ימים טובים אמן",
    "זצ\"ל": "זכר צדיק לברכה", "ע\"ה": "עליו השלום", "בע\"ה": "בעזרת השם",
    "ב\"ה": "ברוך השם", "רבש\"ע": "ריבונו של עולם", "הקב\"ה": "הקדוש ברוך הוא"
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
        // Fixes issue where "מ5" becomes "מ 5" for better TTS reading
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
// PART 5: NETWORK RESILIENCE & RETRY HELPER
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
// PART 6: GLOBAL STATS & VERCEL BLOB STORAGE (PUBLIC ACCESS FIX)
// ============================================================================

class GlobalStatsManager {
    static async getStats() {
        const filePath = SYSTEM_CONSTANTS.YEMOT_PATHS.STATS_FILE;
        try {
            const listUrl = `${SYSTEM_CONSTANTS.VERCEL_BLOB.REST_API_BASE_URL}?prefix=${encodeURIComponent(filePath)}`;
            const listRes = await fetch(listUrl, { headers: { 'Authorization': `Bearer ${AppConfig.blobToken}`, 'x-api-version': '7' } });
            if (!listRes.ok) return this.defaultStats();
            
            const listData = await listRes.json();
            if (!listData.blobs || listData.blobs.length === 0) return this.defaultStats();

            const contentRes = await fetch(listData.blobs[0].url, { headers: { 'Authorization': `Bearer ${AppConfig.blobToken}` } });
            if (!contentRes.ok) return this.defaultStats();
            
            return await contentRes.json();
        } catch (error) {
            return this.defaultStats();
        }
    }

    static async saveStats(statsObj) {
        const filePath = SYSTEM_CONSTANTS.YEMOT_PATHS.STATS_FILE;
        try {
            const url = `${SYSTEM_CONSTANTS.VERCEL_BLOB.REST_API_BASE_URL}/${filePath}`;
            await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${AppConfig.blobToken}`,
                    'x-api-version': '7', 'x-add-random-suffix': 'false',
                    'x-access': 'public', // REQUIRED FOR FREE VERCEL BLOB TO AVOID 500 ERRORS
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(statsObj)
            });
        } catch (error) {
            Logger.warn("GlobalStats", "Failed to save stats.");
        }
    }

    static defaultStats() {
        return { totalSessions: 0, totalSuccess: 0, totalErrors: 0, blockedPhones: [], uniquePhones:[] };
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

class UserRepository {
    static _getUserFilePath(phone) { return `${SYSTEM_CONSTANTS.YEMOT_PATHS.USERS_DB_DIR}${phone}.json`; }

    static async getProfile(phone) {
        if (!phone || phone === 'unknown') return UserProfileDTO.generateDefault();
        if (UserMemoryCache.has(phone)) return UserProfileDTO.validate(UserMemoryCache.get(phone));

        const filePath = this._getUserFilePath(phone);
        const fetchOperation = async () => {
            const listUrl = `${SYSTEM_CONSTANTS.VERCEL_BLOB.REST_API_BASE_URL}?prefix=${encodeURIComponent(filePath)}`;
            const listRes = await fetch(listUrl, { headers: { 'Authorization': `Bearer ${AppConfig.blobToken}`, 'x-api-version': '7' } });
            if (!listRes.ok) throw new Error("Blob List failed");
            
            const listData = await listRes.json();
            if (!listData.blobs || listData.blobs.length === 0) return UserProfileDTO.generateDefault();

            const contentRes = await fetch(listData.blobs[0].url, { headers: { 'Authorization': `Bearer ${AppConfig.blobToken}` } });
            if (!contentRes.ok) throw new Error("Blob Fetch failed");
            
            const profile = UserProfileDTO.validate(await contentRes.json());
            UserMemoryCache.set(phone, profile);
            return profile;
        };

        try {
            return await RetryHelper.withRetry(fetchOperation, "FetchUserBlob", 2, 500);
        } catch (error) {
            Logger.warn("UserRepository", `L2 Blob Fetch failed. Using fresh profile.`);
            const newProfile = UserProfileDTO.generateDefault();
            UserMemoryCache.set(phone, newProfile);
            return newProfile;
        }
    }

    static async saveProfile(phone, profileData) {
        if (!phone || phone === 'unknown') return;
        
        UserMemoryCache.set(phone, profileData);
        const filePath = this._getUserFilePath(phone);
        
        const saveOperation = async () => {
            const url = `${SYSTEM_CONSTANTS.VERCEL_BLOB.REST_API_BASE_URL}/${filePath}`;
            await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${AppConfig.blobToken}`,
                    'x-api-version': '7', 'x-add-random-suffix': 'false',
                    'x-access': 'public', // CRITICAL FIX: Ensures save works properly on free Vercel tiers
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(profileData)
            });
        };

        try {
            await RetryHelper.withRetry(saveOperation, "SaveUserBlob", 3, 500);
            Logger.info("Storage", `Profile saved successfully for ${phone}.`);
        } catch (error) {
            Logger.error("Storage", `L2 Blob save failed for ${phone}. Relying on RAM Cache.`, error);
        }
    }
    
    static async deleteProfile(phone) {
        UserMemoryCache.delete(phone);
        const newProfile = UserProfileDTO.generateDefault();
        await this.saveProfile(phone, newProfile); // Overwrite with empty
    }
}

// ============================================================================
// PART 7: DATA TRANSFER OBJECTS (DTOs)
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
            chats: [], // Saves up to 20 chats!
            transcriptions:[], 
            currentChatId: null,
            tempTranscription: "", 
            currentTransIndex: null,
            currentManagementType: null, // 'chat' or 'trans'
            adminTargetPhone: null,
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
        // Ensure legacy items have the pinned attribute
        data.chats.forEach(c => { if (c.pinned === undefined) c.pinned = false; });
        data.transcriptions.forEach(t => { if (t.pinned === undefined) t.pinned = false; });
        return data;
    }
}

// ============================================================================
// PART 8: EXTERNAL API SERVICES (Wikipedia Search, Yemot, Gemini)
// ============================================================================

class FreeInternetSearch {
    static async searchWikipedia(query) {
        try {
            Logger.info("FreeInternetSearch", `Searching Wikipedia for: ${query}`);
            const searchUrl = `https://he.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&srlimit=1`;
            const searchRes = await fetch(searchUrl);
            const searchData = await searchRes.json();
            
            if (searchData.query && searchData.query.search && searchData.query.search.length > 0) {
                const pageId = searchData.query.search[0].pageid;
                const extractUrl = `https://he.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=1&explaintext=1&pageids=${pageId}`;
                const extractRes = await fetch(extractUrl);
                const extractData = await extractRes.json();
                
                if (extractData.query && extractData.query.pages && extractData.query.pages[pageId]) {
                    const extract = extractData.query.pages[pageId].extract;
                    return extract.substring(0, 1500); 
                }
            }
            return "";
        } catch (e) { return ""; }
    }
}

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
                contents:[{ role: "user", parts:[{ text: `תן כותרת קצרה של 2 עד 4 מילים (ללא מרכאות או תווים מיוחדים כלל) לטקסט הבא:\n\n${text.substring(0, 1000)}` }] }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 20 }
            };
            const topic = await this.callGemini(payload);
            return topic.replace(/["'*#\n\r]/g, '').trim();
        } catch(e) { return "שיחה כללית"; }
    }

    static async processChatInteraction(base64Audio, historyContext =[], yemotDateContext = "") {
        try {
            const transcriptionPayload = {
                contents:[{ role: "user", parts:[{ text: "תמלל את האודיו הבא במדויק:" }, { inlineData: { mimeType: "audio/wav", data: base64Audio } }] }],
                generationConfig: { temperature: 0.1, maxOutputTokens: 1000 }
            };
            let transcriptText = "";
            try {
                const tr = await this.callGemini(transcriptionPayload);
                transcriptText = typeof tr === 'string' ? tr : tr.transcription;
            } catch(e) { Logger.warn("GeminiChat", "Pre-transcription failed, using direct multimodal."); }
            
            let internetContext = "";
            if (transcriptText && transcriptText.length > 3) {
                internetContext = await FreeInternetSearch.searchWikipedia(transcriptText);
            }
            
            let systemInstructions = SYSTEM_CONSTANTS.PROMPTS.GEMINI_SYSTEM_INSTRUCTION_CHAT;
            
            if (yemotDateContext) {
                systemInstructions += `\n\n[הקשר זמן אמת חשוב למענה: ${yemotDateContext}]. הסתמך על נתונים אלו אם אתה נשאל על השעה, התאריך או התאריך העברי!`;
            }
            if (internetContext) {
                systemInstructions += `\n\nמידע מעודכן מהאינטרנט (ויקיפדיה) שרלוונטי לשאלה זו:\n${internetContext}\nהסתמך על מידע זה כדי לענות תשובה מדויקת ועדכנית!`;
            }

            const formattedHistory = historyContext.map(msg => ({
                role: "user", 
                parts:[{ text: `${SYSTEM_CONSTANTS.PROMPTS.PREVIOUS_QUESTION_PREFIX} ${msg.q}\n${SYSTEM_CONSTANTS.PROMPTS.PREVIOUS_ANSWER_PREFIX} ${msg.a}` }]
            }));

            const payload = {
                contents:[
                    ...formattedHistory,
                    { role: "user", parts:[{ text: systemInstructions }, { inlineData: { mimeType: SYSTEM_CONSTANTS.MODELS.AUDIO_MIME_TYPE, data: base64Audio } }] }
                ],
                generationConfig: { temperature: 0.7, maxOutputTokens: 8000, responseMimeType: SYSTEM_CONSTANTS.MODELS.JSON_MIME_TYPE }
            };

const rawJson = await this.callGemini(payload);
            let cleanJson = rawJson.trim();
            
            // ניקוי תגיות Markdown של קוד
            cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();

            try {
                const parsed = JSON.parse(cleanJson);
                return {
                    transcription: parsed.transcription || transcriptText || "לא זוהה דיבור",
                    answer: parsed.answer || "לא הצלחתי לגבש תשובה"
                };
            } catch (parseError) {
                Logger.warn("GeminiChat", "JSON Parse failed, attempting manual recovery", parseError);
                
                // ניסיון חילוץ ידני אם ה-JSON פגום (למשל אם יש גרשיים פנימיים שלא עברו Escape)
                const answerMatch = cleanJson.match(/"answer":\s*"([\s\S]*)"/);
                const transMatch = cleanJson.match(/"transcription":\s*"([\s\S]*?)"/);
                
                return {
                    transcription: transMatch ? transMatch[1] : (transcriptText || "לא זוהה דיבור"),
                    answer: answerMatch ? answerMatch[1] : cleanJson // מוציא את כל הטקסט אם החילוץ נכשל
                };
            }
        } catch (e) {
            throw e;
        }
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
// PART 9: YEMOT IVR COMPILER (NATIVE AUDIO FILE SUPPORT)
// ============================================================================

class YemotResponseCompiler {
    constructor() { 
        this.chain =[]; 
        this.readCommand = null;
        this.routeCommand = null;
    }
    
    playChainedTTS(prompt) {
        if (!prompt) return this;
        if (prompt.startsWith('f-')) {
            this.chain.push(prompt); 
        } else {
            const fmt = YemotTextProcessor.formatForChainedTTS(prompt);
            if (fmt) this.chain.push(fmt);
        }
        return this;
    }
    
    requestDigits(prompt, baseVar, min = 1, max = 1) {
        if (prompt) {
            if (prompt.startsWith('f-')) {
                this.chain.push(prompt);
            } else {
                const fmt = YemotTextProcessor.formatForChainedTTS(prompt);
                if (fmt) this.chain.push(fmt);
            }
        }
        // Join all prompts with `.` so Yemot processes them sequentially within the `read` command!
        const promptString = this.chain.join('.');
        const params =['no', max, min, SYSTEM_CONSTANTS.IVR_DEFAULTS.STANDARD_TIMEOUT, 'No', 'yes', 'no'];
        this.readCommand = `read=${promptString}=${baseVar}_${Date.now()},${params.join(',')}`;
        return this;
    }
    
    requestEmailKeyboard(prompt, baseVar) {
        if (prompt) {
            if (prompt.startsWith('f-')) this.chain.push(prompt);
            else {
                const fmt = YemotTextProcessor.formatForChainedTTS(prompt);
                if (fmt) this.chain.push(fmt);
            }
        }
        const promptString = this.chain.join('.');
        const params =['no', 100, 2, SYSTEM_CONSTANTS.IVR_DEFAULTS.EMAIL_TIMEOUT, 'EmailKeyboard', 'yes', 'no'];
        this.readCommand = `read=${promptString}=${baseVar}_${Date.now()},${params.join(',')}`;
        return this;
    }

    requestAudioRecord(prompt, baseVar, callId) {
        if (prompt) {
            if (prompt.startsWith('f-')) {
                this.chain.push(prompt);
            } else {
                const fmt = YemotTextProcessor.formatForChainedTTS(prompt);
                if (fmt) this.chain.push(fmt);
            }
        }
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
// PART 10: DOMAIN LOGIC & PAGINATION CONTROLLERS
// ============================================================================

class DomainControllers {

    static getSortedHistory(items) {
        // Sort by Pinned (true first), then by Date (Newest first)
        return [...items].sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return new Date(b.date) - new Date(a.date);
        });
    }

    static serveMainMenu(ivrCompiler) {
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.MAIN_MENU, SYSTEM_CONSTANTS.STATE_BASES.MAIN_MENU_CHOICE, 1, 1);
    }

    static serveTransMainMenu(ivrCompiler) {
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.TRANS_MAIN_MENU, SYSTEM_CONSTANTS.STATE_BASES.TRANS_MAIN_MENU_CHOICE, 1, 1);
    }

    static async handleMainMenu(phone, callId, choice, ivrCompiler) {
        if (choice === '0') this.serveTransMainMenu(ivrCompiler);
        else if (choice === '1') await this.initNewChat(phone, callId, ivrCompiler);
        else if (choice === '2') await this.initChatHistoryMenu(phone, ivrCompiler);
        else if (choice === '9') await this.serveAdminAuth(ivrCompiler);
        else {
            // Dynamic Routing: If it's another digit (e.g., 4), route them natively to that folder!
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
            const statsText = `${SYSTEM_CONSTANTS.PROMPTS.ADMIN_STATS_PREFIX} נפתחו ${stats.totalSessions} שיחות, ${stats.totalSuccess} תשובות מוצלחות, ${stats.totalErrors} שגיאות. ויש ${stats.uniquePhones.length} משתמשים ייחודיים במערכת.`;
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
        
        // Action Button (1)
        if (choice === '1') {
            if (pag.type === 'chat') ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO, callId);
            else if (pag.type === 'trans_draft') ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.TRANS_MENU, SYSTEM_CONSTANTS.STATE_BASES.TRANS_DRAFT_MENU, 1, 1);
            else ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.TRANS_ACTION_MENU, SYSTEM_CONSTANTS.STATE_BASES.TRANS_ACTION_CHOICE, 1, 1);
            return;
        }

        // Navigation Engine: 9 (Next), 7 (Prev), 5 (Pause/Repeat - handled by Yemot native logic, we just replay chunk)
        if (choice === '9') {
            if (pag.currentIndex < pag.chunks.length - 1) pag.currentIndex++;
        } 
        else if (choice === '7') {
            if (pag.currentIndex > 0) pag.currentIndex--;
        } 
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

        if (choice === '1') { // PLAY
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
        else if (choice === '2') { // RENAME
            ivrCompiler.requestEmailKeyboard(SYSTEM_CONSTANTS.PROMPTS.RENAME_PROMPT, SYSTEM_CONSTANTS.STATE_BASES.HISTORY_RENAME_INPUT);
        }
        else if (choice === '3') { // DELETE
            ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.DELETE_CONFIRM_MENU, SYSTEM_CONSTANTS.STATE_BASES.HISTORY_DELETE_CONFIRM, 1, 1);
        }
        else if (choice === '4') { // PIN
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
        
        if (profile.chats.length > 20) profile.chats.shift(); // 20 CHATS MEMORY
        
        profile.currentChatId = newSession.id;
        await UserRepository.saveProfile(phone, profile);
        ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO, callId);
    }

    static async processChatAudio(phone, callId, audioPath, ivrCompiler, yemotDateContext) {
        try {
            const b64 = await YemotAPIService.downloadAudioAsBase64(audioPath);
            const profile = await UserRepository.getProfile(phone);
            
            let chatSession = profile.chats.find(c => c.id === profile.currentChatId);
            if (!chatSession) {
                chatSession = new ChatSessionDTO(`chat_rec_${Date.now()}`);
                profile.chats.push(chatSession);
                profile.currentChatId = chatSession.id;
            }

            const historyContext = chatSession.messages; 
            const { transcription, answer } = await GeminiAIService.processChatInteraction(b64, historyContext, yemotDateContext);
            
            // ANTI DUPLICATE FIX
            const lastMsg = chatSession.messages[chatSession.messages.length - 1];
            if (!lastMsg || lastMsg.q !== transcription) {
                chatSession.addMessage(transcription, answer);
            } else {
                lastMsg.a = answer; // Overwrite if retry caused duplicate
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
        const sorted = this.getSortedHistory(validChats); // Up to 20
        sorted.forEach((c, i) => { 
            const topic = c.topic ? YemotTextProcessor.sanitizeForReadPrompt(c.topic) : "שיחה כללית";
            promptText += `לשיחה בנושא ${topic}, הקישו ${i + 1}. `; 
        });
        promptText += "לחזרה לתפריט הראשי הקישו 0.";
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
        
        // DO NOT PLAY YET! Go to History Item Menu!
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

            const announcement = `התמלול הוא:\n${profile.tempTranscription}`;
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
            promptText += `לתמלול בנושא ${topic}, הקישו ${i + 1}. `; 
        });
        promptText += "לחזרה לתפריט הקודם הקישו 0.";
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
        
        // DO NOT PLAY YET! Go to History Item Menu!
        this.serveHistoryItemMenu(ivrCompiler);
    }
}

// ============================================================================
// PART 11: STATE MACHINE & REQUEST ROUTER (MAIN HANDLER)
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

        // Check if user is globally blocked
        if (await GlobalStatsManager.checkBlocked(phone)) {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.USER_BLOCKED).routeToFolder("hangup");
            return sendHTTPResponse(res, ivrCompiler.compile());
        }

        // Extract Real-Time Date from Yemot to Ground Gemini
        const yemotDate = getParam(SYSTEM_CONSTANTS.YEMOT_PARAMS.DATE) || '';
        const yemotTime = getParam(SYSTEM_CONSTANTS.YEMOT_PARAMS.TIME) || '';
        const yemotHebrewDate = getParam(SYSTEM_CONSTANTS.YEMOT_PARAMS.HEBREW_DATE) || '';
        const dateContextStr = `היום תאריך לועזי: ${yemotDate}. שעה נוכחית: ${yemotTime}. התאריך העברי היום הוא: ${yemotHebrewDate}.`;

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
                triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.TRANS_APPEND_AUDIO)) {
                Logger.info("Gateway", "Hangup with pending audio. Processing locally before exit.");
                pendingAudio = true;
            } else {
                return sendHTTPResponse(res, "noop=hangup_acknowledged");
            }
        }

        // ==========================================
        // ROUTING DISPATCHER
        // ==========================================

        if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO && triggerValue && triggerValue.includes('.wav')) {
            await DomainControllers.processChatAudio(phone, callId, triggerValue, ivrCompiler, dateContextStr);
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
