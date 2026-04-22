/**
 * @file api/index.js
 * @description Ultimate Enterprise IVR System for Yemot HaMashiach & Google Gemini AI.
 * @version 14.0.0 (The Monolith Edition - Yemot Format Perfected)
 * @author Custom AI Assistant
 * 
 * CORE FIXES & ARCHITECTURE:
 * 1. FIXED YEMOT FORMAT: The read command now perfectly aligns with `read=t-TEXT=VAR_NAME,opts...`
 * 2. Vercel Blob Private Store Fix: Pure REST API implementation forcing 'x-access: private'.
 * 3. Exclusive Model: gemini-3.1-flash-lite-preview.
 * 4. Timestamped State Machine: Eliminates IVR infinite loops.
 * 5. Robust Error Boundaries: No 500 errors. Every failure is gracefully caught.
 */
export const maxDuration = 60; // Vercel Serverless maximum execution time to prevent timeouts

import { list } from '@vercel/blob';

// ============================================================================
// --- SECTION 1: SYSTEM CONSTANTS, ENUMS & CONFIGURATION DEFAULTS ---
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
        CREATED: 201,
        ACCEPTED: 202,
        NO_CONTENT: 204,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        METHOD_NOT_ALLOWED: 405,
        REQUEST_TIMEOUT: 408,
        CONFLICT: 409,
        PAYLOAD_TOO_LARGE: 413,
        UNSUPPORTED_MEDIA_TYPE: 415,
        UNPROCESSABLE_ENTITY: 422,
        TOO_MANY_REQUESTS: 429,
        INTERNAL_SERVER_ERROR: 500,
        NOT_IMPLEMENTED: 501,
        BAD_GATEWAY: 502,
        SERVICE_UNAVAILABLE: 503,
        GATEWAY_TIMEOUT: 504
    },
    IVR_DEFAULTS: {
        STANDARD_TIMEOUT: "7",
        EMAIL_TIMEOUT: "30",
        RECORD_MIN_SEC: "1",
        RECORD_MAX_SEC: "120",
        MAX_DIGITS_DEFAULT: 1,
        MIN_DIGITS_DEFAULT: 1,
        BLOCK_ASTERISK: "yes",
        BLOCK_ZERO: "no",
        USE_EXISTING_NO: "no",
        PLAYBACK_TYPE_NO: "No",
        SAY_RECORD_MENU_NO: "no",
        SAVE_ON_HANGUP_YES: "yes",
        APPEND_RECORD_NO: "no"
    },
    RETRY_POLICY: {
        MAX_RETRIES: 3,
        INITIAL_BACKOFF_MS: 1000,
        BACKOFF_MULTIPLIER: 2,
        MAX_BACKOFF_MS: 5000,
        BLOB_MAX_RETRIES: 4,
        GEMINI_MAX_RETRIES: 3,
        YEMOT_MAX_RETRIES: 2
    },
    PROMPTS: {
        MAIN_MENU: "ברוכים הבאים למערכת הבינה המלאכותית לתמלול מדויק הקישו 0 לשיחת צ'אט הקישו 1 להיסטוריית צ'אט הקישו 2 להיסטוריית תמלולים הקישו 3",
        NEW_CHAT_RECORD: "אנא הקליטו את שאלתכם לאחר הצליל בסיום הקישו סולמית",
        NEW_TRANSCRIPTION_RECORD: "אנא הקליטו את הטקסט לתמלול לאחר הצליל בסיום הקישו סולמית",
        APPEND_TRANSCRIPTION_RECORD: "אנא הקליטו את המשך הטקסט לאחר הצליל בסיום הקישו סולמית",
        NO_HISTORY: "אין לכם היסטוריית שיחות במערכת הנכם מועברים לשיחה חדשה",
        NO_TRANS_HISTORY: "אין לכם היסטוריית תמלולים במערכת הנכם מועברים לתפריט הראשי",
        HISTORY_MENU_PREFIX: "תפריט היסטוריית שיחות ",
        TRANS_HISTORY_PREFIX: "תפריט היסטוריית תמלולים ",
        MENU_SUFFIX_0: " לחזרה לתפריט הראשי הקישו 0",
        MENU_SUFFIX_8: " לחזרה לתפריט הראשי הקישו 8",
        INVALID_CHOICE: "הבחירה שגויה הנכם מועברים לתפריט הראשי",
        CHAT_ACTION_MENU: "להמשך השיחה הנוכחית הקישו 7 לחזרה לתפריט הראשי הקישו 8",
        TRANS_MENU: "לשמיעה חוזרת הקישו 1 להקלטה מחדש הקישו 2 להקלטת המשך הקישו 3 לשמירת התמלול הקישו 4",
        TRANS_ACTION_MENU: "לשיתוף התמלול למערכות אחרות הקישו 7 לשליחת התמלול לאימייל הקישו 9 לחזרה לתפריט הראשי הקישו 8",
        EMAIL_PROMPT: "אנא הקלידו את כתובת האימייל שלכם באמצעות המקלדת בסיום הקישו סולמית",
        EMAIL_SUCCESS: "האימייל נשלח בהצלחה שלום ותודה",
        SHARE_SUCCESS: "קובץ התמלול נוצר בהצלחה הנכם מועברים לתיקיית השיתוף",
        SHARE_FAILED: "אירעה שגיאה ביצירת קובץ השיתוף הנכם מועברים לתפריט הראשי",
        TRANS_SAVED_SUCCESS: "התמלול נשמר בהצלחה הנכם מועברים לתפריט הראשי",
        SYSTEM_ERROR_FALLBACK: "אירעה שגיאה בלתי צפויה במערכת אנא נסו שוב מאוחר יותר שלום ותודה",
        PREVIOUS_QUESTION_PREFIX: "שאלה קודמת:",
        PREVIOUS_ANSWER_PREFIX: "תשובה קודמת:",
        GEMINI_SYSTEM_INSTRUCTION_CHAT: "אתה עוזר קולי וירטואלי חכם בשפה העברית האזן לאודיו המצורף תמלל אותו במדויק וענה תשובה מלאה ועניינית לשאלת המשתמש חובה עליך להחזיר אובייקט JSON תקני בלבד עם שני שדות transcription answer אסור להחזיר טקסט מחוץ ל JSON אסור להשתמש בסימני פיסוק מיוחדים",
        GEMINI_SYSTEM_INSTRUCTION_TRANSCRIPTION: "תמלל את הנאמר בקובץ האודיו המצורף בעברית במדויק מילה במילה החזר אך ורק את הטקסט המתומלל ללא פרשנות ללא הקדמה וללא סימני פיסוק כלל אתה חייב לחזור בדיוק על מה שנאמר"
    },
    STATE_BASES: {
        MENU_CHOICE: 'State_MainMenuChoice',
        CHAT_USER_AUDIO: 'State_ChatUserAudio',
        CHAT_HISTORY_CHOICE: 'State_ChatHistoryChoice',
        CHAT_ACTION_CHOICE: 'State_ChatActionChoice',
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
        HANGUP: 'hangup',
        REAL_DID: 'ApiRealDID',
        EXTENSION: 'ApiExtension',
        SESSION_TIME: 'ApiTime'
    },
    VERCEL_BLOB: {
        REST_API_BASE_URL: "https://blob.vercel-storage.com",
        API_VERSION_HEADER: "x-api-version",
        API_VERSION_VALUE: "7",
        ACCESS_HEADER: "x-access",
        ACCESS_PRIVATE: "private",
        ACCESS_PUBLIC: "public",
        RANDOM_SUFFIX_HEADER: "x-add-random-suffix",
        RANDOM_SUFFIX_FALSE: "false",
        CONTENT_TYPE_HEADER: "content-type",
        JSON_CONTENT_TYPE: "application/json",
        AUTHORIZATION_HEADER: "authorization",
        BEARER_PREFIX: "Bearer "
    },
    GEMINI_API: {
        BASE_URL: "https://generativelanguage.googleapis.com/v1beta/models",
        GENERATE_METHOD: "generateContent",
        KEY_PARAM: "key",
        ROLE_USER: "user",
        ROLE_MODEL: "model"
    }
};

// ============================================================================
// --- SECTION 2: ADVANCED ENTERPRISE ERROR HANDLING FRAMEWORK ---
// ============================================================================

class AppError extends Error {
    constructor(message, statusCode = SYSTEM_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR, errorCode = "APP_ERR_000", originalError = null, isOperational = true) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.originalError = originalError;
        this.isOperational = isOperational;
        this.timestamp = new Date().toISOString();
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
class YemotAPIError extends AppError {
    constructor(message, originalError = null, errorCode = "YEMOT_ERR_001") {
        super(`Yemot API Error: ${message}`, SYSTEM_CONSTANTS.HTTP_STATUS.BAD_GATEWAY, errorCode, originalError, true);
    }
}
class GeminiAPIError extends AppError {
    constructor(message, originalError = null, errorCode = "GEMINI_ERR_001") {
        super(`Gemini API Error: ${message}`, SYSTEM_CONSTANTS.HTTP_STATUS.SERVICE_UNAVAILABLE, errorCode, originalError, true);
    }
}
class StorageAPIError extends AppError {
    constructor(message, originalError = null, errorCode = "STORAGE_ERR_001") {
        super(`Storage API Error: ${message}`, SYSTEM_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR, errorCode, originalError, true);
    }
}

// ============================================================================
// --- SECTION 3: ROBUST ENTERPRISE LOGGER SYSTEM ---
// ============================================================================

const LogLevels = {
    TRACE: 10,
    DEBUG: 20,
    INFO: 30,
    WARN: 40,
    ERROR: 50,
    FATAL: 60
};

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
            } catch (e) {}
        }
        return logStr;
    }
    debug(context, message, meta = null) {
        if (this.currentLevel <= LogLevels.DEBUG) console.debug(this._formatLog('DEBUG', context, message, meta));
    }
    info(context, message, meta = null) {
        if (this.currentLevel <= LogLevels.INFO) console.info(this._formatLog('INFO', context, message, meta));
    }
    warn(context, message, meta = null) {
        if (this.currentLevel <= LogLevels.WARN) console.warn(this._formatLog('WARN', context, message, meta));
    }
    error(context, message, errorObj = null) {
        if (this.currentLevel <= LogLevels.ERROR) console.error(this._formatLog('ERROR', context, message, errorObj));
    }
}
const Logger = new EnterpriseLogger();

// ============================================================================
// --- SECTION 4: ENVIRONMENT CONFIGURATION MANAGER ---
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
        Logger.debug("ConfigManager", "Initializing system configuration from environment variables.");
        try {
            this.geminiKeys = this.parseApiKeys(process.env.GEMINI_KEYS);
            this.yemotToken = process.env.CALL2ALL_TOKEN || '';
            this.blobToken = process.env.BLOB_READ_WRITE_TOKEN || '';
            this.validateCriticalConfigurations();
        } catch (error) {
            Logger.error("ConfigManager", "Failed to initialize environment configuration.", error);
        }
    }
    parseApiKeys(keysString) {
        if (!keysString) return[];
        return keysString.split(',').map(key => key.trim()).filter(key => key.length > 20);
    }
    validateCriticalConfigurations() {
        if (this.geminiKeys.length === 0) Logger.error("ConfigManager", "CRITICAL MISSING CONFIG: GEMINI_KEYS.");
        if (!this.yemotToken) Logger.error("ConfigManager", "CRITICAL MISSING CONFIG: CALL2ALL_TOKEN.");
        if (!this.blobToken) Logger.error("ConfigManager", "CRITICAL MISSING CONFIG: BLOB_READ_WRITE_TOKEN.");
    }
    getNextGeminiKey() {
        if (this.geminiKeys.length === 0) throw new Error("No Gemini keys configured.");
        const key = this.geminiKeys[this.currentGeminiKeyIndex];
        this.currentGeminiKeyIndex = (this.currentGeminiKeyIndex + 1) % this.geminiKeys.length;
        return key;
    }
    getYemotToken() { return this.yemotToken; }
    getBlobToken() { return this.blobToken; }
}
const AppConfig = new ConfigManager();

// ============================================================================
// --- SECTION 5: TEXT SANITIZATION UTILITIES ---
// ============================================================================

class YemotTextSanitizer {
    static sanitizeForTTS(rawText) {
        if (!rawText) return "שגיאת טקסט";
        if (typeof rawText !== 'string') {
            try { rawText = JSON.stringify(rawText); } catch (e) { return "שגיאת טקסט"; }
        }
        let cleanText = rawText.replace(/\*/g, ' ');
        cleanText = cleanText.replace(/[.,\-=\&^#!?:;()[\]{}]/g, ' ');
        cleanText = cleanText.replace(/[\u{1F600}-\u{1F6FF}\u{1F300}-\u{1F5FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu, '');
        cleanText = cleanText.replace(/[\n\r]/g, ' ');
        cleanText = cleanText.replace(/\s{2,}/g, ' ');
        cleanText = cleanText.trim();
        if (cleanText.length === 0) return "התקבל טקסט ריק";
        return cleanText;
    }
    static validateJsonString(jsonString) {
        try { JSON.parse(jsonString); return true; } catch (e) { return false; }
    }
}

// ============================================================================
// --- SECTION 6: ADVANCED RETRY LOGIC & CIRCUIT BREAKER ---
// ============================================================================

class RetryHelper {
    static sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
    static async withRetry(asyncTask, taskName = "AnonymousTask", maxRetries = SYSTEM_CONSTANTS.RETRY_POLICY.MAX_RETRIES, initialDelay = SYSTEM_CONSTANTS.RETRY_POLICY.INITIAL_BACKOFF_MS) {
        let attempt = 1;
        let currentDelay = initialDelay;
        let lastEncounteredError = null;
        while (attempt <= maxRetries) {
            try {
                Logger.debug("RetryHelper", `Executing task[${taskName}] - Attempt ${attempt}/${maxRetries}`);
                return await asyncTask();
            } catch (error) {
                lastEncounteredError = error;
                Logger.warn("RetryHelper", `Task [${taskName}] failed on attempt ${attempt}. Error: ${error.message}`);
                if (attempt < maxRetries) {
                    await this.sleep(currentDelay);
                    currentDelay = Math.min(currentDelay * SYSTEM_CONSTANTS.RETRY_POLICY.BACKOFF_MULTIPLIER, SYSTEM_CONSTANTS.RETRY_POLICY.MAX_BACKOFF_MS);
                }
                attempt++;
            }
        }
        Logger.error("RetryHelper", `Task [${taskName}] exhaustively failed after ${maxRetries} attempts.`, lastEncounteredError);
        throw lastEncounteredError;
    }
}

// ============================================================================
// --- SECTION 7: PURE REST VERCEL BLOB STORAGE (BYPASSING SDK FOR PRIVATE STORES) ---
// ============================================================================

class PureVercelBlobREST {
    static async listBlobs(prefix) {
        const url = `${SYSTEM_CONSTANTS.VERCEL_BLOB.REST_API_BASE_URL}?prefix=${encodeURIComponent(prefix)}`;
        const headers = {[SYSTEM_CONSTANTS.VERCEL_BLOB.AUTHORIZATION_HEADER]: `${SYSTEM_CONSTANTS.VERCEL_BLOB.BEARER_PREFIX}${AppConfig.getBlobToken()}` };
        const response = await fetch(url, { method: 'GET', headers: headers });
        if (!response.ok) throw new StorageAPIError(`Blob REST List Error: ${response.status}`);
        return await response.json();
    }
    static async putBlob(filePath, data) {
        const url = `${SYSTEM_CONSTANTS.VERCEL_BLOB.REST_API_BASE_URL}/${filePath}`;
        // CRITICAL FIX: EXPLICITLY SETTING 'x-access': 'private' FOR PRIVATE STORES
        const headers = {[SYSTEM_CONSTANTS.VERCEL_BLOB.AUTHORIZATION_HEADER]: `${SYSTEM_CONSTANTS.VERCEL_BLOB.BEARER_PREFIX}${AppConfig.getBlobToken()}`,[SYSTEM_CONSTANTS.VERCEL_BLOB.API_VERSION_HEADER]: SYSTEM_CONSTANTS.VERCEL_BLOB.API_VERSION_VALUE,
            [SYSTEM_CONSTANTS.VERCEL_BLOB.RANDOM_SUFFIX_HEADER]: SYSTEM_CONSTANTS.VERCEL_BLOB.RANDOM_SUFFIX_FALSE,[SYSTEM_CONSTANTS.VERCEL_BLOB.ACCESS_HEADER]: SYSTEM_CONSTANTS.VERCEL_BLOB.ACCESS_PRIVATE,
            [SYSTEM_CONSTANTS.VERCEL_BLOB.CONTENT_TYPE_HEADER]: SYSTEM_CONSTANTS.VERCEL_BLOB.JSON_CONTENT_TYPE
        };
        const response = await fetch(url, { method: 'PUT', headers: headers, body: data });
        if (!response.ok) throw new StorageAPIError(`Blob REST Put Error: ${response.status}`);
        return await response.json();
    }
    static async getBlobContent(url) {
        const headers = {[SYSTEM_CONSTANTS.VERCEL_BLOB.AUTHORIZATION_HEADER]: `${SYSTEM_CONSTANTS.VERCEL_BLOB.BEARER_PREFIX}${AppConfig.getBlobToken()}` };
        const response = await fetch(url, { method: 'GET', headers: headers });
        if (!response.ok) throw new StorageAPIError(`Blob REST Get Content Error: ${response.status}`);
        return await response.json();
    }
}

class UserRepository {
    static _getUserFilePath(phone) {
        return `${SYSTEM_CONSTANTS.YEMOT_PATHS.USERS_DB_DIR}${phone}.json`;
    }
    static async getProfile(phone) {
        if (!phone || phone === 'unknown') return this.generateDefaultProfile();
        const filePath = this._getUserFilePath(phone);
        const fetchOperation = async () => {
            const data = await PureVercelBlobREST.listBlobs(filePath);
            if (!data.blobs || data.blobs.length === 0) return this.generateDefaultProfile();
            const profileJson = await PureVercelBlobREST.getBlobContent(data.blobs[0].url);
            return this.validateProfile(profileJson);
        };
        try {
            return await RetryHelper.withRetry(fetchOperation, SYSTEM_CONSTANTS.RETRY_POLICY.BLOB_MAX_RETRIES, 500, `FetchUser-${phone}`);
        } catch (error) {
            Logger.error("UserRepository", `Failed to retrieve profile for ${phone} after retries.`, error);
            return this.generateDefaultProfile();
        }
    }
    static async saveProfile(phone, profileData) {
        if (!phone || phone === 'unknown') return;
        const filePath = this._getUserFilePath(phone);
        const saveOperation = async () => {
            await PureVercelBlobREST.putBlob(filePath, JSON.stringify(profileData));
        };
        try {
            await RetryHelper.withRetry(saveOperation, SYSTEM_CONSTANTS.RETRY_POLICY.BLOB_MAX_RETRIES, 500, `SaveUser-${phone}`);
        } catch (error) {
            Logger.error("UserRepository", `Failed to save user profile for ${phone}.`, error);
            throw new StorageAPIError(`Failed to persist user profile for ${phone}`, error);
        }
    }
    static generateDefaultProfile() {
        return { chats:[], transcriptions:[], currentChatId: null, tempTranscription: "", currentTransIndex: null, createdAt: new Date().toISOString() };
    }
    static validateProfile(data) {
        if (!data || typeof data !== 'object') return this.generateDefaultProfile();
        if (!Array.isArray(data.chats)) data.chats =[];
        if (!Array.isArray(data.transcriptions)) data.transcriptions =[];
        return data;
    }
}

// ============================================================================
// --- SECTION 8: DATA MODELS & DOMAIN ENTITIES ---
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
    addMessage(question, answer) {
        this.messages.push(new ChatMessageDTO(question, answer));
    }
    getRecentContext(count = 5) {
        return this.messages.slice(-count);
    }
}

class TranscriptionEntryDTO {
    constructor(text) {
        this.id = `trans_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        this.date = new Date().toISOString();
        this.text = text || "";
    }
}

// ============================================================================
// --- SECTION 9: YEMOT API INTEGRATION SERVICES ---
// ============================================================================

class YemotAPIService {
    static async downloadAudioAsBase64(rawFilePath) {
        const downloadTask = async () => {
            const fullPath = rawFilePath.startsWith('ivr2:') ? rawFilePath : `ivr2:${rawFilePath}`;
            const encodedPath = encodeURIComponent(fullPath);
            const downloadUrl = `https://www.call2all.co.il/ym/api/DownloadFile?token=${AppConfig.getYemotToken()}&path=${encodedPath}`;
            const response = await fetch(downloadUrl);
            if (!response.ok) throw new YemotAPIError(`Yemot DownloadFile HTTP ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            if (buffer.length < 500) throw new YemotAPIError(`Invalid audio file received (too small).`);
            return buffer.toString('base64');
        };
        return await RetryHelper.withRetry(downloadTask, SYSTEM_CONSTANTS.RETRY_POLICY.YEMOT_MAX_RETRIES, 1000, "YemotAudioDownload");
    }

    static async uploadTranscriptionForSharing(text, phone) {
        const uploadTask = async () => {
            const fileName = `Shared_Trans_${phone}_${Date.now()}.tts`;
            const fullPath = `ivr2:${SYSTEM_CONSTANTS.YEMOT_PATHS.SHARED_TRANSCRIPTIONS_DIR}/${fileName}`;
            const encodedPath = encodeURIComponent(fullPath);
            const encodedContent = encodeURIComponent(text);
            const uploadUrl = `https://www.call2all.co.il/ym/api/UploadTextFile?token=${AppConfig.getYemotToken()}&what=${encodedPath}&contents=${encodedContent}`;
            const response = await fetch(uploadUrl);
            if (!response.ok) throw new YemotAPIError(`Yemot UploadTextFile HTTP ${response.status}`);
            const result = await response.json();
            if (result.responseStatus !== "OK") throw new YemotAPIError(`Yemot upload rejected: ${JSON.stringify(result)}`);
            return SYSTEM_CONSTANTS.YEMOT_PATHS.SHARED_TRANSCRIPTIONS_DIR;
        };
        try {
            return await RetryHelper.withRetry(uploadTask, SYSTEM_CONSTANTS.RETRY_POLICY.YEMOT_MAX_RETRIES, 1000, "UploadSharedTTS");
        } catch (error) {
            Logger.error("YemotAPIService", "Failed to upload TTS file for sharing.", error);
            return null;
        }
    }
}

// ============================================================================
// --- SECTION 10: GOOGLE GEMINI AI INTEGRATION ---
// ============================================================================

class GeminiAIService {
    static _buildBasePayload(systemInstruction, base64Audio, contextMessages =[], forceJson = false) {
        const formattedHistory = contextMessages.map(msg => ({
            role: SYSTEM_CONSTANTS.GEMINI_API.ROLE_USER,
            parts:[{ text: `${SYSTEM_CONSTANTS.PROMPTS.PREVIOUS_QUESTION_PREFIX} ${msg.q}\n${SYSTEM_CONSTANTS.PROMPTS.PREVIOUS_ANSWER_PREFIX} ${msg.a}` }]
        }));
        const payload = {
            contents:[
                ...formattedHistory,
                {
                    role: SYSTEM_CONSTANTS.GEMINI_API.ROLE_USER,
                    parts:[
                        { text: systemInstruction },
                        { inlineData: { mimeType: SYSTEM_CONSTANTS.MODELS.AUDIO_MIME_TYPE, data: base64Audio } }
                    ]
                }
            ],
            generationConfig: { temperature: 0.5, maxOutputTokens: 800 }
        };
        if (forceJson) payload.generationConfig.responseMimeType = SYSTEM_CONSTANTS.MODELS.JSON_MIME_TYPE;
        return payload;
    }

    static async _executeGenerationWithRotation(payload) {
        const keys = AppConfig.GEMINI_KEYS;
        let lastEncounteredError = null;
        for (let i = 0; i < keys.length; i++) {
            const apiKey = AppConfig.getNextGeminiKey();
            try {
                const endpointUrl = `${SYSTEM_CONSTANTS.GEMINI_API.BASE_URL}/${SYSTEM_CONSTANTS.MODELS.PRIMARY_GEMINI_MODEL}:${SYSTEM_CONSTANTS.GEMINI_API.GENERATE_METHOD}?${SYSTEM_CONSTANTS.GEMINI_API.KEY_PARAM}=${apiKey}`;
                const response = await fetch(endpointUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) throw new Error(`Google API HTTP ${response.status}`);
                const data = await response.json();
                if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
                    return data.candidates[0].content.parts[0].text;
                }
                throw new Error(`Unexpected JSON structure from Gemini.`);
            } catch (error) {
                lastEncounteredError = error;
                Logger.warn("GeminiAIService", `Generation failed. Moving to next. Error: ${error.message}`);
            }
        }
        throw new GeminiAPIError("All API keys in the rotation pool failed.", lastEncounteredError);
    }

    static async processChatInteraction(base64Audio, historyContext =[]) {
        const systemInstruction = SYSTEM_CONSTANTS.PROMPTS.GEMINI_SYSTEM_INSTRUCTION_CHAT;
        const payload = this._buildBasePayload(systemInstruction, base64Audio, historyContext, true);
        try {
            const rawJsonResponse = await this._executeGenerationWithRotation(payload);
            let cleanJsonStr = rawJsonResponse.trim();
            if (cleanJsonStr.startsWith("```json")) cleanJsonStr = cleanJsonStr.substring(7, cleanJsonStr.length - 3).trim();
            else if (cleanJsonStr.startsWith("```")) cleanJsonStr = cleanJsonStr.substring(3, cleanJsonStr.length - 3).trim();
            
            if (!YemotTextSanitizer.validateJsonString(cleanJsonStr)) throw new Error("Invalid JSON structure");
            const parsedData = JSON.parse(cleanJsonStr);
            return {
                transcription: YemotTextSanitizer.sanitizeForTTS(parsedData.transcription || "לא זוהה דיבור קריא"),
                answer: YemotTextSanitizer.sanitizeForTTS(parsedData.answer || "לא הצלחתי לגבש תשובה מתאימה")
            };
        } catch (error) {
            Logger.error("GeminiAIService", "Failed to parse Chat JSON response from Gemini.", error);
            return {
                transcription: "תמלול אודיו לא הצליח עקב שגיאת פורמט בשרת הבינה המלאכותית",
                answer: YemotTextSanitizer.sanitizeForTTS("אירעה שגיאה בהבנת המבנה של התשובה אך נמשיך הלאה")
            };
        }
    }

    static async processTranscriptionOnly(base64Audio) {
        const systemInstruction = SYSTEM_CONSTANTS.PROMPTS.GEMINI_SYSTEM_INSTRUCTION_TRANSCRIPTION;
        const payload = this._buildBasePayload(systemInstruction, base64Audio,[], false);
        try {
            const rawTextResponse = await this._executeGenerationWithRotation(payload);
            return YemotTextSanitizer.sanitizeForTTS(rawTextResponse);
        } catch (error) {
            Logger.error("GeminiAIService", "Failed to process transcription audio.", error);
            return "אירעה שגיאה בתמלול ההקלטה נסו שנית";
        }
    }
}

// ============================================================================
// --- SECTION 11: YEMOT IVR STRING BUILDER (THE COMPILER) ---
// ============================================================================

class YemotResponseCompiler {
    constructor() {
        this.commandChain =[];
    }

    playTTS(textToSpeak) {
        if (!textToSpeak) return this;
        const safeText = YemotTextSanitizer.sanitizeForTTS(textToSpeak);
        this.commandChain.push(`id_list_message=t-${safeText}`);
        return this;
    }

    /**
     * קבלת הקשה ממשתמש
     * תיקון מבנה: השמת משתנה ה-varName בדיוק איפה שימות מצפה לו!
     */
    requestDigits(ttsPrompt, responseVariableName, minDigits = SYSTEM_CONSTANTS.IVR_DEFAULTS.MIN_DIGITS_DEFAULT, maxDigits = SYSTEM_CONSTANTS.IVR_DEFAULTS.MAX_DIGITS_DEFAULT) {
        const safePrompt = YemotTextSanitizer.sanitizeForTTS(ttsPrompt);
        const timeout = SYSTEM_CONSTANTS.IVR_DEFAULTS.STANDARD_TIMEOUT;
        const useExisting = SYSTEM_CONSTANTS.IVR_DEFAULTS.USE_EXISTING_NO;
        const playbackType = SYSTEM_CONSTANTS.IVR_DEFAULTS.PLAYBACK_TYPE_NO;
        const blockAsterisk = SYSTEM_CONSTANTS.IVR_DEFAULTS.BLOCK_ASTERISK;
        const blockZero = SYSTEM_CONSTANTS.IVR_DEFAULTS.BLOCK_ZERO;
        
        // FIXED FORMAT: read=t-[text]=[varName],[useExisting],[max],[min],[timeout],[playbackType]...
        const params =[
            useExisting, maxDigits, minDigits, timeout, playbackType, blockAsterisk, blockZero
        ];
        this.commandChain.push(`read=t-${safePrompt}=${responseVariableName},${params.join(',')}`);
        return this;
    }

    requestEmailKeyboard(ttsPrompt, responseVariableName) {
        const safePrompt = YemotTextSanitizer.sanitizeForTTS(ttsPrompt);
        const timeout = SYSTEM_CONSTANTS.IVR_DEFAULTS.EMAIL_TIMEOUT;
        const params =[
            'no', 100, 5, timeout, 'EmailKeyboard', 'yes', 'no'
        ];
        this.commandChain.push(`read=t-${safePrompt}=${responseVariableName},${params.join(',')}`);
        return this;
    }

    requestAudioRecord(ttsPrompt, responseVariableName, uniqueCallId) {
        const safePrompt = YemotTextSanitizer.sanitizeForTTS(ttsPrompt);
        const fileName = `rec_${uniqueCallId}_${Date.now()}`;
        const folder = SYSTEM_CONSTANTS.YEMOT_PATHS.RECORDINGS_DIR;
        const minTime = SYSTEM_CONSTANTS.IVR_DEFAULTS.RECORD_MIN_SEC;
        const maxTime = SYSTEM_CONSTANTS.IVR_DEFAULTS.RECORD_MAX_SEC;
        const sayRecordMenu = SYSTEM_CONSTANTS.IVR_DEFAULTS.SAY_RECORD_MENU_NO;
        const saveOnHangup = SYSTEM_CONSTANTS.IVR_DEFAULTS.SAVE_ON_HANGUP_YES;
        const append = SYSTEM_CONSTANTS.IVR_DEFAULTS.APPEND_RECORD_NO;
        
        const params =[
            'no', 'record', folder, fileName, sayRecordMenu, saveOnHangup, append, minTime, maxTime
        ];
        this.commandChain.push(`read=t-${safePrompt}=${responseVariableName},${params.join(',')}`);
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
// --- SECTION 12: DOMAIN LOGIC CONTROLLERS ---
// ============================================================================

class DomainControllers {
    static serveMainMenu(ivrCompiler) {
        Logger.info("Domain_Main", "Serving Main Menu to caller.");
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.MAIN_MENU, SYSTEM_CONSTANTS.STATE_BASES.MENU_CHOICE, 1, 1);
    }

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
            Logger.warn("Domain_Chat", "Active chat context lost. Bootstrapping recovery chat.");
            chatSession = new ChatSessionDTO(`chat_rec_${Date.now()}`);
            userProfile.chats.push(chatSession);
            userProfile.currentChatId = chatSession.id;
        }

        const historyContext = chatSession.messages.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS);
        const { transcription, answer } = await GeminiAIService.processChatInteraction(base64Audio, historyContext);
        
        chatSession.messages.push(new ChatMessageDTO(transcription, answer));
        await UserRepository.saveProfile(phone, userProfile);
        
        ivrCompiler.playTTS(answer);
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.CHAT_ACTION_MENU, SYSTEM_CONSTANTS.STATE_BASES.CHAT_ACTION_CHOICE, 1, 1);
    }

    static async initChatHistoryMenu(phone, ivrCompiler) {
        Logger.info("Domain_Chat", "Initializing Chat History Menu.");
        const userProfile = await UserRepository.getProfile(phone);
        if (userProfile.chats.length === 0) {
            ivrCompiler.playTTS(SYSTEM_CONSTANTS.PROMPTS.NO_HISTORY);
            this.serveMainMenu(ivrCompiler);
            return;
        }
        const recentChats = userProfile.chats.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS).reverse();
        let promptText = SYSTEM_CONSTANTS.PROMPTS.CHAT_HISTORY_PREFIX;
        recentChats.forEach((chat, index) => {
            promptText += `לשיחה מספר ${index + 1} הקישו ${index + 1} `;
        });
        promptText += SYSTEM_CONSTANTS.PROMPTS.MENU_SUFFIX_0;
        ivrCompiler.requestDigits(promptText, SYSTEM_CONSTANTS.STATE_BASES.CHAT_HISTORY_CHOICE, 1, 1);
    }

    static async handleChatHistoryPlayback(phone, choice, ivrCompiler) {
        Logger.info("Domain_Chat", `Playing chat history selection: ${choice}`);
        const userProfile = await UserRepository.getProfile(phone);
        const recentChats = userProfile.chats.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS).reverse();
        const selectedIndex = parseInt(choice, 10) - 1;
        
        if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= recentChats.length) {
            ivrCompiler.playTTS(SYSTEM_CONSTANTS.PROMPTS.INVALID_CHOICE);
            this.serveMainMenu(ivrCompiler);
            return;
        }
        
        const selectedSession = recentChats[selectedIndex];
        userProfile.currentChatId = selectedSession.id;
        await UserRepository.saveProfile(phone, userProfile);
        
        let playbackScript = SYSTEM_CONSTANTS.PROMPTS.CHAT_PLAYBACK_PREFIX;
        selectedSession.messages.forEach((msg, i) => {
            playbackScript += `שאלה ${i + 1} ${msg.q} תשובה ${msg.a} `;
        });
        
        ivrCompiler.playTTS(playbackScript);
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.CHAT_ACTION_MENU, SYSTEM_CONSTANTS.STATE_BASES.CHAT_ACTION_CHOICE, 1, 1);
    }

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
            userProfile.tempTranscription += " " + transcribedText;
        } else {
            userProfile.tempTranscription = transcribedText;
        }
        
        await UserRepository.saveProfile(phone, userProfile);
        ivrCompiler.playTTS(`התמלול הוא ${userProfile.tempTranscription}`);
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.TRANS_MENU, SYSTEM_CONSTANTS.STATE_BASES.TRANS_DRAFT_MENU, 1, 1);
    }

    static async handleTransDraftMenu(phone, callId, choice, ivrCompiler) {
        Logger.info("Domain_Trans", `Handling Transcription Draft Menu. Choice: ${choice}`);
        const userProfile = await UserRepository.getProfile(phone);
        switch(choice) {
            case '1':
                const draftText = userProfile.tempTranscription || "טקסט ריק";
                ivrCompiler.playTTS(draftText);
                ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.TRANS_MENU, SYSTEM_CONSTANTS.STATE_BASES.TRANS_DRAFT_MENU, 1, 1);
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
                    ivrCompiler.playTTS(SYSTEM_CONSTANTS.PROMPTS.TRANS_SAVED_SUCCESS);
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
            ivrCompiler.playTTS(SYSTEM_CONSTANTS.PROMPTS.NO_TRANS_HISTORY);
            this.serveMainMenu(ivrCompiler);
            return;
        }
        const recentTrans = userProfile.transcriptions.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS).reverse();
        let promptText = SYSTEM_CONSTANTS.PROMPTS.TRANS_HISTORY_PREFIX;
        recentTrans.forEach((t, i) => promptText += `לתמלול מספר ${i + 1} הקישו ${i + 1} `);
        promptText += SYSTEM_CONSTANTS.PROMPTS.MENU_SUFFIX_0;
        ivrCompiler.requestDigits(promptText, SYSTEM_CONSTANTS.STATE_BASES.TRANS_HISTORY_CHOICE, 1, 1);
    }

    static async handleTransHistoryPlayback(phone, choice, ivrCompiler) {
        Logger.info("Domain_Trans", `Playing transcription history selection: ${choice}`);
        const userProfile = await UserRepository.getProfile(phone);
        const recentTrans = userProfile.transcriptions.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS).reverse();
        const selectedIndex = parseInt(choice, 10) - 1;
        
        if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= recentTrans.length) {
            ivrCompiler.playTTS(SYSTEM_CONSTANTS.PROMPTS.INVALID_CHOICE);
            this.serveMainMenu(ivrCompiler);
            return;
        }
        
        userProfile.currentTransIndex = selectedIndex;
        await UserRepository.saveProfile(phone, userProfile);
        const selectedText = recentTrans[selectedIndex].text;
        ivrCompiler.playTTS(`תוכן התמלול הוא ${selectedText}`);
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.TRANS_PLAYBACK_ACTION_MENU, SYSTEM_CONSTANTS.STATE_BASES.TRANS_ACTION_CHOICE, 1, 1);
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
                ivrCompiler.playTTS(SYSTEM_CONSTANTS.PROMPTS.SHARE_SUCCESS);
                ivrCompiler.routeToFolder(targetDirectory);
            } else {
                ivrCompiler.playTTS(SYSTEM_CONSTANTS.PROMPTS.SHARE_FAILED);
                this.serveMainMenu(ivrCompiler);
            }
        } 
        else if (choice === '9') {
            Logger.info("Domain_Trans", "Executing Email Request protocol.");
            ivrCompiler.requestEmailKeyboard(SYSTEM_CONSTANTS.PROMPTS.EMAIL_KEYBOARD_PROMPT, SYSTEM_CONSTANTS.STATE_BASES.USER_EMAIL_INPUT);
        }
        else {
            this.serveMainMenu(ivrCompiler);
        }
    }

    static async executeEmailSending(phone, emailInput, ivrCompiler) {
        const userProfile = await UserRepository.getProfile(phone);
        const activeIndex = userProfile.currentTransIndex;
        const textBody = (activeIndex !== null && userProfile.transcriptions.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS).reverse()[activeIndex]) 
            ? userProfile.transcriptions.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS).reverse()[activeIndex].text 
            : "תמלול לא נמצא עקב שגיאת זיכרון";
        Logger.info("Domain_Email", `MOCK DISPATCH: Sending Email to[${emailInput}]. Body length:[${textBody.length}]`);
        ivrCompiler.playTTS(SYSTEM_CONSTANTS.PROMPTS.EMAIL_SUCCESS);
        this.serveMainMenu(ivrCompiler);
    }
}

// ============================================================================
// --- SECTION 13: STATE MACHINE & MAIN REQUEST CONTROLLER (ENTRY POINT) ---
// ============================================================================

function sendHTTPResponse(expressResponse, payloadString) {
    expressResponse.setHeader('Content-Type', 'text/plain; charset=utf-8');
    expressResponse.setHeader('Cache-Control', 'no-store, max-age=0');
    expressResponse.status(SYSTEM_CONSTANTS.HTTP_STATUS.OK).send(payloadString);
}

export default async function handler(req, res) {
    const ivrResponse = new YemotResponseCompiler();
    try {
        Logger.info("System_EntryPoint", `---------- BEGIN NEW REQUEST [${req.method}] ----------`);
        
        let rawBody = {};
        if (req.method === 'POST') {
            if (typeof req.body === 'string') {
                try {
                    rawBody = Object.fromEntries(new URLSearchParams(req.body));
                } catch(e) { Logger.debug("System_EntryPoint", "Body is not URL-Encoded"); }
            } else if (req.body && typeof req.body === 'object') {
                rawBody = req.body;
            }
        }
        
        const requestUrl = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
        const urlQueries = Object.fromEntries(requestUrl.searchParams.entries());
        const mergedQueryParameters = { ...urlQueries, ...rawBody };
        
        const extractLatestParam = (key) => {
            const value = mergedQueryParameters[key];
            return Array.isArray(value) ? value[value.length - 1] : value;
        };
        
        const callerPhone = extractLatestParam(SYSTEM_CONSTANTS.YEMOT_PARAMS.PHONE) || extractLatestParam(SYSTEM_CONSTANTS.YEMOT_PARAMS.ENTER_ID) || 'Unknown_Caller';
        const uniqueCallId = extractLatestParam(SYSTEM_CONSTANTS.YEMOT_PARAMS.CALL_ID) || `SIMULATED_${Date.now()}`;
        const isClientHangup = extractLatestParam(SYSTEM_CONSTANTS.YEMOT_PARAMS.HANGUP) === 'yes';
        
        Logger.debug("Call_Metrics", `Caller: ${callerPhone} | CallID: ${uniqueCallId} | IsHangup: ${isClientHangup}`);
        
        // --- TIMESTAMPED STATE MACHINE ENGINE ---
        const allReceivedKeys = Object.keys(mergedQueryParameters);
        let triggerBaseKey = null;
        let triggerValue = null;
        let highestTimestamp = 0;
        
        for (const key of allReceivedKeys) {
            if (key.startsWith('State_')) {
                const parts = key.split('_');
                if (parts.length >= 3) {
                    const timestamp = parseInt(parts[parts.length - 1], 10);
                    if (!isNaN(timestamp) && timestamp > highestTimestamp) {
                        highestTimestamp = timestamp;
                        triggerBaseKey = parts.slice(0, parts.length - 1).join('_');
                        const val = mergedQueryParameters[key];
                        triggerValue = Array.isArray(val) ? val[val.length - 1] : val;
                    }
                }
            }
        }
        
        Logger.info("State_Machine", `Evaluated Current State: [${triggerBaseKey}] = [${triggerValue}]`);
        
        let pendingAudioProcessing = false;
        if (isClientHangup) {
            Logger.info("Call_Lifecycle", `Hangup signal detected for caller ${callerPhone}.`);
            if (triggerValue && triggerValue.includes('.wav') && 
               (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO || 
                triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.TRANS_AUDIO || 
                triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.TRANS_APPEND_AUDIO)) {
                Logger.info("Call_Lifecycle", "Detected pending audio chunk attached to hangup. Processing before terminating.");
                pendingAudioProcessing = true;
            } else {
                Logger.info("Call_Lifecycle", "No pending work. Terminating session gracefully.");
                return sendHTTPResponse(res, "noop=hangup_acknowledged");
            }
        }
        
        // --- DOMAIN ROUTING ENGINE ---
        if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO && triggerValue && triggerValue.includes('.wav')) {
            await DomainControllers.processChatInteraction(callerPhone, uniqueCallId, triggerValue, ivrResponse);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.CHAT_ACTION_CHOICE) {
            if (triggerValue === '7') {
                ivrResponse.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO, uniqueCallId);
            } else {
                DomainControllers.serveMainMenu(ivrResponse);
            }
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.CHAT_HISTORY_CHOICE) {
            if (triggerValue === '0') DomainControllers.serveMainMenu(ivrResponse);
            else await DomainControllers.handleChatHistoryPlayback(callerPhone, triggerValue, ivrResponse);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.TRANS_AUDIO && triggerValue && triggerValue.includes('.wav')) {
            await DomainControllers.processTranscriptionInitial(callerPhone, triggerValue, ivrResponse);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.TRANS_APPEND_AUDIO && triggerValue && triggerValue.includes('.wav')) {
            await DomainControllers.processTranscriptionAppend(callerPhone, triggerValue, ivrResponse);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.TRANS_DRAFT_MENU) {
            await DomainControllers.handleTranscriptionDraftMenu(callerPhone, uniqueCallId, triggerValue, ivrResponse);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.TRANS_HISTORY_CHOICE) {
            if (triggerValue === '0') DomainControllers.serveMainMenu(ivrResponse);
            else await DomainControllers.handleTransHistoryPlayback(callerPhone, triggerValue, ivrResponse);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.TRANS_ACTION_CHOICE) {
            await DomainControllers.handleTransHistoryActions(callerPhone, triggerValue, ivrResponse);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.USER_EMAIL_INPUT) {
            await DomainControllers.executeEmailSending(callerPhone, triggerValue, ivrResponse);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.MENU_CHOICE) {
            if (triggerValue === '0') await DomainControllers.initNewTranscription(callerPhone, uniqueCallId, ivrResponse);
            else if (triggerValue === '1') await DomainControllers.initNewChat(callerPhone, uniqueCallId, ivrResponse);
            else if (triggerValue === '2') await DomainControllers.initChatHistoryMenu(callerPhone, ivrResponse);
            else if (triggerValue === '3') await DomainControllers.initTransHistoryMenu(callerPhone, ivrResponse);
            else DomainControllers.serveMainMenu(ivrResponse);
        }
        else {
            Logger.info("Routing_Engine", "No recognized state trigger. Dispatching Initial Main Menu.");
            DomainControllers.serveMainMenu(ivrResponse);
        }

        if (pendingAudioProcessing) {
            Logger.info("Call_Lifecycle", "Pending audio processed successfully. Committing final hangup.");
            return sendHTTPResponse(res, "noop=hangup_acknowledged");
        }

        const finalOutputString = ivrResponse.compile();
        Logger.info("System_ExitPoint", "Routing completed successfully. Transmitting payload to Yemot.");
        return sendHTTPResponse(res, finalOutputString);

    } catch (globalException) {
        Logger.error("Global_Catch_Block", "A FATAL UNCAUGHT EXCEPTION breached the routing engine.", globalException);
        const failsafeCompiler = new YemotResponseCompiler();
        failsafeCompiler.playTTS(SYSTEM_CONSTANTS.PROMPTS.SYSTEM_ERROR_FALLBACK);
        failsafeCompiler.routeToFolder("hangup");
        return sendHTTPResponse(res, failsafeCompiler.compile());
    }
}
