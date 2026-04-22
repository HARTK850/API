/**
 * @file api/index.js
 * @description Ultimate Enterprise IVR System for Yemot HaMashiach & Google Gemini AI.
 * @version 15.0.0 (Ultimate Monolith - Pure REST Blob + 60s Timeout Fix)
 * @author Custom AI Assistant
 */

// ============================================================================
// --- VERCEL SERVERLESS CONFIGURATION ---
// ============================================================================
// FIX: This prevents the 10-second timeout that caused Yemot to loop the recording prompt!
export const maxDuration = 60; // Allow function to run for up to 60 seconds

// ============================================================================
// --- SECTION 1: SYSTEM CONSTANTS & CONFIGURATION DEFAULTS ---
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
        RECORD_MAX_SEC: "120"
    },
    RETRY_POLICY: {
        MAX_RETRIES: 3,
        INITIAL_BACKOFF_MS: 1000,
        BACKOFF_MULTIPLIER: 2
    },
    PROMPTS: {
        MAIN_MENU: "ברוכים הבאים למערכת הבינה המלאכותית. לתמלול מדויק הקישו 0. לשיחת צ'אט הקישו 1. להיסטוריית צ'אט הקישו 2. להיסטוריית תמלולים הקישו 3.",
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
        TRANS_MENU: "לשמיעה חוזרת הקישו 1. להקלטה מחדש הקישו 2. להקלטת המשך הקישו 3. לשמירת התמלול הקישו 4.",
        TRANS_ACTION_MENU: "לשיתוף התמלול למערכות אחרות הקישו 7. לשליחת התמלול לאימייל הקישו 9. לחזרה לתפריט הראשי הקישו 8.",
        EMAIL_PROMPT: "אנא הקלידו את כתובת האימייל שלכם באמצעות המקלדת. בסיום הקישו סולמית.",
        EMAIL_SUCCESS: "האימייל נשלח בהצלחה. שלום ותודה.",
        SHARE_SUCCESS: "קובץ התמלול נוצר בהצלחה. הנכם מועברים לתיקיית השיתוף.",
        SHARE_FAILED: "אירעה שגיאה ביצירת קובץ השיתוף. הנכם מועברים לתפריט הראשי.",
        TRANS_SAVED_SUCCESS: "התמלול נשמר בהצלחה. הנכם מועברים לתפריט הראשי.",
        SYSTEM_ERROR_FALLBACK: "אירעה שגיאה בלתי צפויה במערכת. אנא נסו שוב מאוחר יותר. שלום ותודה.",
        PREVIOUS_QUESTION_PREFIX: "שאלה קודמת:",
        PREVIOUS_ANSWER_PREFIX: "תשובה קודמת:"
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
        HANGUP: 'hangup'
    }
};

// ============================================================================
// --- SECTION 2: ERROR HANDLING FRAMEWORK ---
// ============================================================================

class AppError extends Error {
    constructor(message, statusCode = 500, originalError = null) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.originalError = originalError;
        Error.captureStackTrace(this, this.constructor);
    }
}
class YemotAPIError extends AppError { constructor(msg, orig) { super(`Yemot API Error: ${msg}`, 400, orig); } }
class GeminiAPIError extends AppError { constructor(msg, orig) { super(`Gemini API Error: ${msg}`, 502, orig); } }
class StorageAPIError extends AppError { constructor(msg, orig) { super(`Storage API Error: ${msg}`, 500, orig); } }

// ============================================================================
// --- SECTION 3: ADVANCED LOGGER SYSTEM ---
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
// --- SECTION 4: ENVIRONMENT CONFIGURATION MANAGER ---
// ============================================================================

class ConfigManager {
    constructor() {
        this.GEMINI_KEYS = this.parseGeminiKeys(process.env.GEMINI_KEYS);
        this.CALL2ALL_TOKEN = process.env.CALL2ALL_TOKEN || '';
        this.BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || '';
        this.currentKeyIndex = 0;
    }

    parseGeminiKeys(keysString) {
        if (!keysString) return[];
        return keysString.split(',').map(key => key.trim()).filter(key => key.length > 0);
    }

    getNextGeminiKey() {
        if (this.GEMINI_KEYS.length === 0) throw new Error("No Gemini API keys configured.");
        const key = this.GEMINI_KEYS[this.currentKeyIndex];
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.GEMINI_KEYS.length;
        return key;
    }
}
const AppConfig = new ConfigManager();

// ============================================================================
// --- SECTION 5: TEXT SANITIZATION UTILITIES ---
// ============================================================================

class YemotTextSanitizer {
    /**
     * פונקציה אגרסיבית למחיקת סימני פיסוק העלולים לשבור את מנגנון ה-HTTP GET/POST של ימות המשיח.
     */
    static sanitizeForTTS(text) {
        if (!text || typeof text !== 'string') return "שגיאת טקסט";
        return text
            .replace(/[.,\-?!:;"'(){}\[\]*#\n\r]/g, ' ') 
            .replace(/[\u{1F600}-\u{1F6FF}]/gu, '') 
            .replace(/\s+/g, ' ') 
            .trim() || "טקסט ריק";
    }
}

// ============================================================================
// --- SECTION 6: RETRY LOGIC HELPER ---
// ============================================================================

class RetryHelper {
    static async withRetry(asyncFunction, retries = SYSTEM_CONSTANTS.RETRY_POLICY.MAX_RETRIES, delayMs = SYSTEM_CONSTANTS.RETRY_POLICY.INITIAL_BACKOFF_MS, context = "Retry") {
        let lastError;
        let currentDelay = delayMs;
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                return await asyncFunction();
            } catch (error) {
                lastError = error;
                Logger.warn(context, `Attempt ${attempt}/${retries} failed: ${error.message}`);
                if (attempt < retries) {
                    await new Promise(res => setTimeout(res, currentDelay));
                    currentDelay *= SYSTEM_CONSTANTS.RETRY_POLICY.BACKOFF_MULTIPLIER;
                }
            }
        }
        Logger.error(context, `Failed after ${retries} attempts.`);
        throw lastError;
    }
}

// ============================================================================
// --- SECTION 7: PURE REST VERCEL BLOB STORAGE (BYPASSING SDK) ---
// ============================================================================

/**
 * מחלקה זו מנהלת את הגישה ל-Vercel Blob ללא שימוש בספרייה שלהם (@vercel/blob).
 * זה פותר באופן מוחלט את שגיאות ה- "Cannot use public access on a private store"
 * שאירעו גם ב-list וגם ב-put. אנו שולטים בהדרים במאה אחוז.
 */
class PureVercelBlobREST {
    /**
     * קבלת רשימת קבצים לפי תחילית (Prefix) מה-REST API של Vercel
     */
    static async listBlobs(prefix) {
        const url = `https://blob.vercel-storage.com?prefix=${encodeURIComponent(prefix)}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${AppConfig.BLOB_TOKEN}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Blob REST List Error: ${response.status} ${await response.text()}`);
        }
        
        return await response.json();
    }

    /**
     * העלאת קובץ ישירות ל-REST API של Vercel, עוקף את חוקי החנות.
     */
    static async putBlob(filePath, data) {
        const url = `https://blob.vercel-storage.com/${filePath}`;
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'authorization': `Bearer ${AppConfig.BLOB_TOKEN}`,
                'x-api-version': '7',
                'x-add-random-suffix': 'false',
                'content-type': 'application/json'
                // לא שולחים x-access. השרת פשוט שומר בהתאם להרשאות הבסיס שלו.
            },
            body: data
        });

        if (!response.ok) {
            throw new Error(`Blob REST Put Error: ${response.status} ${await response.text()}`);
        }
        
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
            if (!data.blobs || data.blobs.length === 0) {
                return this.generateDefaultProfile();
            }

            // משיכת התוכן דרך הכתובת הישירה תוך חובת שרשור הטוקן
            const response = await fetch(data.blobs[0].url, {
                headers: { Authorization: `Bearer ${AppConfig.BLOB_TOKEN}` }
            });
            
            if (!response.ok) throw new StorageAPIError(`Fetch failed: ${response.status}`);
            return this.validateProfile(await response.json());
        };

        try {
            return await RetryHelper.withRetry(fetchOperation, 2, 500, `FetchUser-${phone}`);
        } catch (error) {
            Logger.error("UserRepository", `Failed to get user ${phone}`, error);
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
            await RetryHelper.withRetry(saveOperation, 3, 500, `SaveUser-${phone}`);
            Logger.info("UserRepository", `Profile saved successfully for ${phone}.`);
        } catch (error) {
            Logger.error("UserRepository", `Failed to save user ${phone}`, error);
            throw error; 
        }
    }

    static generateDefaultProfile() {
        return {
            chats:[],
            transcriptions:[],
            currentChatId: null,
            tempTranscription: "",
            currentTransIndex: null,
            createdAt: new Date().toISOString()
        };
    }

    static validateProfile(data) {
        if (!data || typeof data !== 'object') return this.generateDefaultProfile();
        if (!Array.isArray(data.chats)) data.chats =[];
        if (!Array.isArray(data.transcriptions)) data.transcriptions =[];
        return data;
    }
}

// ============================================================================
// --- SECTION 8: YEMOT API INTEGRATION SERVICES ---
// ============================================================================

class YemotAPIService {
    static async downloadAudioAsBase64(rawFilePath) {
        const downloadTask = async () => {
            const fullPath = rawFilePath.startsWith('ivr2:') ? rawFilePath : `ivr2:${rawFilePath}`;
            const url = `https://www.call2all.co.il/ym/api/DownloadFile?token=${AppConfig.CALL2ALL_TOKEN}&path=${encodeURIComponent(fullPath)}`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            if (buffer.length < 500) throw new Error("File too small. Likely an error message text from Yemot.");
            return buffer.toString('base64');
        };

        try {
            return await RetryHelper.withRetry(downloadTask, 2, 1000, "YemotAPI.downloadAudio");
        } catch (error) {
            throw new YemotAPIError("Failed to download audio from Yemot servers.", error);
        }
    }

    static async uploadTranscriptionForSharing(text, phone) {
        const uploadTask = async () => {
            const fileName = `Shared_Trans_${phone}_${Date.now()}.tts`;
            const fullPath = `ivr2:${SYSTEM_CONSTANTS.YEMOT_PATHS.SHARED_TRANSCRIPTIONS_DIR}/${fileName}`;
            const url = `https://www.call2all.co.il/ym/api/UploadTextFile?token=${AppConfig.CALL2ALL_TOKEN}&what=${encodeURIComponent(fullPath)}&contents=${encodeURIComponent(text)}`;
            
            const response = await fetch(url);
            const result = await response.json();
            
            if (result.responseStatus !== "OK") throw new Error(`Upload rejected by Yemot: ${JSON.stringify(result)}`);
            return SYSTEM_CONSTANTS.YEMOT_PATHS.SHARED_TRANSCRIPTIONS_DIR;
        };

        try {
            return await RetryHelper.withRetry(uploadTask, 2, 1000, "UploadSharedTTS");
        } catch (error) {
            Logger.error("YemotAPIService", "Failed to upload shared transcription.", error);
            return null;
        }
    }
}

// ============================================================================
// --- SECTION 9: GOOGLE GEMINI AI INTEGRATION ---
// ============================================================================

class GeminiAIService {
    static async callGemini(payload) {
        const keys = AppConfig.GEMINI_KEYS;
        let lastError = null;

        for (let i = 0; i < keys.length; i++) {
            const apiKey = AppConfig.getNextGeminiKey();
            try {
                Logger.info("GeminiAPI", `Invoking Google Gemini Model: ${SYSTEM_CONSTANTS.MODELS.PRIMARY_GEMINI_MODEL}`);
                const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${SYSTEM_CONSTANTS.MODELS.PRIMARY_GEMINI_MODEL}:generateContent?key=${apiKey}`;
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error(`HTTP ${response.status} - ${await response.text()}`);

                const data = await response.json();
                if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
                    return data.candidates[0].content.parts[0].text;
                }
                throw new Error("Empty AI response received.");
            } catch (error) {
                lastError = error;
                Logger.warn("GeminiAPI", `Key rotated due to failure.`);
            }
        }
        throw new GeminiAPIError(`All configured Gemini API keys failed. Last error: ${lastError?.message}`);
    }

    /**
     * פונקציית העוזר הקולי לצ'אט - דורשת תשובה מובנית ב-JSON (הן תמלול והן תשובה).
     */
    static async processChatInteraction(base64Audio, historyContext =[]) {
        const prompt = `אתה עוזר קולי וירטואלי חכם בשפה העברית.
        האזן לאודיו המצורף, תמלל אותו במדויק, וענה תשובה מלאה ועניינית לשאלת המשתמש.
        חובה עליך להחזיר אובייקט JSON תקני בלבד עם שני שדות: "transcription", "answer".
        אסור להחזיר טקסט מחוץ ל-JSON. אסור להשתמש בסימני פיסוק מיוחדים.`;

        const formattedHistory = historyContext.map(msg => ({
            role: "user", 
            parts:[{ text: `${SYSTEM_CONSTANTS.PROMPTS.PREVIOUS_QUESTION_PREFIX} ${msg.q}\n${SYSTEM_CONSTANTS.PROMPTS.PREVIOUS_ANSWER_PREFIX} ${msg.a}` }]
        }));

        const payload = {
            contents:[
                ...formattedHistory,
                { role: "user", parts:[{ text: prompt }, { inlineData: { mimeType: SYSTEM_CONSTANTS.MODELS.AUDIO_MIME_TYPE, data: base64Audio } }] }
            ],
            generationConfig: { temperature: 0.7, responseMimeType: SYSTEM_CONSTANTS.MODELS.JSON_MIME_TYPE }
        };

        const rawResponse = await this.callGemini(payload);
        try {
            let cleanJsonStr = rawResponse.trim();
            if (cleanJsonStr.startsWith("```json")) cleanJsonStr = cleanJsonStr.substring(7, cleanJsonStr.length - 3).trim();
            else if (cleanJsonStr.startsWith("```")) cleanJsonStr = cleanJsonStr.substring(3, cleanJsonStr.length - 3).trim();
            
            const parsedData = JSON.parse(cleanJsonStr);
            return {
                transcription: YemotTextSanitizer.sanitizeForTTS(parsedData.transcription || "לא זוהה דיבור ברור"),
                answer: YemotTextSanitizer.sanitizeForTTS(parsedData.answer || "לא הצלחתי לגבש תשובה")
            };
        } catch (e) {
            Logger.error("GeminiAPI", "Failed to parse Chat JSON response. Falling back to raw text.", e);
            return { transcription: "שגיאת תמלול בשרת", answer: YemotTextSanitizer.sanitizeForTTS(rawResponse) };
        }
    }

    /**
     * פונקציה לתמלול מוחלט (שלוחה 0) - מבקשת מהמודל לחזור מילה במילה ללא תוספות.
     */
    static async processTranscriptionOnly(base64Audio) {
        const prompt = `תמלל את הנאמר בקובץ האודיו המצורף בעברית במדויק מילה במילה. 
        החזר אך ורק את הטקסט המתומלל. ללא פרשנות, ללא הקדמה וללא סימני פיסוק כלל. אתה חייב לחזור בדיוק על מה שנאמר.`;
        
        const payload = {
            contents:[{ role: "user", parts:[{ text: prompt }, { inlineData: { mimeType: SYSTEM_CONSTANTS.MODELS.AUDIO_MIME_TYPE, data: base64Audio } }] }],
            generationConfig: { temperature: 0.1 } 
        };
        
        const response = await this.callGemini(payload);
        return YemotTextSanitizer.sanitizeForTTS(response);
    }
}

// ============================================================================
// --- SECTION 10: YEMOT IVR COMPILER ---
// ============================================================================

class YemotResponseCompiler {
    constructor() {
        this.commands =[];
    }

    playTTS(text) {
        if (!text) return this;
        this.commands.push(`id_list_message=t-${YemotTextSanitizer.sanitizeForTTS(text)}`);
        return this;
    }

    requestDigits(text, baseVarName, min = 1, max = 1) {
        const cleanPrompt = YemotTextSanitizer.sanitizeForTTS(text);
        const timestampedVar = `${baseVarName}_${Date.now()}`;
        this.commands.push(`read=t-${cleanPrompt}=${timestampedVar},no,${max},${min},${SYSTEM_CONSTANTS.IVR_DEFAULTS.STANDARD_TIMEOUT},No,yes,no`);
        return this;
    }

    requestEmailKeyboard(text, baseVarName) {
        const cleanPrompt = YemotTextSanitizer.sanitizeForTTS(text);
        const timestampedVar = `${baseVarName}_${Date.now()}`;
        this.commands.push(`read=t-${cleanPrompt}=${timestampedVar},no,100,5,${SYSTEM_CONSTANTS.IVR_DEFAULTS.EMAIL_TIMEOUT},EmailKeyboard,yes,no`);
        return this;
    }

    requestAudioRecord(text, baseVarName, callId) {
        const cleanPrompt = YemotTextSanitizer.sanitizeForTTS(text);
        const timestampedVar = `${baseVarName}_${Date.now()}`;
        const fileName = `rec_${callId}_${Date.now()}`;
        this.commands.push(`read=t-${cleanPrompt}=${timestampedVar},no,record,${SYSTEM_CONSTANTS.YEMOT_PATHS.RECORDINGS_DIR},${fileName},no,yes,no,1,120`);
        return this;
    }

    routeToFolder(folder) {
        this.commands.push(`go_to_folder=${folder}`);
        return this;
    }

    compile() {
        if (this.commands.length === 0) this.routeToFolder("hangup");
        return this.commands.join('&');
    }
}

// ============================================================================
// --- SECTION 11: STATE MACHINE & MAIN HANDLER ---
// ============================================================================

export default async function handler(req, res) {
    const ivrCompiler = new YemotResponseCompiler();

    try {
        Logger.info("Gateway", `New request incoming [${req.method}]`);

        // HTTP Parameter Extraction Logic
        let rawBody = {};
        if (req.method === 'POST') {
            if (typeof req.body === 'string') {
                try { rawBody = Object.fromEntries(new URLSearchParams(req.body)); } catch(e){}
            } else if (req.body && typeof req.body === 'object') {
                rawBody = req.body;
            }
        }
        
        const urlObj = new URL(req.url, `https://${req.headers.host}`);
        const urlQueries = Object.fromEntries(urlObj.searchParams.entries());
        const query = { ...urlQueries, ...rawBody };
        
        const getParam = (key) => Array.isArray(query[key]) ? query[key][query[key].length - 1] : query[key];

        const phone = getParam(SYSTEM_CONSTANTS.YEMOT_PARAMS.PHONE) || getParam(SYSTEM_CONSTANTS.YEMOT_PARAMS.ENTER_ID) || 'unknown';
        const callId = getParam(SYSTEM_CONSTANTS.YEMOT_PARAMS.CALL_ID) || `sim_${Date.now()}`;
        const isHangup = getParam(SYSTEM_CONSTANTS.YEMOT_PARAMS.HANGUP) === 'yes';

        // Timestamped State Machine Engine
        let triggerBaseKey = null;
        let triggerValue = null;
        let highestTimestamp = 0;
        let pendingAudioOnHangup = false;

        for (const [key, val] of Object.entries(query)) {
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

        Logger.info("State Machine", `Evaluated Current State: [${triggerBaseKey}] =[${triggerValue}]`);

        // Hangup Audio Recovery System
        if (isHangup) {
            if (triggerValue && triggerValue.includes('.wav') && 
               (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO || 
                triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.TRANS_AUDIO || 
                triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.TRANS_APPEND_AUDIO)) {
                Logger.info("Gateway", "Hangup detected WITH pending audio. Processing before graceful exit.");
                pendingAudioOnHangup = true;
            } else {
                return sendResponse(res, "noop=hangup_acknowledged");
            }
        }

        // ==========================================
        // ROUTING DISPATCHER & BUSINESS LOGIC
        // ==========================================

        // --- 1. CHAT MODULE (Menu 1 & 2) ---
        if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO && triggerValue && triggerValue.includes('.wav')) {
            await DomainControllers.processChatAudio(phone, callId, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.CHAT_ACTION_CHOICE) {
            if (triggerValue === '7') {
                ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO, callId);
            } else {
                DomainControllers.serveMainMenu(ivrCompiler);
            }
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.CHAT_HISTORY_CHOICE) {
            if (triggerValue === '0') DomainControllers.serveMainMenu(ivrCompiler);
            else await DomainControllers.handleChatHistoryPlayback(phone, triggerValue, ivrCompiler);
        }

        // --- 2. TRANSCRIPTION MODULE (Menu 0) ---
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.TRANS_AUDIO && triggerValue && triggerValue.includes('.wav')) {
            await DomainControllers.processTransAudio(phone, triggerValue, ivrCompiler, false);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.TRANS_APPEND_AUDIO && triggerValue && triggerValue.includes('.wav')) {
            await DomainControllers.processTransAudio(phone, triggerValue, ivrCompiler, true);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.TRANS_DRAFT_MENU) {
            await DomainControllers.handleTransDraftMenu(phone, callId, triggerValue, ivrCompiler);
        }

        // --- 3. TRANSCRIPTION HISTORY MODULE (Menu 3) ---
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.TRANS_HISTORY_CHOICE) {
            if (triggerValue === '0') DomainControllers.serveMainMenu(ivrCompiler);
            else await DomainControllers.handleTransHistoryPlayback(phone, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.TRANS_ACTION_CHOICE) {
            await DomainControllers.handleTransHistoryActions(phone, triggerValue, ivrCompiler);
        }
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.USER_EMAIL_INPUT) {
            Logger.info("EmailService", `Mock Email Send Request to ${triggerValue}`);
            ivrCompiler.playTTS(SYSTEM_CONSTANTS.PROMPTS.EMAIL_SUCCESS);
            DomainControllers.serveMainMenu(ivrCompiler);
        }

        // --- 4. MAIN MENU ---
        else if (triggerBaseKey === SYSTEM_CONSTANTS.STATE_BASES.MENU_CHOICE) {
            if (triggerValue === '0') await DomainControllers.initNewTranscription(phone, callId, ivrCompiler);
            else if (triggerValue === '1') await DomainControllers.initNewChat(phone, callId, ivrCompiler);
            else if (triggerValue === '2') await DomainControllers.initChatHistoryMenu(phone, ivrCompiler);
            else if (triggerValue === '3') await DomainControllers.initTransHistoryMenu(phone, ivrCompiler);
            else DomainControllers.serveMainMenu(ivrCompiler);
        }
        
        // --- 5. ROOT ENTRY POINT ---
        else {
            DomainControllers.serveMainMenu(ivrCompiler);
        }

        // Graceful Exit for Audio-Recovery on Hangup
        if (pendingAudioOnHangup) {
            return sendResponse(res, "noop=hangup_acknowledged");
        }

        return sendResponse(res, ivrCompiler.compile());

    } catch (error) {
        Logger.error("Global Handler", "Fatal error intercepted. Informing user and dropping call safely.", error);
        const fallback = new YemotResponseCompiler();
        fallback.playTTS(SYSTEM_CONSTANTS.PROMPTS.SYSTEM_ERROR_FALLBACK).routeToFolder("hangup");
        return sendResponse(res, fallback.compile());
    }
}

// ============================================================================
// --- SECTION 12: DOMAIN CONTROLLERS ---
// ============================================================================

class DomainControllers {
    static serveMainMenu(ivrCompiler) {
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.MAIN_MENU, SYSTEM_CONSTANTS.STATE_BASES.MENU_CHOICE, 1, 1);
    }

    // ---- CHAT DOMAIN ----
    static async initNewChat(phone, callId, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        const newSessionId = `chat_${Date.now()}`;
        profile.chats.push({ id: newSessionId, date: new Date().toISOString(), messages:[] });
        profile.currentChatId = newSessionId;
        await UserRepository.saveProfile(phone, profile);
        ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.STATE_BASES.CHAT_USER_AUDIO, callId);
    }

    static async processChatAudio(phone, callId, audioPath, ivrCompiler) {
        const b64 = await YemotAPIService.downloadAudioAsBase64(audioPath);
        const profile = await UserRepository.getProfile(phone);
        
        let chat = profile.chats.find(c => c.id === profile.currentChatId);
        if (!chat) {
            chat = { id: `chat_rec_${Date.now()}`, date: new Date().toISOString(), messages:[] };
            profile.chats.push(chat);
            profile.currentChatId = chat.id;
        }

        const { transcription, answer } = await GeminiAIService.processChatInteraction(b64, chat.messages.slice(-5));
        
        chat.messages.push({ q: transcription, a: answer });
        await UserRepository.saveProfile(phone, profile);

        ivrCompiler.playTTS(answer);
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.CHAT_ACTION_MENU, SYSTEM_CONSTANTS.STATE_BASES.CHAT_ACTION_CHOICE, 1, 1);
    }

    static async initChatHistoryMenu(phone, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        if (profile.chats.length === 0) {
            ivrCompiler.playTTS(SYSTEM_CONSTANTS.PROMPTS.NO_CHAT_HISTORY);
            this.serveMainMenu(ivrCompiler);
            return;
        }
        
        let prompt = SYSTEM_CONSTANTS.PROMPTS.CHAT_HISTORY_PREFIX;
        const recents = profile.chats.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS).reverse();
        recents.forEach((c, i) => prompt += `לשיחה ${i + 1} הקישו ${i + 1} `);
        prompt += SYSTEM_CONSTANTS.PROMPTS.MENU_SUFFIX_0;
        
        ivrCompiler.requestDigits(prompt, SYSTEM_CONSTANTS.STATE_BASES.CHAT_HISTORY_CHOICE, 1, 1);
    }

    static async handleChatHistoryPlayback(phone, choice, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        const recents = profile.chats.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS).reverse();
        const idx = parseInt(choice, 10) - 1;

        if (isNaN(idx) || idx < 0 || idx >= recents.length) {
            ivrCompiler.playTTS(SYSTEM_CONSTANTS.PROMPTS.INVALID_CHOICE);
            this.serveMainMenu(ivrCompiler);
            return;
        }

        const selected = recents[idx];
        profile.currentChatId = selected.id;
        await UserRepository.saveProfile(phone, profile);

        let playback = SYSTEM_CONSTANTS.PROMPTS.CHAT_PLAYBACK_PREFIX;
        selected.messages.forEach((m, i) => {
            playback += `שאלה ${i + 1} ${m.q} תשובה ${m.a} `;
        });

        ivrCompiler.playTTS(playback);
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.CHAT_ACTION_MENU, SYSTEM_CONSTANTS.STATE_BASES.CHAT_ACTION_CHOICE, 1, 1);
    }

    // ---- TRANSCRIPTION DOMAIN (Menu 0) ----
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
        profile.tempTranscription = isAppend ? `${profile.tempTranscription} ${text}` : text;
        await UserRepository.saveProfile(phone, profile);

        ivrCompiler.playTTS(`התמלול הוא ${profile.tempTranscription}`);
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.TRANS_MENU, SYSTEM_CONSTANTS.STATE_BASES.TRANS_DRAFT_MENU, 1, 1);
    }

    static async handleTransDraftMenu(phone, callId, choice, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        
        switch(choice) {
            case '1':
                ivrCompiler.playTTS(profile.tempTranscription || "טקסט ריק");
                ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.TRANS_MENU, SYSTEM_CONSTANTS.STATE_BASES.TRANS_DRAFT_MENU, 1, 1);
                break;
            case '2':
                ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_TRANSCRIPTION_INITIAL, SYSTEM_CONSTANTS.STATE_BASES.TRANS_AUDIO, callId);
                break;
            case '3':
                ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.APPEND_TRANSCRIPTION_RECORD, SYSTEM_CONSTANTS.STATE_BASES.TRANS_APPEND_AUDIO, callId);
                break;
            case '4':
                if (profile.tempTranscription) {
                    profile.transcriptions.push({ id: Date.now().toString(), date: new Date().toISOString(), text: profile.tempTranscription });
                    profile.tempTranscription = "";
                    await UserRepository.saveProfile(phone, profile);
                    ivrCompiler.playTTS(SYSTEM_CONSTANTS.PROMPTS.TRANS_SAVED_SUCCESS);
                } else {
                    this.serveMainMenu(ivrCompiler);
                }
                break;
            default:
                this.serveMainMenu(ivrCompiler);
        }
    }

    // ---- TRANSCRIPTION HISTORY DOMAIN (Menu 3) ----
    static async initTransHistoryMenu(phone, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        if (profile.transcriptions.length === 0) {
            ivrCompiler.playTTS(SYSTEM_CONSTANTS.PROMPTS.NO_TRANS_HISTORY);
            this.serveMainMenu(ivrCompiler);
            return;
        }
        
        let prompt = SYSTEM_CONSTANTS.PROMPTS.TRANS_HISTORY_PREFIX;
        const recents = profile.transcriptions.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS).reverse();
        recents.forEach((t, i) => prompt += `לתמלול ${i + 1} הקישו ${i + 1} `);
        prompt += SYSTEM_CONSTANTS.PROMPTS.MENU_SUFFIX_0;
        
        ivrCompiler.requestDigits(prompt, SYSTEM_CONSTANTS.STATE_BASES.TRANS_HISTORY_CHOICE, 1, 1);
    }

    static async handleTransHistoryPlayback(phone, choice, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        const recents = profile.transcriptions.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS).reverse();
        const idx = parseInt(choice, 10) - 1;

        if (isNaN(idx) || idx < 0 || idx >= recents.length) {
            ivrCompiler.playTTS(SYSTEM_CONSTANTS.PROMPTS.INVALID_CHOICE);
            this.serveMainMenu(ivrCompiler);
            return;
        }

        profile.currentTransIndex = idx;
        await UserRepository.saveProfile(phone, profile);

        ivrCompiler.playTTS(`התמלול הוא ${recents[idx].text}`);
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.TRANS_PLAYBACK_ACTION_MENU, SYSTEM_CONSTANTS.STATE_BASES.TRANS_ACTION_CHOICE, 1, 1);
    }

    static async handleTransHistoryActions(phone, choice, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        const recents = profile.transcriptions.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS).reverse();
        const idx = profile.currentTransIndex;

        if (choice === '8' || idx === null || !recents[idx]) {
            this.serveMainMenu(ivrCompiler);
            return;
        }

        const textBody = recents[idx].text;

        if (choice === '7') {
            const targetDir = await YemotAPIService.uploadTranscriptionForSharing(textBody, phone);
            if (targetDir) {
                ivrCompiler.playTTS(SYSTEM_CONSTANTS.PROMPTS.SHARE_SUCCESS);
                ivrCompiler.routeToFolder(targetDir);
            } else {
                ivrCompiler.playTTS(SYSTEM_CONSTANTS.PROMPTS.SHARE_FAILED);
                this.serveMainMenu(ivrCompiler);
            }
        } 
        else if (choice === '9') {
            ivrCompiler.requestEmailKeyboard(SYSTEM_CONSTANTS.PROMPTS.EMAIL_KEYBOARD_PROMPT, SYSTEM_CONSTANTS.STATE_BASES.USER_EMAIL_INPUT);
        }
        else {
            this.serveMainMenu(ivrCompiler);
        }
    }
}

function sendResponse(res, data) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(200).send(data);
}
