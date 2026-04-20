/**
 * @file api/index.js
 * @description מערכת IVR מבוססת ימות המשיח בשילוב בינה מלאכותית (Gemini) ומסד נתונים (Vercel Blob).
 * הקוד נכתב במבנה מונחה-עצמים (OOP) כדי להבטיח יציבות מקסימלית, קריאות, ותחזוקה קלה.
 * אין שגיאות 500 - כל שגיאה נתפסת ומוחזרת כהודעה קולית למשתמש.
 */

import { put, list } from '@vercel/blob';

// ============================================================================
// 1. מחלקת ניהול תצורה וסביבה (Config & Environment)
// ============================================================================

class Config {
    constructor() {
        this.GEMINI_KEYS = process.env.GEMINI_KEYS ? process.env.GEMINI_KEYS.split(',').map(k => k.trim()) :[];
        this.CALL2ALL_TOKEN = process.env.CALL2ALL_TOKEN || '';
        
        this.validate();
    }

    /**
     * בודק שכל משתני הסביבה הקריטיים קיימים
     */
    validate() {
        if (this.GEMINI_KEYS.length === 0) {
            console.warn("⚠️ WARNING: GEMINI_KEYS environment variable is missing or empty.");
        }
        if (!this.CALL2ALL_TOKEN) {
            console.warn("⚠️ WARNING: CALL2ALL_TOKEN environment variable is missing.");
        }
    }

    /**
     * מחזיר מפתח Gemini בצורה רנדומלית או עוקבת (Rotation)
     * @returns {string} מפתח API
     */
    getRandomGeminiKey() {
        if (this.GEMINI_KEYS.length === 0) throw new Error("No Gemini keys configured");
        const randomIndex = Math.floor(Math.random() * this.GEMINI_KEYS.length);
        return this.GEMINI_KEYS[randomIndex];
    }
}

const config = new Config();

// ============================================================================
// 2. מחלקת ניהול מסד נתונים (Vercel Blob Storage)
// ============================================================================

class StorageAPI {
    /**
     * מחלקה זו מנהלת את ההיסטוריה של המשתמשים.
     * כל משתמש נשמר בקובץ JSON תחת הנתיב users/{phone}.json
     */

    /**
     * שליפת נתוני משתמש ממסד הנתונים
     * @param {string} phone מספר הטלפון של המשתמש
     * @returns {Promise<Object>} אובייקט המשתמש
     */
    static async getUser(phone) {
        try {
            if (!phone) return this.getDefaultUser();

            const fileName = `users/${phone}.json`;
            const { blobs } = await list({ prefix: fileName });
            
            if (blobs.length === 0) {
                return this.getDefaultUser();
            }

            // משיכת הקובץ מה-URL שחזר מ-Blob
            const response = await fetch(blobs[0].url);
            if (!response.ok) {
                throw new Error(`Failed to fetch user blob: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`[StorageAPI] Error getting user ${phone}:`, error.message);
            // במקרה של שגיאה נחזיר משתמש ריק כדי למנוע קריסת המערכת
            return this.getDefaultUser();
        }
    }

    /**
     * שמירת נתוני משתמש למסד הנתונים
     * @param {string} phone מספר הטלפון
     * @param {Object} data נתונים לשמירה
     */
    static async saveUser(phone, data) {
        try {
            if (!phone) return;
            const fileName = `users/${phone}.json`;
            // addRandomSuffix: false חשוב כדי לדרוס את הקובץ הקיים ולא לייצר כפילויות
            await put(fileName, JSON.stringify(data), { 
                access: 'public', 
                addRandomSuffix: false 
            });
            console.log(`[StorageAPI] User ${phone} saved successfully.`);
        } catch (error) {
            console.error(`[StorageAPI] Error saving user ${phone}:`, error.message);
        }
    }

    /**
     * מבנה ברירת המחדל למשתמש חדש
     * @returns {Object}
     */
    static getDefaultUser() {
        return {
            chats:[],
            currentChatId: null
        };
    }
}

// ============================================================================
// 3. מחלקת ניהול קבצי שמע מול ימות המשיח (Yemot Audio Fetcher)
// ============================================================================

class YemotAPI {
    /**
     * הורדת קובץ אודיו (WAV) מהשרתים של ימות המשיח
     * @param {string} callId מזהה השיחה הייחודי
     * @returns {Promise<string>} הקובץ בפורמט Base64
     */
    static async downloadAudio(callId) {
        try {
            // לפי התיעוד: קבצי הקלטות ב-read נשמרים היכן שהגדרנו. נגדיר לשמור ב /ApiRecords/
            const filePath = `ivr2:/ApiRecords/q_${callId}.wav`;
            const url = `https://www.call2all.co.il/ym/api/DownloadFile?token=${config.CALL2ALL_TOKEN}&path=${encodeURIComponent(filePath)}`;
            
            console.log(`[YemotAPI] Fetching audio from: ${filePath}`);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Yemot API responded with status: ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            // בדיקה שבאמת קיבלנו קובץ ולא הודעת שגיאה בטקסט
            if (buffer.length < 100) {
                const textResp = buffer.toString('utf-8');
                throw new Error(`File is too small or invalid: ${textResp}`);
            }

            return buffer.toString('base64');

        } catch (error) {
            console.error(`[YemotAPI] Audio download error:`, error.message);
            throw new Error("לא הצלחנו למשוך את קובץ השמע מהמערכת");
        }
    }
}

// ============================================================================
// 4. מחלקת ניהול בינה מלאכותית (Gemini AI)
// ============================================================================

class GeminiAPI {
    /**
     * ניקוי טקסט מסימנים שמפריעים למנוע ה-TTS של ימות המשיח (כוכביות, סולמיות, אימוג'ים)
     * @param {string} text טקסט מקורי
     * @returns {string} טקסט נקי
     */
    static cleanTextForTTS(text) {
        if (!text) return "לא התקבלה תשובה";
        return text
            .replace(/\*/g, '') // הסרת כוכביות של מודגש
            .replace(/#/g, '')  // הסרת סולמיות
            .replace(/[\u{1F600}-\u{1F6FF}]/gu, '') // הסרת אימוג'ים
            .replace(/\n/g, '. ') // החלפת שורות חדשות בנקודה
            .replace(/\s+/g, ' ') // הסרת רווחים כפולים
            .trim();
    }

    /**
     * שליחת בקשה ל-Gemini עם מנגנון מפתחות מתחלף (Rotation + Fallback)
     * @param {string} base64Audio קובץ שמע מקודד
     * @param {Array} history היסטוריית השיחה הנוכחית
     * @returns {Promise<string>} תמלול + תשובת המודל
     */
    static async generateContent(base64Audio, history =[]) {
        const prompt = "זה קובץ אודיו של שאלה. תמלל וענה. אם לא הבנת תגיד שלא הבנת. אל תשתמש בכוכביות או תווים מיוחדים בתשובה.";
        
        // המרת היסטוריית השיחה הפנימית שלנו לפורמט של Gemini API
        const geminiContext = history.map(msg => ({
            role: "user", // הודעות עבר - אנו שולחים הכל כ-user כדי להקל על הקונטקסט
            parts:[{ text: `שאלה קודמת: ${msg.q}\nתשובה קודמת: ${msg.a}` }]
        }));

        const payload = {
            contents:[
                ...geminiContext,
                {
                    role: "user",
                    parts:[
                        { text: prompt },
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
                maxOutputTokens: 500, // לא להעמיס טקסט ארוך מדי בטלפון
            }
        };

        // מנגנון ניסיונות חוזרים על כל המפתחות הזמינים
        let lastError = null;
        for (const apiKey of config.GEMINI_KEYS) {
            try {
                console.log(`[GeminiAPI] Trying with key ending in ...${apiKey.slice(-4)}`);
                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`;
                
                const response = await fetch(url, {
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
                    let rawText = data.candidates[0].content.parts[0].text;
                    return this.cleanTextForTTS(rawText);
                } else {
                    throw new Error("Invalid response structure from Gemini");
                }

            } catch (error) {
                console.error(`[GeminiAPI] Key failed: ${error.message}`);
                lastError = error;
                // ממשיכים למפתח הבא בלולאה
            }
        }

        // אם הגענו לכאן, כל המפתחות נכשלו
        console.error("[GeminiAPI] All keys failed.");
        throw new Error("מנוע הבינה המלאכותית אינו זמין כעת. אנא נסה שוב מאוחר יותר.");
    }
}

// ============================================================================
// 5. מחלקת עיצוב תגובות IVR (Yemot Response Builder)
// ============================================================================

class IVRBuilder {
    /**
     * ימות המשיח דורשת פורמט ספציפי של מחרוזות המשורשרות ב- &.
     * המחלקה בונה את הפורמט התקני ביותר למניעת שגיאות והבטחת יציבות.
     * אין רווחים מיותרים ואין שורות ריקות כבקשתך (הופרד ב \n).
     */
    constructor() {
        this.commands =[];
    }

    /**
     * הפעלת קובץ טקסט למנוע הקראה (TTS)
     * @param {string} text טקסט להקראה
     */
    addTTS(text) {
        if (!text) return this;
        // שימוש בפורמט הרשמי: id_list_message=t-טקסט
        this.commands.push(`id_list_message=t-${text}`);
        return this;
    }

    /**
     * קבלת הקשה ממשתמש
     * @param {string} text הודעה שתשמע לפני ההקשה
     * @param {string} varName שם המשתנה שיישלח חזרה לשרת
     * @param {number} min מינימום ספרות
     * @param {number} max מקסימום ספרות
     */
    addReadDigits(text, varName, min = 1, max = 1) {
        // פורמט ה-read לקבלת נתונים (הקשה):
        // read=t-טקסט=VarName,AskNo(yes),Max,Min,TimeOut,Type(Digits),BlockStar(yes),BlockZero(no)
        this.commands.push(`read=t-${text}=${varName},yes,${max},${min},7,Digits,yes,no,*`);
        return this;
    }

    /**
     * קבלת הקלטה ממשתמש
     * @param {string} text הודעה לפני הקלטה
     * @param {string} varName שם המשתנה שיישלח חזרה לשרת (יכיל OK)
     * @param {string} callId מזהה השיחה (לצורך שם קובץ ייחודי)
     */
    addRecord(text, varName, callId) {
        // פורמט ה-read להקלטה:
        // read=t-טקסט=VarName,AskNo(yes),Type(record),Folder,FileName,SayRecordMenu(no),SaveHangup(yes),Append(no),Min(1),Max(120)
        // שומרים בתיקייה /ApiRecords/
        const fileName = `q_${callId}`;
        this.commands.push(`read=t-${text}=${varName},yes,record,/ApiRecords,${fileName},no,yes,no,1,120`);
        return this;
    }

    /**
     * מעבר לשלוחה אחרת או ניתוק
     * @param {string} folder נתיב או "hangup"
     */
    addGoTo(folder) {
        this.commands.push(`go_to_folder=${folder}`);
        return this;
    }

    /**
     * בניית המחרוזת הסופית למענה לימות המשיח. 
     * חיבור הפקודות חייב להתבצע בעזרת & כדי שימות יקראו את כל הפקודות ברצף.
     */
    build() {
        // שינוי קריטי: חיבור הפקודות עם & במקום \n
        return this.commands.join('&');
    }
}

// ============================================================================
// 6. ניהול ובקרה ראשי (Main API Handler)
// ============================================================================

/**
 * נקודת הכניסה של Vercel Serverless Function
 */
export default async function handler(req, res) {
    // מניעת נפילות של שרת, מחזירים תמיד טקסט תקין לימות המשיח
    try {
        // המרת הפרמטרים למערך נוח גם מ-GET וגם מ-POST
        const urlParams = new URL(req.url, `https://${req.headers.host}`).searchParams;
        const query = Object.fromEntries(urlParams.entries());
        
        // שליפת נתונים בסיסיים שימות תמיד שולחת
        const phone = query.ApiPhone || query.ApiEnterID || 'unknown';
        const callId = query.ApiCallId || `sim_${Date.now()}`;
        
        // שליפת משתני תזרים שהגדרנו במערכת
        const menuChoice = query.MenuChoice;
        const userAudioStatus = query.UserAudio;
        const historyChoice = query.HistoryChoice;
        const actionChoice = query.ActionChoice;

        console.log(`[Incoming Request] Phone: ${phone}, CallID: ${callId}`);
        console.log(`[State Variables] Menu: ${menuChoice}, Audio: ${userAudioStatus}, Hist: ${historyChoice}, Action: ${actionChoice}`);

        const ivr = new IVRBuilder();

        // --------------------------------------------------------------------
        // מצב 1: התקבל קובץ אודיו (שאלת המשתמש) -> עיבוד ב-Gemini
        // --------------------------------------------------------------------
        if (userAudioStatus && userAudioStatus.toUpperCase() === 'OK') {
            console.log(`[Flow] Processing Audio for Call: ${callId}`);
            
            // השמעת הודעת המתנה (אופציונלי כי ב-ext.ini אמור להיות מוגדר api_wait_answer_music_on_hold=yes)
            // נשתמש בזה ליתר ביטחון למקרה שאין מוזיקה מוגדרת.
            
            // 1. הורדת האודיו מימות המשיח
            const base64Audio = await YemotAPI.downloadAudio(callId);
            
            // 2. משיכת נתוני משתמש
            const userData = await StorageAPI.getUser(phone);
            
            // מציאת השיחה הנוכחית שאליה נשייך את התשובה
            let currentChat = userData.chats.find(c => c.id === userData.currentChatId);
            if (!currentChat) {
                // אם אין, נייצר אחת קשיחה
                currentChat = { id: Date.now().toString(), date: new Date().toISOString(), messages:[] };
                userData.chats.push(currentChat);
                userData.currentChatId = currentChat.id;
            }

            // לקיחת 5 הודעות אחרונות לטובת הקונטקסט
            const historyContext = currentChat.messages.slice(-5);

            // 3. שליחה ל-Gemini
            const geminiResponse = await GeminiAPI.generateContent(base64Audio, historyContext);
            
            // 4. שמירת ההיסטוריה למסד הנתונים
            // מכיוון ששלחנו אודיו, אנו לא יודעים את שאלת המשתמש בטקסט, נשמור כמציין "הודעה קולית" ואת תשובת הבוט
            currentChat.messages.push({
                q: "שאלה קולית מאת המשתמש",
                a: geminiResponse
            });
            await StorageAPI.saveUser(phone, userData);

            // 5. בניית התגובה חזרה לטלפון
            ivr.addTTS(geminiResponse);
            ivr.addReadDigits("להמשך השיחה הנוכחית הקישו 7. לחזרה לתפריט הראשי הקישו 8.", "ActionChoice", 1, 1);
            
            return sendIvrResponse(res, ivr.build());
        }

        // --------------------------------------------------------------------
        // מצב 2: בחירה מתוך פעולות (המשך שיחה או חזרה)
        // --------------------------------------------------------------------
        if (actionChoice) {
            if (actionChoice === '7') {
                console.log(`[Flow] Continuing chat`);
                ivr.addRecord("אנא הקליטו את שאלתכם לאחר הצליל. בסיום הקישו סולמית.", "UserAudio", callId);
                return sendIvrResponse(res, ivr.build());
            } else {
                console.log(`[Flow] Going back to main menu`);
                // מנקים בחירות כדי להציג תפריט ראשי
                return redirectMainMenu(res, ivr);
            }
        }

        // --------------------------------------------------------------------
        // מצב 3: תפריט היסטוריית שיחות
        // --------------------------------------------------------------------
        if (menuChoice === '2') {
            console.log(`[Flow] History Menu`);
            const userData = await StorageAPI.getUser(phone);
            
            if (userData.chats.length === 0) {
                ivr.addTTS("אין לכם היסטוריית שיחות במערכת.");
                return redirectMainMenu(res, ivr);
            }

            // יצירת תפריט עד 9 שיחות אחרונות כדי להתאים למקשים 1-9
            const recentChats = userData.chats.slice(-9).reverse();
            let menuText = "תפריט היסטוריית שיחות. ";
            
            recentChats.forEach((chat, index) => {
                const dateObj = new Date(chat.date);
                // שימוש באופציית הקראת התאריך של ימות יכולה לעזור, אך כאן פשוט נגיד "לשיחה 1 הקש 1"
                menuText += `לשיחה מספר ${index + 1}, הקישו ${index + 1}. `;
            });
            menuText += "לחזרה לתפריט הראשי הקישו 0.";

            ivr.addReadDigits(menuText, "HistoryChoice", 1, 1);
            return sendIvrResponse(res, ivr.build());
        }

        // --------------------------------------------------------------------
        // מצב 4: בחירת שיחה מתוך ההיסטוריה והשמעתה
        // --------------------------------------------------------------------
        if (historyChoice) {
            console.log(`[Flow] Playing History Item: ${historyChoice}`);
            
            if (historyChoice === '0') {
                return redirectMainMenu(res, ivr);
            }

            const userData = await StorageAPI.getUser(phone);
            const recentChats = userData.chats.slice(-9).reverse();
            const selectedChatIndex = parseInt(historyChoice) - 1;

            if (selectedChatIndex < 0 || selectedChatIndex >= recentChats.length) {
                ivr.addTTS("הבחירה שגויה.");
                return redirectMainMenu(res, ivr);
            }

            const selectedChat = recentChats[selectedChatIndex];
            
            // עדכון מזהה השיחה הנוכחי כדי שיוכל להמשיך אותה
            userData.currentChatId = selectedChat.id;
            await StorageAPI.saveUser(phone, userData);

            // בניית טקסט להקראה של כל השיחה
            let playbackText = "היסטוריית שיחה. ";
            selectedChat.messages.forEach((msg, i) => {
                playbackText += `הודעה מספר ${i + 1}. התשובה הייתה: ${msg.a}. `;
            });

            ivr.addTTS(playbackText);
            ivr.addReadDigits("להמשך שיחה זו הקישו 7. לחזרה לתפריט הראשי הקישו 8.", "ActionChoice", 1, 1);
            
            return sendIvrResponse(res, ivr.build());
        }

        // --------------------------------------------------------------------
        // מצב 5: בחירה בשיחה חדשה
        // --------------------------------------------------------------------
        if (menuChoice === '1') {
            console.log(`[Flow] New Chat Initialized`);
            
            const userData = await StorageAPI.getUser(phone);
            
            // יצירת מזהה שיחה חדש
            const newChatId = `chat_${Date.now()}`;
            userData.chats.push({
                id: newChatId,
                date: new Date().toISOString(),
                messages:[]
            });
            userData.currentChatId = newChatId;
            
            await StorageAPI.saveUser(phone, userData);

            ivr.addRecord("אנא הקליטו את שאלתכם לאחר הצליל. בסיום הקישו סולמית.", "UserAudio", callId);
            return sendIvrResponse(res, ivr.build());
        }

        // --------------------------------------------------------------------
        // מצב דיפולט: תפריט ראשי (כניסה ראשונית או ללא בחירה חוקית)
        // --------------------------------------------------------------------
        console.log(`[Flow] Main Menu`);
        ivr.addTTS("ברוכים הבאים למערכת הבינה המלאכותית.");
        ivr.addReadDigits("לשיחה חדשה עם המערכת, הקישו 1. לשמיעת היסטוריית שיחות והמשך שיחה קודמת, הקישו 2.", "MenuChoice", 1, 1);
        return sendIvrResponse(res, ivr.build());

    } catch (error) {
        // טיפול שגיאות חסון - אין 500 לעולם
        console.error(`[CRITICAL ERROR]`, error);
        const errorIvr = new IVRBuilder();
        errorIvr.addTTS("אירעה שגיאה בלתי צפויה במערכת. אנא נסו שוב מאוחר יותר.");
        errorIvr.addGoTo("/"); // חזרה לתפריט הראשי של המערכת במידה וקיים או ינתק
        return sendIvrResponse(res, errorIvr.build());
    }
}

// ============================================================================
// 7. פונקציות עזר (Helper Functions)
// ============================================================================

/**
 * שליחת תגובה מתוקננת לימות המשיח
 * הפורמט חייב להיות טקסטואלי מופרד בשורות לפי ההוראות.
 */
function sendIvrResponse(res, ivrString) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(200).send(ivrString);
}

/**
 * פונקציית קיצור לחזרה לתפריט הראשי הפנימי
 */
function redirectMainMenu(res, ivrBuilder) {
    ivrBuilder.addReadDigits("תפריט ראשי. לשיחה חדשה, הקישו 1. לשמיעת היסטוריית שיחות, הקישו 2.", "MenuChoice", 1, 1);
    return sendIvrResponse(res, ivrBuilder.build());
}
