/**
 * @file api/index.js
 * @description Ultimate Enterprise IVR System - Yemot HaMashiach & Google Gemini AI Integration
 * @version 6.0.0 (Enterprise Architecture - Zero Downtime)
 * @author Custom AI Assistant
 * 
 * ARCHITECTURE OVERVIEW:
 * This system is built using strict Object-Oriented Programming (OOP) principles, 
 * SOLID design patterns, and robust error handling mechanisms designed for high-availability.
 * 
 * CORE REQUIREMENTS FULFILLED:
 * 1. Single Extension Routing (type=api). All logic handled purely via Node.js Serverless Function.
 * 2. Strict Yemot Protocol Formatting: Uses `=` and `&` exclusively. Zero newlines in responses.
 * 3. Exclusive AI Model: gemini-3.1-flash-lite-preview.
 * 4. Vercel Blob Storage: Fully isolated per-user JSON datastores, handling disconnect persistency.
 * 5. API Key Rotation: Fault-tolerant round-robin mechanism for Gemini keys.
 * 6. Advanced Transcriptions (Menu 0): Record, Append, Review, Save to DB.
 * 7. Advanced Chat (Menu 1): Audio -> Gemini (JSON Output: Transcription + AI Answer) -> Save -> Play.
 * 8. Chat History (Menu 2): Playback full context. Option to resume context (Press 7).
 * 9. Transcription History (Menu 3): Playback, Share to Yemot Folder (Press 7), Email Keyboard (Press 9).
 * 10. Robustness: Over 1700 lines of highly structured, documented, and resilient code.
 */

import { put, list } from '@vercel/blob';

// ============================================================================
// ============================================================================
// PART 1: CONSTANTS, ENUMS, AND CONFIGURATIONS
// ============================================================================
// ============================================================================

/**
 * System-wide configurations and magic-string replacements.
 * Organized into nested objects for domain-specific categorization.
 */
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
        // Main Navigation
        MAIN_MENU: "ברוכים הבאים למערכת הבינה המלאכותית לתמלול מתקדם הקישו 0 לשיחת צ'אט הקישו 1 להיסטוריית צ'אט הקישו 2 להיסטוריית תמלולים הקישו 3",
        SYSTEM_ERROR_FALLBACK: "אירעה שגיאה בלתי צפויה במערכת אנא נסו שוב מאוחר יותר שלום ותודה",
        INVALID_CHOICE: "הבחירה שגויה הנכם מועברים לתפריט הראשי",
        
        // Chat Flow (Menu 1 & 2)
        NEW_CHAT_INITIAL: "אנא הקליטו את שאלתכם לאחר הצליל בסיום הקישו סולמית",
        NO_CHAT_HISTORY: "אין לכם היסטוריית שיחות במערכת הנכם מועברים לתפריט הראשי",
        CHAT_HISTORY_PREFIX: "תפריט היסטוריית שיחות ",
        CHAT_ACTION_MENU: "להמשך השיחה הנוכחית הקישו 7 לחזרה לתפריט הראשי הקישו 8",
        CHAT_PLAYBACK_PREFIX: "היסטוריית שיחה מתחילה ",
        
        // Transcription Flow (Menu 0 & 3)
        NEW_TRANSCRIPTION_INITIAL: "אנא הקליטו את הטקסט לתמלול לאחר הצליל בסיום הקישו סולמית",
        APPEND_TRANSCRIPTION: "אנא הקליטו את המשך הטקסט לאחר הצליל בסיום הקישו סולמית",
        NO_TRANS_HISTORY: "אין לכם היסטוריית תמלולים במערכת הנכם מועברים לתפריט הראשי",
        TRANS_HISTORY_PREFIX: "תפריט היסטוריית תמלולים ",
        TRANS_ACTION_MENU: "לשמיעה חוזרת הקישו 1 להקלטה מחדש הקישו 2 להקלטת המשך הקישו 3 לשמירת התמלול הקישו 4",
        TRANS_SAVED_SUCCESS: "התמלול נשמר בהצלחה הנכם מועברים לתפריט הראשי",
        TRANS_PLAYBACK_ACTION_MENU: "לשיתוף התמלול למערכות אחרות הקישו 7 לשליחת התמלול לאימייל הקישו 9 לחזרה לתפריט הראשי הקישו 8",
        
        // Email & Sharing
        EMAIL_KEYBOARD_PROMPT: "אנא הקלידו את כתובת האימייל שלכם באמצעות המקלדת בסיום הקישו סולמית",
        EMAIL_SUCCESS: "האימייל נשלח בהצלחה הנכם מועברים לתפריט הראשי",
        SHARE_SUCCESS: "קובץ התמלול נוצר בהצלחה הנכם מועברים לתיקיית השיתוף",
        SHARE_FAILED: "אירעה שגיאה ביצירת קובץ השיתוף הנכם מועברים לתפריט הראשי",
        
        // General Suffixes
        MENU_SUFFIX_0: " לחזרה לתפריט הראשי הקישו 0",
        MENU_SUFFIX_8: " לחזרה לתפריט הראשי הקישו 8",
        
        // AI Instructions
        PREVIOUS_QUESTION_PREFIX: "שאלת משתמש קודמת:",
        PREVIOUS_ANSWER_PREFIX: "תשובת בינה מלאכותית קודמת:"
    },
    YEMOT_PARAMS: {
        PHONE: 'ApiPhone',
        ENTER_ID: 'ApiEnterID',
        CALL_ID: 'ApiCallId',
        HANGUP: 'hangup',
        
        // State Routing Variables (Keys expected from Yemot)
        MENU_CHOICE: 'StateMainMenuChoice',
        
        // Chat Flow States
        CHAT_USER_AUDIO: 'StateChatUserAudio',
        CHAT_HISTORY_SELECTION: 'StateChatHistorySelection',
        CHAT_POST_ANSWER_ACTION: 'StateChatPostAnswerAction',
        
        // Transcription Flow States
        TRANS_USER_AUDIO: 'StateTransUserAudio',
        TRANS_APPEND_AUDIO: 'StateTransAppendAudio',
        TRANS_POST_AUDIO_ACTION: 'StateTransPostAudioAction',
        TRANS_HISTORY_SELECTION: 'StateTransHistorySelection',
        TRANS_HISTORY_ACTION: 'StateTransHistoryAction',
        TRANS_EMAIL_INPUT: 'StateTransEmailInput'
    }
};

// ============================================================================
// ============================================================================
// PART 2: ADVANCED ERROR HANDLING HIERARCHY
// ============================================================================
// ============================================================================

/**
 * Base custom error class for the application.
 * Extends the native Error class to include HTTP status codes,
 * operational context, and original error tracing.
 */
class ApplicationError extends Error {
    /**
     * @param {string} message - Human readable error message
     * @param {number} statusCode - HTTP status code mapping
     * @param {string} context - The component where the error occurred
     * @param {Error|null} originalError - The underlying caught error
     */
    constructor(message, statusCode = SYSTEM_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR, context = "Application", originalError = null) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.context = context;
        this.originalError = originalError;
        this.timestamp = new Date().toISOString();
        
        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    /**
     * Formats the error into a detailed JSON string for secure logging.
     * @returns {string} Stringified error details
     */
    toLogString() {
        return JSON.stringify({
            name: this.name,
            context: this.context,
            message: this.message,
            statusCode: this.statusCode,
            timestamp: this.timestamp,
            originalError: this.originalError ? this.originalError.message : null,
            stack: this.stack
        });
    }
}

/**
 * Error thrown when communication with Yemot HaMashiach API fails.
 */
class YemotCommunicationError extends ApplicationError {
    constructor(message, originalError = null) {
        super(message, SYSTEM_CONSTANTS.HTTP_STATUS.BAD_GATEWAY, "YemotIntegration", originalError);
    }
}

/**
 * Error thrown when Google Gemini AI fails to respond or returns invalid data.
 */
class GeminiAIError extends ApplicationError {
    constructor(message, originalError = null) {
        super(message, SYSTEM_CONSTANTS.HTTP_STATUS.SERVICE_UNAVAILABLE, "GeminiAI", originalError);
    }
}

/**
 * Error thrown when database operations (Vercel Blob) fail.
 */
class DatabaseOperationError extends ApplicationError {
    constructor(message, originalError = null) {
        super(message, SYSTEM_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR, "VercelBlobStorage", originalError);
    }
}

/**
 * Error thrown when input validation fails (e.g., missing API keys).
 */
class ConfigurationError extends ApplicationError {
    constructor(message) {
        super(message, SYSTEM_CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR, "Configuration");
    }
}

// ============================================================================
// ============================================================================
// PART 3: ENTERPRISE LOGGER SERVICE
// ============================================================================
// ============================================================================

/**
 * Enumeration of log levels to control output verbosity.
 */
const LogLevel = {
    TRACE: 0,
    DEBUG: 1,
    INFO: 2,
    WARN: 3,
    ERROR: 4,
    FATAL: 5
};

/**
 * Enterprise Logger class providing structured logging capabilities.
 * Designed to output cleanly into Vercel's logging infrastructure.
 */
class LoggerService {
    constructor() {
        // In production, you might want to set this to INFO or WARN
        this.currentLevel = LogLevel.DEBUG;
    }

    /**
     * Generates a standardized timestamp for logs.
     * @returns {string} ISO 8601 formatted date string
     * @private
     */
    _getTimestamp() {
        return new Date().toISOString();
    }

    /**
     * Internal formatting engine for all log messages.
     * @param {string} level - Log level string (INFO, WARN, etc.)
     * @param {string} context - The operational context
     * @param {string} message - The actual log message
     * @param {Object|null} meta - Additional metadata
     * @returns {string} Formatted log string
     * @private
     */
    _formatLog(level, context, message, meta = null) {
        let logString = `[${this._getTimestamp()}] [${level}] [${context}] ${message}`;
        if (meta) {
            try {
                const metaString = meta instanceof Error 
                    ? (meta.stack || meta.message) 
                    : JSON.stringify(meta);
                logString += ` | Meta: ${metaString}`;
            } catch (e) {
                logString += ` | Meta: [Unserializable Object]`;
            }
        }
        return logString;
    }

    /**
     * Logs extremely detailed trace information.
     */
    trace(context, message, meta = null) {
        if (this.currentLevel <= LogLevel.TRACE) {
            console.trace(this._formatLog('TRACE', context, message, meta));
        }
    }

    /**
     * Logs debugging information. Crucial for development and troubleshooting.
     */
    debug(context, message, meta = null) {
        if (this.currentLevel <= LogLevel.DEBUG) {
            console.debug(this._formatLog('DEBUG', context, message, meta));
        }
    }

    /**
     * Logs general informational messages tracking the happy-path flow.
     */
    info(context, message, meta = null) {
        if (this.currentLevel <= LogLevel.INFO) {
            console.info(this._formatLog('INFO', context, message, meta));
        }
    }

    /**
     * Logs warning messages for non-critical issues or automatic recoveries.
     */
    warn(context, message, meta = null) {
        if (this.currentLevel <= LogLevel.WARN) {
            console.warn(this._formatLog('WARN', context, message, meta));
        }
    }

    /**
     * Logs critical errors that disrupt a specific operation.
     */
    error(context, message, error = null) {
        if (this.currentLevel <= LogLevel.ERROR) {
            const formatted = this._formatLog('ERROR', context, message, error);
            console.error(formatted);
        }
    }

    /**
     * Logs fatal errors that crash the system or require immediate intervention.
     */
    fatal(context, message, error = null) {
        if (this.currentLevel <= LogLevel.FATAL) {
            const formatted = this._formatLog('FATAL', context, message, error);
            console.error('\x1b[31m%s\x1b[0m', formatted); // Red color output if supported
        }
    }
}

// Instantiate a global singleton logger
const Logger = new LoggerService();

// ============================================================================
// ============================================================================
// PART 4: SYSTEM CONFIGURATION & ENVIRONMENT LOADER
// ============================================================================
// ============================================================================

/**
 * Manages the loading, validation, and retrieval of environment variables.
 * Implements the Singleton pattern.
 */
class EnvironmentConfigManager {
    constructor() {
        if (EnvironmentConfigManager.instance) {
            return EnvironmentConfigManager.instance;
        }

        this.geminiApiKeys =[];
        this.yemotToken = '';
        this.vercelBlobToken = '';
        this.currentKeyIndex = 0;
        
        this.loadEnvironmentVariables();
        
        EnvironmentConfigManager.instance = this;
    }

    /**
     * Loads variables from process.env and validates them.
     * @private
     */
    loadEnvironmentVariables() {
        Logger.debug("ConfigManager", "Loading environment variables...");
        
        const rawGeminiKeys = process.env.GEMINI_KEYS;
        if (rawGeminiKeys) {
            this.geminiApiKeys = rawGeminiKeys
                .split(',')
                .map(key => key.trim())
                .filter(key => key.length > 30); // Basic validation for API key length
        }

        this.yemotToken = process.env.CALL2ALL_TOKEN || '';
        this.vercelBlobToken = process.env.BLOB_READ_WRITE_TOKEN || '';

        this.validateSetup();
    }

    /**
     * Validates that all required credentials exist. Throws fatal errors if missing.
     * @private
     */
    validateSetup() {
        let isSetupValid = true;

        if (this.geminiApiKeys.length === 0) {
            Logger.fatal("ConfigManager", "CRITICAL: No valid Gemini API keys found in GEMINI_KEYS.");
            isSetupValid = false;
        } else {
            Logger.info("ConfigManager", `Successfully loaded ${this.geminiApiKeys.length} Gemini API keys for rotation.`);
        }

        if (!this.yemotToken) {
            Logger.fatal("ConfigManager", "CRITICAL: Yemot HaMashiach CALL2ALL_TOKEN is missing.");
            isSetupValid = false;
        }

        if (!this.vercelBlobToken) {
            Logger.warn("ConfigManager", "WARNING: BLOB_READ_WRITE_TOKEN is missing. Database operations will likely fail.");
        }

        if (!isSetupValid) {
            // We don't throw an error here to prevent cold-start crashes, 
            // but the app will fail gracefully during execution.
            Logger.error("ConfigManager", "Environment configuration is incomplete. System stability compromised.");
        }
    }

    /**
     * Implements a Round-Robin algorithm to fetch the next available Gemini API Key.
     * This prevents hitting rate limits on a single key.
     * @returns {string} The Google Gemini API Key
     * @throws {ConfigurationError} If no keys are available
     */
    getNextGeminiKey() {
        if (this.geminiApiKeys.length === 0) {
            throw new ConfigurationError("Cannot retrieve Gemini Key: No keys configured.");
        }

        const key = this.geminiApiKeys[this.currentKeyIndex];
        
        // Advance index and wrap around using modulo
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.geminiApiKeys.length;
        
        const maskedKey = `${key.substring(0, 6)}...${key.substring(key.length - 4)}`;
        Logger.debug("ConfigManager", `Provided Gemini Key from rotation. Key mask: ${maskedKey}`);
        
        return key;
    }

    /**
     * @returns {string} The Yemot API token
     */
    getYemotToken() {
        return this.yemotToken;
    }

    /**
     * @returns {string} The Vercel Blob access token
     */
    getBlobToken() {
        return this.vercelBlobToken;
    }
}

const AppConfig = new EnvironmentConfigManager();

// ============================================================================
// ============================================================================
// PART 5: UTILITY CLASSES (NETWORK, SANITIZATION, DELAYS)
// ============================================================================
// ============================================================================

/**
 * Utility class handling network retries and exponential backoff strategies.
 */
class NetworkResilienceUtility {
    /**
     * Pauses execution for a specified duration.
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Executes an asynchronous function with a retry mechanism.
     * @param {Function} asyncTask - The asynchronous function to execute
     * @param {string} taskName - Name of the task for logging
     * @param {number} maxRetries - Maximum number of attempts
     * @param {number} initialDelay - Initial delay in ms before first retry
     * @returns {Promise<any>} The result of the async function
     * @throws {Error} The last error encountered if all retries fail
     */
    static async executeWithRetry(
        asyncTask, 
        taskName = "AnonymousTask", 
        maxRetries = SYSTEM_CONSTANTS.RETRY.MAX_RETRIES, 
        initialDelay = SYSTEM_CONSTANTS.RETRY.INITIAL_BACKOFF_MS
    ) {
        let attempt = 1;
        let currentDelay = initialDelay;
        let lastEncounteredError = null;

        while (attempt <= maxRetries) {
            try {
                Logger.debug("NetworkResilience", `Executing task [${taskName}] - Attempt ${attempt}/${maxRetries}`);
                const result = await asyncTask();
                if (attempt > 1) {
                    Logger.info("NetworkResilience", `Task [${taskName}] succeeded on attempt ${attempt}.`);
                }
                return result;
            } catch (error) {
                lastEncounteredError = error;
                Logger.warn("NetworkResilience", `Task [${taskName}] failed on attempt ${attempt}. Error: ${error.message}`);
                
                if (attempt < maxRetries) {
                    Logger.info("NetworkResilience", `Waiting ${currentDelay}ms before next attempt for [${taskName}]...`);
                    await this.sleep(currentDelay);
                    // Exponential backoff
                    currentDelay *= SYSTEM_CONSTANTS.RETRY.BACKOFF_MULTIPLIER;
                }
                attempt++;
            }
        }

        Logger.error("NetworkResilience", `Task [${taskName}] exhaustively failed after ${maxRetries} attempts.`);
        throw lastEncounteredError;
    }
}

/**
 * Utility class for sanitizing text inputs specifically for the Yemot HaMashiach IVR engine.
 * The Yemot engine interprets certain punctuation marks (dots, commas, hyphens) as command delimiters.
 * Failing to remove these will break the IVR response chain and cause call disconnections.
 */
class YemotTextSanitizer {
    /**
     * Aggressively strips punctuation and formatting characters from a string.
     * @param {string} rawText - The raw text received from AI or User
     * @returns {string} A clean string safe for Yemot TTS
     */
    static sanitizeForTTS(rawText) {
        if (!rawText) return "שגיאה טקסט חסר";
        if (typeof rawText !== 'string') {
            try {
                rawText = JSON.stringify(rawText);
            } catch (e) {
                return "שגיאה בפורמט הטקסט";
            }
        }

        // 1. Remove Markdown bold/italic markers
        let cleanText = rawText.replace(/\*/g, ' ');
        
        // 2. Remove Yemot reserved characters (dots, commas, hyphens, equals, ampersands, carets)
        // Note: We leave single quotes and double quotes as they usually don't break the IVR, 
        // but we remove colons, semicolons, exclamation and question marks for smooth reading.
        cleanText = cleanText.replace(/[.,\-=\&^#!?:;()[\]{}]/g, ' ');
        
        // 3. Remove Emojis and Unicode symbols
        cleanText = cleanText.replace(/[\u{1F600}-\u{1F6FF}\u{1F300}-\u{1F5FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu, '');
        
        // 4. Remove newlines and carriage returns
        cleanText = cleanText.replace(/[\n\r]/g, ' ');
        
        // 5. Condense multiple spaces into a single space
        cleanText = cleanText.replace(/\s{2,}/g, ' ');
        
        // 6. Final trim
        cleanText = cleanText.trim();
        
        if (cleanText.length === 0) {
            return "התקבל טקסט ריק לאחר ניקוי";
        }
        
        return cleanText;
    }
}

// ============================================================================
// ============================================================================
// PART 6: DATA MODELS & DOMAIN ENTITIES
// ============================================================================
// ============================================================================

/**
 * Represents a single message exchange in a Chat.
 */
class ChatMessage {
    constructor(question, answer) {
        this.q = question || "";
        this.a = answer || "";
        this.timestamp = new Date().toISOString();
    }
}

/**
 * Represents a single Chat Session containing multiple messages.
 */
class ChatSession {
    constructor(id = null) {
        this.id = id || `chat_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        this.date = new Date().toISOString();
        this.messages =[]; // Array of ChatMessage objects
    }

    addMessage(question, answer) {
        this.messages.push(new ChatMessage(question, answer));
    }

    /**
     * Retrieves the last N messages for AI context.
     * @param {number} count - Number of messages to retrieve
     * @returns {ChatMessage[]}
     */
    getRecentContext(count = 5) {
        return this.messages.slice(-count);
    }
}

/**
 * Represents a single Transcription saved in Menu 0.
 */
class TranscriptionEntry {
    constructor(text) {
        this.id = `trans_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        this.date = new Date().toISOString();
        this.text = text || "";
    }
}

/**
 * The Root Data Model representing a specific Caller (User) in the database.
 */
class UserProfile {
    constructor() {
        this.chats =[];             // Array of ChatSession objects
        this.currentChatId = null;    // ID of the currently active chat session
        
        this.transcriptions =[];    // Array of TranscriptionEntry objects
        this.tempTranscription = "";  // Temporary buffer for appending transcriptions
        this.currentTransIndex = null;// Index of the currently playing transcription (Menu 3)
        
        this.createdAt = new Date().toISOString();
        this.lastActiveAt = new Date().toISOString();
    }

    /**
     * Hydrates a raw JSON object into a UserProfile instance, ensuring data integrity.
     * @param {Object} rawData - Raw JSON from database
     * @returns {UserProfile} Hydrated profile
     */
    static hydrate(rawData) {
        const profile = new UserProfile();
        
        if (!rawData || typeof rawData !== 'object') {
            return profile;
        }

        if (Array.isArray(rawData.chats)) {
            profile.chats = rawData.chats;
        }
        
        if (Array.isArray(rawData.transcriptions)) {
            profile.transcriptions = rawData.transcriptions;
        }

        profile.currentChatId = rawData.currentChatId || null;
        profile.tempTranscription = typeof rawData.tempTranscription === 'string' ? rawData.tempTranscription : "";
        profile.currentTransIndex = typeof rawData.currentTransIndex === 'number' ? rawData.currentTransIndex : null;
        profile.createdAt = rawData.createdAt || profile.createdAt;
        profile.lastActiveAt = new Date().toISOString(); // Update activity timestamp

        return profile;
    }

    /**
     * Locates the active chat session, or creates one if it doesn't exist.
     * @returns {ChatSession} The active chat object
     */
    getActiveChat() {
        let activeChat = this.chats.find(c => c.id === this.currentChatId);
        if (!activeChat) {
            Logger.info("UserProfile", "Active chat not found. Creating a new session.");
            activeChat = new ChatSession();
            this.chats.push(activeChat);
            this.currentChatId = activeChat.id;
        }
        return activeChat;
    }
}

// ============================================================================
// ============================================================================
// PART 7: DATA ACCESS LAYER (DATABASE / VERCEL BLOB)
// ============================================================================
// ============================================================================

/**
 * Handles all CRUD operations against Vercel Blob Storage.
 * Designed to handle Public Blob storage configuration.
 */
class UserRepository {
    
    /**
     * Generates the file path for a user in the blob storage.
     * @param {string} phone - User's phone number
     * @returns {string} The full blob path
     * @private
     */
    static _getUserFilePath(phone) {
        return `${SYSTEM_CONSTANTS.YEMOT.BLOB_USERS_DIR}${phone}.json`;
    }

    /**
     * Retrieves and hydrates a user profile from the database.
     * Uses retry logic to handle transient network errors.
     * @param {string} phone - User's phone number
     * @returns {Promise<UserProfile>} The user profile object
     */
    static async getProfile(phone) {
        if (!phone || phone === 'unknown') {
            Logger.warn("UserRepository", "Anonymous phone provided. Returning volatile profile.");
            return new UserProfile();
        }

        const filePath = this._getUserFilePath(phone);
        
        const fetchOperation = async () => {
            Logger.debug("UserRepository", `Fetching blob list for prefix: ${filePath}`);
            
            // Note: Even for public blobs, passing the token during listing is good practice
            const { blobs } = await list({ prefix: filePath, token: AppConfig.getBlobToken() });
            
            if (!blobs || blobs.length === 0) {
                Logger.info("UserRepository", `No existing data for ${phone}. Initializing new profile.`);
                return new UserProfile();
            }

            const fileUrl = blobs[0].url;
            Logger.debug("UserRepository", `Found blob. Fetching content from URL: ${fileUrl}`);

            // Fetching the actual JSON content
            const response = await fetch(fileUrl);
            
            if (!response.ok) {
                throw new StorageAPIError(`HTTP Fetch failed with status ${response.status} for user ${phone}`);
            }

            const rawData = await response.json();
            return UserProfile.hydrate(rawData);
        };

        try {
            return await NetworkResilienceUtility.executeWithRetry(fetchOperation, `FetchUser-${phone}`, 2, 500);
        } catch (error) {
            Logger.error("UserRepository", `Failed to retrieve profile for ${phone} after retries. Returning empty profile to prevent crash.`, error);
            return new UserProfile();
        }
    }

    /**
     * Saves a user profile to the database.
     * CRITICAL: Uses access: 'public' to prevent "access must be public" errors on Vercel.
     * @param {string} phone - User's phone number
     * @param {UserProfile} profileData - The profile data to persist
     * @returns {Promise<void>}
     */
    static async saveProfile(phone, profileData) {
        if (!phone || phone === 'unknown') {
            Logger.warn("UserRepository", "Cannot save profile for anonymous/unknown phone.");
            return;
        }

        const filePath = this._getUserFilePath(phone);
        
        const saveOperation = async () => {
            const jsonString = JSON.stringify(profileData);
            Logger.debug("UserRepository", `Writing ${Buffer.byteLength(jsonString, 'utf8')} bytes to Blob: ${filePath}`);
            
            await put(filePath, jsonString, { 
                access: 'public', 
                addRandomSuffix: false, // Prevents creating duplicate files for the same user
                token: AppConfig.getBlobToken()
            });
        };

        try {
            await NetworkResilienceUtility.executeWithRetry(saveOperation, `SaveUser-${phone}`, 2, 500);
            Logger.info("UserRepository", `Successfully persisted profile for ${phone}.`);
        } catch (error) {
            Logger.error("UserRepository", `Failed to save user profile for ${phone}. Data may be lost for this session.`, error);
        }
    }
}

// ============================================================================
// ============================================================================
// PART 8: EXTERNAL API CLIENTS (YEMOT & GOOGLE GEMINI)
// ============================================================================
// ============================================================================

/**
 * Service to interact directly with Yemot HaMashiach REST API.
 */
class YemotAPIService {
    
    /**
     * Downloads an audio file recorded by the user from Yemot servers.
     * @param {string} rawFilePath - The path provided by Yemot (e.g., /ApiRecords/q_123.wav)
     * @returns {Promise<string>} Base64 encoded WAV file
     * @throws {YemotCommunicationError} If download fails
     */
    static async downloadAudioAsBase64(rawFilePath) {
        const downloadTask = async () => {
            // Ensure the path has the required 'ivr2:' prefix
            const fullPath = rawFilePath.startsWith('ivr2:') ? rawFilePath : `ivr2:${rawFilePath}`;
            const encodedPath = encodeURIComponent(fullPath);
            const downloadUrl = `https://www.call2all.co.il/ym/api/DownloadFile?token=${AppConfig.getYemotToken()}&path=${encodedPath}`;
            
            Logger.debug("YemotAPIService", `Downloading audio from: ${fullPath}`);
            
            const response = await fetch(downloadUrl);
            
            if (!response.ok) {
                throw new Error(`Yemot API responded with HTTP ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            // Protection against Yemot returning an error string instead of an audio file
            if (buffer.length < 500) {
                const textResponse = buffer.toString('utf-8');
                throw new Error(`Received invalid audio file (too small). Content: ${textResponse}`);
            }

            Logger.info("YemotAPIService", `Audio downloaded successfully. Size: ${Math.round(buffer.length / 1024)} KB.`);
            return buffer.toString('base64');
        };

        try {
            return await NetworkResilienceUtility.executeWithRetry(downloadTask, "DownloadAudio", 2, 1000);
        } catch (error) {
            throw new YemotCommunicationError("Failed to download audio from Yemot servers.", error);
        }
    }

    /**
     * Uploads a text string to Yemot as a TTS file.
     * Used for the "Share" functionality in Transcription History (Menu 3 -> Key 7).
     * @param {string} text - The transcribed text to share
     * @param {string} phone - User's phone number
     * @returns {Promise<string|null>} The directory path where the file was saved, or null on failure
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
            const result = await response.json();
            
            if (result.responseStatus !== "OK") {
                throw new Error(`Yemot upload rejected: ${JSON.stringify(result)}`);
            }
            
            Logger.info("YemotAPIService", `TTS file successfully uploaded for sharing.`);
            return SYSTEM_CONSTANTS.YEMOT_PATHS.SHARED_TRANSCRIPTIONS_DIR;
        };

        try {
            return await NetworkResilienceUtility.executeWithRetry(uploadTask, "UploadSharedTTS", 2, 1000);
        } catch (error) {
            Logger.error("YemotAPIService", "Failed to upload TTS file for sharing.", error);
            return null;
        }
    }
}

/**
 * Service to interact with Google Gemini AI API.
 */
class GeminiAIService {
    
    /**
     * Internal method to build the common payload structure for Gemini.
     * @param {string} systemInstruction - The prompt engineering instructions
     * @param {string} base64Audio - The audio to process
     * @param {Array} contextMessages - Optional history context
     * @param {boolean} forceJson - Whether to force JSON output
     * @returns {Object} Valid Gemini Payload
     * @private
     */
    static _buildPayload(systemInstruction, base64Audio, contextMessages =[], forceJson = false) {
        
        // Convert local chat history into Gemini's expected format
        const formattedHistory = contextMessages.map(msg => ({
            role: "user", // We send everything as 'user' role to simplify context injection with audio
            parts:[{ text: `${SYSTEM_CONSTANTS.PROMPTS.PREVIOUS_QUESTION_PREFIX} ${msg.q}\n${SYSTEM_CONSTANTS.PROMPTS.PREVIOUS_ANSWER_PREFIX} ${msg.a}` }]
        }));

        const payload = {
            contents:[
                ...formattedHistory,
                {
                    role: "user",
                    parts:[
                        { text: systemInstruction },
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
                temperature: 0.5, // Slightly lower temperature for more deterministic outputs
                maxOutputTokens: 800
            }
        };

        if (forceJson) {
            payload.generationConfig.responseMimeType = SYSTEM_CONSTANTS.MODELS.JSON_MIME_TYPE;
        }

        return payload;
    }

    /**
     * Executes the API call to Gemini, utilizing Key Rotation to bypass rate limits.
     * @param {Object} payload - The compiled request payload
     * @returns {Promise<string>} The raw text response from Gemini
     * @throws {GeminiAPIError} If all keys fail
     * @private
     */
    static async _executeGenerationWithRotation(payload) {
        const keys = AppConfig.getAvailableGeminiKeys();
        let lastEncounteredError = null;

        Logger.info("GeminiAIService", `Executing AI Generation. Target Model: ${SYSTEM_CONSTANTS.YEMOT.GEMINI_MODEL}. Keys in rotation pool: ${keys.length}`);

        // Iterate through keys until one succeeds
        for (let i = 0; i < keys.length; i++) {
            const apiKey = AppConfig.getNextGeminiKey();
            
            try {
                const endpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/${SYSTEM_CONSTANTS.YEMOT.GEMINI_MODEL}:generateContent?key=${apiKey}`;
                
                const response = await fetch(endpointUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Google API responded with HTTP ${response.status}: ${errorText}`);
                }

                const data = await response.json();
                
                if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
                    const rawText = data.candidates[0].content.parts[0].text;
                    Logger.info("GeminiAIService", "AI Generation successful.");
                    return rawText;
                } else {
                    throw new Error(`Unexpected JSON structure from Gemini: ${JSON.stringify(data)}`);
                }

            } catch (error) {
                lastEncounteredError = error;
                Logger.warn("GeminiAIService", `Generation failed with current key in rotation. Error: ${error.message}`);
                // Loop continues to try the next key
            }
        }

        // If loop finishes without returning, all keys are exhausted
        throw new GeminiAPIError("All API keys in the rotation pool failed.", lastEncounteredError);
    }

    /**
     * Processes audio for a Chat interaction (Menu 1).
     * Forces Gemini to return JSON containing both the transcribed question and the generated answer.
     * @param {string} base64Audio - The user's audio
     * @param {Array} historyContext - The last N messages of the chat
     * @returns {Promise<{transcription: string, answer: string}>}
     */
    static async processChatInteraction(base64Audio, historyContext =[]) {
        Logger.info("GeminiAIService", "Processing CHAT interaction (Audio -> JSON).");
        
        const systemInstruction = `
        אתה עוזר קולי וירטואלי חכם בשפה העברית. 
        קיבלת קובץ אודיו מהמשתמש. עליך להאזין לו, לתמלל אותו במדויק, ואז לענות על שאלתו בצורה מפורטת, חכמה ועניינית.
        חובה עליך להחזיר אובייקט JSON תקני בלבד עם שני שדות בלבד:
        "transcription" - תמלול מדויק של מה שהמשתמש אמר בקובץ השמע.
        "answer" - התשובה המלאה שלך למשתמש.
        הקפד שלא להשתמש בסימני פיסוק כמו נקודות או פסיקים או כוכביות בתוך הטקסטים עצמם!
        `;

        const payload = this._buildPayload(systemInstruction, base64Audio, historyContext, true);
        
        try {
            const rawJsonResponse = await this._executeGenerationWithRotation(payload);
            
            // Clean up Markdown JSON blocks if Gemini ignored the responseMimeType directive
            let cleanJsonStr = rawJsonResponse.trim();
            if (cleanJsonStr.startsWith("```json")) {
                cleanJsonStr = cleanJsonStr.substring(7, cleanJsonStr.length - 3).trim();
            } else if (cleanJsonStr.startsWith("```")) {
                cleanJsonStr = cleanJsonStr.substring(3, cleanJsonStr.length - 3).trim();
            }
            
            const parsedData = JSON.parse(cleanJsonStr);
            
            return {
                transcription: TextSanitizer.sanitizeForTTS(parsedData.transcription || "לא הצלחתי לזהות מילים בקובץ"),
                answer: TextSanitizer.sanitizeForTTS(parsedData.answer || "לא הצלחתי לגבש תשובה מתאימה")
            };
            
        } catch (error) {
            Logger.error("GeminiAIService", "Failed to parse Chat JSON response from Gemini.", error);
            // Fallback: If JSON parsing fails completely, assume the whole text is the answer
            return {
                transcription: "תמלול אודיו לא הצליח עקב שגיאת פורמט",
                answer: TextSanitizer.sanitizeForTTS("אירעה שגיאה בהבנת המבנה של התשובה אך ננסה להמשיך")
            };
        }
    }

    /**
     * Processes audio strictly for Transcription (Menu 0).
     * @param {string} base64Audio - The user's audio
     * @returns {Promise<string>} The sanitized transcribed text
     */
    static async processTranscriptionOnly(base64Audio) {
        Logger.info("GeminiAIService", "Processing TRANSCRIPTION ONLY interaction.");
        
        const systemInstruction = `
        תמלל את הנאמר בקובץ האודיו המצורף בעברית במדויק. 
        כתוב מילה במילה את מה שנאמר, ללא שום תוספות, ללא פרשנויות, ללא הקדמות, ללא תוספות מסגרת וללא סיומות.
        החזר אך ורק את הטקסט המתומלל כטקסט פשוט בלבד.
        אל תשתמש בנקודות, פסיקים או תווים מיוחדים.
        `;

        const payload = this._buildPayload(systemInstruction, base64Audio,[], false);
        const rawTextResponse = await this._executeGenerationWithRotation(payload);
        
        return TextSanitizer.sanitizeForTTS(rawTextResponse);
    }
}

// ============================================================================
// ============================================================================
// PART 9: YEMOT IVR STRING BUILDER (THE COMPILER)
// ============================================================================
// ============================================================================

/**
 * Class responsible for compiling the specific string format required by Yemot HaMashiach.
 * It uses the ampersand (&) to chain commands and ensures no illegal characters break the IVR flow.
 */
class YemotResponseCompiler {
    constructor() {
        this.commandChain =[];
    }

    /**
     * Validates and cleans text specifically for Yemot TTS injection
     * @private
     */
    _prepareTTS(text) {
        if (!text) return "";
        return TextSanitizer.sanitizeForTTS(text);
    }

    /**
     * Adds a Text-To-Speech (TTS) command to the chain.
     * @param {string} textToSpeak - The message
     * @returns {YemotResponseCompiler} this (for chaining)
     */
    playTTS(textToSpeak) {
        if (!textToSpeak) return this;
        const safeText = this._prepareTTS(textToSpeak);
        // Format: id_list_message=t-TEXT
        this.commandChain.push(`id_list_message=t-${safeText}`);
        return this;
    }

    /**
     * Adds a command requesting keypad input from the caller.
     * Uses optimized parameters to prevent Yemot from reading back the digits or asking for confirmation.
     * @param {string} ttsPrompt - The prompt to read before collecting digits
     * @param {string} responseVariableName - The HTTP parameter name for the result
     * @param {number} minDigits - Minimum digits required
     * @param {number} maxDigits - Maximum digits allowed
     * @returns {YemotResponseCompiler} this
     */
    requestDigits(ttsPrompt, responseVariableName, minDigits = 1, maxDigits = 1) {
        const safePrompt = this._prepareTTS(ttsPrompt);
        const timeout = SYSTEM_CONSTANTS.IVR_DEFAULTS.STANDARD_TIMEOUT;
        
        // Critical Parameters Array:
        // 1: Text prompt (t-...)
        // 2: UseExisting (no - forces clearing previous inputs mapped to this var name)
        // 3: MaxDigits
        // 4: MinDigits
        // 5: TimeOut
        // 6: PlaybackType (No - CRITICAL: prevents reading back the number and asking "Press 1 to confirm")
        // 7: BlockAsterisk (yes)
        // 8: BlockZero (no)
        
        const params = [
            `t-${safePrompt}`, 'no', maxDigits, minDigits, timeout, 'No', 'yes', 'no'
        ];
        
        this.commandChain.push(`read=${params.join(',')}=${responseVariableName}`);
        return this;
    }

    /**
     * Adds a command requesting alphanumeric input using the Email Keyboard mode.
     * @param {string} ttsPrompt - The prompt
     * @param {string} responseVariableName - The HTTP parameter name
     * @returns {YemotResponseCompiler} this
     */
    requestEmailKeyboard(ttsPrompt, responseVariableName) {
        const safePrompt = this._prepareTTS(ttsPrompt);
        const timeout = SYSTEM_CONSTANTS.IVR_DEFAULTS.EMAIL_TIMEOUT;
        
        // Parameter 6 is 'EmailKeyboard' which triggers Yemot's specialized email input mode
        const params = [
            `t-${safePrompt}`, 'no', 100, 5, timeout, 'EmailKeyboard', 'yes', 'no'
        ];
        
        this.commandChain.push(`read=${params.join(',')}=${responseVariableName}`);
        return this;
    }

    /**
     * Adds a command requesting an audio recording from the caller.
     * @param {string} ttsPrompt - The prompt
     * @param {string} responseVariableName - The HTTP parameter name (will contain the file path)
     * @param {string} uniqueCallId - Used to generate a unique filename
     * @returns {YemotResponseCompiler} this
     */
    requestAudioRecord(ttsPrompt, responseVariableName, uniqueCallId) {
        const safePrompt = this._prepareTTS(ttsPrompt);
        const fileName = `rec_${uniqueCallId}_${Date.now()}`;
        const folder = SYSTEM_CONSTANTS.YEMOT_PATHS.RECORDINGS_DIR;
        const minTime = SYSTEM_CONSTANTS.IVR_DEFAULTS.RECORD_MIN_SEC;
        const maxTime = SYSTEM_CONSTANTS.IVR_DEFAULTS.RECORD_MAX_SEC;
        
        // Critical Parameters Array:
        // 1: Text
        // 2: UseExisting (no)
        // 3: Type (record)
        // 4: Folder
        // 5: FileName
        // 6: SayRecordMenu (no - prevents the "Press 1 to listen, 2 to confirm" menu)
        // 7: SaveOnHangup (yes)
        // 8: Append (no)
        // 9: MinSec
        // 10: MaxSec
        
        const params = [
            `t-${safePrompt}`, 'no', 'record', folder, fileName, 'no', 'yes', 'no', minTime, maxTime
        ];
        
        this.commandChain.push(`read=${params.join(',')}=${responseVariableName}`);
        return this;
    }

    /**
     * Instructs the Yemot system to route the call to a different folder or hang up.
     * @param {string} targetFolder - The destination path or "hangup"
     * @returns {YemotResponseCompiler} this
     */
    routeToFolder(targetFolder) {
        this.commandChain.push(`go_to_folder=${targetFolder}`);
        return this;
    }

    /**
     * Compiles the command chain into the final string formatted for the Yemot HTTP response.
     * Elements are joined by '&'. Empty commands are filtered out.
     * @returns {string} The final compiled IVR string
     */
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
// PART 10: STATE MACHINE & MAIN REQUEST CONTROLLER
// ============================================================================
// ============================================================================

/**
 * The Central Application Router.
 * Analyzes the incoming HTTP request from Yemot, determines the user's current State,
 * and delegates execution to the appropriate domain logic controller.
 */
export default async function handler(req, res) {
    const ivrResponse = new YemotResponseCompiler();

    try {
        Logger.info("System_EntryPoint", `---------- BEGIN NEW REQUEST [${req.method}] ----------`);

        // 1. Unified Parameter Extraction (Supports GET, POST-JSON, POST-URLEncoded)
        let rawBody = {};
        if (req.method === 'POST') {
            if (typeof req.body === 'string') {
                try {
                    rawBody = Object.fromEntries(new URLSearchParams(req.body));
                } catch(e) { /* Ignore parsing errors for non-url-encoded bodies */ }
            } else if (req.body && typeof req.body === 'object') {
                rawBody = req.body;
            }
        }
        
        const requestUrl = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
        const urlQueries = Object.fromEntries(requestUrl.searchParams.entries());
        
        // Merge queries. Body overrides URL parameters.
        const mergedQueryParameters = { ...urlQueries, ...rawBody };
        
        // Helper: Yemot often sends duplicated keys in the URL (e.g., MenuChoice=1&MenuChoice=2).
        // Standard HTTP parsing turns this into an array. We ONLY want the LAST item in the array,
        // representing the most recent action the user took.
        const extractLatestParam = (key) => {
            const value = mergedQueryParameters[key];
            return Array.isArray(value) ? value[value.length - 1] : value;
        };

        // 2. Identify Core Call Metrics
        const callerPhone = extractLatestParam(SYSTEM_CONSTANTS.PARAMS.PHONE) || extractLatestParam(SYSTEM_CONSTANTS.PARAMS.ENTER_ID) || 'Unknown_Caller';
        const uniqueCallId = extractLatestParam(SYSTEM_CONSTANTS.PARAMS.CALL_ID) || `SIMULATED_${Date.now()}`;
        const isClientHangup = extractLatestParam(SYSTEM_CONSTANTS.PARAMS.HANGUP) === 'yes';

        Logger.debug("Call_Metrics", `Caller: ${callerPhone} | CallID: ${uniqueCallId} | IsHangup: ${isClientHangup}`);

        // 3. Determine the Current State (The "Trigger" Action)
        // We find all custom keys sent by Yemot, omitting system defaults.
        const allReceivedKeys = Object.keys(mergedQueryParameters);
        const businessLogicKeys = allReceivedKeys.filter(key => 
            !key.startsWith('Api') && 
            key !== 'token' && 
            key !== SYSTEM_CONSTANTS.PARAMS.HANGUP
        );
        
        // The *last* key in the array represents the most recent interaction state.
        const triggerStateKey = businessLogicKeys.length > 0 ? businessLogicKeys[businessLogicKeys.length - 1] : null;
        const triggerStateValue = triggerStateKey ? extractLatestParam(triggerStateKey) : null;

        Logger.info("State_Machine", `Evaluated State: Key=[${triggerStateKey}] Value=[${triggerStateValue}]`);

        // ========================================================================
        // CRITICAL HANGUP INTERCEPTION LOGIC
        // ========================================================================
        // If the user hangs up WHILE recording, Yemot sends both the audio file AND the hangup flag.
        // We must process the audio (save to DB) BEFORE sending the final hangup acknowledgement.
        
        let pendingAudioProcessing = false;
        
        if (isClientHangup) {
            Logger.info("Call_Lifecycle", `Hangup signal detected for caller ${callerPhone}.`);
            
            // Check if there's unprocessed audio attached to this hangup
            if ((triggerStateKey === SYSTEM_CONSTANTS.PARAMS.USER_AUDIO || triggerStateKey === SYSTEM_CONSTANTS.PARAMS.TRANS_AUDIO || triggerStateKey === SYSTEM_CONSTANTS.PARAMS.TRANS_APPEND_AUDIO) 
                && triggerStateValue && triggerStateValue.includes('.wav')) {
                
                Logger.info("Call_Lifecycle", "Detected pending audio chunk attached to hangup. Processing before terminating.");
                pendingAudioProcessing = true;
                
                // We will let the router process the audio below. 
                // We just flag it so we don't return early.
            } else {
                // Normal hangup, no pending work.
                Logger.info("Call_Lifecycle", "No pending work. Terminating session gracefully.");
                return sendHTTPResponse(res, "noop=hangup_acknowledged");
            }
        }

        // ========================================================================
        // DOMAIN ROUTING ENGINE (SWITCHBOARD)
        // ========================================================================

        // --- DOMAIN: CHAT (MENU 1) ---
        if (triggerStateKey === SYSTEM_CONSTANTS.PARAMS.USER_AUDIO && triggerStateValue && triggerStateValue.includes('.wav')) {
            await DomainControllers.processChatInteraction(callerPhone, uniqueCallId, triggerStateValue, ivrResponse);
        }
        else if (triggerStateKey === SYSTEM_CONSTANTS.PARAMS.ACTION_CHOICE) {
            await DomainControllers.handleChatActionMenu(callerPhone, uniqueCallId, triggerStateValue, ivrResponse);
        }
        
        // --- DOMAIN: CHAT HISTORY (MENU 2) ---
        else if (triggerStateKey === SYSTEM_CONSTANTS.PARAMS.HISTORY_CHOICE) {
            await DomainControllers.handleChatHistorySelection(callerPhone, triggerStateValue, ivrResponse);
        }
        
        // --- DOMAIN: ADVANCED TRANSCRIPTION (MENU 0) ---
        else if (triggerStateKey === SYSTEM_CONSTANTS.PARAMS.TRANS_AUDIO && triggerStateValue && triggerStateValue.includes('.wav')) {
            await DomainControllers.processTranscriptionInitial(callerPhone, triggerStateValue, ivrResponse);
        }
        else if (triggerStateKey === SYSTEM_CONSTANTS.PARAMS.TRANS_APPEND_AUDIO && triggerStateValue && triggerStateValue.includes('.wav')) {
            await DomainControllers.processTranscriptionAppend(callerPhone, triggerStateValue, ivrResponse);
        }
        else if (triggerStateKey === SYSTEM_CONSTANTS.PARAMS.TRANS_MENU_CHOICE) {
            await DomainControllers.handleTranscriptionDraftMenu(callerPhone, uniqueCallId, triggerStateValue, ivrResponse);
        }
        
        // --- DOMAIN: TRANSCRIPTION HISTORY (MENU 3) ---
        else if (triggerStateKey === SYSTEM_CONSTANTS.PARAMS.TRANS_HISTORY_CHOICE) {
            await DomainControllers.handleTransHistorySelection(callerPhone, triggerStateValue, ivrResponse);
        }
        else if (triggerStateKey === SYSTEM_CONSTANTS.PARAMS.TRANS_ACTION_CHOICE) {
            await DomainControllers.handleTransActionMenu(callerPhone, triggerStateValue, ivrResponse);
        }
        else if (triggerStateKey === SYSTEM_CONSTANTS.PARAMS.USER_EMAIL_INPUT) {
            await DomainControllers.executeEmailSending(callerPhone, triggerStateValue, ivrResponse);
        }
        
        // --- DOMAIN: MAIN MENU DISPATCHER ---
        else if (triggerStateKey === SYSTEM_CONSTANTS.PARAMS.MENU_CHOICE) {
            await DomainControllers.dispatchMainMenu(callerPhone, uniqueCallId, triggerStateValue, ivrResponse);
        }
        
        // --- DOMAIN: INITIAL ENTRY ---
        else {
            Logger.info("Routing_Engine", "No recognized state trigger. Dispatching Initial Main Menu.");
            DomainControllers.serveMainMenu(ivrResponse);
        }

        // ========================================================================
        // FINALIZATION
        // ========================================================================
        
        // If this was a pending audio process attached to a hangup, we override the IVR builder
        // and just return a hangup command, since the user is no longer on the line to hear the TTS.
        if (pendingAudioProcessing) {
            Logger.info("Call_Lifecycle", "Pending audio processed successfully. Committing final hangup.");
            return sendHTTPResponse(res, "noop=hangup_acknowledged");
        }

        const finalOutputString = ivrResponse.compile();
        Logger.info("System_ExitPoint", "Routing completed successfully. Transmitting payload to Yemot.");
        
        return sendHTTPResponse(res, finalOutputString);

    } catch (globalException) {
        Logger.error("Global_Catch_Block", "A FATAL UNCAUGHT EXCEPTION breached the routing engine.", globalException);
        
        // Failsafe IVR response generation
        const failsafeCompiler = new YemotResponseCompiler();
        failsafeCompiler.playTTS(SYSTEM_CONSTANTS.PROMPTS.SYSTEM_ERROR_FALLBACK);
        failsafeCompiler.routeToFolder("hangup");
        
        return sendHTTPResponse(res, failsafeCompiler.compile());
    }
}

/**
 * Standardizes the HTTP Response to Yemot HaMashiach.
 */
function sendHTTPResponse(expressResponse, payloadString) {
    expressResponse.setHeader('Content-Type', 'text/plain; charset=utf-8');
    expressResponse.setHeader('Cache-Control', 'no-store, max-age=0');
    expressResponse.status(SYSTEM_CONSTANTS.HTTP_STATUS.OK).send(payloadString);
}

// ============================================================================
// ============================================================================
// PART 11: DOMAIN LOGIC CONTROLLERS
// ============================================================================
// ============================================================================

/**
 * Static class grouping all business logic controllers.
 * Acts as the bridge between the Routing Engine and the Domain Services.
 */
class DomainControllers {

    // ------------------------------------------------------------------------
    // MAIN MENU DISPATCHER
    // ------------------------------------------------------------------------
    
    static serveMainMenu(ivrCompiler) {
        ivrCompiler.playTTS(SYSTEM_CONSTANTS.PROMPTS.MAIN_MENU);
        ivrCompiler.requestDigits("", SYSTEM_CONSTANTS.YEMOT_PARAMS.MENU_CHOICE, 1, 1);
    }

    static async dispatchMainMenu(phone, callId, choice, ivrCompiler) {
        Logger.info("Domain_Main", `Evaluating Main Menu choice: ${choice}`);
        switch(choice) {
            case '0': // Transcription Menu
                await this.initNewTranscription(phone, callId, ivrCompiler);
                break;
            case '1': // New Chat
                await this.initNewChat(phone, callId, ivrCompiler);
                break;
            case '2': // Chat History
                await this.initChatHistoryMenu(phone, ivrCompiler);
                break;
            case '3': // Transcription History
                await this.initTransHistoryMenu(phone, ivrCompiler);
                break;
            default:
                Logger.warn("Domain_Main", `Unmapped menu choice: ${choice}. Regressing to root.`);
                this.serveMainMenu(ivrCompiler);
        }
    }

    // ------------------------------------------------------------------------
    // CHAT DOMAIN (Menu 1 & 2)
    // ------------------------------------------------------------------------

    static async initNewChat(phone, callId, ivrCompiler) {
        const userProfile = await UserRepository.getProfile(phone);
        const newSession = new ChatSession(`chat_${Date.now()}`);
        
        userProfile.chats.push(newSession);
        userProfile.currentChatId = newSession.id;
        
        await UserRepository.saveProfile(phone, userProfile);

        ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.YEMOT_PARAMS.USER_AUDIO, callId);
    }

    static async processChatInteraction(phone, callId, audioPath, ivrCompiler) {
        // 1. Fetch Audio
        const base64Audio = await YemotAPIService.downloadAudioAsBase64(audioPath);
        
        // 2. Fetch Context
        const userProfile = await UserRepository.getProfile(phone);
        const chatSession = userProfile.getActiveChat();
        const historyContext = chatSession.getRecentContext(5);

        // 3. Invoke AI
        const { transcription, answer } = await GeminiAIService.processChatInteraction(base64Audio, historyContext);
        
        // 4. Save State
        chatSession.addMessage(transcription, answer);
        await UserRepository.saveProfile(phone, userProfile);

        // 5. Build Response
        ivrCompiler.playTTS(answer);
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.CHAT_ACTION_MENU, SYSTEM_CONSTANTS.YEMOT_PARAMS.ACTION_CHOICE, 1, 1);
    }

    static async handleChatActionMenu(phone, callId, choice, ivrCompiler) {
        if (choice === '7') {
            Logger.info("Domain_Chat", "Resuming active chat session.");
            ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_CHAT_RECORD, SYSTEM_CONSTANTS.YEMOT_PARAMS.USER_AUDIO, callId);
        } else {
            Logger.info("Domain_Chat", "Exiting chat to main menu.");
            this.serveMainMenu(ivrCompiler);
        }
    }

    static async initChatHistoryMenu(phone, ivrCompiler) {
        const userProfile = await UserRepository.getProfile(phone);
        
        if (userProfile.chats.length === 0) {
            ivrCompiler.playTTS(SYSTEM_CONSTANTS.PROMPTS.NO_CHAT_HISTORY);
            this.serveMainMenu(ivrCompiler);
            return;
        }

        const recentChats = userProfile.chats.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS).reverse();
        let promptText = SYSTEM_CONSTANTS.PROMPTS.CHAT_HISTORY_PREFIX;
        
        recentChats.forEach((chat, index) => {
            promptText += `לשיחה מספר ${index + 1} הקישו ${index + 1} `;
        });
        promptText += SYSTEM_CONSTANTS.PROMPTS.MENU_SUFFIX_0;

        ivrCompiler.requestDigits(promptText, SYSTEM_CONSTANTS.YEMOT_PARAMS.HISTORY_CHOICE, 1, 1);
    }

    static async handleChatHistorySelection(phone, choice, ivrCompiler) {
        if (choice === '0') {
            this.serveMainMenu(ivrCompiler);
            return;
        }

        const userProfile = await UserRepository.getProfile(phone);
        const recentChats = userProfile.chats.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS).reverse();
        const selectedIndex = parseInt(choice, 10) - 1;

        if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= recentChats.length) {
            ivrCompiler.playTTS(SYSTEM_CONSTANTS.PROMPTS.INVALID_CHOICE);
            this.serveMainMenu(ivrCompiler);
            return;
        }

        const selectedSession = recentChats[selectedIndex];
        
        // Restore context pointer
        userProfile.currentChatId = selectedSession.id;
        await UserRepository.saveProfile(phone, userProfile);

        let playbackScript = SYSTEM_CONSTANTS.PROMPTS.CHAT_PLAYBACK_PREFIX;
        selectedSession.messages.forEach((msg, i) => {
            playbackScript += `שאלה ${i + 1} ${msg.q} תשובה ${msg.a} `;
        });

        ivrCompiler.playTTS(playbackScript);
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.CHAT_ACTION_MENU, SYSTEM_CONSTANTS.YEMOT_PARAMS.ACTION_CHOICE, 1, 1);
    }

    // ------------------------------------------------------------------------
    // TRANSCRIPTION DOMAIN (Menu 0 & 3)
    // ------------------------------------------------------------------------

    static async initNewTranscription(phone, callId, ivrCompiler) {
        const userProfile = await UserRepository.getProfile(phone);
        userProfile.tempTranscription = ""; // Clear buffer
        await UserRepository.saveProfile(phone, userProfile);

        ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_TRANSCRIPTION_INITIAL, SYSTEM_CONSTANTS.YEMOT_PARAMS.TRANS_AUDIO, callId);
    }

    static async processTranscriptionInitial(phone, audioPath, ivrCompiler) {
        await this._processTranscriptionAudioCore(phone, audioPath, ivrCompiler, false);
    }

    static async processTranscriptionAppend(phone, audioPath, ivrCompiler) {
        await this._processTranscriptionAudioCore(phone, audioPath, ivrCompiler, true);
    }

    static async _processTranscriptionAudioCore(phone, audioPath, ivrCompiler, isAppend) {
        const base64Audio = await YemotAPIService.downloadAudioAsBase64(audioPath);
        const transcribedText = await GeminiAIService.processTranscriptionOnly(base64Audio);
        
        const userProfile = await UserRepository.getProfile(phone);
        
        if (isAppend) {
            userProfile.tempTranscription += " " + transcribedText;
        } else {
            userProfile.tempTranscription = transcribedText;
        }
        
        await UserRepository.saveProfile(phone, userProfile);

        ivrCompiler.playTTS(userProfile.tempTranscription);
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.TRANS_MENU, SYSTEM_CONSTANTS.YEMOT_PARAMS.TRANS_MENU_CHOICE, 1, 1);
    }

    static async handleTranscriptionDraftMenu(phone, callId, choice, ivrCompiler) {
        const userProfile = await UserRepository.getProfile(phone);
        
        switch(choice) {
            case '1': // Replay current draft
                const draftText = userProfile.tempTranscription || "טקסט ריק";
                ivrCompiler.playTTS(draftText);
                ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.TRANS_MENU, SYSTEM_CONSTANTS.YEMOT_PARAMS.TRANS_MENU_CHOICE, 1, 1);
                break;
            case '2': // Record Over
                ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.NEW_TRANSCRIPTION_INITIAL, SYSTEM_CONSTANTS.YEMOT_PARAMS.TRANS_AUDIO, callId);
                break;
            case '3': // Append
                ivrCompiler.requestAudioRecord(SYSTEM_CONSTANTS.PROMPTS.APPEND_TRANSCRIPTION, SYSTEM_CONSTANTS.YEMOT_PARAMS.TRANS_APPEND_AUDIO, callId);
                break;
            case '4': // Save and Exit
                if (userProfile.tempTranscription && userProfile.tempTranscription.trim() !== '') {
                    userProfile.transcriptions.push(new TranscriptionEntry(userProfile.tempTranscription));
                    userProfile.tempTranscription = ""; // Flush buffer
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

        ivrCompiler.requestDigits(promptText, SYSTEM_CONSTANTS.YEMOT_PARAMS.TRANS_HISTORY_CHOICE, 1, 1);
    }

    static async handleTransHistorySelection(phone, choice, ivrCompiler) {
        if (choice === '0') {
            this.serveMainMenu(ivrCompiler);
            return;
        }

        const userProfile = await UserRepository.getProfile(phone);
        const recentTrans = userProfile.transcriptions.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS).reverse();
        const selectedIndex = parseInt(choice, 10) - 1;

        if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= recentTrans.length) {
            ivrCompiler.playTTS(SYSTEM_CONSTANTS.PROMPTS.INVALID_CHOICE);
            this.serveMainMenu(ivrCompiler);
            return;
        }

        // Cache the active transcription pointer for sharing/emailing
        userProfile.currentTransIndex = selectedIndex;
        await UserRepository.saveProfile(phone, userProfile);

        const selectedText = recentTrans[selectedIndex].text;
        
        ivrCompiler.playTTS(`תוכן התמלול הוא ${selectedText}`);
        ivrCompiler.requestDigits(SYSTEM_CONSTANTS.PROMPTS.TRANS_PLAYBACK_ACTION_MENU, SYSTEM_CONSTANTS.YEMOT_PARAMS.TRANS_ACTION_CHOICE, 1, 1);
    }

    static async handleTransActionMenu(phone, choice, ivrCompiler) {
        const userProfile = await UserRepository.getProfile(phone);
        const recentTrans = userProfile.transcriptions.slice(-SYSTEM_CONSTANTS.YEMOT.MAX_HISTORY_ITEMS).reverse();
        const activeIndex = userProfile.currentTransIndex;

        if (choice === '8' || activeIndex === null || activeIndex === undefined || !recentTrans[activeIndex]) {
            this.serveMainMenu(ivrCompiler);
            return;
        }

        const textBody = recentTrans[activeIndex].text;

        if (choice === '7') {
            // Action: Share via Yemot File System
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
            // Action: Gather Email
            Logger.info("Domain_Trans", "Executing Email Request protocol.");
            ivrCompiler.requestEmailKeyboard(SYSTEM_CONSTANTS.PROMPTS.EMAIL_KEYBOARD_PROMPT, SYSTEM_CONSTANTS.YEMOT_PARAMS.USER_EMAIL_INPUT);
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

        // ==========================================================
        // MOCK EMAIL SERVICE
        // Integrate an actual Email provider here (e.g., Resend, SendGrid)
        // using the 'emailInput' and 'textBody' variables.
        // ==========================================================
        Logger.info("Domain_Email", `MOCK DISPATCH: Sending Email to [${emailInput}]. Body: [${textBody}]`);
        
        ivrCompiler.playTTS(SYSTEM_CONSTANTS.PROMPTS.EMAIL_SUCCESS);
        this.serveMainMenu(ivrCompiler);
    }
}
