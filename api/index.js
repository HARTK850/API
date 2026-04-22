/**
 * @file api/index.js
 * @description Ultimate Enterprise IVR System for Yemot HaMashiach & Google Gemini AI.
 * @version 19.0.0 (The Monolith - Unified, Clean, Phonetics, Pagination & Blob Rest API)
 * @author Custom AI Assistant
 * 
 * CORE FEATURES IMPLEMENTED:
 * 1. Single Extension Routing (type=api).
 * 2. Smart Punctuation & Niqqud: AI instructed to use punctuation. Dual text sanitization 
 *    keeps punctuation for TTS (breathing pauses via `.t-`) but strips it for READ prompts.
 * 3. Hebrew Phonetic Engine: Automatically expands acronyms (e.g., צה"ל -> צבא הגנה לישראל).
 * 4. Advanced Pagination: Long texts are chunked intelligently. User presses '9' to continue.
 * 5. Pure REST Blob Fail-Safe: Direct API calls to Vercel Blob with `x-access: private` to bypass SDK bugs.
 * 6. Hardcoded to `gemini-3.1-flash-lite-preview`.
 * 7. Unified Enterprise OOP structure without duplications.
 */

export const maxDuration = 60; // Critical: Prevents Vercel Serverless from timing out

// ============================================================================
// ============================================================================
// PART 1: SYSTEM CONSTANTS, ENUMS & CONFIGURATION DEFAULTS
// ============================================================================
// ============================================================================

const SYSTEM_CONSTANTS = {
    MODELS: {
        PRIMARY_GEMINI_MODEL: "gemini-3.1-flash-lite-preview",
        JSON_MIME_TYPE: "application/json",
        AUDIO_MIME_TYPE: "audio/wav"
    },
    YEMOT_PATHS: {
        RECORDINGS_DIR: "/ApiRecords",
        SHARED_TRANSCRIPTIONS_DIR: "/SharedTranscriptions",
        USERS_DB_DIR: "users/"
    },
    HTTP_STATUS: {
        OK: 200,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        INTERNAL_SERVER_ERROR: 500,
        BAD_GATEWAY: 502,
        SERVICE_UNAVAILABLE: 503,
        GATEWAY_TIMEOUT: 504
    },
    IVR_DEFAULTS: {
        STANDARD_TIMEOUT: "7",
        EMAIL_TIMEOUT: "40",
        RECORD_MIN_SEC: "1",
        RECORD_MAX_SEC: "120",
        MAX_CHUNK_LENGTH: 350 // Safe length for Yemot buffer
    },
    RETRY_POLICY: {
        MAX_RETRIES: 3,
        INITIAL_BACKOFF_MS: 1000,
        BACKOFF_MULTIPLIER: 2,
        BLOB_MAX_RETRIES: 2,
        GEMINI_MAX_RETRIES: 3,
        YEMOT_MAX_RETRIES: 2
    },
    PROMPTS: {
        MAIN_MENU: "ברוכים הבאים למערכת הבינה המלאכותית. לתמלול מתקדם הקישו 0. לשיחת צ'אט הקישו 1. להיסטוריית צ'אט הקישו 2. להיסטוריית תמלולים הקישו 3.",
        NEW_CHAT_RECORD: "אנא הקליטו את שאלתכם לאחר הצליל. בסיום הקישו סולמית.",
        NEW_TRANSCRIPTION_RECORD: "אנא הקליטו את הטקסט לתמלול לאחר הצליל. בסיום הקישו סולמית.",
        APPEND_TRANSCRIPTION_RECORD: "אנא הקליטו את המשך הטקסט לאחר הצליל. בסיום הקישו סולמית.",
        NO_HISTORY: "אין לכם היסטוריית שיחות במערכת. הנכם מועברים לשיחה חדשה.",
        NO_TRANS_HISTORY: "אין לכם היסטוריית תמלולים במערכת. הנכם מועברים לתפריט הראשי.",
        HISTORY_MENU_PREFIX: "תפריט היסטוריית שיחות. ",
        TRANS_HISTORY_PREFIX: "תפריט היסטוריית תמלולים. ",
        MENU_SUFFIX_0: "לחזרה לתפריט הראשי הקישו 0.",
        MENU_SUFFIX_8: "לחזרה לתפריט הראשי הקישו 8.",
        INVALID_CHOICE: "הבחירה שגויה. הנכם מועברים לתפריט הראשי.",
        CHAT_ACTION_MENU: "להמשך השיחה הנוכחית הקישו 7. לחזרה לתפריט הראשי הקישו 8.",
        CHAT_PAGINATION_MENU: "לשמיעת המשך התשובה הקישו 9. להמשך השיחה הקישו 7. לחזרה לתפריט הראשי הקישו 8.",
        TRANS_MENU: "לשמיעה חוזרת הקישו 1. להקלטה מחדש הקישו 2. להקלטת המשך הקישו 3. לשמירת התמלול הקישו 4.",
        TRANS_ACTION_MENU: "לשיתוף התמלול למערכות אחרות הקישו 7. לשליחת התמלול לאימייל הקישו 9. לחזרה לתפריט הראשי הקישו 8.",
        TRANS_PAGINATION_MENU: "לשמיעת המשך התמלול הקישו 9. לחזרה לתפריט הראשי הקישו 8.",
        EMAIL_PROMPT: "אנא הקלידו את כתובת האימייל שלכם באמצעות המקלדת. בסיום הקישו סולמית.",
        EMAIL_SUCCESS: "האימייל נשלח בהצלחה. שלום ותודה.",
        SHARE_SUCCESS: "קובץ התמלול נוצר בהצלחה. הנכם מועברים לתיקיית השיתוף.",
        SHARE_FAILED: "אירעה שגיאה ביצירת קובץ השיתוף. הנכם מועברים לתפריט הראשי.",
        TRANS_SAVED_SUCCESS: "התמלול נשמר בהצלחה. הנכם מועברים לתפריט הראשי.",
        SYSTEM_ERROR_FALLBACK: "אירעה שגיאה. אך ננסה להמשיך. אנא נסו שוב.",
        PREVIOUS_QUESTION_PREFIX: "שאלה קודמת:",
        PREVIOUS_ANSWER_PREFIX: "תשובה קודמת:",
        GEMINI_SYSTEM_INSTRUCTION_CHAT: `
        אתה עוזר קולי וירטואלי חכם בשפה העברית.
        האזן לאודיו המצורף, תמלל אותו במדויק, וענה תשובה מלאה, מקיפה, מפורטת וארוכה ככל הנדרש.
        כדי שרובוט ההקראה הקולי (TTS) יישמע טבעי, עליך למלא אחר ההוראות הבאות:
        1. השתמש בסימני פיסוק (פסיקים ונקודות) במקומות הנכונים כדי לייצר הפסקות נשימה.
        2. השתמש בניקוד חלקי במילים שעלולות להיות מבוטאות לא נכון.
        3. לא להשתמש כלל בכוכביות (*), קווים מפרידים (-), סולמיות (#) או אמוג'י.
        חובה עליך להחזיר אובייקט JSON תקני בלבד עם שני שדות: transcription ו-answer.
        ענה בהרחבה, ביסודיות ובמקצועיות.
        `,
        GEMINI_SYSTEM_INSTRUCTION_TRANSCRIPTION: "תמלל את הנאמר בקובץ האודיו המצורף בעברית במדויק מילה במילה. החזר אך ורק את הטקסט המתומלל ללא פרשנות וללא הקדמות. השתמש בסימני פיסוק כדי לשמור על קריאה טבעית, אך אל תשתמש בתווים מיוחדים אחרים."
    },
    STATE_BASES: {
        MENU_CHOICE: 'State_MainMenuChoice',
        CHAT_USER_AUDIO: 'State_ChatUserAudio',
        CHAT_HISTORY_CHOICE: 'State_ChatHistoryChoice',
        CHAT_ACTION_CHOICE: 'State_ChatActionChoice',
        CHAT_PAGINATION: 'State_ChatPagination',
        TRANS_USER_AUDIO: 'State_TransUserAudio',
        TRANS_APPEND_AUDIO: 'State_TransAppendAudio',
        TRANS_DRAFT_MENU: 'State_TransDraftMenu',
        TRANS_HISTORY_CHOICE: 'State_TransHistoryChoice',
        TRANS_ACTION_CHOICE: 'State_TransActionChoice',
        TRANS_PAGINATION: 'State_TransPagination',
        USER_EMAIL_INPUT: 'State_UserEmailInput'
    },
    YEMOT_PARAMS: {
        PHONE: 'ApiPhone',
        ENTER_ID: 'ApiEnterID',
        CALL_ID: 'ApiCallId',
        HANGUP: 'hangup'
    },
    VERCEL_BLOB: {
        REST_API_BASE_URL: "https://blob.vercel-storage.com"
    }
};

// ============================================================================
// ============================================================================
// PART 2: ADVANCED ERROR HANDLING & EXCEPTIONS
// ============================================================================
// ============================================================================

class AppError extends Error {
    constructor(message, statusCode = SYSTEM_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR, errorCode = "APP_ERR_000", originalError = null) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.originalError = originalError;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
class YemotAPIError extends AppError { constructor(msg, orig) { super(`Yemot API Error: ${msg}`, 400, "YEMOT_001", orig); } }
class GeminiAPIError extends AppError { constructor(msg, orig) { super(`Gemini API Error: ${msg}`, 502, "GEMINI_001", orig); } }
class StorageAPIError extends AppError { constructor(msg, orig) { super(`Storage API Error: ${msg}`, 500, "STORAGE_001", orig); } }

// ============================================================================
// ============================================================================
// PART 3: ENTERPRISE TELEMETRY & LOGGER SYSTEM
// ============================================================================
// ============================================================================

class Logger {
    static getTimestamp() { return new Date().toISOString(); }
    static info(context, message) { console.log(`[INFO][${this.getTimestamp()}] [${context}] ${message}`); }
    static warn(context, message) { console.warn(`[WARN][${this.getTimestamp()}] [${context}] ${message}`); }
    static error(context, message, errorObj = null) {
        console.error(`[ERROR][${this.getTimestamp()}] [${context}] ${message}`);
        if (errorObj) console.error(`[TRACE] ${errorObj.stack || errorObj.message || errorObj}`);
    }
    static debug(context, message) { console.debug(`[DEBUG][${this.getTimestamp()}] [${context}] ${message}`); }
}

// ============================================================================
// ============================================================================
// PART 4: ENVIRONMENT CONFIGURATION MANAGER
// ============================================================================
// ============================================================================

class ConfigManager {
    constructor() {
        if (ConfigManager.instance) return ConfigManager.instance;
        this.geminiKeys =[];
        this.yemotToken = '';
        this.blobToken = '';
        this.currentGeminiKeyIndex = 0;
        this.initializeConfiguration();
        ConfigManager.instance = this;
    }
    
    initializeConfiguration() {
        try {
            this.geminiKeys = this.parseApiKeys(process.env.GEMINI_KEYS);
            this.yemotToken = process.env.CALL2ALL_TOKEN || '';
            this.blobToken = process.env.BLOB_READ_WRITE_TOKEN || '';
        } catch (error) {
            Logger.error("ConfigManager", "Failed to initialize environment configuration.", error);
        }
    }
    
    parseApiKeys(keysString) {
        if (!keysString) return[];
        return keysString.split(',').map(key => key.trim()).filter(key => key.length > 20);
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
// ============================================================================
// PART 5: HEBREW PHONETICS, SANITIZATION & PACING ENGINE
// ============================================================================
// ============================================================================

const HEBREW_PHONETIC_MAP = {
    "צה\"ל": "צבא הגנה לישראל",
    "שב\"כ": "שירות הביטחון הכללי",
    "מוסד": "המוסד למודיעין ולתפקידים מיוחדים",
    "מנכ\"ל": "מנהל כללי",
    "יו\"ר": "יושב ראש",
    "ח\"כ": "חבר כנסת",
    "בג\"ץ": "בית משפט גבוה לצדק",
    "עו\"ד": "דוקטור עורך דין",
    "ד\"ר": "דוקטור",
    "פרופ'": "פרופסור",
    "חז\"ל": "חכמינו זכרונם לברכה",
    "שליט\"א": "שיחיה לאורך ימים טובים אמן",
    "זצ\"ל": "זכר צדיק לברכה",
    "ע\"ה": "עליו השלום",
    "בע\"ה": "בעזרת השם",
    "ב\"ה": "ברוך השם",
    "רבש\"ע": "ריבונו של עולם",
    "הקב\"ה": "הקדוש ברוך הוא",
    "תנ\"ך": "תורה נביאים כתובים",
    "חוהמ\"ע": "חול המועד",
    "יו\"ט": "יום טוב",
    "מוצ\"ש": "מוצאי שבת",
    "רמב\"ם": "רבי משה בן מימון",
    "רש\"י": "רבי שלמה יצחקי",
    "ארה\"ב": "ארצות הברית",
    "חו\"ל": "חוץ לארץ",
    "דו\"ח": "דין וחשבון",
    "ת\"א": "תל אביב",
    "י-ם": "ירושלים",
    "כיוצ\"ב": "כיוצא בזה",
    "וכד'": "וכדומה",
    "וכו'": "וכולי",
    "עמ'": "עמוד"
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

    /**
     * FOR READ PROMPTS: Aggressive stripping.
     * The `read` command breaks if the prompt text contains commas or dots.
     */
    static sanitizeForReadPrompt(rawText) {
        if (!rawText || typeof rawText !== 'string') return "שגיאת טקסט";
        let cleanText = this.applyPhonetics(rawText);
        cleanText = cleanText.replace(/[.,\-=\&^#!?:;()[\]{}]/g, ' '); 
        cleanText = cleanText.replace(/[\u{1F600}-\u{1F6FF}]/gu, ''); 
        cleanText = cleanText.replace(/[\n\r]/g, ' ');
        return cleanText.replace(/\s{2,}/g, ' ').trim() || "התקבל טקסט ריק";
    }

    /**
     * FOR TTS PLAYBACK: Keeps punctuation, splits into sentences, and joins with `.t-`
     * This creates natural breathing pauses for the TTS robot.
     */
    static formatForChainedTTS(text) {
        if (!text) return "t-טקסט ריק";
        let cleanText = this.applyPhonetics(text);
        
        // Strip critical break characters but LEAVE dots, commas, and newlines
        cleanText = cleanText.replace(/[*#=\&^\[\]{}]/g, ' ');
        cleanText = cleanText.replace(/[\u{1F600}-\u{1F6FF}]/gu, '');
        
        // Split by typical sentence boundaries (newlines, periods)
        const parts = cleanText.split(/[\n\r.]+/);
        const validParts = parts.map(p => p.trim()).filter(p => p.length > 0);
        
        if (validParts.length === 0) return "t-טקסט ריק";
        return "t-" + validParts.join('.t-');
    }

    /**
     * Chunks extremely long text into pages to prevent Yemot memory crash.
     */
    static paginateText(text, maxLength = SYSTEM_CONSTANTS.IVR_DEFAULTS.MAX_CHUNK_LENGTH) {
        if (!text) return ["טקסט ריק"];
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
// ============================================================================
// PART 6: NETWORK RESILIENCE & RETRY HELPER
// ============================================================================
// ============================================================================

class RetryHelper {
    static sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
    
    static async withRetry(asyncTask, taskName = "Task", maxRetries = SYSTEM_CONSTANTS.RETRY_POLICY.MAX_RETRIES, initialDelay = SYSTEM_CONSTANTS.RETRY_POLICY.INITIAL_BACKOFF_MS) {
        let lastError;
        let currentDelay = initialDelay;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                Logger.debug("RetryHelper", `Executing [${taskName}] Attempt ${attempt}/${maxRetries}`);
                return await asyncTask();
            } catch (error) {
                lastError = error;
                Logger.warn("RetryHelper", `[${taskName}] failed: ${error.message}`);
                if (attempt < maxRetries) {
                    await this.sleep(currentDelay);
                    currentDelay *= SYSTEM_CONSTANTS.RETRY_POLICY.BACKOFF_MULTIPLIER;
                }
            }
        }
        throw lastError;
    }
}

// ============================================================================
// ============================================================================
// PART 7: L1 MEMORY CACHE & L2 VERCEL BLOB STORAGE (PURE REST API)
// ============================================================================
// ============================================================================

const UserMemoryCache = new Map();

class UserRepository {
    static _getUserFilePath(phone) { return `${SYSTEM_CONSTANTS.YEMOT_PATHS.USERS_DB_DIR}${phone}.json`; }

    static async getProfile(phone) {
        if (!phone || phone === 'unknown') return this.generateDefaultProfile();
        
        // 1. L1 CACHE: Check RAM first
        if (UserMemoryCache.has(phone)) {
            Logger.debug("UserRepository", `L1 Cache Hit for ${phone}`);
            return UserProfileDTO.validate(UserMemoryCache.get(phone));
        }

        // 2. L2 CACHE: Check Vercel Blob via REST
        const filePath = this._getUserFilePath(phone);
        const fetchOperation = async () => {
            const listUrl = `${SYSTEM_CONSTANTS.VERCEL_BLOB.REST_API_BASE_URL}?prefix=${encodeURIComponent(filePath)}`;
            const listRes = await fetch(listUrl, { headers: { 'Authorization': `Bearer ${AppConfig.blobToken}` } });
            if (!listRes.ok) throw new Error("Blob List failed");
            
            const listData = await listRes.json();
            if (!listData.blobs || listData.blobs.length === 0) return this.generateDefaultProfile();

            const contentRes = await fetch(listData.blobs[0].url, { headers: { 'Authorization': `Bearer ${AppConfig.blobToken}` } });
            if (!contentRes.ok) throw new Error("Blob Fetch failed");
            
            const profile = UserProfileDTO.validate(await contentRes.json());
            UserMemoryCache.set(phone, profile); // Warm up L1
            return profile;
        };

        try {
            return await RetryHelper.withRetry(fetchOperation, "FetchUserBlob", SYSTEM_CONSTANTS.RETRY_POLICY.BLOB_MAX_RETRIES, 500);
        } catch (error) {
            Logger.warn("UserRepository", `L2 Blob Fetch failed. Using fresh profile. Error: ${error.message}`);
            const newProfile = this.generateDefaultProfile();
            UserMemoryCache.set(phone, newProfile);
            return newProfile;
        }
    }

    static async saveProfile(phone, profileData) {
        if (!phone || phone === 'unknown') return;
        
        // 1. L1 CACHE: Save to RAM instantly
        UserMemoryCache.set(phone, profileData);
        
        // 2. L2 CACHE: Save to Vercel Blob via REST API, forcing private access
        const filePath = this._getUserFilePath(phone);
        const saveOperation = async () => {
            const url = `${SYSTEM_CONSTANTS.VERCEL_BLOB.REST_API_BASE_URL}/${filePath}`;
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'authorization': `Bearer ${AppConfig.blobToken}`,
                    'x-api-version': '7',
                    'x-add-random-suffix': 'false',
                    'x-access': 'private', // CRITICAL FIX FOR PRIVATE STORES
                    'content-type': 'application/json'
                },
                body: JSON.stringify(profileData)
            });
            if (!response.ok) throw new Error(`Blob Put failed: ${await response.text()}`);
        };

        try {
            await RetryHelper.withRetry(saveOperation, "SaveUserBlob", 2, 500);
            Logger.info("UserRepository", `Profile persisted to L2 Blob for ${phone}.`);
        } catch (error) {
            Logger.error("UserRepository", `L2 Blob save failed. System will rely on L1 Memory Cache. Error: ${error.message}`);
        }
    }

    static generateDefaultProfile() {
        return UserProfileDTO.generateDefault();
    }
}

// ============================================================================
// ============================================================================
// PART 8: DATA TRANSFER OBJECTS (DTOs)
// ============================================================================
// ============================================================================

class ChatMessageDTO {
    constructor(question, answer) {
        this.q = question || "";
        this.a = answer || "";
        this.timestamp = new Date().toISOString();
    }
}

class ChatSessionDTO {
    constructor(id = null) {
        this.id = id || `chat_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        this.date = new Date().toISOString();
        this.messages =[];
    }
    addMessage(question, answer) { this.messages.push(new ChatMessageDTO(question, answer)); }
    getRecentContext(count = 5) { return this.messages.slice(-count); }
}

class TranscriptionEntryDTO {
    constructor(text) {
        this.id = `trans_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        this.date = new Date().toISOString();
        this.text = text || "";
    }
}

class UserProfileDTO {
    static generateDefault() {
        return {
            chats: [], transcriptions:[], currentChatId: null,
            tempTranscription: "", currentTransIndex: null,
            pagination: { chunks:[], currentIndex: 0, type: null },
            lastActive: new Date().toISOString()
        };
    }
    static validate(data) {
        if (!data || typeof data !== 'object') return this.generateDefault();
        if (!Array.isArray(data.chats)) data.chats =[];
        if (!Array.isArray(data.transcriptions)) data.transcriptions =[];
        if (!data.pagination || !Array.isArray(data.pagination.chunks)) {
            data.pagination = { chunks:[], currentIndex: 0, type: null };
        }
        data.lastActive = new Date().toISOString();
        return data;
    }
}

// ============================================================================
// ============================================================================
// PART 9: EXTERNAL API SERVICES
// ============================================================================
// ============================================================================

class YemotAPIService {
    static async downloadAudioAsBase64(rawFilePath) {
        const downloadTask = async () => {
            const fullPath = rawFilePath.startsWith('ivr2:') ? rawFilePath : `ivr2:${rawFilePath}`;
            const url = `https://www.call2all.co.il/ym/api/DownloadFile?token=${AppConfig.yemotToken}&path=${encodeURIComponent(fullPath)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const buffer = Buffer.from(await response.arrayBuffer());
            if (buffer.length < 500) throw new Error("File too small (likely text error).");
            return buffer.toString('base64');
        };
        return await RetryHelper.withRetry(downloadTask, "YemotAudioDownload", SYSTEM_CONSTANTS.RETRY_POLICY.YEMOT_MAX_RETRIES, 1000);
    }

    static async uploadTranscriptionForSharing(text, phone) {
        const uploadTask = async () => {
            const fileName = `Shared_Trans_${phone}_${Date.now()}.tts`;
            const fullPath = `ivr2:${SYSTEM_CONSTANTS.YEMOT_PATHS.SHARED_TRANSCRIPTIONS_DIR}/${fileName}`;
            const url = `https://www.call2all.co.il/ym/api/UploadTextFile?token=${AppConfig.yemotToken}&what=${encodeURIComponent(fullPath)}&contents=${encodeURIComponent(text)}`;
            const response = await fetch(url);
            const result = await response.json();
            if (result.responseStatus !== "OK") throw new Error("Yemot upload rejected");
            return SYSTEM_CONSTANTS.YEMOT_PATHS.SHARED_TRANSCRIPTIONS_DIR;
        };
        try {
            return await RetryHelper.withRetry(uploadTask, "UploadSharedTTS", 2, 1000);
        } catch (e) {
            Logger.error("YemotAPI", "Failed to upload shared file.", e);
            return null;
        }
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
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    return data.candidates[0].content.parts[0].text;
                }
                throw new Error("Empty AI response.");
            } catch (error) {
                lastError = error;
                Logger.warn("GeminiAPI", `Key rotated.`);
            }
        }
        throw new GeminiAPIError("All API keys failed.", lastError);
    }

    static async processChatInteraction(base64Audio, historyContext =[]) {
        const formattedHistory = historyContext.map(msg => ({
            role: "user", 
            parts:[{ text: `${SYSTEM_CONSTANTS.PROMPTS.PREVIOUS_QUESTION_PREFIX} ${msg.q}\n${SYSTEM_CONSTANTS.PROMPTS.PREVIOUS_ANSWER_PREFIX} ${msg.a}` }]
        }));

        const payload = {
            contents:[
                ...formattedHistory,
                { role: "user", parts:[{ text: SYSTEM_CONSTANTS.PROMPTS.GEMINI_SYSTEM_INSTRUCTION_CHAT }, { inlineData: { mimeType: SYSTEM_CONSTANTS.MODELS.AUDIO_MIME_TYPE, data: base64Audio } }] }
            ],
            // 4000 tokens for massive, detailed responses
            generationConfig: { temperature: 0.7, maxOutputTokens: 4000, responseMimeType: SYSTEM_CONSTANTS.MODELS.JSON_MIME_TYPE }
        };

        const rawJson = await this.callGemini(payload);
        try {
            let cleanJson = rawJson.trim();
            if (cleanJson.startsWith("```json")) cleanJson = cleanJson.substring(7, cleanJson.length - 3).trim();
            else if (cleanJson.startsWith("```")) cleanJson = cleanJson.substring(3, cleanJson.length - 3).trim();
            const parsed = JSON.parse(cleanJson);
            return {
                transcription: parsed.transcription || "לא זוהה דיבור",
                answer: parsed.answer || "לא הצלחתי לגבש תשובה"
            };
        } catch (e) {
            return { transcription: "שגיאת תמלול בשרת", answer: rawJson };
        }
    }

    static async processTranscriptionOnly(base64Audio) {
        const payload = {
            contents: [{ role: "user", parts:[{ text: SYSTEM_CONSTANTS.PROMPTS.GEMINI_SYSTEM_INSTRUCTION_TRANSCRIPTION }, { inlineData: { mimeType: SYSTEM_CONSTANTS.MODELS.AUDIO_MIME_TYPE, data: base64Audio } }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 4000 }
        };
        return await this.callGemini(payload);
    }
}

// ============================================================================
// ============================================================================
// PART 10: YEMOT IVR COMPILER
// ============================================================================
// ============================================================================

class YemotResponseCompiler {
    constructor() { this.commandChain =[]; }

    playChainedTTS(text) {
        if (!text) return this;
        // Uses the smart formatter that converts sentences to chained `.t-` commands
        const chainedText = YemotTextProcessor.formatForChainedTTS(text);
        this.commandChain.push(`id_list_message=${chainedText}`);
        return this;
    }

    requestDigits(ttsPrompt, baseVariableName, minDigits = 1, maxDigits = 1) {
        const safePrompt = YemotTextProcessor.sanitizeForReadPrompt(ttsPrompt);
        const timestampedVarName = `${baseVariableName}_${Date.now()}`;
        const params =['no', maxDigits, minDigits, SYSTEM_CONSTANTS.IVR_DEFAULTS.STANDARD_TIMEOUT, 'No', 'yes', 'no'];
        this.commandChain.push(`read=t-${safePrompt}=${timestampedVarName},${params.join(',')}`);
        return this;
    }

    requestEmailKeyboard(ttsPrompt, baseVariableName) {
        const safePrompt = YemotTextProcessor.sanitizeForReadPrompt(ttsPrompt);
        const timestampedVarName = `${baseVariableName}_${Date.now()}`;
        const params =['no', 100, 5, SYSTEM_CONSTANTS.IVR_DEFAULTS.EMAIL_TIMEOUT, 'EmailKeyboard', 'yes', 'no'];
        this.commandChain.push(`read=t-${safePrompt}=${timestampedVarName},${params.join(',')}`);
        return this;
    }

    requestAudioRecord(ttsPrompt, baseVariableName, uniqueCallId) {
        const safePrompt = YemotTextProcessor.sanitizeForReadPrompt(ttsPrompt);
        const fileName = `rec_${uniqueCallId}_${Date.now()}`;
        const timestampedVarName = `${baseVariableName}_${Date.now()}`;
        const params =['no', 'record', SYSTEM_CONSTANTS.YEMOT_PATHS.RECORDINGS_DIR, fileName, 'no', 'yes', 'no', 1, 120];
        this.commandChain.push(`read=t-${safePrompt}=${timestampedVarName},${params.join(',')}`);
        return this;
    }

    routeToFolder(folder) {
        this.commandChain.push(`go_to_folder=${folder}`);
        return this;
    }

    compile() {
        if (this.commandChain.length === 0) this.routeToFolder("hangup");
        return this.commandChain.filter(cmd => cmd.trim() !== '').join('&');
    }
}

// ============================================================================
// ============================================================================
// PART 11: DOMAIN LOGIC & PAGINATION CONTROLLERS
// ============================================================================
// ============================================================================

class DomainControllers {

    static serveMainMenu(ivrCompiler) {
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.MAIN_MENU, SYSTEM_CONSTANTS.STATE_BASES.MENU_CHOICE, 1, 1);
    }

    static async initiatePaginatedPlayback(phone, fullText, contextType, ivrCompiler) {
        const chunks = YemotTextProcessor.paginateText(fullText);
        
        if (chunks.length <= 1) {
            ivrCompiler.playChainedTTS(chunks[0]);
            if (contextType === 'chat') {
                ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.CHAT_ACTION_MENU, SYSTEM_CONSTANTS.STATE_BASES.CHAT_ACTION_CHOICE, 1, 1);
            } else {
                ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.TRANS_ACTION_MENU, SYSTEM_CONSTANTS.STATE_BASES.TRANS_ACTION_CHOICE, 1, 1);
            }
            return;
        }

        const userProfile = await UserRepository.getProfile(phone);
        userProfile.pagination = { type: contextType, currentIndex: 0, chunks: chunks };
        await UserRepository.saveProfile(phone, userProfile);

        ivrCompiler.playChainedTTS(chunks[0]);
        const prompt = contextType === 'chat' ? SYSTEM_CONSTANTS.PROMPTS.CHAT_PAGINATION_MENU : SYSTEM_CONSTANTS.PROMPTS.TRANS_PAGINATION_MENU;
        const stateKey = contextType === 'chat' ? SYSTEM_CONSTANTS.STATE_BASES.CHAT_PAGINATION : SYSTEM_CONSTANTS.STATE_BASES.TRANS_PAGINATION;
        ivrCompiler.requestDigits(prompt, stateKey, 1, 1);
    }

    static async handlePaginationNavigation(phone, choice, ivrCompiler, expectedContext) {
        const userProfile = await UserRepository.getProfile(phone);
        const pag = userProfile.pagination;

        if (!pag || !pag.chunks || pag.chunks.length === 0 || pag.type !== expectedContext) {
            this.serveMainMenu(ivrCompiler);
            return;
        }

        if (choice === '9' && pag.currentIndex < pag.chunks.length - 1) {
            pag.currentIndex++;
            await UserRepository.saveProfile(phone, userProfile);
            
            const isLast = pag.currentIndex === pag.chunks.length - 1;
            ivrCompiler.playChainedTTS(pag.chunks[pag.currentIndex]);
            
            if (isLast) {
                if (expectedContext === 'chat') ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.CHAT_ACTION_MENU, SYSTEM_CONSTANTS.STATE_BASES.CHAT_ACTION_CHOICE, 1, 1);
                else ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.TRANS_ACTION_MENU, SYSTEM_CONSTANTS.STATE_BASES.TRANS_ACTION_CHOICE, 1, 1);
            } else {
                const prompt = expectedContext === 'chat' ? SYSTEM_CONSTANTS.PROMPTS.CHAT_PAGINATION_MENU : SYSTEM_CONSTANTS.PROMPTS.TRANS_PAGINATION_MENU;
                const stateKey = expectedContext === 'chat' ? SYSTEM_CONSTANTS.STATE_BASES.CHAT_PAGINATION : SYSTEM_CONSTANTS.STATE_BASES.TRANS_PAGINATION;
                ivrCompiler.requestDigits(prompt, stateKey, 1, 1);
            }
        } 
        else if (expectedContext === 'chat' && choice === '7') {
            ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO, `rec_${Date.now()}`);
        } else {
            this.serveMainMenu(ivrCompiler);
        }
    }

    // ---- CHAT DOMAIN ----
    static async initNewChat(phone, callId, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        const newSession = new ChatSessionDTO(`chat_${Date.now()}`);
        profile.chats.push(newSession);
        profile.currentChatId = newSession.id;
        await UserRepository.saveProfile(phone, profile);
        ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO, callId);
    }

    static async processChatAudio(phone, callId, audioPath, ivrCompiler) {
        const b64 = await YemotAPIService.downloadAudioAsBase64(audioPath);
        const profile = await UserRepository.getProfile(phone);
        
        let chatSession = profile.chats.find(c => c.id === profile.currentChatId);
        if (!chatSession) {
            chatSession = new ChatSessionDTO(`chat_rec_${Date.now()}`);
            profile.chats.push(chatSession);
            profile.currentChatId = chatSession.id;
        }

        const historyContext = chatSession.messages.slice(-5);
        const { transcription, answer } = await GeminiAIService.processChatInteraction(b64, historyContext);
        
        chatSession.messages.push(new ChatMessageDTO(transcription, answer));
        await UserRepository.saveProfile(phone, profile);

        await this.initiatePaginatedPlayback(phone, answer, 'chat', ivrCompiler);
    }

    static async initChatHistoryMenu(phone, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        if (profile.chats.length === 0) {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.NO_HISTORY);
            this.serveMainMenu(ivrCompiler);
            return;
        }
        let promptText = SYSTEM_CONSTANTS.PROMPTS.HISTORY_MENU_PREFIX;
        const recents = profile.chats.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS).reverse();
        recents.forEach((c, i) => { promptText += `לשיחה ${i + 1} הקישו ${i + 1} `; });
        promptText += SYSTEM_CONSTANTS.PROMPTS.MENU_SUFFIX_0;
        ivrCompiler.requestDigits(promptText, SYSTEM_CONSTANTS.STATE_BASES.CHAT_HISTORY_CHOICE, 1, 1);
    }

    static async handleChatHistoryPlayback(phone, choice, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        const recents = profile.chats.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS).reverse();
        const idx = parseInt(choice, 10) - 1;

        if (isNaN(idx) || idx < 0 || idx >= recents.length) {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.INVALID_CHOICE);
            this.serveMainMenu(ivrCompiler);
            return;
        }

        const selectedSession = recents[idx];
        profile.currentChatId = selectedSession.id;
        await UserRepository.saveProfile(phone, profile);

        let playbackScript = "היסטוריית שיחה מתחילה\n";
        selectedSession.messages.forEach((msg, i) => {
            playbackScript += `שאלה ${i + 1}\n${msg.q}\nתשובה ${i + 1}\n${msg.a}\n`;
        });

        await this.initiatePaginatedPlayback(phone, playbackScript, 'chat', ivrCompiler);
    }

    // ---- TRANSCRIPTION DOMAIN ----
    static async initNewTranscription(phone, callId, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        profile.tempTranscription = "";
        await UserRepository.saveProfile(phone, profile);
        ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_TRANSCRIPTION_INITIAL, SYSTEM_CONSTANTS.STATE_BASES.TRANS_AUDIO, callId);
    }

    static async processTransAudio(phone, audioPath, ivrCompiler, isAppend) {
        const b64 = await YemotAPIService.downloadAudioAsBase64(audioPath);
        const text = await GeminiAIService.processTranscriptionOnly(b64);
        
        const profile = await UserRepository.getProfile(phone);
        profile.tempTranscription = isAppend ? `${profile.tempTranscription}\n${text}` : text;
        await UserRepository.saveProfile(phone, profile);

        await this.initiatePaginatedPlayback(phone, `התמלול הוא\n${profile.tempTranscription}`, 'trans', ivrCompiler);
    }

    static async handleTransDraftMenu(phone, callId, choice, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        switch(choice) {
            case '1':
                await this.initiatePaginatedPlayback(phone, profile.tempTranscription || "טקסט ריק", 'trans', ivrCompiler);
                break;
            case '2':
                ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_TRANSCRIPTION_INITIAL, SYSTEM_CONSTANTS.STATE_BASES.TRANS_AUDIO, callId);
                break;
            case '3':
                ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.APPEND_TRANSCRIPTION_RECORD, SYSTEM_CONSTANTS.STATE_BASES.TRANS_APPEND_AUDIO, callId);
                break;
            case '4':
                if (profile.tempTranscription) {
                    profile.transcriptions.push(new TranscriptionEntryDTO(profile.tempTranscription));
                    profile.tempTranscription = ""; 
                    await UserRepository.saveProfile(phone, profile);
                    ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.TRANS_SAVED_SUCCESS);
                }
                this.serveMainMenu(ivrCompiler);
                break;
            default:
                this.serveMainMenu(ivrCompiler);
        }
    }

    static async initTransHistoryMenu(phone, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        if (profile.transcriptions.length === 0) {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.NO_TRANS_HISTORY);
            this.serveMainMenu(ivrCompiler);
            return;
        }
        let promptText = SYSTEM_CONSTANTS.PROMPTS.TRANS_HISTORY_PREFIX;
        const recents = profile.transcriptions.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS).reverse();
        recents.forEach((t, i) => { promptText += `לתמלול ${i + 1} הקישו ${i + 1} `; });
        promptText += SYSTEM_CONSTANTS.PROMPTS.MENU_SUFFIX_0;
        ivrCompiler.requestDigits(promptText, SYSTEM_CONSTANTS.STATE_BASES.TRANS_HISTORY_CHOICE, 1, 1);
    }

    static async handleTransHistoryPlayback(phone, choice, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        const recents = profile.transcriptions.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS).reverse();
        const idx = parseInt(choice, 10) - 1;

        if (isNaN(idx) || idx < 0 || idx >= recents.length) {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.INVALID_CHOICE);
            this.serveMainMenu(ivrCompiler);
            return;
        }

        profile.currentTransIndex = idx;
        await UserRepository.saveProfile(phone, profile);
        await this.initiatePaginatedPlayback(phone, `תוכן התמלול הוא\n${recents[idx].text}`, 'trans', ivrCompiler);
    }

    static async handleTransHistoryActions(phone, choice, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        const recents = profile.transcriptions.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS).reverse();
        const idx = profile.currentTransIndex;

        if (choice === '8' || idx === null || idx === undefined || !recents[idx]) {
            this.serveMainMenu(ivrCompiler);
            return;
        }

        if (choice === '7') {
            const targetDir = await YemotAPIService.uploadTranscriptionForSharing(recents[idx].text, phone);
            if (targetDir) {
                ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.SHARE_SUCCESS);
                ivrCompiler.routeToFolder(targetDir);
            } else {
                ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.SHARE_FAILED);
                this.serveMainMenu(ivrCompiler);
            }
        } 
        else if (choice === '9') {
            ivrCompiler.requestEmailKeyboard(SYSTEM_CONSTANTS.PROMPTS.EMAIL_PROMPT, SYSTEM_CONSTANTS.STATE_BASES.USER_EMAIL_INPUT);
        }
        else {
            this.serveMainMenu(ivrCompiler);
        }
    }

    static async executeEmailSending(phone, emailInput, ivrCompiler) {
        Logger.info("Domain_Email", `MOCK: Email sent to [${emailInput}]`);
        ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.EMAIL_SUCCESS);
        this.serveMainMenu(ivrCompiler);
    }
}

// ============================================================================
// ============================================================================
// PART 13: STATE MACHINE & REQUEST ROUTER (MAIN HANDLER)
// ============================================================================
// ============================================================================

function sendHTTPResponse(res, payloadString) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.status(200).send(payloadString);
}

export default async function handler(req, res) {
    const ivrCompiler = new YemotResponseCompiler();

    try {
        Logger.info("Gateway", `---------- REQUEST [${req.method}] ----------`);

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

        let triggerBaseKey = null;
        let triggerValue = null;
        let highestTimestamp = 0;
        
        for (const [key, val] of Object.entries(mergedQuery)) {
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

        Logger.info("State_Machine", `Trigger:[${triggerBaseKey}] = [${triggerValue}]`);

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
            await DomainControllers.processChatAudio(phone, callId, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.CHAT_PAGINATION) {
            await DomainControllers.handlePaginationNavigation(phone, triggerValue, ivrCompiler, 'chat');
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.CHAT_ACTION_CHOICE) {
            if (triggerValue === '7') ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO, callId);
            else DomainControllers.serveMainMenu(ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.CHAT_HISTORY_CHOICE) {
            if (triggerValue === '0') DomainControllers.serveMainMenu(ivrCompiler);
            else await DomainControllers.handleChatHistoryPlayback(phone, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.TRANS_AUDIO && triggerValue && triggerValue.includes('.wav')) {
            await DomainControllers.processTransAudio(phone, triggerValue, ivrCompiler, false);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.TRANS_APPEND_AUDIO && triggerValue && triggerValue.includes('.wav')) {
            await DomainControllers.processTransAudio(phone, triggerValue, ivrCompiler, true);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.TRANS_DRAFT_MENU) {
            await DomainControllers.handleTransDraftMenu(phone, callId, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.TRANS_HISTORY_CHOICE) {
            if (triggerValue === '0') DomainControllers.serveMainMenu(ivrCompiler);
            else await DomainControllers.handleTransHistoryPlayback(phone, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.TRANS_PAGINATION) {
            await DomainControllers.handlePaginationNavigation(phone, triggerValue, ivrCompiler, 'trans');
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.TRANS_ACTION_CHOICE) {
            await DomainControllers.handleTransHistoryActions(phone, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.USER_EMAIL_INPUT) {
            await DomainControllers.executeEmailSending(phone, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.MENU_CHOICE) {
            if (triggerValue === '0') await DomainControllers.initNewTranscription(phone, callId, ivrCompiler);
            else if (triggerValue === '1') await DomainControllers.initNewChat(phone, callId, ivrCompiler);
            else if (triggerValue === '2') await DomainControllers.initChatHistoryMenu(phone, ivrCompiler);
            else if (triggerValue === '3') await DomainControllers.initTransHistoryMenu(phone, ivrCompiler);
            else DomainControllers.serveMainMenu(ivrCompiler);
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
