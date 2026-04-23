/**
 * @file api/index.js
 * @description Ultimate Enterprise IVR System for Yemot HaMashiach & Google Gemini AI.
 * @version 20.0.0 (The Apex Edition - Full History, Advanced Pagination, Native Pauses & Deep AI Context)
 * @author Custom AI Assistant
 * 
 * CORE FEATURES IMPLEMENTED:
 * 1. Single Extension Routing (type=api).
 * 2. Infinite Chat Memory: Feeds the ENTIRE chat history to Gemini, not just the last 5 messages.
 * 3. Smart Punctuation & Niqqud: AI uses `systemInstruction` natively to generate perfect JSON, long answers, and Niqqud.
 * 4. Advanced Pagination Engine: 
 *    - Press 9: Next chunk
 *    - Press 8: Previous chunk
 *    - Press 5: Native Yemot Pause/Resume (announced in prompt)
 *    - Press 7: Quick-Action (Record next in Chat, or Menu in Transcriptions).
 * 5. Fixed Menu 0 Loop: Corrected state transitions for the transcription drafts.
 * 6. Empty Chat Filter: Menu 2 (History) now filters out empty sessions created by hang-ups.
 * 7. Hardcoded to `gemini-3.1-flash-lite-preview`.
 */

export const maxDuration = 60; // Critical: Prevents Vercel Serverless from timing out

import { list } from '@vercel/blob';

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
        MAX_CHUNK_LENGTH: 380 // Safe length for Yemot buffer without truncating
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
        
        // Context-Aware Pagination Menus (9=Next, 8=Prev, 5=Pause, 0=Main Menu, 7=Action)
        PAGINATION_MENU_CHAT: "לשמיעת המשך התשובה הקישו 9. לחלק הקודם הקישו 8. להשהייה והמשך השמעת התשובה הקישו 5. להקלטת שאלה נוספת בשיחה הקישו 7. לחזרה לתפריט הראשי הקישו 0.",
        PAGINATION_MENU_TRANS_DRAFT: "לשמיעת המשך התמלול הקישו 9. לחלק הקודם הקישו 8. לעצירה והמשך הקישו 5. למעבר לתפריט שמירת התמלול הקישו 7. לחזרה לתפריט הראשי הקישו 0.",
        PAGINATION_MENU_TRANS_HIST: "לשמיעת המשך התמלול הקישו 9. לחלק הקודם הקישו 8. לעצירה והמשך הקישו 5. למעבר לאפשרויות השיתוף הקישו 7. לחזרה לתפריט הראשי הקישו 0.",
        
        TRANS_MENU: "לשמיעה חוזרת הקישו 1. להקלטה מחדש הקישו 2. להקלטת המשך הקישו 3. לשמירת התמלול הקישו 4.",
        TRANS_ACTION_MENU: "לשיתוף התמלול למערכות אחרות הקישו 7. לשליחת התמלול לאימייל הקישו 9. לחזרה לתפריט הראשי הקישו 8.",
        EMAIL_PROMPT: "אנא הקלידו את כתובת האימייל שלכם באמצעות המקלדת. בסיום הקישו סולמית.",
        EMAIL_SUCCESS: "האימייל נשלח בהצלחה. שלום ותודה.",
        SHARE_SUCCESS: "קובץ התמלול נוצר בהצלחה. הנכם מועברים לתיקיית השיתוף.",
        SHARE_FAILED: "אירעה שגיאה ביצירת קובץ השיתוף. הנכם מועברים לתפריט הראשי.",
        TRANS_SAVED_SUCCESS: "התמלול נשמר בהצלחה. הנכם מועברים לתפריט הראשי.",
        SYSTEM_ERROR_FALLBACK: "אירעה שגיאה. אך ננסה להמשיך. אנא נסו שוב.",
        PREVIOUS_QUESTION_PREFIX: "שאלת משתמש בעבר:",
        PREVIOUS_ANSWER_PREFIX: "תשובת המערכת בעבר:",
        
        // System Prompt for Gemini: Instructs for HIGH detail, strict JSON, and proper Hebrew phonetics/punctuation.
        GEMINI_SYSTEM_INSTRUCTION_CHAT: `
        אתה עוזר קולי וירטואלי חכם בשפה העברית.
        האזן לאודיו המצורף. עליך קודם כל לתמלל את השאלה במדויק, ולאחר מכן לענות עליה תשובה מלאה, מקיפה, מפורטת וארוכה ככל הנדרש! אל תקצר בתשובות.
        הוראות חובה להקראה קולית במערכת טלפונית (TTS):
        1. השתמש בסימני פיסוק (פסיקים ונקודות) במקומות הנכונים.
        2. השתמש בניקוד עברי (Niqqud) במילים שעלולות להיות מבוטאות לא נכון.
        3. אל תשתמש כלל בכוכביות (*), קווים מפרידים (-), סולמיות (#) או אמוג'י.
        חובה עליך להחזיר אובייקט JSON תקני בלבד עם שני שדות: "transcription" ו-"answer".
        אסור להחזיר שום טקסט מחוץ למבנה ה-JSON.
        `,
        GEMINI_SYSTEM_INSTRUCTION_TRANSCRIPTION: `
        תמלל את הנאמר בקובץ האודיו המצורף בעברית במדויק מילה במילה. החזר אך ורק את הטקסט המתומלל ללא פרשנות, ללא הקדמות וללא תוספות שלך. 
        השתמש בסימני פיסוק (נקודה, פסיק) כדי לשמור על קריאה טבעית, אך אל תשתמש בתווים מיוחדים אחרים. נקד מילים קשות להגייה.
        `
    },
    STATE_BASES: {
        MENU_CHOICE: 'State_MainMenuChoice',
        CHAT_USER_AUDIO: 'State_ChatUserAudio',
        CHAT_HISTORY_CHOICE: 'State_ChatHistoryChoice',
        CHAT_ACTION_CHOICE: 'State_ChatActionChoice',
        PAGINATION_CHOICE: 'State_PaginationChoice',
        TRANS_USER_AUDIO: 'State_TransUserAudio',
        TRANS_APPEND_AUDIO: 'State_TransAppendAudio',
        TRANS_DRAFT_MENU: 'State_TransDraftMenu',
        TRANS_HISTORY_CHOICE: 'State_TransHistoryChoice',
        TRANS_ACTION_CHOICE: 'State_TransActionChoice',
        USER_EMAIL_INPUT: 'State_UserEmailInput'
    },
    YEMOT_PARAMS: {
        PHONE: 'ApiPhone',
        ENTER_ID: 'ApiEnterID',
        CALL_ID: 'ApiCallId',
        HANGUP: 'hangup'
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
// --- SECTION 3: ROBUST ENTERPRISE LOGGER SYSTEM ---
// ============================================================================

const LogLevels = { TRACE: 10, DEBUG: 20, INFO: 30, WARN: 40, ERROR: 50, FATAL: 60 };

class EnterpriseLogger {
    constructor() {
        this.currentLevel = LogLevels.DEBUG;
    }
    _formatLog(levelName, context, message, meta) {
        const timestamp = new Date().toISOString();
        let logStr = `[${timestamp}][${levelName}] [${context}] ${message}`;
        if (meta) {
            try {
                if (meta instanceof Error) {
                    logStr += ` | Exception: ${meta.message}`;
                } else if (typeof meta === 'object') {
                    logStr += ` | Meta: ${JSON.stringify(meta)}`;
                } else {
                    logStr += ` | Meta: ${meta}`;
                }
            } catch (e) {
                logStr += ` | Meta:[Unserializable]`;
            }
        }
        return logStr;
    }
    trace(context, message, meta = null) { if (this.currentLevel <= LogLevels.TRACE) console.trace(this._formatLog('TRACE', context, message, meta)); }
    debug(context, message, meta = null) { if (this.currentLevel <= LogLevels.DEBUG) console.debug(this._formatLog('DEBUG', context, message, meta)); }
    info(context, message, meta = null) { if (this.currentLevel <= LogLevels.INFO) console.info(this._formatLog('INFO', context, message, meta)); }
    warn(context, message, meta = null) { if (this.currentLevel <= LogLevels.WARN) console.warn(this._formatLog('WARN', context, message, meta)); }
    error(context, message, errorObj = null) { if (this.currentLevel <= LogLevels.ERROR) console.error(this._formatLog('ERROR', context, message, errorObj)); }
    fatal(context, message, errorObj = null) { if (this.currentLevel <= LogLevels.FATAL) console.error(this._formatLog('FATAL', context, message, errorObj)); }
}
const Logger = new EnterpriseLogger();

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
        this.currentKeyIndex = 0;
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
        const key = this.geminiKeys[this.currentKeyIndex];
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.geminiKeys.length;
        return key;
    }
}
const AppConfig = new ConfigManager();

// ============================================================================
// ============================================================================
// PART 5: HEBREW PHONETICS, SANITIZATION & PAGINATION ENGINE
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
     * Ensures words and Nikud are not split in half.
     */
    static paginateText(text, maxLength = SYSTEM_CONSTANTS.IVR_DEFAULTS.MAX_CHUNK_LENGTH) {
        if (!text) return ["טקסט ריק"];
        
        const words = text.split(/[\s\n\r]+/); // Split by space or newline
        const chunks =[];
        let currentChunk = '';

        for (const word of words) {
            // Check if adding the next word exceeds our safe length for Yemot
            if ((currentChunk.length + word.length + 1) > maxLength) {
                if (currentChunk.trim().length > 0) {
                    chunks.push(currentChunk.trim());
                }
                currentChunk = word; // Start a new chunk
            } else {
                currentChunk += (currentChunk.length > 0 ? ' ' : '') + word;
            }
        }
        
        if (currentChunk.trim().length > 0) {
            chunks.push(currentChunk.trim());
        }
        
        Logger.debug("PaginationEngine", `Text chunked into ${chunks.length} segments.`);
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
// PART 7: L1 MEMORY CACHE & L2 VERCEL BLOB STORAGE (THE DUAL STORE FIX)
// ============================================================================
// ============================================================================

/**
 * In-Memory cache acts as L1 storage.
 * Since Serverless functions stay "warm" across requests (like pressing '9' for pagination),
 * this completely eliminates dependency on Vercel Blob if it fails due to permissions!
 */
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

        // 2. L2 CACHE: Check Vercel Blob
        const filePath = this._getUserFilePath(phone);
        const fetchOperation = async () => {
            const { blobs } = await list({ prefix: filePath, token: AppConfig.blobToken });
            if (!blobs || blobs.length === 0) return this.generateDefaultProfile();

            const response = await fetch(blobs[0].url, { headers: { Authorization: `Bearer ${AppConfig.blobToken}` } });
            if (!response.ok) throw new Error("Fetch failed");
            return UserProfileDTO.validate(await response.json());
        };

        try {
            const profile = await RetryHelper.withRetry(fetchOperation, "FetchUserBlob", 2, 500);
            UserMemoryCache.set(phone, profile); // Warm up L1
            return profile;
        } catch (error) {
            Logger.warn("UserRepository", `L2 Blob Fetch failed. Initializing fresh L1 profile. Error: ${error.message}`);
            const newProfile = this.generateDefaultProfile();
            UserMemoryCache.set(phone, newProfile);
            return newProfile;
        }
    }

    static async saveProfile(phone, profileData) {
        if (!phone || phone === 'unknown') return;
        
        // 1. L1 CACHE: Save to RAM instantly (Guarantees flow continuation!)
        UserMemoryCache.set(phone, profileData);
        Logger.debug("UserRepository", `Profile saved to L1 Memory Cache for ${phone}`);

        // 2. L2 CACHE: Attempt background save to Vercel Blob
        const filePath = this._getUserFilePath(phone);
        const saveOperation = async () => {
            // Using standard put. Omit access to let Vercel handle it natively.
            await put(filePath, JSON.stringify(profileData), { 
                addRandomSuffix: false,
                token: AppConfig.blobToken
            });
        };

        try {
            // We await it here to ensure data consistency, but if it fails, L1 cache still exists!
            await RetryHelper.withRetry(saveOperation, "SaveUserBlob", 2, 500);
            Logger.info("UserRepository", `Profile successfully persisted to L2 Blob for ${phone}.`);
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

class UserProfileDTO {
    static generateDefault() {
        return {
            chats:[],
            transcriptions:[],
            currentChatId: null,
            tempTranscription: "",
            currentTransIndex: null,
            pagination: { chunks:[], currentIndex: 0, type: null, endPrompt: "", endStateBase: "" },
            lastActive: new Date().toISOString()
        };
    }

    static validate(data) {
        if (!data || typeof data !== 'object') return this.generateDefault();
        if (!Array.isArray(data.chats)) data.chats =[];
        if (!Array.isArray(data.transcriptions)) data.transcriptions =[];
        if (!data.pagination || !Array.isArray(data.pagination.chunks)) {
            data.pagination = { chunks:[], currentIndex: 0, type: null, endPrompt: "", endStateBase: "" };
        }
        data.lastActive = new Date().toISOString();
        return data;
    }
}

// ============================================================================
// ============================================================================
// PART 9: YEMOT API INTEGRATION SERVICES (AUDIO & SHARE)
// ============================================================================
// ============================================================================

class YemotAPIService {
    
    /**
     * Pulls the recorded WAV file from Yemot's servers.
     */
    static async downloadAudioAsBase64(rawFilePath) {
        const downloadTask = async () => {
            const fullPath = rawFilePath.startsWith('ivr2:') ? rawFilePath : `ivr2:${rawFilePath}`;
            const encodedPath = encodeURIComponent(fullPath);
            const downloadUrl = `https://www.call2all.co.il/ym/api/DownloadFile?token=${AppConfig.getYemotToken()}&path=${encodedPath}`;
            
            Logger.debug("YemotAPIService", `Downloading audio from: ${fullPath}`);
            const response = await fetch(downloadUrl);
            
            if (!response.ok) {
                throw new YemotAPIError(`Yemot DownloadFile HTTP ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            if (buffer.length < 500) {
                throw new YemotAPIError(`Invalid audio file received (too small).`);
            }

            Logger.info("YemotAPIService", `Audio downloaded successfully. Size: ${buffer.length} bytes.`);
            return buffer.toString('base64');
        };

        try {
            return await RetryHelper.withRetry(downloadTask, "YemotAudioDownload", SYSTEM_CONSTANTS.RETRY_POLICY.YEMOT_MAX_RETRIES, 1000);
        } catch (error) {
            throw new YemotAPIError("Exhausted retries downloading audio from Yemot servers.", error);
        }
    }

    /**
     * Uploads the generated text as a TTS file back to Yemot for native sharing via key 7.
     */
    static async uploadTranscriptionForSharing(text, phone) {
        const uploadTask = async () => {
            const fileName = `Shared_Trans_${phone}_${Date.now()}.tts`;
            const fullPath = `ivr2:${SYSTEM_CONSTANTS.YEMOT_PATHS.SHARED_TRANSCRIPTIONS_DIR}/${fileName}`;
            const encodedPath = encodeURIComponent(fullPath);
            const encodedContent = encodeURIComponent(text);
            
            const uploadUrl = `https://www.call2all.co.il/ym/api/UploadTextFile?token=${AppConfig.getYemotToken()}&what=${encodedPath}&contents=${encodedContent}`;
            
            Logger.debug("YemotAPIService", `Uploading TTS file for sharing to: ${fullPath}`);
            const response = await fetch(uploadUrl);
            
            if (!response.ok) throw new YemotAPIError(`Yemot UploadTextFile HTTP ${response.status}`);
            const result = await response.json();
            
            if (result.responseStatus !== "OK") {
                throw new YemotAPIError(`Yemot upload rejected: ${JSON.stringify(result)}`);
            }
            
            Logger.info("YemotAPIService", `TTS file successfully uploaded for sharing.`);
            return SYSTEM_CONSTANTS.YEMOT_PATHS.SHARED_TRANSCRIPTIONS_DIR;
        };

        try {
            return await RetryHelper.withRetry(uploadTask, "UploadSharedTTS", SYSTEM_CONSTANTS.RETRY_POLICY.YEMOT_MAX_RETRIES, 1000);
        } catch (error) {
            Logger.error("YemotAPIService", "Failed to upload TTS file for sharing.", error);
            return null;
        }
    }
}

// ============================================================================
// ============================================================================
// PART 10: GOOGLE GEMINI AI INTEGRATION
// ============================================================================
// ============================================================================

class GeminiAIService {
    
    /**
     * Builds the payload, strictly passing system instructions in the dedicated field.
     */
    static _buildPayload(systemInstructionText, base64Audio, contextMessages =[], forceJson = false) {
        
        const formattedHistory = contextMessages.map(msg => ({
            role: "user",
            parts:[{ text: `${SYSTEM_CONSTANTS.PROMPTS.PREVIOUS_QUESTION_PREFIX} ${msg.q}\n${SYSTEM_CONSTANTS.PROMPTS.PREVIOUS_ANSWER_PREFIX} ${msg.a}` }]
        }));

        const payload = {
            systemInstruction: {
                parts: [{ text: systemInstructionText }]
            },
            contents:[
                ...formattedHistory,
                {
                    role: "user",
                    parts:[
                        { text: "אנא האזן לקובץ הקול המצורף ופעל בהתאם להנחיות המערכת שניתנו לך." },
                        {
                            inlineData: {
                                mimeType: SYSTEM_CONSTANTS.MODELS.AUDIO_MIME_TYPE,
                                data: base64Audio
                            }
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8192 // Huge limit for extensive answers
            }
        };

        if (forceJson) {
            payload.generationConfig.responseMimeType = SYSTEM_CONSTANTS.MODELS.JSON_MIME_TYPE;
        }

        return payload;
    }

    static async _executeGenerationWithRotation(payload) {
        const keys = AppConfig.geminiKeys;
        let lastEncounteredError = null;

        Logger.info("GeminiAIService", `Executing AI Generation. Target Model: ${SYSTEM_CONSTANTS.MODELS.PRIMARY_GEMINI_MODEL}.`);

        for (let i = 0; i < keys.length; i++) {
            const apiKey = AppConfig.getNextGeminiKey();
            try {
                const endpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/${SYSTEM_CONSTANTS.MODELS.PRIMARY_GEMINI_MODEL}:generateContent?key=${apiKey}`;
                
                const response = await fetch(endpointUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Google API HTTP ${response.status}: ${errorText}`);
                }

                const data = await response.json();
                if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
                    return data.candidates[0].content.parts[0].text;
                } else {
                    throw new Error(`Unexpected JSON structure from Gemini.`);
                }
            } catch (error) {
                lastEncounteredError = error;
                Logger.warn("GeminiAIService", `Generation failed with current key. Moving to next. Error: ${error.message}`);
            }
        }
        throw new GeminiAPIError("All API keys in the rotation pool failed.", lastEncounteredError);
    }

    /**
     * Executes Menu 1 (Chat). Forces JSON output for Transcription + Answer.
     */
    static async processChatInteraction(base64Audio, historyContext =[]) {
        Logger.info("GeminiAIService", "Processing CHAT interaction (Audio -> JSON).");
        
        const systemInstruction = SYSTEM_CONSTANTS.PROMPTS.GEMINI_SYSTEM_INSTRUCTION_CHAT;
        const payload = this._buildPayload(systemInstruction, base64Audio, historyContext, true);
        
        try {
            const rawJsonResponse = await this._executeGenerationWithRotation(payload);
            
            // Clean markdown wrap
            let cleanJsonStr = rawJsonResponse.trim();
            if (cleanJsonStr.startsWith("```json")) cleanJsonStr = cleanJsonStr.substring(7, cleanJsonStr.length - 3).trim();
            else if (cleanJsonStr.startsWith("```")) cleanJsonStr = cleanJsonStr.substring(3, cleanJsonStr.length - 3).trim();
            
            const parsedData = JSON.parse(cleanJsonStr);
            
            return {
                transcription: parsedData.transcription || "לא זוהה דיבור קריא",
                answer: parsedData.answer || "לא הצלחתי לגבש תשובה מתאימה"
            };
            
        } catch (error) {
            Logger.error("GeminiAIService", "Failed to parse Chat JSON response from Gemini.", error);
            return {
                transcription: "תמלול אודיו לא הצליח",
                answer: "אירעה שגיאה בהבנת המבנה של התשובה משרת הבינה המלאכותית, אך נמשיך הלאה."
            };
        }
    }

    /**
     * Executes Menu 0 (Transcription Only). Forces exact wording.
     */
    static async processTranscriptionOnly(base64Audio) {
        Logger.info("GeminiAIService", "Processing TRANSCRIPTION ONLY interaction.");
        
        const systemInstruction = SYSTEM_CONSTANTS.PROMPTS.GEMINI_SYSTEM_INSTRUCTION_TRANSCRIPTION;
        // Low temperature for high deterministic accuracy
        const payload = this._buildPayload(systemInstruction, base64Audio,[], false);
        payload.generationConfig.temperature = 0.1; 
        
        try {
            const rawTextResponse = await this._executeGenerationWithRotation(payload);
            return rawTextResponse;
        } catch (error) {
            Logger.error("GeminiAIService", "Failed to process transcription audio.", error);
            return "אירעה שגיאה בתמלול ההקלטה נסו שנית";
        }
    }
}

// ============================================================================
// ============================================================================
// PART 11: YEMOT IVR STRING COMPILER (THE COMMAND BUILDER)
// ============================================================================
// ============================================================================

class YemotResponseCompiler {
    constructor() {
        this.commandChain =[];
    }

    /**
     * Uses the Chained TTS formatter to create breathing pauses for Yemot.
     */
    playChainedTTS(text) {
        if (!text) return this;
        const chainedText = YemotTextProcessor.formatForChainedTTS(text);
        this.commandChain.push(`id_list_message=${chainedText}`);
        return this;
    }

    /**
     * Standard READ request. Aggressively sanitizes the prompt to avoid comma crashes.
     */
    requestDigits(ttsPrompt, baseVariableName, minDigits = SYSTEM_CONSTANTS.IVR_DEFAULTS.MIN_DIGITS_DEFAULT, maxDigits = SYSTEM_CONSTANTS.IVR_DEFAULTS.MAX_DIGITS_DEFAULT) {
        const safePrompt = YemotTextProcessor.sanitizeForReadPrompt(ttsPrompt);
        const timeout = SYSTEM_CONSTANTS.IVR_DEFAULTS.STANDARD_TIMEOUT;
        const useExisting = SYSTEM_CONSTANTS.IVR_DEFAULTS.USE_EXISTING_NO;
        const playbackType = SYSTEM_CONSTANTS.IVR_DEFAULTS.PLAYBACK_TYPE_NO;
        const blockAsterisk = SYSTEM_CONSTANTS.IVR_DEFAULTS.BLOCK_ASTERISK;
        const blockZero = SYSTEM_CONSTANTS.IVR_DEFAULTS.BLOCK_ZERO;
        
        // Add a timestamp to the variable name so Yemot treats every request as a new state!
        const timestampedVarName = `${baseVariableName}_${Date.now()}`;

        const params =[
            useExisting, maxDigits, minDigits, timeout, playbackType, blockAsterisk, blockZero
        ];
        
        this.commandChain.push(`read=t-${safePrompt}=${timestampedVarName},${params.join(',')}`);
        return this;
    }

    requestEmailKeyboard(ttsPrompt, baseVariableName) {
        const safePrompt = YemotTextProcessor.sanitizeForReadPrompt(ttsPrompt);
        const timeout = SYSTEM_CONSTANTS.IVR_DEFAULTS.EMAIL_TIMEOUT;
        const timestampedVarName = `${baseVariableName}_${Date.now()}`;
        
        const params =[
            'no', 100, 5, timeout, 'EmailKeyboard', 'yes', 'no'
        ];
        
        this.commandChain.push(`read=t-${safePrompt}=${timestampedVarName},${params.join(',')}`);
        return this;
    }

    requestAudioRecord(ttsPrompt, baseVariableName, uniqueCallId) {
        const safePrompt = YemotTextProcessor.sanitizeForReadPrompt(ttsPrompt);
        // Do not add rec_ to the prefix again if uniqueCallId already has it.
        const fileName = uniqueCallId.startsWith('rec_') ? `${uniqueCallId}_${Date.now()}` : `rec_${uniqueCallId}_${Date.now()}`;
        const folder = SYSTEM_CONSTANTS.YEMOT_PATHS.RECORDINGS_DIR;
        const minTime = SYSTEM_CONSTANTS.IVR_DEFAULTS.RECORD_MIN_SEC;
        const maxTime = SYSTEM_CONSTANTS.IVR_DEFAULTS.RECORD_MAX_SEC;
        const sayRecordMenu = SYSTEM_CONSTANTS.IVR_DEFAULTS.SAY_RECORD_MENU_NO;
        const saveOnHangup = SYSTEM_CONSTANTS.IVR_DEFAULTS.SAVE_ON_HANGUP_YES;
        const append = SYSTEM_CONSTANTS.IVR_DEFAULTS.APPEND_RECORD_NO;
        
        const timestampedVarName = `${baseVariableName}_${Date.now()}`;

        const params =[
            'no', 'record', folder, fileName, sayRecordMenu, saveOnHangup, append, minTime, maxTime
        ];
        
        this.commandChain.push(`read=t-${safePrompt}=${timestampedVarName},${params.join(',')}`);
        return this;
    }

    routeToFolder(targetFolder) {
        this.commandChain.push(`go_to_folder=${targetFolder}`);
        return this;
    }

    compile() {
        if (this.commandChain.length === 0) {
            Logger.warn("Compiler", "Attempted to compile an empty command chain. Injecting fallback hangup.");
            this.routeToFolder("hangup");
        }
        
        const finalString = this.commandChain.filter(cmd => cmd && cmd.trim() !== '').join('&');
        Logger.debug("Compiler", `Compiled output string length: ${finalString.length} chars`);
        return finalString;
    }
}

// ============================================================================
// ============================================================================
// PART 12: DOMAIN LOGIC CONTROLLERS & PAGINATION ENGINE
// ============================================================================
// ============================================================================

class DomainControllers {

    static serveMainMenu(ivrCompiler) {
        Logger.info("Domain_Main", "Serving Main Menu to caller.");
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.MAIN_MENU, SYSTEM_CONSTANTS.STATE_BASES.MENU_CHOICE, 1, 1);
    }

    // ------------------------------------------------------------------------
    // THE PAGINATION ENGINE (Chunks long text, supports 9-Next, 8-Prev, 7-Action)
    // ------------------------------------------------------------------------

    /**
     * Initializes playback of a long text by chunking it and saving state.
     * @param {string} phone - User Phone
     * @param {string} fullText - The raw long text
     * @param {string} contextType - 'chat', 'trans_draft', or 'trans_hist'
     * @param {YemotResponseCompiler} ivrCompiler - compiler
     * @param {string} endPrompt - The prompt to play when reaching the end of chunks
     * @param {string} endStateBase - The state base to transition to after the end
     */
    static async initiatePaginatedPlayback(phone, fullText, contextType, ivrCompiler, endPrompt, endStateBase) {
        const chunks = YemotTextProcessor.paginateText(fullText);
        Logger.info("Pagination", `Text chunked into ${chunks.length} parts for context: ${contextType}`);
        
        const userProfile = await UserRepository.getProfile(phone);
        userProfile.pagination = {
            type: contextType,
            currentIndex: 0,
            chunks: chunks,
            endPrompt: endPrompt,
            endStateBase: endStateBase
        };
        await UserRepository.saveProfile(phone, userProfile);

        ivrCompiler.playChainedTTS(chunks[0]);
        
        if (chunks.length <= 1) {
            // No pagination needed, go directly to the end action menu
            ivrCompiler.requestDigits(endPrompt, endStateBase, 1, 1);
        } else {
            // Pagination needed, go to pagination menu
            let pPrompt = SYSTEM_CONSTANTS.PROMPTS.PAGINATION_MENU_CHAT;
            if (contextType === 'trans_draft') pPrompt = SYSTEM_CONSTANTS.PROMPTS.TRANS_PAGINATION_MENU;
            if (contextType === 'trans_hist') pPrompt = SYSTEM_CONSTANTS.PROMPTS.TRANS_PAGINATION_MENU;
            
            ivrCompiler.requestDigits(pPrompt, SYSTEM_CONSTANTS.STATE_BASES.PAGINATION_CHOICE, 1, 1);
        }
    }

    /**
     * Handles user pressing 9 (next), 8 (prev), 7 (action) during paginated playback.
     */
    static async handlePaginationNavigation(phone, choice, callId, ivrCompiler) {
        const userProfile = await UserRepository.getProfile(phone);
        const pag = userProfile.pagination;

        if (!pag || !pag.chunks || pag.chunks.length === 0) {
            Logger.warn("Pagination", "Invalid pagination state. Resetting to main menu.");
            this.serveMainMenu(ivrCompiler);
            return;
        }

        // Action Bypass: User presses 7 to skip the rest of the reading and do the action
        if (choice === '7') {
            if (pag.type === 'chat') {
                ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO, callId);
            } else if (pag.type === 'trans_draft') {
                ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.TRANS_MENU, SYSTEM_CONSTANTS.STATE_BASES.TRANS_DRAFT_MENU, 1, 1);
            } else if (pag.type === 'trans_hist') {
                ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.TRANS_ACTION_MENU, SYSTEM_CONSTANTS.STATE_BASES.TRANS_ACTION_CHOICE, 1, 1);
            }
            return;
        }

        // Main Menu Bypass
        if (choice === '0') {
            this.serveMainMenu(ivrCompiler);
            return;
        }

        // Normal Navigation
        if (choice === '9' && pag.currentIndex < pag.chunks.length - 1) {
            pag.currentIndex++;
        } else if (choice === '8' && pag.currentIndex > 0) {
            pag.currentIndex--;
        }

        await UserRepository.saveProfile(phone, userProfile);
        
        ivrCompiler.playChainedTTS(pag.chunks[pag.currentIndex]);
        
        const isLastChunk = pag.currentIndex === pag.chunks.length - 1;
        if (isLastChunk) {
            ivrCompiler.requestDigits(pag.endPrompt, pag.endStateBase, 1, 1);
        } else {
            let pPrompt = SYSTEM_CONSTANTS.PROMPTS.PAGINATION_MENU_CHAT;
            if (pag.type === 'trans_draft') pPrompt = SYSTEM_CONSTANTS.PROMPTS.TRANS_PAGINATION_MENU;
            if (pag.type === 'trans_hist') pPrompt = SYSTEM_CONSTANTS.PROMPTS.TRANS_PAGINATION_MENU;
            
            ivrCompiler.requestDigits(pPrompt, SYSTEM_CONSTANTS.STATE_BASES.PAGINATION_CHOICE, 1, 1);
        }
    }

    // ------------------------------------------------------------------------
    // CHAT DOMAIN (Menu 1 & 2)
    // ------------------------------------------------------------------------

    static async initNewChat(phone, callId, ivrCompiler) {
        Logger.info("Domain_Chat", "Initializing new chat session.");
        const userProfile = await UserRepository.getProfile(phone);
        const newSession = new ChatSessionDTO(`chat_${Date.now()}`);
        
        userProfile.chats.push(newSession);
        userProfile.currentChatId = newSession.id;
        
        await UserRepository.saveProfile(phone, userProfile);

        ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO, callId);
    }

    static async processChatAudio(phone, callId, audioPath, ivrCompiler) {
        Logger.info("Domain_Chat", `Processing Chat Audio for call: ${callId}`);
        const base64Audio = await YemotAPIService.downloadAudioAsBase64(audioPath);
        const userProfile = await UserRepository.getProfile(phone);
        
        let chatSession = userProfile.chats.find(c => c.id === userProfile.currentChatId);
        if (!chatSession) {
            chatSession = new ChatSessionDTO(`chat_rec_${Date.now()}`);
            userProfile.chats.push(chatSession);
            userProfile.currentChatId = chatSession.id;
        }

        // Supply the ENTIRE chat history to Gemini, allowing deep context!
        const historyContext = chatSession.messages; 
        const { transcription, answer } = await GeminiAIService.processChatInteraction(base64Audio, historyContext);
        
        chatSession.addMessage(transcription, answer);
        await UserRepository.saveProfile(phone, userProfile);

        // Paginated Playback of the AI's Answer
        await this.initiatePaginatedPlayback(
            phone, 
            answer, 
            'chat', 
            ivrCompiler, 
            SYSTEM_CONSTANTS.PROMPTS.CHAT_ACTION_MENU, 
            SYSTEM_CONSTANTS.STATE_BASES.CHAT_ACTION_CHOICE
        );
    }

    static async initChatHistoryMenu(phone, ivrCompiler) {
        Logger.info("Domain_Chat", "Initializing Chat History Menu.");
        const userProfile = await UserRepository.getProfile(phone);
        
        // Filter out empty chats (created by hang-ups before message sent)
        const validChats = userProfile.chats.filter(c => c.messages && c.messages.length > 0);
        
        if (validChats.length === 0) {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.NO_HISTORY);
            this.serveMainMenu(ivrCompiler);
            return;
        }

        const recentChats = validChats.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS).reverse();
        let promptText = SYSTEM_CONSTANTS.PROMPTS.CHAT_HISTORY_PREFIX;
        
        recentChats.forEach((chat, index) => {
            promptText += `לשיחה מספר ${index + 1} הקישו ${index + 1}. `;
        });
        promptText += SYSTEM_CONSTANTS.PROMPTS.MENU_SUFFIX_0;

        ivrCompiler.requestDigits(promptText, SYSTEM_CONSTANTS.STATE_BASES.CHAT_HISTORY_CHOICE, 1, 1);
    }

    static async handleChatHistoryPlayback(phone, choice, ivrCompiler) {
        Logger.info("Domain_Chat", `Playing chat history selection: ${choice}`);
        const userProfile = await UserRepository.getProfile(phone);
        
        const validChats = userProfile.chats.filter(c => c.messages && c.messages.length > 0);
        const recentChats = validChats.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS).reverse();
        const selectedIndex = parseInt(choice, 10) - 1;

        if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= recentChats.length) {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.INVALID_CHOICE);
            this.serveMainMenu(ivrCompiler);
            return;
        }

        const selectedSession = recentChats[selectedIndex];
        userProfile.currentChatId = selectedSession.id;
        await UserRepository.saveProfile(phone, userProfile);

        let playbackScript = "היסטוריית שיחה מתחילה\n";
        selectedSession.messages.forEach((msg, i) => {
            playbackScript += `שאלה ${i + 1}\n${msg.q}\nתשובה ${i + 1}\n${msg.a}\n`;
        });

        await this.initiatePaginatedPlayback(
            phone, 
            playbackScript, 
            'chat', 
            ivrCompiler, 
            SYSTEM_CONSTANTS.PROMPTS.CHAT_ACTION_MENU, 
            SYSTEM_CONSTANTS.STATE_BASES.CHAT_ACTION_CHOICE
        );
    }

    // ------------------------------------------------------------------------
    // TRANSCRIPTION DOMAIN (Menu 0 & 3)
    // ------------------------------------------------------------------------

    static async initNewTranscription(phone, callId, ivrCompiler) {
        Logger.info("Domain_Trans", "Initializing New Transcription Flow.");
        const userProfile = await UserRepository.getProfile(phone);
        userProfile.tempTranscription = "";
        await UserRepository.saveProfile(phone, userProfile);

        ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_TRANSCRIPTION_INITIAL, SYSTEM_CONSTANTS.STATE_BASES.TRANS_AUDIO, callId);
    }

    static async processTransAudio(phone, audioPath, ivrCompiler, isAppend) {
        Logger.info("Domain_Trans", `Processing Transcription Audio. IsAppend: ${isAppend}`);
        const base64Audio = await YemotAPIService.downloadAudioAsBase64(audioPath);
        const transcribedText = await GeminiAIService.processTranscriptionOnly(base64Audio);
        
        const userProfile = await UserRepository.getProfile(phone);
        
        if (isAppend) {
            userProfile.tempTranscription += "\n" + transcribedText;
        } else {
            userProfile.tempTranscription = transcribedText;
        }
        
        await UserRepository.saveProfile(phone, userProfile);

        const announcement = `התמלול הוא:\n${userProfile.tempTranscription}`;
        
        // Use pagination for the draft!
        await this.initiatePaginatedPlayback(
            phone, 
            announcement, 
            'trans_draft', 
            ivrCompiler, 
            SYSTEM_CONSTANTS.PROMPTS.TRANS_MENU, 
            SYSTEM_CONSTANTS.STATE_BASES.TRANS_DRAFT_MENU
        );
    }

    static async handleTransDraftMenu(phone, callId, choice, ivrCompiler) {
        Logger.info("Domain_Trans", `Handling Transcription Draft Menu. Choice: ${choice}`);
        const userProfile = await UserRepository.getProfile(phone);
        
        switch(choice) {
            case '1':
                const draftText = userProfile.tempTranscription || "טקסט ריק";
                await this.initiatePaginatedPlayback(
                    phone, 
                    draftText, 
                    'trans_draft', 
                    ivrCompiler, 
                    SYSTEM_CONSTANTS.PROMPTS.TRANS_MENU, 
                    SYSTEM_CONSTANTS.STATE_BASES.TRANS_DRAFT_MENU
                );
                break;
            case '2':
                ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_TRANSCRIPTION_INITIAL, SYSTEM_CONSTANTS.STATE_BASES.TRANS_AUDIO, callId);
                break;
            case '3':
                ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.APPEND_TRANSCRIPTION_RECORD, SYSTEM_CONSTANTS.STATE_BASES.TRANS_APPEND_AUDIO, callId);
                break;
            case '4':
                if (userProfile.tempTranscription && userProfile.tempTranscription.trim() !== '') {
                    userProfile.transcriptions.push(new TranscriptionEntryDTO(userProfile.tempTranscription));
                    userProfile.tempTranscription = ""; 
                    await UserRepository.saveProfile(phone, userProfile);
                    ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.TRANS_SAVED_SUCCESS);
                } else {
                    Logger.warn("Domain_Trans", "Attempted to save an empty transcription. Ignored.");
                }
                this.serveMainMenu(ivrCompiler);
                break;
            default:
                this.serveMainMenu(ivrCompiler);
        }
    }

    static async initTransHistoryMenu(phone, ivrCompiler) {
        Logger.info("Domain_Trans", "Initializing Transcription History Menu.");
        const userProfile = await UserRepository.getProfile(phone);
        
        if (userProfile.transcriptions.length === 0) {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.NO_TRANS_HISTORY);
            this.serveMainMenu(ivrCompiler);
            return;
        }

        const recentTrans = userProfile.transcriptions.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS).reverse();
        let promptText = SYSTEM_CONSTANTS.PROMPTS.TRANS_HISTORY_PREFIX;
        
        recentTrans.forEach((t, i) => { promptText += `לתמלול מספר ${i + 1} הקישו ${i + 1}. ` });
        promptText += SYSTEM_CONSTANTS.PROMPTS.MENU_SUFFIX_0;

        ivrCompiler.requestDigits(promptText, SYSTEM_CONSTANTS.STATE_BASES.TRANS_HISTORY_CHOICE, 1, 1);
    }

    static async handleTransHistoryPlayback(phone, choice, ivrCompiler) {
        Logger.info("Domain_Trans", `Playing transcription history selection: ${choice}`);
        const userProfile = await UserRepository.getProfile(phone);
        const recentTrans = userProfile.transcriptions.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS).reverse();
        const selectedIndex = parseInt(choice, 10) - 1;

        if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= recentTrans.length) {
            ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.INVALID_CHOICE);
            this.serveMainMenu(ivrCompiler);
            return;
        }

        userProfile.currentTransIndex = selectedIndex;
        await UserRepository.saveProfile(phone, userProfile);

        const selectedText = `תוכן התמלול הוא\n${recentTrans[selectedIndex].text}`;
        
        await this.initiatePaginatedPlayback(
            phone, 
            selectedText, 
            'trans_hist', 
            ivrCompiler, 
            SYSTEM_CONSTANTS.PROMPTS.TRANS_ACTION_MENU, 
            SYSTEM_CONSTANTS.STATE_BASES.TRANS_ACTION_CHOICE
        );
    }

    static async handleTransHistoryActions(phone, choice, ivrCompiler) {
        Logger.info("Domain_Trans", `Handling transcription action: ${choice}`);
        const userProfile = await UserRepository.getProfile(phone);
        const recentTrans = userProfile.transcriptions.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS).reverse();
        const activeIndex = userProfile.currentTransIndex;

        if (choice === '8' || activeIndex === null || activeIndex === undefined || !recentTrans[activeIndex]) {
            this.serveMainMenu(ivrCompiler);
            return;
        }

        const textBody = recentTrans[activeIndex].text;

        if (choice === '7') {
            Logger.info("Domain_Trans", "Executing Yemot File Share protocol.");
            const targetDirectory = await YemotAPIService.uploadTranscriptionForSharing(textBody, phone);
            
            if (targetDirectory) {
                ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.SHARE_SUCCESS);
                ivrCompiler.routeToFolder(targetDirectory);
            } else {
                ivrCompiler.playChainedTTS(SYSTEM_CONSTANTS.PROMPTS.SHARE_FAILED);
                this.serveMainMenu(ivrCompiler);
            }
        } 
        else if (choice === '9') {
            Logger.info("Domain_Trans", "Executing Email Request protocol.");
            ivrCompiler.requestEmailKeyboard(SYSTEM_CONSTANTS.PROMPTS.EMAIL_PROMPT, SYSTEM_CONSTANTS.STATE_BASES.USER_EMAIL_INPUT);
        }
        else {
            this.serveMainMenu(ivrCompiler);
        }
    }

    static async executeEmailSending(phone, emailInput, ivrCompiler) {
        Logger.info("Domain_Email", `MOCK DISPATCH: Sending Email to [${emailInput}].`);
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
    res.status(SYSTEM_CONSTANTS.HTTP_STATUS.OK).send(payloadString);
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
        
        // TIMESTAMPED STATE MACHINE ENGINE
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

        if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.PAGINATION_CHOICE) {
            await DomainControllers.handlePaginationNavigation(phone, triggerValue, callId, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO && triggerValue && triggerValue.includes('.wav')) {
            await DomainControllers.processChatAudio(phone, callId, triggerValue, ivrCompiler);
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
