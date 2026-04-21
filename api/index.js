/**
 * @file api/index.js
 * @description Ultimate Enterprise IVR System for Yemot HaMashiach & Google Gemini.
 * @version 8.0.0 (Private Blob Enforced & Audio VarName Fixed)
 * @author Custom AI Assistant
 */

import { put, list } from '@vercel/blob';

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
        SERVICE_UNAVAILABLE: 503
    },
    IVR_DEFAULTS: {
        STANDARD_TIMEOUT: "7",
        EMAIL_TIMEOUT: "30",
        RECORD_MIN_SEC: "1",
        RECORD_MAX_SEC: "120"
    },
    RETRY_POLICY: {
        MAX_RETRIES: 3,
        INITIAL_BACKOFF_MS: 1000,
        BACKOFF_MULTIPLIER: 2
    },
    PROMPTS: {
        MAIN_MENU: "ברוכים הבאים למערכת הבינה המלאכותית לתמלול מדויק הקישו 0 לשיחת צ'אט הקישו 1 להיסטוריית צ'אט הקישו 2 להיסטוריית תמלולים הקישו 3",
        NEW_CHAT_RECORD: "אנא הקליטו את שאלתכם לאחר הצליל בסיום הקישו סולמית",
        NEW_TRANSCRIPTION_RECORD: "אנא הקליטו את הטקסט לתמלול לאחר הצליל בסיום הקישו סולמית",
        APPEND_TRANSCRIPTION_RECORD: "אנא הקליטו את המשך הטקסט לאחר הצליל בסיום הקישו סולמית",
        NO_HISTORY: "אין לכם היסטוריית שיחות במערכת הנכם מועברים לשיחה חדשה",
        NO_TRANS_HISTORY: "אין לכם היסטוריית תמלולים במערכת הנכם מועברים לתפריט הראשי",
        HISTORY_MENU_PREFIX: "תפריט היסטוריית שיחות ",
        TRANS_HISTORY_MENU_PREFIX: "תפריט היסטוריית תמלולים ",
        MENU_SUFFIX: " לחזרה לתפריט הראשי הקישו 0",
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
        PREVIOUS_ANSWER_PREFIX: "תשובה קודמת:"
    },
    YEMOT_PARAMS: {
        PHONE: 'ApiPhone',
        ENTER_ID: 'ApiEnterID',
        CALL_ID: 'ApiCallId',
        HANGUP: 'hangup',
        MENU_CHOICE: 'StateMainMenuChoice',
        USER_AUDIO: 'StateChatUserAudio',
        HISTORY_CHOICE: 'StateChatHistorySelection',
        ACTION_CHOICE: 'StateChatPostAnswerAction',
        TRANS_AUDIO: 'StateTransUserAudio',
        TRANS_APPEND_AUDIO: 'StateTransAppendAudio',
        TRANS_MENU_CHOICE: 'StateTransDraftMenu',
        TRANS_HISTORY_CHOICE: 'StateTransHistorySelection',
        TRANS_ACTION_CHOICE: 'StateTransHistoryAction',
        USER_EMAIL_INPUT: 'StateTransEmailInput'
    }
};

// ============================================================================
// --- SECTION 2: ERROR HANDLING ---
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
// --- SECTION 3: LOGGER SYSTEM ---
// ============================================================================

class Logger {
    static getTimestamp() { return new Date().toISOString(); }
    static info(context, message) { console.log(`[INFO][${this.getTimestamp()}] [${context}] ${message}`); }
    static warn(context, message) { console.warn(`[WARN][${this.getTimestamp()}] [${context}] ${message}`); }
    static error(context, message, errorObj = null) {
        console.error(`[ERROR][${this.getTimestamp()}] [${context}] ${message}`);
        if (errorObj) console.error(`[TRACE] ${errorObj.stack || errorObj.message || errorObj}`);
    }
    static debug(context, message) { console.debug(`[DEBUG][${this.getTimestamp()}][${context}] ${message}`); }
}

// ============================================================================
// --- SECTION 4: CONFIGURATION MANAGER ---
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
// --- SECTION 5: TEXT SANITIZATION ---
// ============================================================================

class YemotTextSanitizer {
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
// --- SECTION 6: RETRY HELPER ---
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
// --- SECTION 7: VERCEL BLOB STORAGE (ENFORCING PRIVATE ACCESS) ---
// ============================================================================

class UserRepository {
    static _getUserFilePath(phone) {
        return `${SYSTEM_CONSTANTS.YEMOT_PATHS.USERS_DB_DIR}${phone}.json`;
    }

    static async getProfile(phone) {
        if (!phone || phone === 'unknown') return this.generateDefaultProfile();
        const filePath = this._getUserFilePath(phone);
        
        const fetchOperation = async () => {
            const { blobs } = await list({ prefix: filePath, token: AppConfig.BLOB_TOKEN });
            if (!blobs || blobs.length === 0) return this.generateDefaultProfile();

            // Authorization Header is MANDATORY for private blobs
            const response = await fetch(blobs[0].url, {
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
            // EXPLICITLY SETTING PRIVATE ACCESS
            await put(filePath, JSON.stringify(profileData), { 
                access: 'private', 
                addRandomSuffix: false,
                token: AppConfig.BLOB_TOKEN
            });
        };

        try {
            await RetryHelper.withRetry(saveOperation, 2, 500, `SaveUser-${phone}`);
            Logger.info("UserRepository", `Profile saved for ${phone}.`);
        } catch (error) {
            Logger.error("UserRepository", `Failed to save user ${phone}`, error);
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
// --- SECTION 8: YEMOT API INTEGRATION ---
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
            
            if (buffer.length < 500) throw new Error("File too small");
            return buffer.toString('base64');
        };

        try {
            return await RetryHelper.withRetry(downloadTask, 2, 1000, "YemotAudioDownload");
        } catch (error) {
            throw new YemotAPIError("Failed to download audio.", error);
        }
    }

    static async uploadTranscriptionForSharing(text, phone) {
        const uploadTask = async () => {
            const fileName = `Shared_Trans_${phone}_${Date.now()}.tts`;
            const fullPath = `ivr2:${SYSTEM_CONSTANTS.YEMOT_PATHS.SHARED_TRANSCRIPTIONS_DIR}/${fileName}`;
            const url = `https://www.call2all.co.il/ym/api/UploadTextFile?token=${AppConfig.CALL2ALL_TOKEN}&what=${encodeURIComponent(fullPath)}&contents=${encodeURIComponent(text)}`;
            
            const response = await fetch(url);
            const result = await response.json();
            
            if (result.responseStatus !== "OK") throw new Error(`Upload rejected: ${JSON.stringify(result)}`);
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
// --- SECTION 9: GOOGLE GEMINI AI ---
// ============================================================================

class GeminiAIService {
    static async callGemini(payload) {
        const keys = AppConfig.GEMINI_KEYS;
        let lastError = null;

        for (let i = 0; i < keys.length; i++) {
            const apiKey = AppConfig.getNextGeminiKey();
            try {
                const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${SYSTEM_CONSTANTS.MODELS.PRIMARY_GEMINI_MODEL}:generateContent?key=${apiKey}`;
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const data = await response.json();
                if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
                    return data.candidates[0].content.parts[0].text;
                }
                throw new Error("Empty AI response.");
            } catch (error) {
                lastError = error;
                Logger.warn("GeminiAPI", `Key failed. Moving to next.`);
            }
        }
        throw new GeminiAPIError(`All Gemini keys failed. Last error: ${lastError?.message}`);
    }

    static async processChatInteraction(base64Audio, historyContext =[]) {
        const prompt = `אתה עוזר קולי וירטואלי חכם. האזן לאודיו, תמלל, וענה על השאלה. 
        החזר אובייקט JSON תקני בלבד עם שדות: "transcription", "answer". 
        ללא סימני פיסוק מיוחדים בטקסט.`;

        const formattedHistory = historyContext.map(msg => ({
            role: "user", 
            parts:[{ text: `שאלה קודמת: ${msg.q}\nתשובה קודמת: ${msg.a}` }]
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
            let cleanJson = rawResponse.trim();
            if (cleanJson.startsWith("```json")) cleanJson = cleanJson.substring(7, cleanJson.length - 3).trim();
            else if (cleanJson.startsWith("```")) cleanJson = cleanJson.substring(3, cleanJson.length - 3).trim();
            const parsed = JSON.parse(cleanJson);
            return {
                transcription: YemotTextSanitizer.sanitizeForTTS(parsed.transcription || "דיבור לא ברור"),
                answer: YemotTextSanitizer.sanitizeForTTS(parsed.answer || "לא הצלחתי לגבש תשובה")
            };
        } catch (e) {
            return { transcription: "שגיאת תמלול", answer: YemotTextSanitizer.sanitizeForTTS(rawResponse) };
        }
    }

    static async processTranscriptionOnly(base64Audio) {
        const prompt = "תמלל את הנאמר בקובץ האודיו המצורף בעברית במדויק. החזר אך ורק את הטקסט המתומלל ללא פרשנות או סימני פיסוק.";
        const payload = {
            contents:[{ role: "user", parts:[{ text: prompt }, { inlineData: { mimeType: SYSTEM_CONSTANTS.MODELS.AUDIO_MIME_TYPE, data: base64Audio } }] }],
            generationConfig: { temperature: 0.2 }
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

    requestDigits(text, varName, min = 1, max = 1) {
        const cleanPrompt = YemotTextSanitizer.sanitizeForTTS(text);
        this.commands.push(`read=t-${cleanPrompt}=${varName},no,${max},${min},${SYSTEM_CONSTANTS.IVR_DEFAULTS.STANDARD_TIMEOUT},No,yes,no`);
        return this;
    }

    requestEmailKeyboard(text, varName) {
        const cleanPrompt = YemotTextSanitizer.sanitizeForTTS(text);
        this.commands.push(`read=t-${cleanPrompt}=${varName},no,100,5,${SYSTEM_CONSTANTS.IVR_DEFAULTS.EMAIL_TIMEOUT},EmailKeyboard,yes,no`);
        return this;
    }

    // FIXED: Ensured `varName` is properly injected here to avoid `undefined` in Yemot logs
    requestAudioRecord(text, varName, callId) {
        const cleanPrompt = YemotTextSanitizer.sanitizeForTTS(text);
        const fileName = `rec_${callId}_${Date.now()}`;
        this.commands.push(`read=t-${cleanPrompt}=${varName},no,record,${SYSTEM_CONSTANTS.YEMOT_PATHS.RECORDINGS_DIR},${fileName},no,yes,no,1,120`);
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
// --- SECTION 11: MAIN HANDLER & STATE MACHINE ---
// ============================================================================

export default async function handler(req, res) {
    const ivrCompiler = new YemotResponseCompiler();

    try {
        Logger.info("Gateway", `New request incoming [${req.method}]`);

        // Parameter Extraction
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

        // Custom Key Extraction (To find current State)
        const allKeys = Object.keys(query);
        const businessKeys = allKeys.filter(k => !k.startsWith('Api') && k !== 'token' && k !== SYSTEM_CONSTANTS.YEMOT_PARAMS.HANGUP);
        const triggerKey = businessKeys.length > 0 ? businessKeys[businessKeys.length - 1] : null;
        const triggerValue = triggerKey ? getParam(triggerKey) : null;

        Logger.info("State Machine", `Trigger: [${triggerKey}] = [${triggerValue}]`);

        // Hangup Interceptor (Process Audio Before Exit)
        let pendingAudio = false;
        if (isHangup) {
            if (triggerValue && triggerValue.includes('.wav') && 
               (triggerKey === SYSTEM_CONSTANTS.YEMOT_PARAMS.USER_AUDIO || 
                triggerKey === SYSTEM_CONSTANTS.YEMOT_PARAMS.TRANS_AUDIO || 
                triggerKey === SYSTEM_CONSTANTS.YEMOT_PARAMS.TRANS_APPEND_AUDIO)) {
                Logger.info("Gateway", "Hangup detected WITH pending audio. Processing before graceful exit.");
                pendingAudio = true;
            } else {
                return sendResponse(res, "noop=hangup_acknowledged");
            }
        }

        // ==========================================
        // ROUTING DISPATCHER
        // ==========================================

        // --- 1. CHAT MODULE ---
        if (triggerKey === SYSTEM_CONSTANTS.YEMOT_PARAMS.USER_AUDIO && triggerValue && triggerValue.includes('.wav')) {
            await DomainControllers.processChatAudio(phone, callId, triggerValue, ivrCompiler);
        }
        else if (triggerKey === SYSTEM_CONSTANTS.YEMOT_PARAMS.ACTION_CHOICE) {
            if (triggerValue === '7') {
                ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.YEMOT_PARAMS.USER_AUDIO, callId);
            } else {
                DomainControllers.serveMainMenu(ivrCompiler);
            }
        }
        else if (triggerKey === SYSTEM_CONSTANTS.YEMOT_PARAMS.HISTORY_CHOICE) {
            if (triggerValue === '0') DomainControllers.serveMainMenu(ivrCompiler);
            else await DomainControllers.handleChatHistoryPlayback(phone, triggerValue, ivrCompiler);
        }

        // --- 2. TRANSCRIPTION MODULE (Menu 0) ---
        else if (triggerKey === SYSTEM_CONSTANTS.YEMOT_PARAMS.TRANS_AUDIO && triggerValue && triggerValue.includes('.wav')) {
            await DomainControllers.processTransAudio(phone, triggerValue, ivrCompiler, false);
        }
        else if (triggerKey === SYSTEM_CONSTANTS.YEMOT_PARAMS.TRANS_APPEND_AUDIO && triggerValue && triggerValue.includes('.wav')) {
            await DomainControllers.processTransAudio(phone, triggerValue, ivrCompiler, true);
        }
        else if (triggerKey === SYSTEM_CONSTANTS.YEMOT_PARAMS.TRANS_MENU_CHOICE) {
            await DomainControllers.handleTransDraftMenu(phone, callId, triggerValue, ivrCompiler);
        }

        // --- 3. TRANSCRIPTION HISTORY MODULE (Menu 3) ---
        else if (triggerKey === SYSTEM_CONSTANTS.YEMOT_PARAMS.TRANS_HISTORY_CHOICE) {
            if (triggerValue === '0') DomainControllers.serveMainMenu(ivrCompiler);
            else await DomainControllers.handleTransHistoryPlayback(phone, triggerValue, ivrCompiler);
        }
        else if (triggerKey === SYSTEM_CONSTANTS.YEMOT_PARAMS.TRANS_ACTION_CHOICE) {
            await DomainControllers.handleTransHistoryActions(phone, triggerValue, ivrCompiler);
        }
        else if (triggerKey === SYSTEM_CONSTANTS.YEMOT_PARAMS.USER_EMAIL_INPUT) {
            Logger.info("EmailService", `Simulated email send to ${triggerValue}`);
            ivrCompiler.playTTS(SYSTEM_CONSTANTS.PROMPTS.EMAIL_SUCCESS);
            DomainControllers.serveMainMenu(ivrCompiler);
        }

        // --- 4. MAIN MENU ---
        else if (triggerKey === SYSTEM_CONSTANTS.YEMOT_PARAMS.MENU_CHOICE) {
            if (triggerValue === '0') await DomainControllers.initNewTranscription(phone, callId, ivrCompiler);
            else if (triggerValue === '1') await DomainControllers.initNewChat(phone, callId, ivrCompiler);
            else if (triggerValue === '2') await DomainControllers.initChatHistoryMenu(phone, ivrCompiler);
            else if (triggerValue === '3') await DomainControllers.initTransHistoryMenu(phone, ivrCompiler);
            else DomainControllers.serveMainMenu(ivrCompiler);
        }
        
        // --- 5. ROOT ENTRY ---
        else {
            DomainControllers.serveMainMenu(ivrCompiler);
        }

        if (pendingAudio) {
            return sendResponse(res, "noop=hangup_acknowledged");
        }

        return sendResponse(res, ivrCompiler.compile());

    } catch (error) {
        Logger.error("Global Handler", "Fatal error", error);
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
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.MAIN_MENU, SYSTEM_CONSTANTS.YEMOT_PARAMS.MENU_CHOICE, 1, 1);
    }

    static async initNewChat(phone, callId, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        const newSessionId = `chat_${Date.now()}`;
        profile.chats.push({ id: newSessionId, date: new Date().toISOString(), messages:[] });
        profile.currentChatId = newSessionId;
        await UserRepository.saveProfile(phone, profile);
        ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.YEMOT_PARAMS.USER_AUDIO, callId);
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
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.CHAT_ACTION_MENU, SYSTEM_CONSTANTS.YEMOT_PARAMS.ACTION_CHOICE, 1, 1);
    }

    static async initChatHistoryMenu(phone, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        if (profile.chats.length === 0) {
            ivrCompiler.playTTS(SYSTEM_CONSTANTS.PROMPTS.NO_HISTORY);
            this.serveMainMenu(ivrCompiler);
            return;
        }
        
        let prompt = SYSTEM_CONSTANTS.PROMPTS.CHAT_HISTORY_PREFIX;
        const recents = profile.chats.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS).reverse();
        recents.forEach((c, i) => prompt += `לשיחה ${i + 1} הקישו ${i + 1} `);
        prompt += SYSTEM_CONSTANTS.PROMPTS.MENU_SUFFIX_0;
        
        ivrCompiler.requestDigits(prompt, SYSTEM_CONSTANTS.YEMOT_PARAMS.HISTORY_CHOICE, 1, 1);
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
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.CHAT_ACTION_MENU, SYSTEM_CONSTANTS.YEMOT_PARAMS.ACTION_CHOICE, 1, 1);
    }

    static async initNewTranscription(phone, callId, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        profile.tempTranscription = "";
        await UserRepository.saveProfile(phone, profile);
        ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_TRANSCRIPTION_INITIAL, SYSTEM_CONSTANTS.YEMOT_PARAMS.TRANS_AUDIO, callId);
    }

    static async processTransAudio(phone, audioPath, ivrCompiler, isAppend) {
        const b64 = await YemotAPIService.downloadAudioAsBase64(audioPath);
        const text = await GeminiAIService.processTranscriptionOnly(b64);
        
        const profile = await UserRepository.getProfile(phone);
        profile.tempTranscription = isAppend ? `${profile.tempTranscription} ${text}` : text;
        await UserRepository.saveProfile(phone, profile);

        ivrCompiler.playTTS(`התמלול הוא ${profile.tempTranscription}`);
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.TRANS_MENU, SYSTEM_CONSTANTS.YEMOT_PARAMS.TRANS_MENU_CHOICE, 1, 1);
    }

    static async handleTransDraftMenu(phone, callId, choice, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        
        switch(choice) {
            case '1':
                ivrCompiler.playTTS(profile.tempTranscription || "ריק");
                ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.TRANS_MENU, SYSTEM_CONSTANTS.YEMOT_PARAMS.TRANS_MENU_CHOICE, 1, 1);
                break;
            case '2':
                ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_TRANSCRIPTION_INITIAL, SYSTEM_CONSTANTS.YEMOT_PARAMS.TRANS_AUDIO, callId);
                break;
            case '3':
                ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.APPEND_TRANSCRIPTION_RECORD, SYSTEM_CONSTANTS.YEMOT_PARAMS.TRANS_APPEND_AUDIO, callId);
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
        
        ivrCompiler.requestDigits(prompt, SYSTEM_CONSTANTS.YEMOT_PARAMS.TRANS_HISTORY_CHOICE, 1, 1);
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
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.TRANS_PLAYBACK_ACTION_MENU, SYSTEM_CONSTANTS.YEMOT_PARAMS.TRANS_ACTION_CHOICE, 1, 1);
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
            ivrCompiler.requestEmailKeyboard(SYSTEM_CONSTANTS.PROMPTS.EMAIL_KEYBOARD_PROMPT, SYSTEM_CONSTANTS.YEMOT_PARAMS.USER_EMAIL_INPUT);
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
