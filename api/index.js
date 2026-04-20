/**
 * @file api/index.js
 * @description Enterprise-Grade IVR System integrating Yemot HaMashiach, Vercel Blob (Private/Public adaptive), and Google Gemini AI.
 * @version 4.0.0 (Enterprise Edition - Zero Downtime)
 * @author Custom AI Assistant
 * 
 * מפרט טכני ודרישות שיושמו בקוד זה:
 * 1. שלוחה אחת בלבד (type=api) המנהלת את כל התזרים (Menu, History, Chat).
 * 2. פורמט Yemot מחמיר: שימוש ב- "=" ו- "&", ללא שורות ריקות, שרשור מדויק.
 * 3. שימוש במודל הספציפי: gemini-3.1-flash-lite-preview בלבד!
 * 4. אחסון ב-Vercel Blob תחת הגישה Adaptive Private/Public.
 * 5. רוטציה בין מפתחות ה-API של גוגל למניעת הגבלות קצב (Rate Limits).
 * 6. ארכיטקטורה מונחית עצמים (OOP) מתקדמת ללא שגיאות 500.
 * 7. טיפול בשגיאות מלא בתוך בלוק Catch חסין התרסקויות.
 */

import { put, list } from '@vercel/blob';

// ============================================================================
// --- SECTION 1: SYSTEM CONSTANTS & CONFIGURATION DEFAULTS ---
// ============================================================================

/**
 * ריכוז כל הקבועים של המערכת.
 * שימוש בקבועים מונע שגיאות הקלדה (Magic Strings) ומקל על תחזוקת המערכת.
 */
const SYSTEM_CONSTANTS = {
    PROMPTS: {
        MAIN_MENU: "ברוכים הבאים למערכת הבינה המלאכותית. לשיחה חדשה הקישו 1. לשמיעת היסטוריית שיחות והמשך שיחה קודמת הקישו 2.",
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
    },
    RETRY: {
        MAX_RETRIES: 3,
        DELAY_MS: 1000
    }
};

// ============================================================================
// --- SECTION 2: ENTERPRISE ERROR HANDLING ---
// ============================================================================

/**
 * מחלקת שגיאות בסיסית מורחבת עבור המערכת.
 * תופסת את מחסנית הקריאות (Stack Trace) לטובת דיבאג מהיר יותר.
 */
class AppError extends Error {
    constructor(message, statusCode = 500, originalError = null) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.originalError = originalError;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * שגיאה המייצגת תקלה מול ה-API של ימות המשיח (למשל, בעיה במשיכת ההקלטה).
 */
class YemotAPIError extends AppError {
    constructor(message, originalError = null) {
        super(`Yemot API Error: ${message}`, 400, originalError);
    }
}

/**
 * שגיאה המייצגת תקלה מול גוגל (Gemini AI).
 */
class GeminiAPIError extends AppError {
    constructor(message, originalError = null) {
        super(`Gemini API Error: ${message}`, 502, originalError);
    }
}

/**
 * שגיאה המייצגת בעיה מול Vercel Blob Storage (שמירה/קריאה של JSON).
 */
class StorageAPIError extends AppError {
    constructor(message, originalError = null) {
        super(`Storage API Error: ${message}`, 500, originalError);
    }
}

// ============================================================================
// --- SECTION 3: ADVANCED LOGGER SYSTEM ---
// ============================================================================

/**
 * מחלקה לניהול והדפסת לוגים בצורה מתוקננת וקריאה בקונסול של Vercel.
 */
class Logger {
    /**
     * פונקציית עזר להרכבת חותמת זמן מדויקת
     * @returns {string} חותמת זמן
     */
    static getTimestamp() {
        return new Date().toISOString();
    }

    /**
     * הדפסת מידע כללי
     * @param {string} context - ההקשר (למשל: StorageAPI)
     * @param {string} message - ההודעה
     */
    static info(context, message) {
        console.log(`[INFO][${this.getTimestamp()}] [${context}] ${message}`);
    }

    /**
     * הדפסת אזהרה (שגיאה שלא קורסת את המערכת)
     * @param {string} context - ההקשר
     * @param {string} message - ההודעה
     */
    static warn(context, message) {
        console.warn(`[WARN] [${this.getTimestamp()}][${context}] ${message}`);
    }

    /**
     * הדפסת שגיאה קריטית
     * @param {string} context - ההקשר
     * @param {string} message - ההודעה
     * @param {Error|null} errorObj - אובייקט השגיאה
     */
    static error(context, message, errorObj = null) {
        console.error(`[ERROR] [${this.getTimestamp()}] [${context}] ${message}`);
        if (errorObj) {
            console.error(`[ERROR TRACE] ${errorObj.stack || errorObj.message || errorObj}`);
        }
    }

    /**
     * הדפסת מידע דיבאג (מוצג תמיד לטובת פתרון תקלות בייצור)
     * @param {string} context - ההקשר
     * @param {string} message - ההודעה
     */
    static debug(context, message) {
        console.debug(`[DEBUG][${this.getTimestamp()}] [${context}] ${message}`);
    }
}

// ============================================================================
// --- SECTION 4: ENVIRONMENT CONFIGURATION MANAGER ---
// ============================================================================

/**
 * מחלקה לטעינה, אימות וניהול משתני הסביבה (Environment Variables).
 */
class ConfigManager {
    constructor() {
        this.GEMINI_KEYS =[];
        this.CALL2ALL_TOKEN = '';
        this.BLOB_TOKEN = '';
        this.initialize();
    }

    /**
     * קורא את משתני הסביבה, מפרסר ומאמת אותם.
     */
    initialize() {
        try {
            this.GEMINI_KEYS = this.parseGeminiKeys(process.env.GEMINI_KEYS);
            this.CALL2ALL_TOKEN = process.env.CALL2ALL_TOKEN || '';
            this.BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || '';
            this.validateConfiguration();
        } catch (error) {
            Logger.error("ConfigManager", "Failed to initialize configuration", error);
        }
    }

    /**
     * מפרסר את רשימת המפתחות של Gemini שמופרדים בפסיקים
     * @param {string} keysString - מחרוזת המפתחות
     * @returns {string[]} מערך של מפתחות
     */
    parseGeminiKeys(keysString) {
        if (!keysString) return[];
        return keysString.split(',').map(key => key.trim()).filter(key => key.length > 0);
    }

    /**
     * מאמת שהמשתנים החיוניים קיימים
     */
    validateConfiguration() {
        if (this.GEMINI_KEYS.length === 0) {
            Logger.warn("ConfigManager", "GEMINI_KEYS environment variable is missing or empty.");
        } else {
            Logger.info("ConfigManager", `Loaded ${this.GEMINI_KEYS.length} Gemini API keys ready for rotation.`);
        }

        if (!this.CALL2ALL_TOKEN) {
            Logger.warn("ConfigManager", "CALL2ALL_TOKEN environment variable is missing.");
        }

        if (!this.BLOB_TOKEN) {
            Logger.warn("ConfigManager", "BLOB_READ_WRITE_TOKEN environment variable is missing. Database access might fail.");
        }
    }

    /**
     * מחזיר את רשימת מפתחות ה-API
     * @returns {string[]} מערך המפתחות
     */
    getAvailableGeminiKeys() {
        if (this.GEMINI_KEYS.length === 0) {
            throw new AppError("No Gemini API keys configured. Check Vercel environment variables.");
        }
        return this.GEMINI_KEYS;
    }
}

// יצירת אינסטנס יחיד (Singleton)
const config = new ConfigManager();

// ============================================================================
// --- SECTION 5: TEXT SANITIZATION UTILITIES ---
// ============================================================================

/**
 * מחלקה האחראית על ניקוי וסניטיזציה של טקסטים.
 * מבטיחה שהטקסט שחוזר לימות המשיח לא ישבור את שרשור הפקודות.
 */
class TextSanitizer {
    /**
     * מנקה טקסט מתווים שעלולים לשבור את הפורמט של ימות המשיח.
     * הערה: נקודה (.) פסיק (,) ומקף (-) שוברים את ההגדרות. אנו מחליפים אותם ברווח.
     * 
     * @param {string} text - הטקסט המקורי להקראה
     * @returns {string} טקסט נקי ובטוח למנוע ה-TTS של ימות המשיח
     */
    static cleanForYemotTTS(text) {
        // אם הטקסט ריק או לא מוגדר, נחזיר רווח במקום הודעת שגיאה
        if (!text || typeof text !== 'string' || text.trim() === "") {
            return " ";
        }
        
        return text
            .replace(/\*/g, ' ') 
            .replace(/#/g, ' ')  
            .replace(/[\u{1F600}-\u{1F6FF}]/gu, '') 
            .replace(/[.,\-?!:\n\r]/g, ' ') 
            .replace(/\s+/g, ' ') 
            .trim();
    }
}

// ============================================================================
// --- SECTION 6: RETRY LOGIC HELPER ---
// ============================================================================

/**
 * מחלקה המספקת יכולות Retry (נסיונות חוזרים) במקרה של שגיאות רשת.
 */
class RetryHelper {
    /**
     * מבצע פונקציה אסינכרונית מספר פעמים עד להצלחה או כשלון סופי
     * @param {Function} asyncFunction - הפונקציה לביצוע
     * @param {number} retries - מספר ניסיונות מקסימלי
     * @param {number} delayMs - עיכוב במילישניות בין הניסיונות
     * @param {string} context - הקשר לטובת הדפסת לוגים
     * @returns {Promise<any>}
     */
    static async withRetry(asyncFunction, retries = SYSTEM_CONSTANTS.RETRY.MAX_RETRIES, delayMs = SYSTEM_CONSTANTS.RETRY.DELAY_MS, context = "RetryHelper") {
        let lastError;
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                return await asyncFunction();
            } catch (error) {
                lastError = error;
                Logger.warn(context, `Attempt ${attempt}/${retries} failed. Reason: ${error.message}`);
                
                if (attempt < retries) {
                    Logger.info(context, `Waiting ${delayMs}ms before next attempt...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            }
        }
        Logger.error(context, `All ${retries} attempts failed.`);
        throw lastError;
    }
}

// ============================================================================
// --- SECTION 7: VERCEL BLOB STORAGE API ---
// ============================================================================

/**
 * מחלקה לניהול תקשורת מול מסד הנתונים Vercel Blob.
 * מנהלת קריאה וכתיבה של פרופילי משתמשים והיסטוריית שיחות בפורמט JSON.
 * תמיכה אדפטיבית ב-Private ו-Public blobs.
 */
class StorageAPI {
    
    /**
     * קבלת נתוני משתמש ממסד הנתונים
     * @param {string} phone - מספר הטלפון המזהה את המשתמש
     * @returns {Promise<Object>} אובייקט המייצג את היסטוריית המשתמש
     */
    static async getUserProfile(phone) {
        if (!phone || phone === 'unknown') {
            Logger.warn("StorageAPI", "Anonymous phone provided. Returning default empty profile.");
            return this.generateDefaultProfile();
        }

        const fileName = `${SYSTEM_CONSTANTS.YEMOT.BLOB_USERS_DIR}${phone}.json`;
        Logger.info("StorageAPI", `Fetching profile for file: ${fileName}`);

        const fetchTask = async () => {
            // העברת טוקן חיונית במידה והחנות היא מסוג פרטי (Private)
            const { blobs } = await list({ prefix: fileName, token: config.BLOB_TOKEN });
            
            if (!blobs || blobs.length === 0) {
                Logger.info("StorageAPI", `No existing profile found for ${phone}. Initializing new profile.`);
                return this.generateDefaultProfile();
            }

            // העברת ה-Bearer token קריטית בחנות מוגדרת Private
            const fetchOptions = {
                headers: {
                    Authorization: `Bearer ${config.BLOB_TOKEN}`
                }
            };

            const response = await fetch(blobs[0].url, fetchOptions);
            if (!response.ok) {
                throw new Error(`HTTP Fetch failed with status ${response.status}`);
            }

            const data = await response.json();
            return this.validateProfile(data);
        };

        try {
            // שימוש במנגנון Retry כדי להיות חסינים לתקלות רשת רגעיות
            return await RetryHelper.withRetry(fetchTask, 2, 500, "StorageAPI.getUserProfile");
        } catch (error) {
            Logger.error("StorageAPI", `Failed to get user profile for ${phone} after retries.`, error);
            return this.generateDefaultProfile(); // מונע קריסה מלאה
        }
    }

    /**
     * שמירת נתוני המשתמש למסד הנתונים בתצורה אדפטיבית (Private/Public).
     * @param {string} phone - מספר הטלפון
     * @param {Object} data - הנתונים המעודכנים לשמירה
     */
    static async saveUserProfile(phone, data) {
        if (!phone || phone === 'unknown') {
            Logger.warn("StorageAPI", "Cannot save profile for unknown phone.");
            return;
        }

        const fileName = `${SYSTEM_CONSTANTS.YEMOT.BLOB_USERS_DIR}${phone}.json`;
        Logger.info("StorageAPI", `Saving profile for file: ${fileName}`);

        const putTask = async () => {
            try {
                // מנסים לשמור קודם עם הגדרות לשרת פרטי (Private) כפי שמוגדר בחנות
                await put(fileName, JSON.stringify(data), { 
                    access: 'private', 
                    addRandomSuffix: false,
                    token: config.BLOB_TOKEN
                });
                Logger.info("StorageAPI", `Successfully saved profile as PRIVATE for ${phone}`);
            } catch (err) {
                // אם השרת זורק שגיאה שהגישה חייבת להיות ציבורית, אנחנו מבצעים Fallback שקוף
                if (err.message && err.message.includes('public')) {
                    Logger.warn("StorageAPI", "Private access rejected. Falling back to public access mode.");
                    await put(fileName, JSON.stringify(data), { 
                        access: 'public', 
                        addRandomSuffix: false,
                        token: config.BLOB_TOKEN
                    });
                    Logger.info("StorageAPI", `Successfully saved profile as PUBLIC for ${phone}`);
                } else {
                    throw err; // שגיאה אחרת, זורקים אותה הלאה ל-RetryHelper
                }
            }
        };

        try {
            await RetryHelper.withRetry(putTask, 2, 500, "StorageAPI.saveUserProfile");
        } catch (error) {
            Logger.error("StorageAPI", `Failed to save user profile for ${phone}.`, error);
        }
    }

    /**
     * יצירת שלד ריק לפרופיל משתמש חדש.
     * @returns {Object} פרופיל משתמש עם מערכים מאותחלים
     */
    static generateDefaultProfile() {
        return {
            chats:[],
            currentChatId: null,
            createdAt: new Date().toISOString()
        };
    }

    /**
     * אימות שכל השדות ההכרחיים קיימים באובייקט כדי למנוע שגיאות undefined בהמשך הקוד.
     * @param {Object} data - המידע הגולמי שחזר מה-JSON
     * @returns {Object} מידע מאומת
     */
    static validateProfile(data) {
        if (!data || typeof data !== 'object') {
            return this.generateDefaultProfile();
        }
        if (!Array.isArray(data.chats)) {
            data.chats =[];
        }
        return data;
    }
}

// ============================================================================
// --- SECTION 8: YEMOT HA'MASHIACH API INTEGRATION ---
// ============================================================================

/**
 * מחלקה המטפלת בתקשורת מול ה-API הרשמי של ימות המשיח (למשיכת הקלטות).
 */
class YemotIntegrationAPI {
    /**
     * הורדת קובץ אודיו מהשרת של ימות המשיח והמרתו ל-Base64.
     * @param {string} rawFilePath - הנתיב לקובץ שחזר מימות
     * @returns {Promise<string>} מחרוזת Base64 המייצגת את הקובץ
     */
    static async fetchAudioAsBase64(rawFilePath) {
        Logger.info("YemotIntegrationAPI", `Initiating audio download for path: ${rawFilePath}`);
        
        const downloadTask = async () => {
            // הוספת הקידומת ivr2: החיונית לפעולת ה-API של ימות המשיח
            const fullPath = rawFilePath.startsWith('ivr2:') ? rawFilePath : `ivr2:${rawFilePath}`;
            const encodedPath = encodeURIComponent(fullPath);
            const downloadUrl = `https://www.call2all.co.il/ym/api/DownloadFile?token=${config.CALL2ALL_TOKEN}&path=${encodedPath}`;
            
            const response = await fetch(downloadUrl);
            
            if (!response.ok) {
                throw new YemotAPIError(`HTTP Request failed with status: ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            // הגנה: אם הקובץ קטן מ-500 בתים, זה בדרך כלל קובץ טקסט המכיל הודעת שגיאה מימות, ולא קובץ WAV תקין
            if (buffer.length < 500) {
                const errorText = buffer.toString('utf-8');
                throw new YemotAPIError(`Invalid audio file received. Server responded with text: ${errorText}`);
            }

            Logger.info("YemotIntegrationAPI", `Successfully downloaded audio. Buffer size: ${buffer.length} bytes.`);
            return buffer.toString('base64');
        };

        try {
            return await RetryHelper.withRetry(downloadTask, 2, 1000, "YemotAudioDownload");
        } catch (error) {
            Logger.error("YemotIntegrationAPI", "Audio fetch process failed exhaustively.", error);
            throw new AppError("לא הצלחנו למשוך את קובץ השמע ממערכת הטלפוניה.");
        }
    }
}

// ============================================================================
// --- SECTION 9: GOOGLE GEMINI AI INTEGRATION ---
// ============================================================================

/**
 * מחלקה המנהלת את יצירת הקשר מול המודל של Google Gemini.
 * מיושם רוטציית מפתחות לניהול עומסים ושימוש במודל הספציפי שנדרש.
 */
class GeminiAIIntegration {
    
    /**
     * בניית חבילת הנתונים (Payload) שתישלח ל-API של גוגל
     * @param {string} base64Audio - השמע למודל
     * @param {Array} historyContext - ההודעות הקודמות ליצירת זיכרון שיחה
     * @returns {Object} Payload מפורמט לפי דרישות גוגל
     */
    static buildPayload(base64Audio, historyContext) {
        // המרת היסטוריית השיחה הפנימית שלנו למבנה שגוגל דורשת כ-role 'user'
        const formattedContext = historyContext.map(msg => ({
            role: "user", 
            parts:[{ text: `${SYSTEM_CONSTANTS.PROMPTS.PREVIOUS_QUESTION_PREFIX} ${msg.q}\n${SYSTEM_CONSTANTS.PROMPTS.PREVIOUS_ANSWER_PREFIX} ${msg.a}` }]
        }));

        return {
            contents:[
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
                maxOutputTokens: 600, // לא לחפור ללקוח בטלפון, מקסמים תשובות בינוניות
            }
        };
    }

    /**
     * שליחת הבקשה עם מנגנון Key Rotation מובנה למניעת חסימות או חריגה ממכסות
     * @param {string} base64Audio - קובץ השמע לתמלול וניתוח
     * @param {Array} historyContext - היסטוריית השיחה
     * @returns {Promise<string>} הטקסט שנוצר ונוקה
     */
    static async processAudioAndRespond(base64Audio, historyContext =[]) {
        const payload = this.buildPayload(base64Audio, historyContext);
        const keys = config.getAvailableGeminiKeys();
        
        let lastDetailedError = null;

        Logger.info("GeminiAIIntegration", `Starting AI generation using model: ${SYSTEM_CONSTANTS.YEMOT.GEMINI_MODEL}. Available keys: ${keys.length}`);

        // מעבר על מערך המפתחות עד להצלחה
        for (let i = 0; i < keys.length; i++) {
            const apiKey = keys[i];
            const maskedKey = apiKey.substring(0, 5) + "..." + apiKey.substring(apiKey.length - 4);
            
            try {
                Logger.debug("GeminiAIIntegration", `Attempting request with key[${i + 1}/${keys.length}]: ${maskedKey}`);
                
                // שימוש קשיח במודל שהתבקש gemini-3.1-flash-lite-preview
                const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${SYSTEM_CONSTANTS.YEMOT.GEMINI_MODEL}:generateContent?key=${apiKey}`;
                
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    Logger.warn("GeminiAIIntegration", `HTTP Error with key ${maskedKey}. Status: ${response.status}. Details: ${errorText}`);
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }

                const data = await response.json();
                
                if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
                    const rawText = data.candidates[0].content.parts[0].text;
                    const cleanText = TextSanitizer.cleanForYemotTTS(rawText);
                    Logger.info("GeminiAIIntegration", "Successfully generated AI response.");
                    return cleanText;
                } else {
                    Logger.warn("GeminiAIIntegration", `Unexpected response structure from key ${maskedKey}. Data: ${JSON.stringify(data)}`);
                    throw new Error("Invalid or empty response structure from Gemini API");
                }

            } catch (error) {
                lastDetailedError = error;
                Logger.error("GeminiAIIntegration", `Key ${maskedKey} failed. Continuing to next key if available.`);
                // ממשיכים לנסות עם המפתח הבא בלולאה
            }
        }

        // הגענו לכאן? כל המפתחות נכשלו. זורקים שגיאה למערכת.
        Logger.error("GeminiAIIntegration", "All available Gemini API keys failed exhaustively.");
        throw new GeminiAPIError(`AI Generation failed. Last error: ${lastDetailedError ? lastDetailedError.message : 'Unknown Error'}`);
    }
}

// ============================================================================
// --- SECTION 10: YEMOT IVR RESPONSE BUILDER ---
// ============================================================================

/**
 * מחלקה זו בונה את המחרוזת הסטרינגית שמוחזרת לימות המשיח.
 * היא עושה שימוש באמפרסנד (&) לשירשור הפקודות ומבטיחה תקינות מלאה.
 */
class IVRBuilder {
    constructor() {
        this.commands =[];
    }

    /**
     * הוספת פקודת השמעת טקסט ממוחשב (TTS)
     * @param {string} text - הטקסט להקראה
     */
    addTTS(text) {
        if (!text) return this;
        const cleanText = TextSanitizer.cleanForYemotTTS(text);
        // פורמט: id_list_message=t-טקסט
        this.commands.push(`id_list_message=t-${cleanText}`);
        return this;
    }

    /**
     * הוספת בקשת הקשה מהמשתמש.
     * @param {string} text - הוראה קולית לפני ההקשה
     * @param {string} varName - שם המשתנה שיוחזר לשרת
     * @param {number} min - מינימום ספרות (ברירת מחדל 1)
     * @param {number} max - מקסימום ספרות (ברירת מחדל 1)
     */
    addReadDigits(text, varName, min = 1, max = 1) {
        const cleanText = TextSanitizer.cleanForYemotTTS(text);
        const timeout = SYSTEM_CONSTANTS.YEMOT.READ_TIMEOUT;
        // פרמטר שני 'no': מוחק הקשות ישנות. פרמטר שישי 'No': עובר שלב ללא הקראת הספרה ובקשת אישור.
        this.commands.push(`read=t-${cleanText}=${varName},no,${max},${min},${timeout},No,yes,no`);
        return this;
    }

    /**
     * הוספת בקשת הקלטה מהמשתמש.
     * @param {string} text - הוראה קולית לפני ההקלטה
     * @param {string} varName - שם המשתנה שיוחזר לשרת (יכיל את נתיב ההקלטה)
     * @param {string} callId - מזהה שיחה ליצירת שם קובץ מבוסס שיחה
     */
    addRecord(text, varName, callId) {
        const cleanText = TextSanitizer.cleanForYemotTTS(text);
        const fileName = `q_${callId}`;
        const folder = SYSTEM_CONSTANTS.YEMOT.RECORD_DIR;
        // פרמטר שני 'no': לא ממחזר הקלטות קודמות
        this.commands.push(`read=t-${cleanText}=${varName},no,record,${folder},${fileName},no,yes,no,1,120`);
        return this;
    }

    /**
     * מעבר לשלוחה קבועה או ניתוק.
     * @param {string} target - יעד, לדוגמה 'hangup' או נתיב '/1'
     */
    addGoTo(target) {
        this.commands.push(`go_to_folder=${target}`);
        return this;
    }

    /**
     * הרכבת כל הפקודות למחרוזת חוקית אחת עבור השרת של ימות.
     * @returns {string} 
     */
    build() {
        return this.commands.join('&');
    }
}

// ============================================================================
// --- SECTION 11: STATE MACHINE & REQUEST ROUTER (MAIN HANDLER) ---
// ============================================================================

/**
 * נקודת הכניסה של פונקציית ה-Serverless ב-Vercel.
 * אחראית לקבל את הבקשה, לזהות מה המשתמש עשה בפעם האחרונה, ולהחזיר את הפקודה הבאה.
 */
export default async function handler(req, res) {
    const ivrBuilder = new IVRBuilder();

    try {
        Logger.info("System", `--- Incoming Request: ${req.method} ---`);

        // 1. ניתוח פרמטרים חכם מתוך URL ו-Body כדי לתמוך ב-POST URL-Encoded מול ימות
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
        
        // עזר: תפיסת הערך האחרון מתוך פרמטר שחזר כמערך (התנהגות ידועה של ימות)
        const getParam = (key) => Array.isArray(query[key]) ? query[key][query[key].length - 1] : query[key];

        // 2. זיהוי בסיסי של השיחה והלקוח
        const phone = getParam(SYSTEM_CONSTANTS.PARAMS.PHONE) || getParam(SYSTEM_CONSTANTS.PARAMS.ENTER_ID) || 'unknown';
        const callId = getParam(SYSTEM_CONSTANTS.PARAMS.CALL_ID) || `sim_${Date.now()}`;
        const isHangup = getParam(SYSTEM_CONSTANTS.PARAMS.HANGUP) === 'yes';

        Logger.debug("Request Headers", `Phone: ${phone}, CallId: ${callId}, isHangup: ${isHangup}`);

        // 3. טיפול בניתוק - אם הלקוח ניתק, אין טעם להפעיל אלגוריתמים כבדים
        if (isHangup) {
            Logger.info("Flow Manager", `User ${phone} ended the call. Closing session.`);
            return sendValidResponse(res, "noop=hangup_acknowledged");
        }

        // 4. "מכונת מצבים" (State Machine) לזיהוי הפעולה האחרונה שהמשתמש ביצע
        const allKeys = Array.from(urlObj.searchParams.keys());
        if (req.method === 'POST' && typeof req.body !== 'string') {
            allKeys.push(...Object.keys(rawBody));
        }

        // סינון משתני ליבה של ימות המשיח מתוך רשימת הפרמטרים
        const customKeys = allKeys.filter(k => 
            !k.startsWith('Api') && 
            k !== 'token' && 
            k !== SYSTEM_CONSTANTS.PARAMS.HANGUP
        );
        
        // הפעולה הנוכחית האמיתית היא *המשתנה האחרון* ברשימה שימות שלחה לנו
        const currentStepKey = customKeys.length > 0 ? customKeys[customKeys.length - 1] : null;
        const currentStepValue = currentStepKey ? getParam(currentStepKey) : null;

        Logger.info("Flow Manager", `Current Step Identified: [${currentStepKey}] = [${currentStepValue}]`);

        // 5. ניתוב (Routing) לפי המצב שזוהה
        
        // --- מצב 1: המשתמש הקליט הרגע אודיו ואנו מקבלים אותו מ-ימות ---
        if (currentStepKey === SYSTEM_CONSTANTS.PARAMS.USER_AUDIO && currentStepValue && currentStepValue.includes('.wav')) {
            await handleAudioProcessingAndAiResponse(phone, callId, currentStepValue, ivrBuilder);
        }
        
        // --- מצב 2: המשתמש נמצא בתפריט ההמשך (אחרי תשובת ה-AI) ---
        else if (currentStepKey === SYSTEM_CONSTANTS.PARAMS.ACTION_CHOICE) {
            if (currentStepValue === '7') {
                Logger.info("Flow Manager", "User elected to continue the current chat.");
                ivrBuilder.addRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.PARAMS.USER_AUDIO, callId);
            } else {
                Logger.info("Flow Manager", "User elected to return to the main menu.");
                await serveMainMenuPrompt(ivrBuilder);
            }
        }
        
        // --- מצב 3: המשתמש שומע את תפריט ההיסטוריה ובחר שיחה ---
        else if (currentStepKey === SYSTEM_CONSTANTS.PARAMS.HISTORY_CHOICE) {
            if (currentStepValue === '0') {
                Logger.info("Flow Manager", "User returned to main menu from history list.");
                await serveMainMenuPrompt(ivrBuilder);
            } else {
                await handleHistoryPlaybackSelection(phone, currentStepValue, ivrBuilder);
            }
        }
        
        // --- מצב 4: המשתמש בתפריט הראשי של המערכת ---
        else if (currentStepKey === SYSTEM_CONSTANTS.PARAMS.MENU_CHOICE) {
            if (currentStepValue === '1') {
                await handleNewChatInitialization(phone, callId, ivrBuilder);
            } 
            else if (currentStepValue === '2') {
                await handleHistoryMenuInitialization(phone, ivrBuilder);
            }
            else {
                Logger.warn("Flow Manager", `Invalid main menu selection received: ${currentStepValue}. Restarting menu.`);
                await serveMainMenuPrompt(ivrBuilder);
            }
        }
        
        // --- מצב 5 (ברירת מחדל): כניסה ראשונית למערכת ---
        else {
            Logger.info("Flow Manager", "First entry to system. Serving main menu.");
            // איחוד הקראת התפריט ובקשת ההקשה לפעולה אחת כדי למנוע ניתוק
            ivrBuilder.addReadDigits(SYSTEM_CONSTANTS.PROMPTS.MAIN_MENU, SYSTEM_CONSTANTS.PARAMS.MENU_CHOICE, 1, 1);
        }

        // 6. הרכבת השרשור הסופי והחזרתו בצורה בטוחה ללקוח
        const finalResponseStr = ivrBuilder.build();
        Logger.debug("Final Response Output", finalResponseStr);
        return sendValidResponse(res, finalResponseStr);

    } catch (error) {
        // רשת הביטחון העליונה. אם הגענו לכאן משהו קרס, אבל אנחנו מחזירים לימות תגובה תקנית שמנתקת את השיחה בנימוס!
        Logger.error("Global Handler Catch", "A critical error bypassed standard handling.", error);
        
        const fallbackIvr = new IVRBuilder(); // Use the CORRECT class name for the catch block!
        fallbackIvr.addTTS(SYSTEM_CONSTANTS.PROMPTS.SYSTEM_ERROR);
        fallbackIvr.addGoTo("hangup");
        
        return sendValidResponse(res, fallbackIvr.build());
    }
}

// ============================================================================
// --- SECTION 12: SPECIFIC FLOW PROCESSORS ---
// ============================================================================

/**
 * מוריד את קובץ האודיו, שולח למודל, מקבל תגובה ומעדכן את מסד הנתונים והלקוח.
 */
async function handleAudioProcessingAndAiResponse(phone, callId, yemotAudioPath, ivrBuilder) {
    Logger.info("Processor", "Processing user audio chunk...");
    
    // א. הורדה
    const base64Audio = await YemotIntegrationAPI.fetchAudioAsBase64(yemotAudioPath);
    
    // ב. הבאת נתוני משתמש ממסד הנתונים Vercel Blob
    const userData = await StorageAPI.getUserProfile(phone);
    
    // איתור שיחה נוכחית
    let currentChat = userData.chats.find(c => c.id === userData.currentChatId);
    if (!currentChat) {
        Logger.warn("Processor", "Active chat context lost. Bootstrapping recovery chat.");
        currentChat = { id: `chat_rec_${Date.now()}`, date: new Date().toISOString(), messages:[] };
        userData.chats.push(currentChat);
        userData.currentChatId = currentChat.id;
    }

    // לקיחת חמשת ההודעות האחרונות כדי לספק ל-Gemini "זיכרון" שיחה (Context)
    const historyContext = currentChat.messages.slice(-5);

    // ג. ייצור תגובה מול ה-AI
    const aiResponseText = await GeminiAIIntegration.processAudioAndRespond(base64Audio, historyContext);
    
    // ד. שמירת הנתונים המעודכנים כולל התשובה החדשה למסד הנתונים
    currentChat.messages.push({
        q: "הקלטה קולית שסופקה על ידי המשתמש",
        a: aiResponseText
    });
    await StorageAPI.saveUserProfile(phone, userData);

    // ה. בניית הפלט והתפריט
    ivrBuilder.addTTS(aiResponseText);
    ivrBuilder.addReadDigits(SYSTEM_CONSTANTS.PROMPTS.CHAT_ACTION_MENU, SYSTEM_CONSTANTS.PARAMS.ACTION_CHOICE, 1, 1);
}

/**
 * מאתחל סשן של שיחה חדשה למשתמש
 */
async function handleNewChatInitialization(phone, callId, ivrBuilder) {
    Logger.info("Processor", "Bootstrapping new chat session infrastructure.");
    
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
 * מרכיב את תפריט ההיסטוריה על סמך נתוני המשתמש.
 */
async function handleHistoryMenuInitialization(phone, ivrBuilder) {
    Logger.info("Processor", "Constructing dynamic history menu.");
    
    const userData = await StorageAPI.getUserProfile(phone);
    
    if (!userData.chats || userData.chats.length === 0) {
        Logger.info("Processor", "User lacks history. Rerouting to new chat.");
        ivrBuilder.addTTS(SYSTEM_CONSTANTS.PROMPTS.NO_HISTORY);
        await handleNewChatInitialization(phone, `sim_${Date.now()}`, ivrBuilder);
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
 * מקריא את תוכן השיחה הקודמת שהלקוח בחר לשמוע
 */
async function handleHistoryPlaybackSelection(phone, choiceString, ivrBuilder) {
    Logger.info("Processor", `Initiating history playback for user selection: ${choiceString}`);
    
    const userData = await StorageAPI.getUserProfile(phone);
    const recentChats = userData.chats.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS).reverse();
    const selectedIndex = parseInt(choiceString, 10) - 1;

    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= recentChats.length) {
        Logger.warn("Processor", `Out-of-bounds history selection: ${choiceString}`);
        ivrBuilder.addTTS(SYSTEM_CONSTANTS.PROMPTS.HISTORY_INVALID_CHOICE);
        await serveMainMenuPrompt(ivrBuilder);
        return;
    }

    const selectedChat = recentChats[selectedIndex];
    
    userData.currentChatId = selectedChat.id;
    await StorageAPI.saveUserProfile(phone, userData);

    let playbackText = "היסטוריית שיחה מתחילה. ";
    selectedChat.messages.forEach((msg, i) => {
        playbackText += `תשובה מספר ${i + 1} הייתה ${msg.a}. `;
    });

    ivrBuilder.addTTS(playbackText);
    ivrBuilder.addReadDigits(SYSTEM_CONSTANTS.PROMPTS.CHAT_ACTION_MENU, SYSTEM_CONSTANTS.PARAMS.ACTION_CHOICE, 1, 1);
}

/**
 * פונקציית עזר להגשת התפריט הראשי
 */
async function serveMainMenuPrompt(ivrBuilder) {
    ivrBuilder.addReadDigits(SYSTEM_CONSTANTS.PROMPTS.MAIN_MENU, SYSTEM_CONSTANTS.PARAMS.MENU_CHOICE, 1, 1);
}

/**
 * פונקציית תשתית: הבטחת שליחת Header נקי וקוד HTTP 200 בלבד אל ימות המשיח.
 */
function sendValidResponse(res, responseString) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(200).send(responseString);
}
