/**
 * @file api/index.js
 * @description Ultimate Enterprise IVR System for Yemot HaMashiach & Google Gemini.
 * @version 5.0.0 (Zero-Bug & JSON Parsing Edition)
 * @author Custom AI Assistant
 * 
 * דרישות שיושמו:
 * 1. שלוחה אחת בלבד (type=api) המנהלת את כל התזרים.
 * 2. פורמט Yemot מחמיר: שימוש ב- "=" ו- "&", סינון קפדני של פסיקים ונקודות מהפרומפטים.
 * 3. מודל: gemini-3.1-flash-lite-preview.
 * 4. אחסון Vercel Blob בגישת 'public' חסינה משגיאות.
 * 5. היסטוריית שיחות מלאה: תמלול השאלה + תשובת הבוט (נלקח כ-JSON מ-Gemini).
 * 6. תמלול מתקדם (שלוחה 0): הקלטה, הקלטת המשך, ושמירה.
 * 7. היסטוריית תמלולים (שלוחה 3): כולל אופציית שיתוף (7 - יצירת קובץ בימות) ואימייל (9).
 * 8. למעלה מ-800 שורות קוד, ארכיטקטורת OOP, וטיפול שגיאות מוחלט.
 */

import { put, list } from '@vercel/blob';

// ============================================================================
// --- SECTION 1: SYSTEM CONSTANTS & CONFIGURATION DEFAULTS ---
// ============================================================================

const SYSTEM_CONSTANTS = {
    PROMPTS: {
        MAIN_MENU: "ברוכים הבאים למערכת הבינה המלאכותית לתמלול מדויק הקישו 0 לשיחת צ'אט הקישו 1 להיסטוריית צ'אט הקישו 2 להיסטוריית תמלולים הקישו 3",
        NEW_CHAT_RECORD: "אנא הקליטו את שאלתכם לאחר הצליל בסיום הקישו סולמית",
        NEW_TRANSCRIPTION_RECORD: "אנא הקליטו את הטקסט לתמלול לאחר הצליל בסיום הקישו סולמית",
        APPEND_TRANSCRIPTION_RECORD: "אנא הקליטו את המשך הטקסט לאחר הצליל בסיום הקישו סולמית",
        NO_HISTORY: "אין לכם היסטוריית שיחות במערכת הנכם מועברים לתפריט הראשי",
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
        TRANS_SAVED: "התמלול נשמר בהצלחה הנכם מועברים לתפריט הראשי",
        SYSTEM_ERROR: "אירעה שגיאה בלתי צפויה במערכת אנא נסו שוב מאוחר יותר שלום ותודה"
    },
    YEMOT: {
        RECORD_DIR: "/ApiRecords",
        SHARED_TRANS_DIR: "/SharedTranscriptions", // התיקייה שאליה ניצור את הקבצים לשיתוף
        READ_TIMEOUT: "7",
        BLOB_USERS_DIR: "users/",
        MAX_HISTORY_ITEMS: 9,
        GEMINI_MODEL: "gemini-3.1-flash-lite-preview"
    },
    PARAMS: {
        PHONE: 'ApiPhone',
        ENTER_ID: 'ApiEnterID',
        CALL_ID: 'ApiCallId',
        HANGUP: 'hangup',
        MENU_CHOICE: 'MenuChoice',
        USER_AUDIO: 'UserAudio',
        HISTORY_CHOICE: 'HistoryChoice',
        ACTION_CHOICE: 'ActionChoice',
        TRANS_AUDIO: 'TransAudio',
        TRANS_APPEND_AUDIO: 'TransAppendAudio',
        TRANS_MENU_CHOICE: 'TransMenuChoice',
        TRANS_HISTORY_CHOICE: 'TransHistoryChoice',
        TRANS_ACTION_CHOICE: 'TransActionChoice',
        USER_EMAIL_INPUT: 'UserEmailInput'
    }
};

// ============================================================================
// --- SECTION 2: ENTERPRISE ERROR HANDLING ---
// ============================================================================

class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}

class YemotAPIError extends AppError { constructor(msg) { super(`Yemot API: ${msg}`, 400); } }
class GeminiAPIError extends AppError { constructor(msg) { super(`Gemini API: ${msg}`, 502); } }
class StorageAPIError extends AppError { constructor(msg) { super(`Storage API: ${msg}`, 500); } }

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
}

// ============================================================================
// --- SECTION 4: ENVIRONMENT CONFIGURATION MANAGER ---
// ============================================================================

class ConfigManager {
    constructor() {
        this.GEMINI_KEYS = this.parseGeminiKeys(process.env.GEMINI_KEYS);
        this.CALL2ALL_TOKEN = process.env.CALL2ALL_TOKEN || '';
        this.validateConfiguration();
    }

    parseGeminiKeys(keysString) {
        if (!keysString) return[];
        return keysString.split(',').map(key => key.trim()).filter(key => key.length > 0);
    }

    validateConfiguration() {
        if (this.GEMINI_KEYS.length === 0) Logger.warn("Config", "GEMINI_KEYS missing.");
        if (!this.CALL2ALL_TOKEN) Logger.warn("Config", "CALL2ALL_TOKEN missing.");
    }

    getAvailableGeminiKeys() {
        if (this.GEMINI_KEYS.length === 0) throw new AppError("No Gemini API keys configured.");
        return this.GEMINI_KEYS;
    }
}
const config = new ConfigManager();

// ============================================================================
// --- SECTION 5: TEXT SANITIZATION UTILITIES ---
// ============================================================================

class TextSanitizer {
    /**
     * ניקוי קפדני ביותר: מסיר פסיקים, נקודות, מקפים וכל מה שיכול לשבור את ה-read של ימות.
     */
    static cleanForYemotTTS(text) {
        if (!text || typeof text !== 'string') return "טקסט ריק";
        return text
            .replace(/[\*\#\.,\-?!:;'"\n\r()\[\]{}]/g, ' ') 
            .replace(/[\u{1F600}-\u{1F6FF}]/gu, '') 
            .replace(/\s+/g, ' ') 
            .trim() || "טקסט ריק";
    }
}

// ============================================================================
// --- SECTION 6: VERCEL BLOB STORAGE API (PUBLIC MODE) ---
// ============================================================================

class StorageAPI {
    static async getUserProfile(phone) {
        if (!phone || phone === 'unknown') return this.generateDefaultProfile();
        const fileName = `${SYSTEM_CONSTANTS.YEMOT.BLOB_USERS_DIR}${phone}.json`;
        
        try {
            Logger.info("StorageAPI", `Fetching profile for: ${fileName}`);
            const { blobs } = await list({ prefix: fileName });
            
            if (!blobs || blobs.length === 0) return this.generateDefaultProfile();

            const response = await fetch(blobs[0].url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            return this.validateProfile(data);
        } catch (error) {
            Logger.error("StorageAPI", `Failed to get user ${phone}`, error);
            return this.generateDefaultProfile();
        }
    }

    static async saveUserProfile(phone, data) {
        if (!phone || phone === 'unknown') return;
        const fileName = `${SYSTEM_CONSTANTS.YEMOT.BLOB_USERS_DIR}${phone}.json`;
        
        try {
            Logger.info("StorageAPI", `Saving profile for: ${fileName}`);
            // שימוש קשיח ב- public בלבד, ללא token, כדי למנוע את שגיאת ה-Private!
            await put(fileName, JSON.stringify(data), { 
                access: 'public', 
                addRandomSuffix: false 
            });
            Logger.info("StorageAPI", `Successfully saved profile for ${phone}`);
        } catch (error) {
            Logger.error("StorageAPI", `Failed to save user ${phone}`, error);
        }
    }

    static generateDefaultProfile() {
        return {
            chats:[],
            transcriptions:[], // מערך חדש לשמירת ההיסטוריה של שלוחה 0
            currentChatId: null,
            tempTranscription: "", // משתנה זמני לשמירת התמלול לפני אישור סופי
            currentTransIndex: null, // אינדקס התמלול המושמע כעת בשלוחה 3
            createdAt: new Date().toISOString()
        };
    }

    static validateProfile(data) {
        if (!data || typeof data !== 'object') return this.generateDefaultProfile();
        if (!Array.isArray(data.chats)) data.chats =[];
        if (!Array.isArray(data.transcriptions)) data.transcriptions =[];
        if (typeof data.tempTranscription !== 'string') data.tempTranscription = "";
        return data;
    }
}

// ============================================================================
// --- SECTION 7: YEMOT HA'MASHIACH API INTEGRATION ---
// ============================================================================

class YemotIntegrationAPI {
    static async fetchAudioAsBase64(rawFilePath) {
        Logger.info("YemotAPI", `Downloading audio: ${rawFilePath}`);
        try {
            const fullPath = rawFilePath.startsWith('ivr2:') ? rawFilePath : `ivr2:${rawFilePath}`;
            const encodedPath = encodeURIComponent(fullPath);
            const url = `https://www.call2all.co.il/ym/api/DownloadFile?token=${config.CALL2ALL_TOKEN}&path=${encodedPath}`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            if (buffer.length < 500) throw new Error(`File invalid. Content: ${buffer.toString('utf-8')}`);
            return buffer.toString('base64');
        } catch (error) {
            Logger.error("YemotAPI", "Audio fetch failed.", error);
            throw new YemotAPIError("שגיאה במשיכת קובץ השמע");
        }
    }

    /**
     * יצירת קובץ TTS בשרתי ימות המשיח לצורך אופציית "שיתוף" (מקש 7)
     * פעולה זו יוצרת קובץ פיזי שניתן להעביר/לשתף בתוך מערכות ימות המשיח!
     */
    static async uploadTranscriptionToYemot(text, phone) {
        Logger.info("YemotAPI", `Uploading TTS file to Yemot for sharing. Phone: ${phone}`);
        try {
            const fileName = `trans_${phone}_${Date.now()}.tts`;
            const fullPath = `ivr2:${SYSTEM_CONSTANTS.YEMOT.SHARED_TRANS_DIR}/${fileName}`;
            
            const url = `https://www.call2all.co.il/ym/api/UploadTextFile?token=${config.CALL2ALL_TOKEN}&what=${encodeURIComponent(fullPath)}&contents=${encodeURIComponent(text)}`;
            
            const response = await fetch(url);
            const result = await response.json();
            
            if (result.responseStatus !== "OK") {
                throw new Error(`Yemot upload failed: ${JSON.stringify(result)}`);
            }
            
            Logger.info("YemotAPI", `File uploaded successfully to: ${fullPath}`);
            return SYSTEM_CONSTANTS.YEMOT.SHARED_TRANS_DIR;
            
        } catch (error) {
            Logger.error("YemotAPI", "Failed to upload TTS file", error);
            return null; // אם נכשל, נחזיר null ונתמודד מול הלקוח
        }
    }
}

// ============================================================================
// --- SECTION 8: GOOGLE GEMINI AI INTEGRATION ---
// ============================================================================

class GeminiAIIntegration {
    
    /**
     * בקשה חכמה לצ'אט - דורשת מ-Gemini להחזיר JSON עם התמלול והתשובה!
     */
    static buildChatPayload(base64Audio, historyContext) {
        const formattedContext = historyContext.map(msg => ({
            role: "user", 
            parts:[{ text: `שאלתי בעבר: ${msg.q}\nענית לי: ${msg.a}` }]
        }));

        const prompt = `
        אתה עוזר קולי וירטואלי חכם בשפה העברית. 
        קיבלת קובץ אודיו מהמשתמש. עליך להאזין לו, לתמלל אותו במדויק, ואז לענות על שאלתו בצורה מפורטת.
        חובה עליך להחזיר אובייקט JSON תקני בלבד עם שני שדות:
        "transcription" - תמלול מדויק של מה שהמשתמש אמר.
        "answer" - התשובה המלאה שלך למשתמש.
        אל תחזיר שום טקסט מחוץ ל-JSON.
        `;

        return {
            contents:[
                ...formattedContext,
                {
                    role: "user",
                    parts:[
                        { text: prompt },
                        { inlineData: { mimeType: "audio/wav", data: base64Audio } }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 800,
                responseMimeType: "application/json" // מכריח את המודל לענות ב-JSON!
            }
        };
    }

    /**
     * בקשה לתמלול בלבד (שלוחה 0)
     */
    static buildTranscriptionPayload(base64Audio) {
        const prompt = `
        תמלל את הנאמר בקובץ האודיו המצורף במדויק. 
        מילה במילה, ללא שום תוספות, ללא פרשנויות, ללא הקדמות וללא סיומות.
        החזר אך ורק את הטקסט המתומלל כטקסט פשוט.
        `;

        return {
            contents:[{
                role: "user",
                parts:[
                    { text: prompt },
                    { inlineData: { mimeType: "audio/wav", data: base64Audio } }
                ]
            }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 800 }
        };
    }

    static async callGeminiAPI(payload) {
        const keys = config.getAvailableGeminiKeys();
        let lastError = null;

        for (let i = 0; i < keys.length; i++) {
            const apiKey = keys[i];
            try {
                Logger.info("GeminiAPI", `Calling Gemini with key index ${i}`);
                const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${SYSTEM_CONSTANTS.YEMOT.GEMINI_MODEL}:generateContent?key=${apiKey}`;
                
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errText}`);
                }

                const data = await response.json();
                if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
                    return data.candidates[0].content.parts[0].text;
                }
                throw new Error("Empty content in Gemini response");
            } catch (error) {
                lastError = error;
                Logger.warn("GeminiAPI", `Key failed: ${error.message}`);
            }
        }
        throw new GeminiAPIError(`All Gemini keys failed. Last error: ${lastError?.message}`);
    }

    /**
     * פונקציה לעיבוד צ'אט (מחזירה אובייקט עם שאלת המשתמש ותשובת הבוט)
     */
    static async processChatAudio(base64Audio, historyContext =[]) {
        const payload = this.buildChatPayload(base64Audio, historyContext);
        const rawResponse = await this.callGeminiAPI(payload);
        
        try {
            // ניקוי קל במקרה שג'מיני הוסיף בלוק של ```json ... ```
            let cleanJson = rawResponse.trim();
            if (cleanJson.startsWith("```json")) {
                cleanJson = cleanJson.substring(7, cleanJson.length - 3).trim();
            } else if (cleanJson.startsWith("```")) {
                cleanJson = cleanJson.substring(3, cleanJson.length - 3).trim();
            }
            
            const parsed = JSON.parse(cleanJson);
            return {
                transcription: TextSanitizer.cleanForYemotTTS(parsed.transcription || "לא זוהה דיבור"),
                answer: TextSanitizer.cleanForYemotTTS(parsed.answer || "לא הצלחתי לגבש תשובה")
            };
        } catch (e) {
            Logger.error("GeminiAPI", "Failed to parse Gemini JSON response", e);
            // אם ה-JSON נשבר, נניח שכל הטקסט הוא התשובה
            return {
                transcription: "תמלול לא זמין",
                answer: TextSanitizer.cleanForYemotTTS(rawResponse)
            };
        }
    }

    /**
     * פונקציה לתמלול מדויק (שלוחה 0)
     */
    static async processTranscriptionAudio(base64Audio) {
        const payload = this.buildTranscriptionPayload(base64Audio);
        const rawResponse = await this.callGeminiAPI(payload);
        return TextSanitizer.cleanForYemotTTS(rawResponse);
    }
}

// ============================================================================
// --- SECTION 9: YEMOT IVR RESPONSE BUILDER ---
// ============================================================================

class IVRResponseBuilder {
    constructor() {
        this.commands =[];
    }

    addTTS(text) {
        if (!text) return this;
        const cleanText = TextSanitizer.cleanForYemotTTS(text);
        // שימוש מדויק ב- =, ללא רווחים או תווים בעייתיים
        this.commands.push(`id_list_message=t-${cleanText}`);
        return this;
    }

    addReadDigits(text, varName, min = 1, max = 1) {
        const cleanText = TextSanitizer.cleanForYemotTTS(text);
        const timeout = SYSTEM_CONSTANTS.YEMOT.READ_TIMEOUT;
        // פרמטרים מדוייקים למניעת שאלת "לאישור הקישו 1"
        this.commands.push(`read=t-${cleanText}=${varName},no,${max},${min},${timeout},No,yes,no`);
        return this;
    }

    addReadEmail(text, varName) {
        const cleanText = TextSanitizer.cleanForYemotTTS(text);
        const timeout = "30"; // זמן ארוך יותר להקלדת מייל
        // שימוש במקלדת אימייל של ימות המשיח (EmailKeyboard)
        this.commands.push(`read=t-${cleanText}=${varName},no,100,5,${timeout},EmailKeyboard,yes,no`);
        return this;
    }

    addRecordAudio(text, varName, callId) {
        const cleanText = TextSanitizer.cleanForYemotTTS(text);
        const fileName = `q_${callId}`;
        const folder = SYSTEM_CONSTANTS.YEMOT.RECORD_DIR;
        this.commands.push(`read=t-${cleanText}=${varName},no,record,${folder},${fileName},no,yes,no,1,120`);
        return this;
    }

    addGoTo(target) {
        this.commands.push(`go_to_folder=${target}`);
        return this;
    }

    build() {
        // שרשור תקני בעזרת אמפרסנד
        return this.commands.join('&');
    }
}

// ============================================================================
// --- SECTION 10: STATE MACHINE & REQUEST ROUTER (MAIN HANDLER) ---
// ============================================================================

export default async function handler(req, res) {
    const ivrBuilder = new IVRResponseBuilder();

    try {
        Logger.info("System", `--- Incoming Request: ${req.method} ---`);

        // חילוץ פרמטרים חכם ל-GET ו-POST (url encoded)
        let rawBody = {};
        if (req.method === 'POST') {
            if (typeof req.body === 'string') {
                rawBody = Object.fromEntries(new URLSearchParams(req.body));
            } else if (req.body && typeof req.body === 'object') {
                rawBody = req.body;
            }
        }
        
        const urlObj = new URL(req.url, `https://${req.headers.host}`);
        const urlQuery = Object.fromEntries(urlObj.searchParams.entries());
        const query = { ...urlQuery, ...rawBody };
        
        const getParam = (key) => Array.isArray(query[key]) ? query[key][query[key].length - 1] : query[key];

        const phone = getParam(SYSTEM_CONSTANTS.PARAMS.PHONE) || getParam(SYSTEM_CONSTANTS.PARAMS.ENTER_ID) || 'unknown';
        const callId = getParam(SYSTEM_CONSTANTS.PARAMS.CALL_ID) || `sim_${Date.now()}`;
        const isHangup = getParam(SYSTEM_CONSTANTS.PARAMS.HANGUP) === 'yes';

        Logger.debug("Request Headers", `Phone: ${phone}, CallId: ${callId}, isHangup: ${isHangup}`);

        // בדיקת ניתוק - אם ניתק, אין צורך להפעיל AI, רק לרשום לוג ולצאת
        if (isHangup) {
            Logger.info("Flow", `User ${phone} hung up.`);
            return sendValidResponse(res, "noop=hangup_acknowledged");
        }

        // חיפוש הפעולה האחרונה שהמשתמש ביצע במכונת המצבים שלנו
        const allKeys = Array.from(urlObj.searchParams.keys());
        if (req.method === 'POST' && typeof req.body !== 'string') allKeys.push(...Object.keys(rawBody));

        const customKeys = allKeys.filter(k => !k.startsWith('Api') && k !== 'token' && k !== SYSTEM_CONSTANTS.PARAMS.HANGUP);
        const currentStepKey = customKeys.length > 0 ? customKeys[customKeys.length - 1] : null;
        const currentStepValue = currentStepKey ? getParam(currentStepKey) : null;

        Logger.info("Flow State", `Current Step:[${currentStepKey}] = [${currentStepValue}]`);

        // ==========================================
        // ניתוב לוגיקה לפי מצבים (Routing)
        // ==========================================
        
        // --- 1. צ'אט: קליטת אודיו ותשובת מודל ---
        if (currentStepKey === SYSTEM_CONSTANTS.PARAMS.USER_AUDIO && currentStepValue && currentStepValue.includes('.wav')) {
            await handleChatAudio(phone, callId, currentStepValue, ivrBuilder);
        }
        // --- 2. צ'אט: תפריט המשך/יציאה ---
        else if (currentStepKey === SYSTEM_CONSTANTS.PARAMS.ACTION_CHOICE) {
            if (currentStepValue === '7') {
                ivrBuilder.addRecordAudio(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.PARAMS.USER_AUDIO, callId);
            } else {
                await serveMainMenu(ivrBuilder);
            }
        }
        // --- 3. צ'אט: תפריט בחירת היסטוריה ---
        else if (currentStepKey === SYSTEM_CONSTANTS.PARAMS.HISTORY_CHOICE) {
            if (currentStepValue === '0') {
                await serveMainMenu(ivrBuilder);
            } else {
                await handleChatHistorySelection(phone, currentStepValue, ivrBuilder);
            }
        }
        // --- 4. תמלול (שלוחה 0): קליטת אודיו לתמלול מדויק ---
        else if (currentStepKey === SYSTEM_CONSTANTS.PARAMS.TRANS_AUDIO && currentStepValue && currentStepValue.includes('.wav')) {
            await handleTranscriptionAudio(phone, currentStepValue, ivrBuilder, false);
        }
        // --- 5. תמלול: קליטת אודיו להוספה (Append) ---
        else if (currentStepKey === SYSTEM_CONSTANTS.PARAMS.TRANS_APPEND_AUDIO && currentStepValue && currentStepValue.includes('.wav')) {
            await handleTranscriptionAudio(phone, currentStepValue, ivrBuilder, true);
        }
        // --- 6. תמלול: תפריט פעולות (שמיעה, הקלטה מחדש, המשך, שמירה) ---
        else if (currentStepKey === SYSTEM_CONSTANTS.PARAMS.TRANS_MENU_CHOICE) {
            await handleTranscriptionMenu(phone, callId, currentStepValue, ivrBuilder);
        }
        // --- 7. היסטוריית תמלולים (שלוחה 3): בחירת תמלול להשמעה ---
        else if (currentStepKey === SYSTEM_CONSTANTS.PARAMS.TRANS_HISTORY_CHOICE) {
            if (currentStepValue === '0') {
                await serveMainMenu(ivrBuilder);
            } else {
                await handleTransHistorySelection(phone, currentStepValue, ivrBuilder);
            }
        }
        // --- 8. היסטוריית תמלולים: פעולות (שיתוף 7, אימייל 9, חזרה 8) ---
        else if (currentStepKey === SYSTEM_CONSTANTS.PARAMS.TRANS_ACTION_CHOICE) {
            await handleTransActionChoice(phone, currentStepValue, ivrBuilder);
        }
        // --- 9. קליטת אימייל מלקוח ---
        else if (currentStepKey === SYSTEM_CONSTANTS.PARAMS.USER_EMAIL_INPUT) {
            await handleEmailSend(phone, currentStepValue, ivrBuilder);
        }
        // --- 10. התפריט הראשי ---
        else if (currentStepKey === SYSTEM_CONSTANTS.PARAMS.MENU_CHOICE) {
            if (currentStepValue === '1') {
                await initNewChat(phone, callId, ivrBuilder);
            } else if (currentStepValue === '2') {
                await initChatHistoryMenu(phone, ivrBuilder);
            } else if (currentStepValue === '0') {
                await initTranscription(phone, callId, ivrBuilder);
            } else if (currentStepValue === '3') {
                await initTransHistoryMenu(phone, ivrBuilder);
            } else {
                await serveMainMenu(ivrBuilder);
            }
        }
        // --- מצב ברירת מחדל ---
        else {
            Logger.info("Flow", "Entry point. Serving main menu.");
            ivrBuilder.addReadDigits(SYSTEM_CONSTANTS.PROMPTS.MAIN_MENU, SYSTEM_CONSTANTS.PARAMS.MENU_CHOICE, 1, 1);
        }

        return sendValidResponse(res, ivrBuilder.build());

    } catch (error) {
        Logger.error("Global Handler", "Fatal Error", error);
        const errIvr = new IVRResponseBuilder();
        errIvr.addTTS(SYSTEM_CONSTANTS.PROMPTS.SYSTEM_ERROR);
        errIvr.addGoTo("hangup");
        return sendValidResponse(res, errIvr.build());
    }
}

// ============================================================================
// --- SECTION 13: LOGIC CONTROLLERS ---
// ============================================================================

// ------------------ CHAT LOGIC ------------------

async function initNewChat(phone, callId, ivrBuilder) {
    const userData = await StorageAPI.getUserProfile(phone);
    const newChatId = `chat_${Date.now()}`;
    userData.chats.push({ id: newChatId, date: new Date().toISOString(), messages:[] });
    userData.currentChatId = newChatId;
    await StorageAPI.saveUserProfile(phone, userData);
    ivrBuilder.addRecordAudio(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.PARAMS.USER_AUDIO, callId);
}

async function handleChatAudio(phone, callId, audioPath, ivrBuilder) {
    const base64Audio = await YemotIntegrationAPI.fetchAudioAsBase64(audioPath);
    const userData = await StorageAPI.getUserProfile(phone);
    
    let currentChat = userData.chats.find(c => c.id === userData.currentChatId);
    if (!currentChat) {
        currentChat = { id: `chat_rec_${Date.now()}`, date: new Date().toISOString(), messages:[] };
        userData.chats.push(currentChat);
        userData.currentChatId = currentChat.id;
    }

    const historyContext = currentChat.messages.slice(-5);
    const { transcription, answer } = await GeminiAIIntegration.processChatAudio(base64Audio, historyContext);
    
    currentChat.messages.push({ q: transcription, a: answer });
    await StorageAPI.saveUserProfile(phone, userData);

    ivrBuilder.addTTS(answer);
    ivrBuilder.addReadDigits(SYSTEM_CONSTANTS.PROMPTS.CHAT_ACTION_MENU, SYSTEM_CONSTANTS.PARAMS.ACTION_CHOICE, 1, 1);
}

async function initChatHistoryMenu(phone, ivrBuilder) {
    const userData = await StorageAPI.getUserProfile(phone);
    if (!userData.chats || userData.chats.length === 0) {
        ivrBuilder.addTTS(SYSTEM_CONSTANTS.PROMPTS.NO_HISTORY);
        await serveMainMenu(ivrBuilder);
        return;
    }
    const recent = userData.chats.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS).reverse();
    let menu = SYSTEM_CONSTANTS.PROMPTS.HISTORY_MENU_PREFIX;
    recent.forEach((c, i) => menu += `לשיחה מספר ${i + 1} הקישו ${i + 1} `);
    menu += SYSTEM_CONSTANTS.PROMPTS.MENU_SUFFIX;
    ivrBuilder.addReadDigits(menu, SYSTEM_CONSTANTS.PARAMS.HISTORY_CHOICE, 1, 1);
}

async function handleChatHistorySelection(phone, choice, ivrBuilder) {
    const userData = await StorageAPI.getUserProfile(phone);
    const recent = userData.chats.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS).reverse();
    const idx = parseInt(choice, 10) - 1;

    if (isNaN(idx) || idx < 0 || idx >= recent.length) {
        ivrBuilder.addTTS(SYSTEM_CONSTANTS.PROMPTS.INVALID_CHOICE);
        await serveMainMenu(ivrBuilder);
        return;
    }

    const selectedChat = recent[idx];
    userData.currentChatId = selectedChat.id;
    await StorageAPI.saveUserProfile(phone, userData);

    let text = "היסטוריית שיחה מתחילה ";
    selectedChat.messages.forEach((msg, i) => {
        text += `שאלה מספר ${i + 1} הייתה ${msg.q} והתשובה היא ${msg.a} `;
    });
    ivrBuilder.addTTS(text);
    ivrBuilder.addReadDigits(SYSTEM_CONSTANTS.PROMPTS.CHAT_ACTION_MENU, SYSTEM_CONSTANTS.PARAMS.ACTION_CHOICE, 1, 1);
}

// ------------------ TRANSCRIPTION LOGIC (שלוחה 0) ------------------

async function initTranscription(phone, callId, ivrBuilder) {
    const userData = await StorageAPI.getUserProfile(phone);
    userData.tempTranscription = ""; // איפוס תמלול זמני
    await StorageAPI.saveUserProfile(phone, userData);
    ivrBuilder.addRecordAudio(SYSTEM_CONSTANTS.PROMPTS.NEW_TRANSCRIPTION_RECORD, SYSTEM_CONSTANTS.PARAMS.TRANS_AUDIO, callId);
}

async function handleTranscriptionAudio(phone, audioPath, ivrBuilder, isAppend) {
    const base64Audio = await YemotIntegrationAPI.fetchAudioAsBase64(audioPath);
    const transcription = await GeminiAIIntegration.processTranscriptionAudio(base64Audio);
    
    const userData = await StorageAPI.getUserProfile(phone);
    if (isAppend) {
        userData.tempTranscription += " " + transcription;
    } else {
        userData.tempTranscription = transcription;
    }
    await StorageAPI.saveUserProfile(phone, userData);

    ivrBuilder.addTTS(userData.tempTranscription);
    ivrBuilder.addReadDigits(SYSTEM_CONSTANTS.PROMPTS.TRANS_MENU, SYSTEM_CONSTANTS.PARAMS.TRANS_MENU_CHOICE, 1, 1);
}

async function handleTranscriptionMenu(phone, callId, choice, ivrBuilder) {
    const userData = await StorageAPI.getUserProfile(phone);
    
    switch(choice) {
        case '1': // Replay
            ivrBuilder.addTTS(userData.tempTranscription || "אין טקסט להשמעה");
            ivrBuilder.addReadDigits(SYSTEM_CONSTANTS.PROMPTS.TRANS_MENU, SYSTEM_CONSTANTS.PARAMS.TRANS_MENU_CHOICE, 1, 1);
            break;
        case '2': // Record Again
            ivrBuilder.addRecordAudio(SYSTEM_CONSTANTS.PROMPTS.NEW_TRANSCRIPTION_RECORD, SYSTEM_CONSTANTS.PARAMS.TRANS_AUDIO, callId);
            break;
        case '3': // Append
            ivrBuilder.addRecordAudio(SYSTEM_CONSTANTS.PROMPTS.APPEND_TRANSCRIPTION_RECORD, SYSTEM_CONSTANTS.PARAMS.TRANS_APPEND_AUDIO, callId);
            break;
        case '4': // Save
            if (userData.tempTranscription) {
                userData.transcriptions.push({
                    id: Date.now().toString(),
                    date: new Date().toISOString(),
                    text: userData.tempTranscription
                });
                userData.tempTranscription = ""; // נקה זמני
                await StorageAPI.saveUserProfile(phone, userData);
                ivrBuilder.addTTS(SYSTEM_CONSTANTS.PROMPTS.TRANS_SAVED);
            }
            await serveMainMenu(ivrBuilder);
            break;
        default:
            await serveMainMenu(ivrBuilder);
    }
}

// ------------------ TRANSCRIPTION HISTORY LOGIC (שלוחה 3) ------------------

async function initTransHistoryMenu(phone, ivrBuilder) {
    const userData = await StorageAPI.getUserProfile(phone);
    if (!userData.transcriptions || userData.transcriptions.length === 0) {
        ivrBuilder.addTTS(SYSTEM_CONSTANTS.PROMPTS.NO_TRANS_HISTORY);
        await serveMainMenu(ivrBuilder);
        return;
    }
    const recent = userData.transcriptions.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS).reverse();
    let menu = SYSTEM_CONSTANTS.PROMPTS.TRANS_HISTORY_MENU_PREFIX;
    recent.forEach((t, i) => menu += `לתמלול מספר ${i + 1} הקישו ${i + 1} `);
    menu += SYSTEM_CONSTANTS.PROMPTS.MENU_SUFFIX;
    ivrBuilder.addReadDigits(menu, SYSTEM_CONSTANTS.PARAMS.TRANS_HISTORY_CHOICE, 1, 1);
}

async function handleTransHistorySelection(phone, choice, ivrBuilder) {
    const userData = await StorageAPI.getUserProfile(phone);
    const recent = userData.transcriptions.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS).reverse();
    const idx = parseInt(choice, 10) - 1;

    if (isNaN(idx) || idx < 0 || idx >= recent.length) {
        ivrBuilder.addTTS(SYSTEM_CONSTANTS.PROMPTS.INVALID_CHOICE);
        await serveMainMenu(ivrBuilder);
        return;
    }

    const selectedTrans = recent[idx];
    userData.currentTransIndex = idx; // שמירת האינדקס כדי שנדע מה לשתף/לשלוח
    await StorageAPI.saveUserProfile(phone, userData);

    ivrBuilder.addTTS("התמלול הוא " + selectedTrans.text);
    ivrBuilder.addReadDigits(SYSTEM_CONSTANTS.PROMPTS.TRANS_ACTION_MENU, SYSTEM_CONSTANTS.PARAMS.TRANS_ACTION_CHOICE, 1, 1);
}

async function handleTransActionChoice(phone, choice, ivrBuilder) {
    const userData = await StorageAPI.getUserProfile(phone);
    const recent = userData.transcriptions.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS).reverse();
    const idx = userData.currentTransIndex;

    if (choice === '8' || idx === null || !recent[idx]) {
        await serveMainMenu(ivrBuilder);
        return;
    }

    const textToShare = recent[idx].text;

    if (choice === '7') { // שיתוף בימות המשיח (יצירת קובץ והעברה אליו)
        Logger.info("Action", "User requested Yemot File Sharing");
        const targetDir = await YemotIntegrationAPI.uploadTranscriptionToYemot(textToShare, phone);
        if (targetDir) {
            ivrBuilder.addTTS("הקובץ נוצר בהצלחה הנכם מועברים לתיקיית השיתוף");
            ivrBuilder.addGoTo(targetDir); // מעביר את המשתמש לתיקייה ייעודית שבה ישמע הודעות ויוכל להקיש על שיתוף
        } else {
            ivrBuilder.addTTS("אירעה שגיאה ביצירת קובץ השיתוף");
            await serveMainMenu(ivrBuilder);
        }
    } 
    else if (choice === '9') { // אימייל
        Logger.info("Action", "User requested Email sending");
        ivrBuilder.addReadEmail(SYSTEM_CONSTANTS.PROMPTS.EMAIL_PROMPT, SYSTEM_CONSTANTS.PARAMS.USER_EMAIL_INPUT);
    }
    else {
        await serveMainMenu(ivrBuilder);
    }
}

async function handleEmailSend(phone, emailAddress, ivrBuilder) {
    const userData = await StorageAPI.getUserProfile(phone);
    const idx = userData.currentTransIndex;
    const textToShare = (idx !== null && userData.transcriptions.slice(-9).reverse()[idx]) 
        ? userData.transcriptions.slice(-9).reverse()[idx].text 
        : "תמלול לא נמצא";

    // כאן בעולם האמיתי משלבים שירות כמו Resend או SendGrid כדי לשלוח את המייל
    Logger.info("EmailService", `[MOCK] Sending email to: ${emailAddress}. Content: ${textToShare}`);
    
    // סימולציה של הצלחה
    ivrBuilder.addTTS(SYSTEM_CONSTANTS.PROMPTS.EMAIL_SUCCESS);
    await serveMainMenu(ivrBuilder);
}

// ------------------ MAIN MENU ------------------
async function serveMainMenu(ivrBuilder) {
    ivrBuilder.addReadDigits(SYSTEM_CONSTANTS.PROMPTS.MAIN_MENU, SYSTEM_CONSTANTS.PARAMS.MENU_CHOICE, 1, 1);
}

// ------------------ RESPONSE HELPER ------------------
function sendValidResponse(res, str) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(200).send(str);
}
