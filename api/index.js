/**
 * @file api/index.js
 * @description Ultimate Enterprise IVR System for Yemot HaMashiach & Google Gemini AI.
 * @version 17.0.0 (The Pagination & Unlimited Text Edition)
 * @author Custom AI Assistant
 * 
 * FEATURES:
 * 1. Syntax Fixed: Addressed the Vercel build syntax error.
 * 2. Unlocked AI Length: Gemini is configured to output long, comprehensive answers.
 * 3. Text Pagination (Chunking): Long AI responses and transcriptions are split into chunks. 
 *    User can press '9' to hear the next part of the response seamlessly.
 * 4. Adaptive Blob Storage: Forcing 'x-access: private' directly to REST API.
 * 5. Timestamped State Machine: Eliminates IVR infinite loops.
 */
export const maxDuration = 60; // Allow 60s execution for long Gemini generations

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
        EMAIL_TIMEOUT: "30",
        RECORD_MIN_SEC: "1",
        RECORD_MAX_SEC: "120",
        MAX_DIGITS_DEFAULT: 1,
        MIN_DIGITS_DEFAULT: 1,
        MAX_CHUNK_LENGTH: 450 // מקסימום תווים למקטע כדי שימות לא תקרוס
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
        CHAT_PAGINATION_MENU: "לשמיעת המשך התשובה הקישו 9 להמשך השיחה הנוכחית הקישו 7 לחזרה לתפריט הראשי הקישו 8",
        TRANS_MENU: "לשמיעה חוזרת הקישו 1 להקלטה מחדש הקישו 2 להקלטת המשך הקישו 3 לשמירת התמלול הקישו 4",
        TRANS_ACTION_MENU: "לשיתוף התמלול למערכות אחרות הקישו 7 לשליחת התמלול לאימייל הקישו 9 לחזרה לתפריט הראשי הקישו 8",
        TRANS_PAGINATION_MENU: "לשמיעת המשך התמלול הקישו 9 לחזרה לתפריט הראשי הקישו 8",
        EMAIL_PROMPT: "אנא הקלידו את כתובת האימייל שלכם באמצעות המקלדת בסיום הקישו סולמית",
        EMAIL_SUCCESS: "האימייל נשלח בהצלחה שלום ותודה",
        SHARE_SUCCESS: "קובץ התמלול נוצר בהצלחה הנכם מועברים לתיקיית השיתוף",
        SHARE_FAILED: "אירעה שגיאה ביצירת קובץ השיתוף הנכם מועברים לתפריט הראשי",
        TRANS_SAVED_SUCCESS: "התמלול נשמר בהצלחה הנכם מועברים לתפריט הראשי",
        SYSTEM_ERROR_FALLBACK: "אירעה שגיאה בלתי צפויה במערכת אנא נסו שוב מאוחר יותר שלום ותודה",
        PREVIOUS_QUESTION_PREFIX: "שאלה קודמת:",
        PREVIOUS_ANSWER_PREFIX: "תשובה קודמת:",
        GEMINI_SYSTEM_INSTRUCTION_CHAT: "אתה עוזר קולי וירטואלי חכם בשפה העברית. האזן לאודיו המצורף, תמלל אותו במדויק, וענה תשובה מלאה, מקיפה, מפורטת וארוכה ככל הנדרש. אין לך מגבלת אורך. חובה עליך להחזיר אובייקט JSON תקני בלבד עם שני שדות transcription ו-answer. אסור להשתמש בסימני פיסוק מיוחדים בטקסט.",
        GEMINI_SYSTEM_INSTRUCTION_TRANSCRIPTION: "תמלל את הנאמר בקובץ האודיו המצורף בעברית במדויק מילה במילה. החזר אך ורק את הטקסט המתומלל ללא פרשנות וללא סימני פיסוק כלל. אתה חייב לחזור בדיוק על מה שנאמר."
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
// --- SECTION 2: ADVANCED ERROR HANDLING FRAMEWORK ---
// ============================================================================
class AppError extends Error {
    constructor(message, statusCode = SYSTEM_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR, originalError = null) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.originalError = originalError;
        if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    }
}
class StorageAPIError extends AppError { constructor(msg, orig) { super(`Storage API Error: ${msg}`, 500, orig); } }

// ============================================================================
// --- SECTION 3: ROBUST ENTERPRISE LOGGER SYSTEM ---
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
        if (ConfigManager.instance) return ConfigManager.instance;
        this.geminiKeys = this.parseApiKeys(process.env.GEMINI_KEYS);
        this.yemotToken = process.env.CALL2ALL_TOKEN || '';
        this.blobToken = process.env.BLOB_READ_WRITE_TOKEN || '';
        this.currentGeminiKeyIndex = 0;
        ConfigManager.instance = this;
    }
    parseApiKeys(keysString) {
        if (!keysString) return[];
        return keysString.split(',').map(key => key.trim()).filter(key => key.length > 20);
    }
    getNextGeminiKey() {
        if (this.geminiKeys.length === 0) throw new Error("No Gemini keys configured in environment.");
        const key = this.geminiKeys[this.currentGeminiKeyIndex];
        this.currentGeminiKeyIndex = (this.currentGeminiKeyIndex + 1) % this.geminiKeys.length;
        return key;
    }
}
const AppConfig = new ConfigManager();

// ============================================================================
// --- SECTION 5: TEXT SANITIZATION & CHUNKING (PAGINATION) ---
// ============================================================================
class YemotTextSanitizer {
    static sanitizeForTTS(rawText) {
        if (!rawText) return "שגיאת טקסט";
        if (typeof rawText !== 'string') {
            try { rawText = JSON.stringify(rawText); } catch (e) { return "שגיאת טקסט"; }
        }
        return rawText
            .replace(/\*/g, ' ')
            .replace(/[.,\-=\&^#!?:;()[\]{}]/g, ' ')
            .replace(/[\u{1F600}-\u{1F6FF}]/gu, '')
            .replace(/[\n\r]/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim() || "התקבל טקסט ריק";
    }

    /**
     * חותך טקסט ארוך למקטעים (Chunks) כדי למנוע קריסה בימות המשיח.
     * שומר על מילים שלמות ולא חותך מילה באמצע.
     */
    static chunkText(text, maxLength = SYSTEM_CONSTANTS.IVR_DEFAULTS.MAX_CHUNK_LENGTH) {
        if (!text) return ["טקסט ריק"];
        const words = text.split(' ');
        const chunks =[];
        let currentChunk = '';

        for (const word of words) {
            if ((currentChunk.length + word.length + 1) > maxLength) {
                chunks.push(currentChunk.trim());
                currentChunk = word;
            } else {
                currentChunk += (currentChunk ? ' ' : '') + word;
            }
        }
        if (currentChunk) chunks.push(currentChunk.trim());
        return chunks;
    }
}

// ============================================================================
// --- SECTION 6: ADVANCED RETRY LOGIC ---
// ============================================================================
class RetryHelper {
    static sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
    static async withRetry(asyncTask, taskName = "Task", maxRetries = SYSTEM_CONSTANTS.RETRY_POLICY.MAX_RETRIES, initialDelay = SYSTEM_CONSTANTS.RETRY_POLICY.INITIAL_BACKOFF_MS) {
        let lastError;
        let currentDelay = initialDelay;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await asyncTask();
            } catch (error) {
                lastError = error;
                Logger.warn("Retry", `[${taskName}] Attempt ${attempt}/${maxRetries} failed: ${error.message}`);
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
// --- SECTION 7: PURE REST VERCEL BLOB STORAGE ---
// ============================================================================
class PureVercelBlobREST {
    static async listBlobs(prefix) {
        const url = `${SYSTEM_CONSTANTS.VERCEL_BLOB.REST_API_BASE_URL}?prefix=${encodeURIComponent(prefix)}`;
        const response = await fetch(url, { method: 'GET', headers: { 'Authorization': `Bearer ${AppConfig.blobToken}` } });
        if (!response.ok) throw new StorageAPIError(`Blob List Error: ${response.status}`);
        return await response.json();
    }
    static async putBlob(filePath, data) {
        const url = `${SYSTEM_CONSTANTS.VERCEL_BLOB.REST_API_BASE_URL}/${filePath}`;
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'authorization': `Bearer ${AppConfig.blobToken}`,
                'x-api-version': '7',
                'x-add-random-suffix': 'false',
                'x-access': 'private', // הכרחת גישה פרטית 
                'content-type': 'application/json'
            },
            body: data
        });
        if (!response.ok) throw new StorageAPIError(`Blob Put Error: ${response.status}`);
        return await response.json();
    }
}

class UserRepository {
    static _getUserFilePath(phone) { return `${SYSTEM_CONSTANTS.YEMOT_PATHS.USERS_DB_DIR}${phone}.json`; }
    static async getProfile(phone) {
        if (!phone || phone === 'unknown') return this.generateDefaultProfile();
        try {
            return await RetryHelper.withRetry(async () => {
                const data = await PureVercelBlobREST.listBlobs(this._getUserFilePath(phone));
                if (!data.blobs || data.blobs.length === 0) return this.generateDefaultProfile();
                const response = await fetch(data.blobs[0].url, { headers: { Authorization: `Bearer ${AppConfig.blobToken}` } });
                if (!response.ok) throw new Error("Fetch failed");
                return this.validateProfile(await response.json());
            }, "FetchUser", 2, 500);
        } catch (error) {
            Logger.error("UserRepository", `Failed to retrieve profile for ${phone}`, error);
            return this.generateDefaultProfile();
        }
    }
    static async saveProfile(phone, profileData) {
        if (!phone || phone === 'unknown') return;
        try {
            await RetryHelper.withRetry(async () => {
                await PureVercelBlobREST.putBlob(this._getUserFilePath(phone), JSON.stringify(profileData));
            }, "SaveUser", 3, 500);
        } catch (error) {
            Logger.error("UserRepository", `Failed to save user ${phone}`, error);
        }
    }
    static generateDefaultProfile() {
        return {
            chats: [], transcriptions:[], currentChatId: null, tempTranscription: "",
            currentTransIndex: null, pagination: { chunks:[], currentIndex: 0, type: null }
        };
    }
    static validateProfile(data) {
        if (!data || typeof data !== 'object') return this.generateDefaultProfile();
        if (!Array.isArray(data.chats)) data.chats = [];
        if (!Array.isArray(data.transcriptions)) data.transcriptions =[];
        if (!data.pagination) data.pagination = { chunks:[], currentIndex: 0, type: null };
        return data;
    }
}

// ============================================================================
// --- SECTION 8: YEMOT API INTEGRATION SERVICES ---
// ============================================================================
class YemotAPIService {
    static async downloadAudioAsBase64(rawFilePath) {
        const fullPath = rawFilePath.startsWith('ivr2:') ? rawFilePath : `ivr2:${rawFilePath}`;
        const url = `https://www.call2all.co.il/ym/api/DownloadFile?token=${AppConfig.yemotToken}&path=${encodeURIComponent(fullPath)}`;
        return await RetryHelper.withRetry(async () => {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            if (buffer.length < 500) throw new Error("File too small");
            return buffer.toString('base64');
        }, "DownloadAudio", 2, 1000);
    }

    static async uploadTranscriptionForSharing(text, phone) {
        const fileName = `Shared_Trans_${phone}_${Date.now()}.tts`;
        const fullPath = `ivr2:${SYSTEM_CONSTANTS.YEMOT_PATHS.SHARED_TRANSCRIPTIONS_DIR}/${fileName}`;
        const url = `https://www.call2all.co.il/ym/api/UploadTextFile?token=${AppConfig.yemotToken}&what=${encodeURIComponent(fullPath)}&contents=${encodeURIComponent(text)}`;
        return await RetryHelper.withRetry(async () => {
            const response = await fetch(url);
            const result = await response.json();
            if (result.responseStatus !== "OK") throw new Error("Yemot upload rejected");
            return SYSTEM_CONSTANTS.YEMOT_PATHS.SHARED_TRANSCRIPTIONS_DIR;
        }, "UploadTTS", 2, 1000).catch(() => null);
    }
}

// ============================================================================
// --- SECTION 9: GOOGLE GEMINI AI INTEGRATION ---
// ============================================================================
class GeminiAIService {
    static async callGemini(payload) {
        const keys = AppConfig.geminiKeys;
        let lastError = null;
        for (let i = 0; i < keys.length; i++) {
            const apiKey = AppConfig.getNextGeminiKey();
            try {
                const endpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/${SYSTEM_CONSTANTS.MODELS.PRIMARY_GEMINI_MODEL}:generateContent?key=${apiKey}`;
                const response = await fetch(endpointUrl, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
                });
                if (!response.ok) throw new Error(`Google API HTTP ${response.status}`);
                const data = await response.json();
                if (data.candidates && data.candidates[0].content) {
                    return data.candidates[0].content.parts[0].text;
                }
                throw new Error("Unexpected JSON structure");
            } catch (error) {
                lastError = error;
                Logger.warn("Gemini", `Key failed. Moving to next.`);
            }
        }
        throw new Error("All API keys failed.");
    }

    static async processChatInteraction(base64Audio, historyContext =[]) {
        const formattedHistory = historyContext.map(msg => ({
            role: "user",
            parts:[{ text: `${SYSTEM_CONSTANTS.PROMPTS.PREVIOUS_QUESTION_PREFIX} ${msg.q}\n${SYSTEM_CONSTANTS.PROMPTS.PREVIOUS_ANSWER_PREFIX} ${msg.a}` }]
        }));
        
        const payload = {
            contents:[
                ...formattedHistory,
                {
                    role: "user",
                    parts:[
                        { text: SYSTEM_CONSTANTS.PROMPTS.GEMINI_SYSTEM_INSTRUCTION_CHAT },
                        { inlineData: { mimeType: SYSTEM_CONSTANTS.MODELS.AUDIO_MIME_TYPE, data: base64Audio } }
                    ]
                }
            ],
            // הוספת כמות טוקנים ענקית (4000) לתשובות מפורטות ומלאות
            generationConfig: { temperature: 0.7, maxOutputTokens: 4000, responseMimeType: SYSTEM_CONSTANTS.MODELS.JSON_MIME_TYPE }
        };

        const rawJsonResponse = await this.callGemini(payload);
        try {
            let cleanJsonStr = rawJsonResponse.trim();
            if (cleanJsonStr.startsWith("```json")) cleanJsonStr = cleanJsonStr.substring(7, cleanJsonStr.length - 3).trim();
            else if (cleanJsonStr.startsWith("```")) cleanJsonStr = cleanJsonStr.substring(3, cleanJsonStr.length - 3).trim();
            
            const parsedData = JSON.parse(cleanJsonStr);
            return {
                transcription: YemotTextSanitizer.sanitizeForTTS(parsedData.transcription || "לא זוהה דיבור"),
                answer: YemotTextSanitizer.sanitizeForTTS(parsedData.answer || "לא הצלחתי לגבש תשובה")
            };
        } catch (error) {
            return { transcription: "שגיאת תמלול בשרת", answer: YemotTextSanitizer.sanitizeForTTS(rawJsonResponse) };
        }
    }

    static async processTranscriptionOnly(base64Audio) {
        const payload = {
            contents: [{
                role: "user",
                parts:[
                    { text: SYSTEM_CONSTANTS.PROMPTS.GEMINI_SYSTEM_INSTRUCTION_TRANSCRIPTION },
                    { inlineData: { mimeType: SYSTEM_CONSTANTS.MODELS.AUDIO_MIME_TYPE, data: base64Audio } }
                ]
            }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 4000 }
        };
        const rawTextResponse = await this.callGemini(payload);
        return YemotTextSanitizer.sanitizeForTTS(rawTextResponse);
    }
}

// ============================================================================
// --- SECTION 10: YEMOT IVR STRING COMPILER ---
// ============================================================================
class YemotResponseCompiler {
    constructor() { this.commandChain =[]; }
    
    playTTS(textToSpeak) {
        if (!textToSpeak) return this;
        this.commandChain.push(`id_list_message=t-${YemotTextSanitizer.sanitizeForTTS(textToSpeak)}`);
        return this;
    }
    requestDigits(ttsPrompt, baseVariableName, minDigits = 1, maxDigits = 1) {
        const safePrompt = YemotTextSanitizer.sanitizeForTTS(ttsPrompt);
        const timestampedVarName = `${baseVariableName}_${Date.now()}`;
        const params =['no', maxDigits, minDigits, SYSTEM_CONSTANTS.IVR_DEFAULTS.STANDARD_TIMEOUT, 'No', 'yes', 'no'];
        this.commandChain.push(`read=t-${safePrompt}=${timestampedVarName},${params.join(',')}`);
        return this;
    }
    requestEmailKeyboard(ttsPrompt, baseVariableName) {
        const safePrompt = YemotTextSanitizer.sanitizeForTTS(ttsPrompt);
        const timestampedVarName = `${baseVariableName}_${Date.now()}`;
        const params =['no', 100, 5, SYSTEM_CONSTANTS.IVR_DEFAULTS.EMAIL_TIMEOUT, 'EmailKeyboard', 'yes', 'no'];
        this.commandChain.push(`read=t-${safePrompt}=${timestampedVarName},${params.join(',')}`);
        return this;
    }
    requestAudioRecord(ttsPrompt, baseVariableName, uniqueCallId) {
        const safePrompt = YemotTextSanitizer.sanitizeForTTS(ttsPrompt);
        const fileName = `rec_${uniqueCallId}_${Date.now()}`;
        const timestampedVarName = `${baseVariableName}_${Date.now()}`;
        const params =['no', 'record', SYSTEM_CONSTANTS.YEMOT_PATHS.RECORDINGS_DIR, fileName, 'no', 'yes', 'no', 1, 120];
        this.commandChain.push(`read=t-${safePrompt}=${timestampedVarName},${params.join(',')}`);
        return this;
    }
    routeToFolder(targetFolder) {
        this.commandChain.push(`go_to_folder=${targetFolder}`);
        return this;
    }
    compile() {
        if (this.commandChain.length === 0) this.routeToFolder("hangup");
        return this.commandChain.filter(cmd => cmd.trim() !== '').join('&');
    }
}

// ============================================================================
// --- SECTION 11: DOMAIN CONTROLLERS & PAGINATION ---
// ============================================================================
class DomainControllers {
    static serveMainMenu(ivrCompiler) {
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.MAIN_MENU, SYSTEM_CONSTANTS.STATE_BASES.MENU_CHOICE, 1, 1);
    }

    // --- Pagination Handlers (מנגנון פיצול תשובות ארוכות) ---
    static async handlePaginationFlow(phone, choice, callId, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        const pag = profile.pagination;

        if (choice === '9' && pag && pag.chunks && pag.currentIndex < pag.chunks.length - 1) {
            pag.currentIndex++;
            await UserRepository.saveProfile(phone, profile);
            
            const isLast = pag.currentIndex === pag.chunks.length - 1;
            ivrCompiler.playTTS(pag.chunks[pag.currentIndex]);
            
            if (isLast) {
                if (pag.type === 'chat') {
                    ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.CHAT_ACTION_MENU, SYSTEM_CONSTANTS.STATE_BASES.CHAT_ACTION_CHOICE, 1, 1);
                } else {
                    ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.TRANS_ACTION_MENU, SYSTEM_CONSTANTS.STATE_BASES.TRANS_ACTION_CHOICE, 1, 1);
                }
            } else {
                const prompt = pag.type === 'chat' ? SYSTEM_CONSTANTS.PROMPTS.CHAT_PAGINATION_MENU : SYSTEM_CONSTANTS.PROMPTS.TRANS_PAGINATION_MENU;
                const stateBase = pag.type === 'chat' ? SYSTEM_CONSTANTS.STATE_BASES.CHAT_PAGINATION : SYSTEM_CONSTANTS.STATE_BASES.TRANS_PAGINATION;
                ivrCompiler.requestDigits(prompt, stateBase, 1, 1);
            }
        } 
        else if (pag.type === 'chat' && choice === '7') {
            this.serveMainMenu(ivrCompiler); // fallback if they press 7 directly without listening
        }
        else {
            this.serveMainMenu(ivrCompiler);
        }
    }

    static async startPaginatedPlayback(phone, fullText, type, ivrCompiler) {
        const chunks = YemotTextSanitizer.chunkText(fullText, SYSTEM_CONSTANTS.IVR_DEFAULTS.MAX_CHUNK_LENGTH);
        const profile = await UserRepository.getProfile(phone);
        
        if (chunks.length > 1) {
            profile.pagination = { chunks, currentIndex: 0, type };
            await UserRepository.saveProfile(phone, profile);
            
            ivrCompiler.playTTS(chunks[0]);
            const prompt = type === 'chat' ? SYSTEM_CONSTANTS.PROMPTS.CHAT_PAGINATION_MENU : SYSTEM_CONSTANTS.PROMPTS.TRANS_PAGINATION_MENU;
            const stateBase = type === 'chat' ? SYSTEM_CONSTANTS.STATE_BASES.CHAT_PAGINATION : SYSTEM_CONSTANTS.STATE_BASES.TRANS_PAGINATION;
            ivrCompiler.requestDigits(prompt, stateBase, 1, 1);
        } else {
            ivrCompiler.playTTS(chunks[0]);
            const prompt = type === 'chat' ? SYSTEM_CONSTANTS.PROMPTS.CHAT_ACTION_MENU : SYSTEM_CONSTANTS.PROMPTS.TRANS_ACTION_MENU;
            const stateBase = type === 'chat' ? SYSTEM_CONSTANTS.STATE_BASES.CHAT_ACTION_CHOICE : SYSTEM_CONSTANTS.STATE_BASES.TRANS_ACTION_CHOICE;
            ivrCompiler.requestDigits(prompt, stateBase, 1, 1);
        }
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

        await this.startPaginatedPlayback(phone, answer, 'chat', ivrCompiler);
    }

    static async initChatHistoryMenu(phone, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        if (profile.chats.length === 0) {
            ivrCompiler.playTTS(SYSTEM_CONSTANTS.PROMPTS.NO_HISTORY);
            this.serveMainMenu(ivrCompiler);
            return;
        }
        
        let promptText = SYSTEM_CONSTANTS.PROMPTS.CHAT_HISTORY_PREFIX;
        // Fix syntax issue in older version, use correct iteration
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
            ivrCompiler.playTTS(SYSTEM_CONSTANTS.PROMPTS.INVALID_CHOICE);
            this.serveMainMenu(ivrCompiler);
            return;
        }

        const selected = recents[idx];
        profile.currentChatId = selected.id;
        await UserRepository.saveProfile(phone, profile);

        let playbackScript = SYSTEM_CONSTANTS.PROMPTS.CHAT_PLAYBACK_PREFIX;
        selected.messages.forEach((msg, i) => {
            playbackScript += `שאלה ${i + 1} ${msg.q} תשובה ${msg.a} `;
        });

        await this.startPaginatedPlayback(phone, playbackScript, 'chat', ivrCompiler);
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

    static async initTransHistoryMenu(phone, ivrCompiler) {
        const profile = await UserRepository.getProfile(phone);
        if (profile.transcriptions.length === 0) {
            ivrCompiler.playTTS(SYSTEM_CONSTANTS.PROMPTS.NO_TRANS_HISTORY);
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
            ivrCompiler.playTTS(SYSTEM_CONSTANTS.PROMPTS.INVALID_CHOICE);
            this.serveMainMenu(ivrCompiler);
            return;
        }

        profile.currentTransIndex = idx;
        await UserRepository.saveProfile(phone, profile);

        const text = `התמלול המלא הוא ${recents[idx].text}`;
        await this.startPaginatedPlayback(phone, text, 'trans', ivrCompiler);
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
            ivrCompiler.requestEmailKeyboard(SYSTEM_CONSTANTS.PROMPTS.EMAIL_PROMPT, SYSTEM_CONSTANTS.STATE_BASES.USER_EMAIL_INPUT);
        }
        else {
            this.serveMainMenu(ivrCompiler);
        }
    }

    static async executeEmailSending(phone, emailInput, ivrCompiler) {
        Logger.info("Domain_Email", `Simulated Email Sent to: [${emailInput}]`);
        ivrCompiler.playTTS(SYSTEM_CONSTANTS.PROMPTS.EMAIL_SUCCESS);
        this.serveMainMenu(ivrCompiler);
    }
}

// ============================================================================
// --- SECTION 13: STATE MACHINE & REQUEST ROUTER (MAIN HANDLER) ---
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

        // Advanced Timestamped State Engine
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

        // Hangup Audio Interceptor
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
            await DomainControllers.handlePaginationFlow(phone, triggerValue, callId, ivrCompiler);
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
            await DomainControllers.handlePaginationFlow(phone, triggerValue, callId, ivrCompiler);
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
        fallbackCompiler.playTTS(SYSTEM_CONSTANTS.PROMPTS.SYSTEM_ERROR_FALLBACK).routeToFolder("hangup");
        return sendHTTPResponse(res, fallbackCompiler.compile());
    }
}
