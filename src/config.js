export const SYSTEM_CONSTANTS = {
    MODELS: {
        PRIMARY_GEMINI_MODEL: "gemini-3.1-flash-lite-preview", 
        JSON_MIME_TYPE: "application/json",
        AUDIO_MIME_TYPE: "audio/wav"
    },
    YEMOT_PATHS: { RECORDINGS_DIR: "/ApiRecords" },
    HTTP_STATUS: { OK: 200, INTERNAL_SERVER_ERROR: 500 },
    IVR_DEFAULTS: {
        STANDARD_TIMEOUT: "7",
        RECORD_MIN_SEC: "1", RECORD_MAX_SEC: "120",
        MAX_CHUNK_LENGTH: 850 
    },
    PROMPTS: {
        MAIN_MENU: "f-main_menu",
        INFO_MENU: "t-לשמיעת נתוני המערכת הקישו 9. לחזרה הקישו 0.",
        NEW_CHAT_RECORD: "f-Recorded",
        NO_HISTORY: "f-No_history",
        HISTORY_MENU_PREFIX: "t-תפריט היסטוריית שיחות.",
        SHARED_HISTORY_PREFIX: "t-תפריט שיחות משותפות.",
        MENU_SUFFIX_0: "f-return",
        INVALID_CHOICE: "f-Wrong",
        CHAT_ACTION_MENU: "f-Chat_menu",
        CHAT_PAGINATION_MENU: "f-Full_chat_menu",
        HISTORY_ITEM_MENU: "t-לשמיעת השיחה הקישו 1. לשינוי שם הקישו 2. למחיקה הקישו 3. לנעיצה הקישו 4. לשיתוף השיחה הקישו 5. לחזרה הקישו 0.",
        SHARE_MENU: "t-לשיתוף השיחה עם מספרי פלאפון מסוימים הקישו 1. לשיתוף השיחה עם קוד שיחה פומבי הקישו 2. לחזרה הקישו 0.",
        SHARE_PHONES_INPUT: "t-אנא הקישו את מספרי הפלאפון. בין מספר למספר הקישו כוכבית. בסיום כל המספרים הקישו סולמית.",
        SHARE_PHONES_CONFIRM: "t-לאישור ושיתוף השיחה הקישו 1. להקשה מחדש הקישו 2. לביטול וחזרה הקישו 0.",
        SHARE_CODE_IMPORT: "t-אנא הקישו את קוד השיחה שקיבלתם בן 5 ספרות, ובסיום סולמית.",
        DELETE_CONFIRM_MENU: "f-delete_confirm_menu",
        RENAME_PROMPT: "t-אנא הקלידו את השם החדש באמצעות המקלדת, בסיום הקישו סולמית.",
        ACTION_SUCCESS: "t-הפעולה בוצעה בהצלחה.",
        ADMIN_AUTH: "t-אנא הקישו את סיסמת הניהול ובסיום סולמית.",
        ADMIN_MENU: "t-תפריט ניהול. לנתוני מערכת הקישו 1. לניהול משתמש ספציפי הקישו 2. לרשימת כל המשתמשים הקישו 3. לסטטוס מפתחות אי פי איי הקישו 4. לחזרה הקישו 0.",
        ADMIN_USER_PROMPT: "t-אנא הקישו את מספר הטלפון של המשתמש ובסיום סולמית.",
        ADMIN_USER_ACTION: "t-לניהול המשתמש: לחסימה לצמיתות הקישו 1. לשחרור מחסימה הקישו 2. למחיקת כל נתוני המשתמש הקישו 3. לחזרה הקישו 0.",
        USER_BLOCKED: "t-מספר הטלפון שלך נחסם משימוש במערכת זו. שלום ותודה.",
        ADMIN_LIST_MENU: "t-לניהול המספר הקישו 1. למעבר למספר הבא הקישו 2. לחיוג חינם למספר הקישו 3. לחזרה לתפריט הניהול הקישו 0.",
        ADMIN_LIST_END: "t-סוף רשימת המשתמשים.",
        SYSTEM_ERROR_FALLBACK: "t-אירעה שגיאה בלתי צפויה, אך ננסה להמשיך. אנא נסו שוב.",
        AI_API_ERROR: "t-אירעה שגיאה בחיבור למנוע הבינה המלאכותית. אנא נסו שוב מאוחר יותר.",
        BAD_AUDIO: "t-לא הצלחתי לשמוע אתכם בבירור. אנא הקפידו לדבר בקול רם ונסו שוב.",
        PREVIOUS_QUESTION_PREFIX: "שאלה קודמת:",
        PREVIOUS_ANSWER_PREFIX: "תשובה קודמת:",
        GAME_START: "t-ברוכים הבאים למשחק שיצרתי עבורכם. נתחיל בשאלה הראשונה.", 
        GAME_QUESTION: "t-השאלה היא.", 
        GAME_ANS_PREFIX: "t-אפשרות.", 
        GAME_PROMPT_DIGIT: "t-אנא הקישו את מספר התשובה הנכונה כעת.", 
        GAME_CLOCK: "m-1209", 
        GAME_CORRECT: "m-1200", 
        GAME_WRONG: "m-1210", 
        GAME_GET_POINT: "m-1017", 
        GAME_POINT_WORD: "m-1014", 
        GAME_NEXT_Q: "m-1206", 
        GAME_END_SCORE: "m-1229", 
        GAME_AWESOME: "m-1230",
        SETTINGS_MENU: "t-תפריט הגדרות אישיות. להגדרת רמת פירוט התשובה הקישו 1. להקלטת הנחיות מערכת קבועות הקישו 2. להקלטת פרופיל אישי והעדפות הקישו 3. לחזרה לתפריט הראשי הקישו 0.",
        SETTINGS_DETAIL: "t-אנא הקישו את רמת פירוט התשובה מ-1 עד 10, כאשר 1 זה תשובות קצרות מאוד ו-10 זה תשובות ארוכות ומפורטות מאוד. בסיום הקישו סולמית.",
        SETTINGS_EXISTING_PROMPT: "t-המערכת זיהתה שקיים מידע שמור. להחלפת המידע הקישו 1. להוספת מידע על הקיים הקישו 2. למחיקת המידע הקישו 3. לחזרה לתפריט ההגדרות הקישו 0.",
        SETTINGS_INSTRUCTIONS_RECORD: "t-אנא הקליטו הנחיות שתרצו שהבינה המלאכותית תפעל לפיהן תמיד. בסיום ההקלטה הקישו סולמית.",
        SETTINGS_PROFILE_RECORD: "t-אנא הקליטו פרטים על עצמכם, מה אתם אוהבים, ותחביבים. בסיום הקישו סולמית.",
        SETTINGS_PROCESSING: "t-מעבד את ההקלטה, אנא המתינו...",
        SETTINGS_CONFIRM_PREFIX: "הטקסט שזוהה הוא: ",
        SETTINGS_CONFIRM_MENU: "לאישור ושמירה הקישו 1. להקלטה מחדש הקישו 2. לביטול הקישו 0.",
        SETTINGS_DELETED: "t-המידע נמחק בהצלחה.",
        GEMINI_SYSTEM_INSTRUCTION_CHAT: `[זהות ליבה]:
שמך הוא "עויזר צ'אט". אל תציין את השם שלך או את המפתחים שלך ביוזמתך! הזכר זאת אך ורק אם המשתמש שואל מפורשות. בשיחה רגילה פשוט עזור למשתמש.
[הוראות תשובה]:
ענה ישירות לעניין. אל תשתמש בכוכביות (*), סולמיות (#) או תווים מיוחדים.[כלים ויכולות]:
לניתוק השיחה: "action": "hangup"
למעבר לתפריט: "action": "go_to_main_menu"
[משחקים]: למשחק: "action": "play_game" וייצר אובייקט "game".
[לוח מודעות]: לפרסום מודעה: "action": "post_notice".
החזר אך ורק אובייקט JSON תקני בהתאם לשדות שנתבקשת.`
    },
    STATE_BASES: {
        MAIN_MENU_CHOICE: 'State_MainMenuChoice',
        INFO_MENU_CHOICE: 'State_InfoMenuChoice',
        CHAT_USER_AUDIO: 'State_ChatUserAudio',
        CHAT_HISTORY_CHOICE: 'State_ChatHistoryChoice',
        CHAT_ACTION_CHOICE: 'State_ChatActionChoice',
        PAGINATION_CHOICE: 'State_PaginationChoice',
        HISTORY_ITEM_ACTION: 'State_HistoryItemAction',
        HISTORY_RENAME_INPUT: 'State_HistoryRenameInput',
        HISTORY_DELETE_CONFIRM: 'State_HistoryDeleteConfirm',
        HISTORY_SHARE_METHOD: 'State_HistShareMethod',
        HISTORY_SHARE_PHONES_INPUT: 'State_HistSharePhonesInput',
        HISTORY_SHARE_PHONES_CONFIRM: 'State_HistSharePhonesConfirm',
        SHARED_CHATS_MENU: 'State_SharedChatsMenu',
        SHARED_IMPORT_CODE: 'State_SharedImportCode',
        ADMIN_AUTH: 'State_AdminAuth',
        ADMIN_MENU: 'State_AdminMenu',
        ADMIN_USER_INPUT: 'State_AdminUserInput',
        ADMIN_USER_CONFIRM: 'State_AdminUserConfirm', 
        ADMIN_LIST_USERS: 'State_AdminListUsers',     
        ADMIN_USER_ACTION: 'State_AdminUserAction',
        ADMIN_KEYS_MENU: 'State_AdminKeysMenu',
        SETTINGS_MENU_CHOICE: 'State_SettingsMenuChoice',
        SETTINGS_DETAIL_INPUT: 'State_SettingsDetailInput',
        SETTINGS_INSTRUCTIONS_CHECK: 'State_SetInstCheck',
        SETTINGS_INSTRUCTIONS_AUDIO: 'State_SetInstAudio',
        SETTINGS_INSTRUCTIONS_CONFIRM: 'State_SetInstConfirm',
        SETTINGS_PROFILE_CHECK: 'State_SetProfCheck',
        SETTINGS_PROFILE_AUDIO: 'State_SetProfAudio',
        SETTINGS_PROFILE_CONFIRM: 'State_SetProfConfirm',
        GAME_ANSWER_INPUT: 'State_GameAnsInput',
        NOTICE_PHONE_INPUT: 'State_NoticePhoneInput',
        NOTICE_PHONE_CONFIRM: 'State_NoticePhoneConfirm'
    },
    YEMOT_PARAMS: {
        PHONE: 'ApiPhone', ENTER_ID: 'ApiEnterID',
        CALL_ID: 'ApiCallId', HANGUP: 'hangup',
        DATE: 'Date', TIME: 'Time', HEBREW_DATE: 'HebrewDate'
    }
};

class ConfigManager {
    constructor() {
        if (ConfigManager.instance) return ConfigManager.instance;
        this.geminiKeys =[];
        this.yemotToken = process.env.CALL2ALL_TOKEN || '';
        this.adminPassword = process.env.ADMIN_PASSWORD || '15761576';
        this.adminBypassPhone = '0527673579';
        
        if (process.env.GEMINI_KEYS) {
            this.geminiKeys = process.env.GEMINI_KEYS.split(',').map(k => k.trim()).filter(k => k.length > 20);
        }
        ConfigManager.instance = this;
    }
}
export const AppConfig = new ConfigManager();
