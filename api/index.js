/**
 * @file api/index.js
 * @description Enterprise-Grade IVR System integrating Yemot HaMashiach, Vercel Blob, and Google Gemini.
 * @version 2.0.0
 * @author Custom AI Assistant
 * 
 * דרישות המערכת:
 * 1. שלוחה אחת בלבד (type=api)
 * 2. לוגיקה, ניווט והיסטוריה מנוהלים כולם בשרת זה.
 * 3. Vercel Blob לאחסון משתמשים (users/{phone}.json).
 * 4. שימוש במודל: gemini-3.1-flash-lite-preview.
 * 5. רוטציה בין מפתחות API וטיפול שגיאות ללא שגיאות 500.
 * 6. ארכיטקטורה יציבה מעל 650 שורות קוד.
 */

import { put, list } from '@vercel/blob';

// ============================================================================
// --- SECTION 1: CONSTANTS & ENUMS ---
// ============================================================================

/**
 * מאגר קבועים של המערכת למניעת "שגיאות הקלדה" (Magic Strings)
 */
const SYSTEM_CONSTANTS = {
    PROMPTS: {
        MAIN_MENU: "ברוכים הבאים למערכת הבינה המלאכותית. לשיחה חדשה עם המערכת הקישו 1. לשמיעת היסטוריית שיחות והמשך שיחה קודמת הקישו 2.",
        NEW_CHAT_RECORD: "אנא הקליטו את שאלתכם לאחר הצליל. בסיום הקישו סולמית.",
        NO_HISTORY: "אין לכם היסטוריית שיחות במערכת. הנכם מועברים לשיחה חדשה.",
        HISTORY_MENU_PREFIX: "תפריט היסטוריית שיחות. ",
        HISTORY_MENU_SUFFIX: "לחזרה לתפריט הראשי הקישו 0.",
        HISTORY_INVALID_CHOICE: "הבחירה שגויה. הנכם מועברים לתפריט הראשי.",
        CHAT_ACTION_MENU: "להמשך השיחה הנוכחית הקישו 7. לחזרה לתפריט הראשי הקישו 8.",
        SYSTEM_ERROR: "אירעה שגיאה בלתי צפויה במערכת. אנא נסו שוב מאוחר יותר. שלום ותודה.",
        GEMINI_PROMPT_INSTRUCTION: "זה קובץ אודיו של שאלה. תמלל וענה. אם לא הבנת תגיד שלא הבנת. אל תשתמש בכוכביות, סולמיות, או תווים מיוחדים בתשובה.",
        PREVIOUS_QUESTION_PREFIX: "שאלה קודמת:",
        PREVIOUS_ANSWER_PREFIX: "תשובה קודמת:"
    },
    YEMOT: {
        RECORD_DIR: "/ApiRecords",
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
        ACTION_CHOICE: 'ActionChoice'
    }
};

// ============================================================================
// --- SECTION 2: CUSTOM ERROR HANDLING ---
// ============================================================================

/**
 * מחלקת שגיאות בסיסית למערכת
 */
class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * שגיאות הקשורות לימות המשיח
 */
class YemotAPIError extends AppError {
    constructor(message) {
        super(`Yemot API Error: ${message}`, 400);
    }
}

/**
 * שגיאות הקשורות ל-Gemini
 */
class GeminiAPIError extends AppError {
    constructor(message) {
        super(`Gemini API Error: ${message}`, 502);
    }
}

/**
 * שגיאות הקשורות למסד הנתונים Vercel Blob
 */
class StorageAPIError extends AppError {
    constructor(message) {
        super(`Storage API Error: ${message}`, 500);
    }
}

// ============================================================================
// --- SECTION 3: LOGGER SYSTEM ---
// ============================================================================

/**
 * מחלקה לניהול הדפסות לוג בצורה מסודרת ב-Vercel
 */
class Logger {
    static info(context, message) {
        console.log(`[INFO] [${context}] ${message}`);
    }

    static warn(context, message) {
        console.warn(`[WARN] [${context}] ${message}`);
    }

    static error(context, message, errorObj = null) {
        console.error(`[ERROR][${context}] ${message}`);
        if (errorObj) {
            console.error(errorObj.stack || errorObj.message || errorObj);
        }
    }

    static debug(context, message) {
        if (process.env.NODE_ENV !== 'production') {
            console.debug(`[DEBUG] [${context}] ${message}`);
        }
    }
}

// ============================================================================
// --- SECTION 4: CONFIGURATION & ENVIRONMENT ---
// ============================================================================

/**
 * מחלקה לטעינה ואימות של משתני הסביבה
 */
class ConfigManager {
    constructor() {
        this.initialize();
    }

    initialize() {
        this.GEMINI_KEYS = this.parseGeminiKeys(process.env.GEMINI_KEYS);
        this.CALL2ALL_TOKEN = process.env.CALL2ALL_TOKEN || '';
        this.BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || '';
        this.validateConfiguration();
    }

    parseGeminiKeys(keysString) {
        if (!keysString) return[];
        return keysString.split(',').map(key => key.trim()).filter(key => key.length > 0);
    }

    validateConfiguration() {
        if (this.GEMINI_KEYS.length === 0) {
            Logger.warn("Config", "GEMINI_KEYS environment variable is missing or empty.");
        } else {
            Logger.info("Config", `Loaded ${this.GEMINI_KEYS.length} Gemini API keys for rotation.`);
        }

        if (!this.CALL2ALL_TOKEN) {
            Logger.warn("Config", "CALL2ALL_TOKEN environment variable is missing.");
        }
    }

    getAvailableGeminiKeys() {
        if (this.GEMINI_KEYS.length === 0) {
            throw new AppError("No Gemini API keys configured in environment variables.");
        }
        return this.GEMINI_KEYS;
    }
}

const config = new ConfigManager();

// ============================================================================
// --- SECTION 5: TEXT SANITIZATION ---
// ============================================================================

/**
 * מחלקה האחראית על ניקוי טקסטים כך שלא ישברו את המערכת של ימות המשיח
 */
class TextSanitizer {
    /**
     * מנקה טקסט לחלוטין מתווים שעלולים לשבור שרשור פקודות בימות המשיח.
     * מסיר: נקודות, פסיקים, מקפים, סימני קריאה ושאלה, שורות חדשות.
     * @param {string} text - הטקסט המקורי
     * @returns {string} טקסט נקי ובטוח ל-TTS
     */
    static cleanForYemotTTS(text) {
        if (!text || typeof text !== 'string') return "שגיאת טקסט חסר";
        
        return text
            .replace(/\*/g, '') // הסרת כוכביות של מרקדאון
            .replace(/#/g, '')  // הסרת סולמיות
            .replace(/[\u{1F600}-\u{1F6FF}]/gu, '') // הסרת אימוג'ים
            .replace(/[.,\-?!:\n\r]/g, ' ') // החלפת סימני פיסוק וירידות שורה ברווחים
            .replace(/\s+/g, ' ') // הסרת רווחים כפולים שנוצרו
            .trim();
    }
}

// ============================================================================
// --- SECTION 6: VERCEL BLOB STORAGE API ---
// ============================================================================

/**
 * ניהול שמירה וקריאה של היסטוריית שיחות המשתמש ממסד הנתונים
 */
class StorageAPI {
    
    /**
     * קבלת נתוני משתמש
     * @param {string} phone - מספר הטלפון
     * @returns {Promise<Object>} אובייקט המשתמש
     */
    static async getUserProfile(phone) {
        if (!phone || phone === 'unknown') {
            Logger.warn("StorageAPI", "Anonymous user requested profile. Returning default.");
            return this.generateDefaultProfile();
        }

        const fileName = `${SYSTEM_CONSTANTS.YEMOT.BLOB_USERS_DIR}${phone}.json`;
        Logger.info("StorageAPI", `Fetching profile for: ${fileName}`);

        try {
            const { blobs } = await list({ prefix: fileName, token: config.BLOB_TOKEN });
            
            if (!blobs || blobs.length === 0) {
                Logger.info("StorageAPI", `No existing profile found for ${phone}. Creating new.`);
                return this.generateDefaultProfile();
            }

            const response = await fetch(blobs[0].url);
            if (!response.ok) {
                throw new StorageAPIError(`HTTP Fetch failed with status ${response.status}`);
            }

            const data = await response.json();
            return this.validateProfile(data);

        } catch (error) {
            Logger.error("StorageAPI", `Failed to get user profile for ${phone}`, error);
            return this.generateDefaultProfile();
        }
    }

    /**
     * שמירת נתוני משתמש
     * @param {string} phone - מספר הטלפון
     * @param {Object} data - הנתונים לשמירה
     */
    static async saveUserProfile(phone, data) {
        if (!phone || phone === 'unknown') return;

        const fileName = `${SYSTEM_CONSTANTS.YEMOT.BLOB_USERS_DIR}${phone}.json`;
        Logger.info("StorageAPI", `Saving profile for: ${fileName}`);

        try {
            // שים לב: גישה ציבורית (public) כפי שנדרש על ידי Vercel Blob בהגדרות החנות שלך
            await put(fileName, JSON.stringify(data), { 
                access: 'public', 
                addRandomSuffix: false,
                token: config.BLOB_TOKEN
            });
            Logger.info("StorageAPI", `Successfully saved profile for ${phone}`);
        } catch (error) {
            Logger.error("StorageAPI", `Failed to save user profile for ${phone}`, error);
        }
    }

    /**
     * יצירת פרופיל ברירת מחדל
     * @returns {Object} פרופיל ריק וחוקי
     */
    static generateDefaultProfile() {
        return {
            chats:[],
            currentChatId: null,
            createdAt: new Date().toISOString()
        };
    }

    /**
     * אימות תקינות הפרופיל שחזר ממסד הנתונים
     * @param {Object} data - המידע הגולמי
     * @returns {Object} פרופיל תקין ב-100%
     */
    static validateProfile(data) {
        if (!data || typeof data !== 'object') return this.generateDefaultProfile();
        if (!Array.isArray(data.chats)) data.chats =[];
        return data;
    }
}

// ============================================================================
// --- SECTION 7: YEMOT HA'MASHIACH API INTEGRATION ---
// ============================================================================

/**
 * מחלקה המטפלת בתקשורת היוצאת מול שרתי ימות המשיח
 */
class YemotIntegrationAPI {
    /**
     * הורדת קובץ אודיו (WAV) מהשרתים של ימות המשיח
     * @param {string} rawFilePath - הנתיב כפי שימות שולחת אותו
     * @returns {Promise<string>} הקובץ בפורמט Base64
     */
    static async fetchAudioAsBase64(rawFilePath) {
        Logger.info("YemotAPI", `Initiating audio download for path: ${rawFilePath}`);
        
        try {
            // הוספת קידומת ivr2: כנדרש בתיעוד הרשמי של ימות
            const fullPath = rawFilePath.startsWith('ivr2:') ? rawFilePath : `ivr2:${rawFilePath}`;
            const encodedPath = encodeURIComponent(fullPath);
            const downloadUrl = `https://www.call2all.co.il/ym/api/DownloadFile?token=${config.CALL2ALL_TOKEN}&path=${encodedPath}`;
            
            const response = await fetch(downloadUrl);
            
            if (!response.ok) {
                throw new YemotAPIError(`HTTP request failed with status: ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            // אימות תקינות הקובץ - אם הוא קטן מדי זה כנראה הודעת שגיאה בטקסט מימות
            if (buffer.length < 500) {
                const errorText = buffer.toString('utf-8');
                throw new YemotAPIError(`Invalid audio file received. Server responded with: ${errorText}`);
            }

            Logger.info("YemotAPI", `Successfully downloaded audio. Buffer size: ${buffer.length} bytes.`);
            return buffer.toString('base64');

        } catch (error) {
            Logger.error("YemotAPI", "Audio fetch process failed.", error);
            throw new YemotAPIError("לא הצלחנו למשוך את קובץ השמע מהמערכת עקב שגיאת תקשורת.");
        }
    }
}

// ============================================================================
// --- SECTION 8: GOOGLE GEMINI AI INTEGRATION ---
// ============================================================================

/**
 * מחלקה לניהול התקשורת מול שרתי גוגל וניהול חכם של מפתחות והקשר שיחה
 */
class GeminiAIIntegration {
    
    /**
     * בניית בקשה ל-Gemini כולל היסטוריית השיחה
     * @param {string} base64Audio - קובץ השמע לתמלול
     * @param {Array} historyContext - מערך הודעות קודמות בשיחה זו
     * @returns {Object} Payload תקין ל-Google API
     */
    static buildPayload(base64Audio, historyContext) {
        // המרת היסטוריית השיחה הפנימית למבנה שגוגל דורשת
        const formattedContext = historyContext.map(msg => ({
            role: "user", // הכל כ-user כדי לפשט את ההקשר למודל תמלול
            parts:[{ text: `${SYSTEM_CONSTANTS.PROMPTS.PREVIOUS_QUESTION_PREFIX} ${msg.q}\n${SYSTEM_CONSTANTS.PROMPTS.PREVIOUS_ANSWER_PREFIX} ${msg.a}` }]
        }));

        return {
            contents: [
                ...formattedContext,
                {
                    role: "user",
                    parts:[
                        { text: SYSTEM_CONSTANTS.PROMPTS.GEMINI_PROMPT_INSTRUCTION },
                        {
                            inlineData: {
                                mimeType: "audio/wav",
                                data: base64Audio
                            }
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 800, // ארוך מספיק לתשובה טובה, לא ארוך מדי לטלפון
            }
        };
    }

    /**
     * שליחת הבקשה עם מנגנון Rotation לגיבוי מפתחות שנכשלים
     * @param {string} base64Audio - השמע
     * @param {Array} historyContext - ההיסטוריה
     * @returns {Promise<string>} התשובה המנוקה ל-TTS
     */
    static async processAudioAndRespond(base64Audio, historyContext =[]) {
        const payload = this.buildPayload(base64Audio, historyContext);
        const keys = config.getAvailableGeminiKeys();
        
        let lastDetailedError = null;

        Logger.info("GeminiAPI", `Starting generation process. Using model: ${SYSTEM_CONSTANTS.YEMOT.GEMINI_MODEL}. Keys available: ${keys.length}`);

        for (let i = 0; i < keys.length; i++) {
            const apiKey = keys[i];
            const maskedKey = apiKey.substring(0, 5) + "..." + apiKey.substring(apiKey.length - 4);
            
            try {
                Logger.debug("GeminiAPI", `Attempting request with key [${i + 1}/${keys.length}]: ${maskedKey}`);
                
                const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${SYSTEM_CONSTANTS.YEMOT.GEMINI_MODEL}:generateContent?key=${apiKey}`;
                
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    Logger.warn("GeminiAPI", `HTTP Error with key ${maskedKey}. Status: ${response.status}. Details: ${errorText}`);
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }

                const data = await response.json();
                
                if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
                    const rawText = data.candidates[0].content.parts[0].text;
                    const cleanText = TextSanitizer.cleanForYemotTTS(rawText);
                    Logger.info("GeminiAPI", "Successfully generated and sanitized response.");
                    return cleanText;
                } else {
                    Logger.warn("GeminiAPI", `Invalid response structure from key ${maskedKey}. Data: ${JSON.stringify(data)}`);
                    throw new Error("Invalid or empty response structure from Gemini API");
                }

            } catch (error) {
                lastDetailedError = error;
                Logger.error("GeminiAPI", `Key ${maskedKey} failed. Moving to next key if available.`, error);
                // Continue to next key in the loop
            }
        }

        // If loop completes without returning, all keys failed
        Logger.error("GeminiAPI", "All available Gemini API keys failed exhaustively.");
        throw new GeminiAPIError(`Failed to generate content. Last error: ${lastDetailedError ? lastDetailedError.message : 'Unknown'}`);
    }
}

// ============================================================================
// --- SECTION 9: IVR RESPONSE BUILDER ---
// ============================================================================

/**
 * מחלקה זו בונה את המחרוזת החוזרת לשרתי ימות המשיח.
 * היא משתמשת באמפרסנד (&) לשירשור הפקודות בהתאם לפרוטוקול העבודה היציב ביותר מול ימות.
 */
class IVRResponseBuilder {
    constructor() {
        this.commands =[];
    }

    /**
     * הוספת פקודת השמעת טקסט ממוחשב
     * @param {string} text - הטקסט להקראה
     */
    addTTSPlay(text) {
        if (!text) return this;
        const cleanText = TextSanitizer.cleanForYemotTTS(text);
        // פורמט: id_list_message=t-טקסט
        this.commands.push(`id_list_message=t-${cleanText}`);
        return this;
    }

    /**
     * הוספת בקשת הקשה מהמשתמש
     * @param {string} text - הוראה קולית לפני ההקשה
     * @param {string} varName - המשתנה שיוחזר לשרת
     * @param {number} min - מינימום ספרות
     * @param {number} max - מקסימום ספרות
     */
    addReadDigits(text, varName, min = 1, max = 1) {
        const cleanText = TextSanitizer.cleanForYemotTTS(text);
        const timeout = SYSTEM_CONSTANTS.YEMOT.READ_TIMEOUT;
        // פרמטר 2 (no): מוחק הקשה ישנה, פרמטר 6 (No): מבטל הקראת המספר ובקשת אישור. מעבר מיידי.
        this.commands.push(`read=t-${cleanText}=${varName},no,${max},${min},${timeout},No,yes,no`);
        return this;
    }

    /**
     * הוספת בקשת הקלטה מהמשתמש
     * @param {string} text - הוראה קולית לפני ההקלטה
     * @param {string} varName - המשתנה שיוחזר לשרת
     * @param {string} callId - מזהה השיחה ליצירת שם קובץ מבוסס שיחה
     */
    addRecordAudio(text, varName, callId) {
        const cleanText = TextSanitizer.cleanForYemotTTS(text);
        const fileName = `q_${callId}`;
        const folder = SYSTEM_CONSTANTS.YEMOT.RECORD_DIR;
        // פרמטר 2 (no): מוחק הקלטה ישנה
        this.commands.push(`read=t-${cleanText}=${varName},no,record,${folder},${fileName},no,yes,no,1,120`);
        return this;
    }

    /**
     * מעבר לשלוחה או ניתוק
     * @param {string} target - 'hangup' או נתיב שלוחה
     */
    addGoTo(target) {
        this.commands.push(`go_to_folder=${target}`);
        return this;
    }

    /**
     * סיום בניית המחרוזת
     * @returns {string} המחרוזת הסופית והמפורמטת לימות המשיח
     */
    build() {
        return this.commands.join('&');
    }
}

// ============================================================================
// --- SECTION 10: STATE MACHINE & REQUEST ROUTER (MAIN HANDLER) ---
// ============================================================================

/**
 * הפונקציה הראשית של Serverless ב-Vercel.
 * מקבלת את הבקשה מימות המשיח, מנתחת את המצב (State), מנתבת לפעולה המתאימה ומחזירה תגובה.
 */
export default async function handler(req, res) {
    const ivrBuilder = new IVRResponseBuilder();

    try {
        Logger.info("System", `--- New Request Received: ${req.method} ---`);

        // 1. חילוץ חכם של פרמטרים התומך גם ב-POST וגם ב-GET בצורה מלאה
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
        
        // מיזוג של ה-URL וה-Body
        const query = { ...urlQuery, ...rawBody };
        
        // פונקציית עזר לשליפת הערך האחרון (פותר את בעיית המערכים של ימות המשיח)
        const getParam = (key) => Array.isArray(query[key]) ? query[key][query[key].length - 1] : query[key];

        // 2. שליפת פרטי יסוד של השיחה
        const phone = getParam(SYSTEM_CONSTANTS.PARAMS.PHONE) || getParam(SYSTEM_CONSTANTS.PARAMS.ENTER_ID) || 'unknown';
        const callId = getParam(SYSTEM_CONSTANTS.PARAMS.CALL_ID) || `sim_${Date.now()}`;
        const isHangup = getParam(SYSTEM_CONSTANTS.PARAMS.HANGUP) === 'yes';

        Logger.debug("Request Info", `Phone: ${phone}, CallId: ${callId}, isHangup: ${isHangup}`);

        // 3. טיפול מיידי בניתוק שיחה (מניעת הפעלת מודלים וחיובים מיותרים)
        if (isHangup) {
            Logger.info("Flow", `User ${phone} hung up the call. Graceful exit.`);
            return sendValidResponse(res, "noop=hangup_acknowledged");
        }

        // 4. מנגנון State Machine חכם - זיהוי הפעולה *האחרונה* שביצע המשתמש
        const allKeys = Array.from(urlObj.searchParams.keys());
        if (req.method === 'POST' && typeof req.body !== 'string') {
            allKeys.push(...Object.keys(rawBody));
        }

        // סינון פרמטרים שמערכת ימות שולחת כברירת מחדל
        const customKeys = allKeys.filter(k => 
            !k.startsWith('Api') && 
            k !== 'token' && 
            k !== SYSTEM_CONSTANTS.PARAMS.HANGUP
        );
        
        // הפעולה הנוכחית היא המשתנה האחרון שימות הוסיפה לרשימה
        const currentStepKey = customKeys.length > 0 ? customKeys[customKeys.length - 1] : null;
        const currentStepValue = currentStepKey ? getParam(currentStepKey) : null;

        Logger.info("Flow State", `Identified Step: [${currentStepKey}] with Value: [${currentStepValue}]`);

        // 5. ניתוב (Routing) לפי המצב שזוהה
        
        // -> מצב: קבלת אודיו מהמשתמש ופנייה ל-Gemini
        if (currentStepKey === SYSTEM_CONSTANTS.PARAMS.USER_AUDIO && currentStepValue && currentStepValue.includes('.wav')) {
            await handleAudioProcessing(phone, callId, currentStepValue, ivrBuilder);
        }
        
        // -> מצב: המשתמש סיים לשמוע תשובה מ-Gemini או היסטוריה, ובחר מה לעשות הלאה
        else if (currentStepKey === SYSTEM_CONSTANTS.PARAMS.ACTION_CHOICE) {
            if (currentStepValue === '7') {
                Logger.info("Flow", "User chose to continue current chat.");
                ivrBuilder.addRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.PARAMS.USER_AUDIO, callId);
            } else {
                Logger.info("Flow", "User chose to return to main menu from action menu.");
                await serveMainMenu(ivrBuilder);
            }
        }
        
        // -> מצב: המשתמש נמצא בתפריט בחירת היסטוריה והקיש בחירה
        else if (currentStepKey === SYSTEM_CONSTANTS.PARAMS.HISTORY_CHOICE) {
            if (currentStepValue === '0') {
                Logger.info("Flow", "User chose to return to main menu from history menu.");
                await serveMainMenu(ivrBuilder);
            } else {
                await handleHistoryPlayback(phone, currentStepValue, ivrBuilder);
            }
        }
        
        // -> מצב: המשתמש בתפריט הראשי והקיש בחירה
        else if (currentStepKey === SYSTEM_CONSTANTS.PARAMS.MENU_CHOICE) {
            if (currentStepValue === '1') {
                await handleNewChatInit(phone, callId, ivrBuilder);
            } 
            else if (currentStepValue === '2') {
                await handleHistoryMenuInit(phone, ivrBuilder);
            }
            else {
                Logger.warn("Flow", `Invalid main menu choice: ${currentStepValue}. Returning to main menu.`);
                await serveMainMenu(ivrBuilder);
            }
        }
        
        // -> מצב ברירת מחדל: כניסה ראשונית לשלוחה
        else {
            Logger.info("Flow", "Initial call entry. Serving main menu.");
            ivrBuilder.addTTS(SYSTEM_CONSTANTS.PROMPTS.MAIN_MENU);
            ivrBuilder.addReadDigits("", SYSTEM_CONSTANTS.PARAMS.MENU_CHOICE, 1, 1);
        }

        // 6. סיום הבקשה החזרת התגובה המעוצבת
        const finalResponseStr = ivrBuilder.build();
        Logger.debug("Final Response", finalResponseStr);
        return sendValidResponse(res, finalResponseStr);

    } catch (error) {
        // טיפול שגיאות גלובלי - מבטיח שום קריסת 500 אלא חזרה מבוקרת למשתמש
        Logger.error("Global Handler", "A critical error occurred preventing normal flow.", error);
        const errorIvr = new IVRResponseBuilder();
        errorIvr.addTTS(SYSTEM_CONSTANTS.PROMPTS.SYSTEM_ERROR);
        errorIvr.addGoTo("hangup");
        return sendValidResponse(res, errorIvr.build());
    }
}

// ============================================================================
// --- SECTION 11: SPECIFIC FLOW HANDLERS ---
// ============================================================================

/**
 * מטפל בתהליך הורדת אודיו, תמלול, שליחה ל-Gemini, ושמירת התוצאה להיסטוריה.
 */
async function handleAudioProcessing(phone, callId, yemotAudioPath, ivrBuilder) {
    Logger.info("Action", "Processing user audio file...");
    
    // 1. הורדה
    const base64Audio = await YemotIntegrationAPI.fetchAudioAsBase64(yemotAudioPath);
    
    // 2. טעינת היסטוריה מקומית
    const userData = await StorageAPI.getUserProfile(phone);
    
    let currentChat = userData.chats.find(c => c.id === userData.currentChatId);
    if (!currentChat) {
        Logger.warn("Action", "Current chat ID not found. Initializing a recovery chat.");
        currentChat = { id: `chat_rec_${Date.now()}`, date: new Date().toISOString(), messages:[] };
        userData.chats.push(currentChat);
        userData.currentChatId = currentChat.id;
    }

    // שליפת הקשר שיחה קודם
    const historyContext = currentChat.messages.slice(-5);

    // 3. ייצור תוכן באמצעות Gemini AI
    const aiResponseText = await GeminiAIIntegration.processAudioAndRespond(base64Audio, historyContext);
    
    // 4. שמירת המידע למסד
    currentChat.messages.push({
        q: "הודעה קולית מאת המשתמש",
        a: aiResponseText
    });
    await StorageAPI.saveUserProfile(phone, userData);

    // 5. בניית פלט התשובה
    ivrBuilder.addTTS(aiResponseText);
    ivrBuilder.addReadDigits(SYSTEM_CONSTANTS.PROMPTS.CHAT_ACTION_MENU, SYSTEM_CONSTANTS.PARAMS.ACTION_CHOICE, 1, 1);
}

/**
 * מאתחל שיחה חדשה למשתמש ושומר במסד הנתונים
 */
async function handleNewChatInit(phone, callId, ivrBuilder) {
    Logger.info("Action", "Initializing new chat session.");
    
    const userData = await StorageAPI.getUserProfile(phone);
    const newChatId = `chat_${Date.now()}`;
    
    userData.chats.push({
        id: newChatId,
        date: new Date().toISOString(),
        messages:[]
    });
    userData.currentChatId = newChatId;
    
    await StorageAPI.saveUserProfile(phone, userData);

    ivrBuilder.addRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.PARAMS.USER_AUDIO, callId);
}

/**
 * טוען ומכין את תפריט היסטוריית השיחות למשתמש
 */
async function handleHistoryMenuInit(phone, ivrBuilder) {
    Logger.info("Action", "Loading history menu for user.");
    
    const userData = await StorageAPI.getUserProfile(phone);
    
    if (!userData.chats || userData.chats.length === 0) {
        Logger.info("Action", "No history found for user.");
        ivrBuilder.addTTS(SYSTEM_CONSTANTS.PROMPTS.NO_HISTORY);
        await handleNewChatInit(phone, `sim_${Date.now()}`, ivrBuilder); // Fallback to new chat
        return;
    }

    const recentChats = userData.chats.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS).reverse();
    let menuText = SYSTEM_CONSTANTS.PROMPTS.HISTORY_MENU_PREFIX;
    
    recentChats.forEach((chat, index) => {
        menuText += `לשיחה מספר ${index + 1} הקישו ${index + 1}. `;
    });
    menuText += SYSTEM_CONSTANTS.PROMPTS.HISTORY_MENU_SUFFIX;

    ivrBuilder.addReadDigits(menuText, SYSTEM_CONSTANTS.PARAMS.HISTORY_CHOICE, 1, 1);
}

/**
 * מטפל בבחירת המשתמש מתוך תפריט ההיסטוריה ומשמיע את התוכן הרלוונטי
 */
async function handleHistoryPlayback(phone, choiceString, ivrBuilder) {
    Logger.info("Action", `Handling history playback for choice: ${choiceString}`);
    
    const userData = await StorageAPI.getUserProfile(phone);
    const recentChats = userData.chats.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS).reverse();
    const selectedIndex = parseInt(choiceString, 10) - 1;

    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= recentChats.length) {
        Logger.warn("Action", `Invalid history selection: ${choiceString}`);
        ivrBuilder.addTTS(SYSTEM_CONSTANTS.PROMPTS.HISTORY_INVALID_CHOICE);
        await serveMainMenu(ivrBuilder);
        return;
    }

    const selectedChat = recentChats[selectedIndex];
    
    // הגדרת השיחה הנוכחית כדי לאפשר המשכיות
    userData.currentChatId = selectedChat.id;
    await StorageAPI.saveUserProfile(phone, userData);

    let playbackText = "היסטוריית שיחה. ";
    selectedChat.messages.forEach((msg, i) => {
        playbackText += `תשובה מספר ${i + 1} הייתה ${msg.a}. `;
    });

    ivrBuilder.addTTS(playbackText);
    ivrBuilder.addReadDigits(SYSTEM_CONSTANTS.PROMPTS.CHAT_ACTION_MENU, SYSTEM_CONSTANTS.PARAMS.ACTION_CHOICE, 1, 1);
}

/**
 * פונקציית מעטפת להגשת התפריט הראשי
 */
async function serveMainMenu(ivrBuilder) {
    ivrBuilder.addReadDigits(SYSTEM_CONSTANTS.PROMPTS.MAIN_MENU, SYSTEM_CONSTANTS.PARAMS.MENU_CHOICE, 1, 1);
}

/**
 * פונקציית עזר לשליחת התגובה הסופית ללקוח בפורמט HTTP נקי
 */
function sendValidResponse(res, responseString) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(200).send(responseString);
}
