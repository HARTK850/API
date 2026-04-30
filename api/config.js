export const SYSTEM_CONSTANTS = {
    MODELS: {
        PRIMARY_GEMINI_MODEL: "gemini-3.1-flash-lite-preview",
        JSON_MIME_TYPE: "application/json"
    },
    PROMPTS: {
        MAIN_MENU: "t-לשיחת צ'אט הקישו 1. להיסטוריית שיחות הקישו 2. למידע על המערכת הקישו 0. לתפריט הגדרות הקישו כוכבית.",
        INFO_MENU: "t-לשמיעת נתוני המערכת הקישו 9. לחזרה הקישו 0.",
        NO_HISTORY: "t-אין לכם היסטוריית שיחות. הנכם מועברים לשיחה חדשה.",
        HISTORY_MENU_PREFIX: "t-תפריט היסטוריית שיחות.",
        SHARED_HISTORY_PREFIX: "t-תפריט שיחות משותפות.",
        MENU_SUFFIX_0: "t-לחזרה לתפריט הראשי הקישו 0.",
        INVALID_CHOICE: "t-הבחירה שגויה, אנא נסו שוב.",
        CHAT_ACTION_MENU: "t-להמשך השיחה הנוכחית הקישו 7. לחזרה לתפריט הראשי הקישו 8.",
        CHAT_PAGINATION_MENU: "t-לשמיעת המשך התשובה הקישו 9. לחלק הקודם הקישו 8. לחזרה הקישו 0.",
        HISTORY_ITEM_MENU: "t-לשמיעת השיחה הקישו 1. לשינוי שם הקישו 2. למחיקה הקישו 3. לנעיצה הקישו 4. לשיתוף השיחה הקישו 5. לחזרה הקישו 0.",
        SHARE_MENU: "t-לשיתוף השיחה עם מספרי פלאפון הקישו 1. לשיתוף השיחה עם קוד שיחה פומבי הקישו 2. לחזרה הקישו 0.",
        SHARE_PHONES_INPUT: "t-אנא הקישו את מספרי הפלאפון. בין מספר למספר הקישו כוכבית. בסיום הקישו סולמית.",
        SHARE_PHONES_CONFIRM: "t-לאישור ושיתוף השיחה הקישו 1. להקשה מחדש הקישו 2. לביטול וחזרה הקישו 0.",
        SHARE_CODE_IMPORT: "t-אנא הקישו את קוד השיחה שקיבלתם בן 5 ספרות, ובסיום סולמית.",
        DELETE_CONFIRM_MENU: "t-לאישור המחיקה הקישו 1. לביטול הקישו 0.",
        RENAME_PROMPT: "t-אנא הקלידו את השם החדש. בסיום הקישו סולמית.",
        ACTION_SUCCESS: "t-הפעולה בוצעה בהצלחה.",
        ADMIN_AUTH: "t-אנא הקישו את סיסמת הניהול ובסיום סולמית.",
        ADMIN_MENU: "t-תפריט ניהול. לנתוני מערכת הקישו 1. לניהול משתמש ספציפי הקישו 2. לרשימת כל המשתמשים הקישו 3. לסטטוס מפתחות אי פי איי הקישו 4. לחזרה הקישו 0.",
        ADMIN_USER_PROMPT: "t-אנא הקישו את מספר הטלפון של המשתמש ובסיום סולמית.",
        ADMIN_USER_ACTION: "t-לחסימה לצמיתות הקישו 1. לשחרור מחסימה הקישו 2. למחיקת הנתונים הקישו 3. לחזרה הקישו 0.",
        USER_BLOCKED: "t-מספר הטלפון שלך נחסם. שלום ותודה.",
        ADMIN_LIST_MENU: "t-לניהול המספר הקישו 1. למעבר למספר הבא הקישו 2. לחיוג חינם למספר הקישו 3. לחזרה הקישו 0.",
        ADMIN_LIST_END: "t-סוף רשימת המשתמשים.",
        SYSTEM_ERROR_FALLBACK: "t-אירעה שגיאה בלתי צפויה. נסו שוב.",
        AI_API_ERROR: "t-המערכת עמוסה כעת. אנא נסו שוב מאוחר יותר.",
        BAD_AUDIO: "t-לא הצלחתי לשמוע ברור. נסו שוב.",
        PREVIOUS_QUESTION_PREFIX: "שאלה קודמת:",
        PREVIOUS_ANSWER_PREFIX: "תשובה קודמת:",
        GAME_START: "t-ברוכים הבאים למשחק שיצרתי עבורכם! נתחיל בשאלה הראשונה.", 
        GAME_QUESTION: "t-השאלה היא: ", 
        GAME_ANS_PREFIX: "t-אפשרות ", 
        GAME_PROMPT_DIGIT: "t-אנא הקישו את מספר התשובה הנכונה כעת.", 
        GAME_CLOCK: "t-ממתין לתשובתכם...", 
        GAME_CORRECT: "t-תשובה נכונה! כל הכבוד.", 
        GAME_WRONG: "t-טעות. לא נורא, נמשיך הלאה.", 
        GAME_GET_POINT: "t-קיבלת ", 
        GAME_POINT_WORD: "t-נקודות.", 
        GAME_NEXT_Q: "t-עוברים לשאלה הבאה.", 
        GAME_END_SCORE: "t-המשחק הסתיים! סך הניקוד שצברתם הוא ", 
        GAME_AWESOME: "t-כל הכבוד לכם!", 
        SETTINGS_MENU: "t-תפריט הגדרות. להגדרת רמת פירוט הקישו 1. להקלטת הנחיות קבועות הקישו 2. להקלטת פרופיל אישי הקישו 3. לחזרה הקישו 0.",
        SETTINGS_DETAIL: "t-אנא הקישו את רמת פירוט התשובה מ-1 עד 10, בסיום הקישו סולמית.",
        SETTINGS_EXISTING_PROMPT: "t-המערכת זיהתה שקיים מידע שמור. להחלפת המידע הקישו 1. להוספת מידע הקישו 2. למחיקה הקישו 3. לחזרה הקישו 0.",
        SETTINGS_INSTRUCTIONS_RECORD: "t-אנא הקליטו הנחיות לפיהן תפעל המערכת. בסיום הקישו סולמית.",
        SETTINGS_PROFILE_RECORD: "t-אנא הקליטו פרטים על עצמכם. בסיום הקישו סולמית.",
        SETTINGS_PROCESSING: "t-מעבד את ההקלטה, אנא המתינו...",
        SETTINGS_CONFIRM_PREFIX: "הטקסט שזוהה הוא: ",
        SETTINGS_CONFIRM_MENU: "לאישור הקישו 1. להקלטה מחדש הקישו 2. לביטול הקישו 0.",
        SETTINGS_DELETED: "t-המידע נמחק בהצלחה.",
        GEMINI_SYSTEM_INSTRUCTION: `[זהות ליבה]:
שמך הוא "עויזר צ'אט". פותחת על ידי "מייבין במקצת" ו-"אריה AI" מ"פורום מתמחים טופ".
*חוק ברזל:* אל תציין את השם שלך או את המפתחים שלך ביוזמתך! הזכר זאת *אך ורק* אם המשתמש שואל אותך מפורשות "מי אתה", או "מי פיתח אותך".
האזן לאודיו, וענה ישירות לעניין. השתמש בסימני פיסוק. אל תשתמש בכוכביות (*), קווים מפרידים (-) או אמוג'י. כתוב מספרים במילים בלבד בעברית.[יכולות מתקדמות]:
יש לך גישה לכלי (Tool) בשם "query_long_term_memory". אל תמציא מידע על העבר! אם משתמש שואל על משהו מהשיחה הקודמת, קרא לפונקציה הזו עם מילות חיפוש מתאימות.[יצירת משחקים וחידונים]:
אם המשתמש מבקש חידון, מבחן או משחק - חובה עליך להחזיר בשדה "action" את הערך "play_game". 
עליך לייצר אובייקט "game" ב-JSON הכולל מערך "questions". כל שאלה תכיל: "q" (השאלה), "options" (מערך תשובות), "correct_index" (מספר התשובה הנכונה, מתחיל ב-1). 
בשדה "answer" תן רק פתיח קצר ומשמח למשחק.

[לוח מודעות קהילתי]:
- לפרסום מודעה: אם המשתמש מבקש להעלות מודעה, החזר בשדה action "post_notice" ובשדה "notice_text" את המודעה.
- חיוג למפרסם: אם אתה מקריא מודעה ויש בה טלפון, חובה להוסיף לשדה "notice_phone_context" את המספר.

החזר JSON תקני בלבד:
{
  "transcription": "...", "answer": "...", "action": "none / hangup / go_to_main_menu / play_game / post_notice",
  "notice_text": "...", "notice_phone_context": "...", "update_profile": "...", "summary": "...", "game": {...}
}`
    },
    STATE_BASES: {
        MAIN_MENU_CHOICE: 'St_MainMenu', INFO_MENU_CHOICE: 'St_InfoMenu',
        CHAT_USER_AUDIO: 'St_ChatAudio', CHAT_HISTORY_CHOICE: 'St_ChatHist',
        CHAT_ACTION_CHOICE: 'St_ChatAction', PAGINATION_CHOICE: 'St_Pag',
        HISTORY_ITEM_ACTION: 'St_HistItem', HISTORY_RENAME_INPUT: 'St_HistRen',
        HISTORY_DELETE_CONFIRM: 'St_HistDel', HISTORY_SHARE_METHOD: 'St_ShrMeth',
        HISTORY_SHARE_PHONES_INPUT: 'St_ShrPhIn', HISTORY_SHARE_PHONES_CONFIRM: 'St_ShrPhConf',
        SHARED_CHATS_MENU: 'St_ShrChats', SHARED_IMPORT_CODE: 'St_ShrCode',
        ADMIN_AUTH: 'St_AdmAuth', ADMIN_MENU: 'St_AdmMenu', ADMIN_USER_INPUT: 'St_AdmUsrIn',
        ADMIN_USER_CONFIRM: 'St_AdmUsrConf', ADMIN_LIST_USERS: 'St_AdmList', ADMIN_USER_ACTION: 'St_AdmAct',
        SETTINGS_MENU_CHOICE: 'St_SetMenu', SETTINGS_DETAIL_INPUT: 'St_SetDet',
        SETTINGS_INSTRUCTIONS_CHECK: 'St_SetInstChk', SETTINGS_INSTRUCTIONS_AUDIO: 'St_SetInstAud',
        SETTINGS_INSTRUCTIONS_CONFIRM: 'St_SetInstCnf', SETTINGS_PROFILE_CHECK: 'St_SetPrfChk',
        SETTINGS_PROFILE_AUDIO: 'St_SetPrfAud', SETTINGS_PROFILE_CONFIRM: 'St_SetPrfCnf',
        GAME_ANSWER_INPUT: 'St_GameAns', NOTICE_PHONE_INPUT: 'St_NotPhIn', NOTICE_PHONE_CONFIRM: 'St_NotPhCnf'
    }
};

export class AppConfig {
    static get geminiKeys() { return (process.env.GEMINI_KEYS || '').split(',').map(k => k.trim()).filter(k => k.length > 20); }
    static get yemotToken() { return process.env.CALL2ALL_TOKEN || ''; }
    static get adminPassword() { return process.env.ADMIN_PASSWORD || '15761576'; }
    static get adminBypassPhone() { return '0527673579'; }
    static get upstashRedisRestUrl() { return process.env.UPSTASH_REDIS_REST_URL || ''; }
    static get upstashRedisRestToken() { return process.env.UPSTASH_REDIS_REST_TOKEN || ''; }
}
