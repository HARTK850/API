/**
 * @file api/index.js
 * @description מערכת IVR מבוססת ימות המשיח בשילוב בינה מלאכותית (Gemini) ומסד נתונים פרטי (Vercel Blob).
 */

import { put, list } from '@vercel/blob';

// ============================================================================
// 1. מחלקת ניהול תצורה וסביבה (Config)
// ============================================================================
class Config {
    constructor() {
        this.GEMINI_KEYS = process.env.GEMINI_KEYS ? process.env.GEMINI_KEYS.split(',').map(k => k.trim()) :[];
        this.CALL2ALL_TOKEN = process.env.CALL2ALL_TOKEN || '';
        this.BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || '';
    }
}
const config = new Config();

// ============================================================================
// 2. מחלקת ניהול מסד נתונים (Vercel Blob Storage - PRIVATE MODE)
// ============================================================================
class StorageAPI {
    static async getUser(phone) {
        try {
            if (!phone) return this.getDefaultUser();

            const fileName = `users/${phone}.json`;
            const { blobs } = await list({ prefix: fileName, token: config.BLOB_TOKEN });
            
            if (blobs.length === 0) return this.getDefaultUser();

            // בגלל שהחנות פרטית, חובה לשלוח טוקן בבקשת הקריאה (Fetch)
            const response = await fetch(blobs[0].url, {
                headers: { Authorization: `Bearer ${config.BLOB_TOKEN}` }
            });
            
            if (!response.ok) throw new Error(`Failed to fetch user blob: ${response.status}`);
            return await response.json();
            
        } catch (error) {
            console.error(`[StorageAPI] Error getting user ${phone}:`, error.message);
            return this.getDefaultUser(); // מונע קריסה ומחזיר משתמש ריק
        }
    }

    static async saveUser(phone, data) {
        try {
            if (!phone) return;
            const fileName = `users/${phone}.json`;
            
            // שינוי קריטי: access מוגדר כ- private כדי להתאים לחנות שלך
            await put(fileName, JSON.stringify(data), { 
                access: 'private', 
                addRandomSuffix: false,
                token: config.BLOB_TOKEN
            });
            console.log(`[StorageAPI] User ${phone} saved successfully.`);
        } catch (error) {
            console.error(`[StorageAPI] Error saving user ${phone}:`, error.message);
        }
    }

    static getDefaultUser() {
        return { chats:[], currentChatId: null };
    }
}

// ============================================================================
// 3. מחלקת הורדת שמע מימות המשיח (Yemot API)
// ============================================================================
class YemotAPI {
    static async downloadAudio(filePath) {
        try {
            // ימות שולחת נתיב כמו /ApiRecords/q_123.wav, אנו מוסיפים לו את הקידומת ivr2:
            const fullPath = `ivr2:${filePath}`;
            const url = `https://www.call2all.co.il/ym/api/DownloadFile?token=${config.CALL2ALL_TOKEN}&path=${encodeURIComponent(fullPath)}`;
            
            console.log(`[YemotAPI] Fetching audio from: ${fullPath}`);
            const response = await fetch(url);
            
            if (!response.ok) throw new Error(`Yemot API Error: ${response.status}`);

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            if (buffer.length < 100) throw new Error(`File too small or invalid.`);
            return buffer.toString('base64');

        } catch (error) {
            console.error(`[YemotAPI] Audio download error:`, error.message);
            throw new Error("לא הצלחנו למשוך את קובץ השמע מהמערכת");
        }
    }
}

// ============================================================================
// 4. מחלקת בינה מלאכותית (Gemini AI)
// ============================================================================
class GeminiAPI {
    static cleanTextForTTS(text) {
        if (!text) return "לא התקבלה תשובה";
        return text
            .replace(/\*/g, '')
            .replace(/#/g, '')
            .replace(/[\u{1F600}-\u{1F6FF}]/gu, '')
            .replace(/\n/g, '. ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    static async generateContent(base64Audio, history =[]) {
        const prompt = "זה קובץ אודיו של שאלה. תמלל וענה בעברית. אם לא הבנת תגיד שלא הבנת. אל תשתמש בכוכביות או תווים מיוחדים בתשובה.";
        
        const geminiContext = history.map(msg => ({
            role: "user",
            parts:[{ text: `שאלה קודמת: ${msg.q}\nתשובה קודמת: ${msg.a}` }]
        }));

        const payload = {
            contents:[
                ...geminiContext,
                {
                    role: "user",
                    parts:[
                        { text: prompt },
                        { inlineData: { mimeType: "audio/wav", data: base64Audio } }
                    ]
                }
            ],
            generationConfig: { temperature: 0.7, maxOutputTokens: 600 }
        };

        for (const apiKey of config.GEMINI_KEYS) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const data = await response.json();
                if (data.candidates && data.candidates[0].content) {
                    return this.cleanTextForTTS(data.candidates[0].content.parts[0].text);
                }
            } catch (error) {
                console.error(`[GeminiAPI] Key failed: ${error.message}`);
            }
        }
        throw new Error("מנוע הבינה המלאכותית אינו זמין כעת.");
    }
}

// ============================================================================
// 5. מחלקת עיצוב תגובות (IVR Builder)
// ============================================================================
class IVRBuilder {
    constructor() {
        this.commands =[];
    }

    cleanForYemot(text) {
        if (!text) return "";
        return text.replace(/[.,\-?!:\n]/g, ' ').replace(/\s+/g, ' ').trim();
    }

    addTTS(text) {
        if (!text) return this;
        const cleanText = this.cleanForYemot(text);
        this.commands.push(`id_list_message=t-${cleanText}`);
        return this;
    }

    addReadDigits(text, varName, min = 1, max = 1) {
        const cleanText = this.cleanForYemot(text);
        this.commands.push(`read=t-${cleanText}=${varName},no,${max},${min},7,No,yes,no`);
        return this;
    }

    addRecord(text, varName, callId) {
        const cleanText = this.cleanForYemot(text);
        const fileName = `q_${callId}`;
        this.commands.push(`read=t-${cleanText}=${varName},no,record,/ApiRecords,${fileName},no,yes,no,1,120`);
        return this;
    }

    addGoTo(folder) {
        this.commands.push(`go_to_folder=${folder}`);
        return this;
    }

    build() {
        return this.commands.join('&');
    }
}

// ============================================================================
// 6. ניהול ובקרה ראשי (Main Handler) - פותר את בעיית שרשור הפרמטרים של ימות
// ============================================================================
export default async function handler(req, res) {
    try {
        const urlObj = new URL(req.url, `https://${req.headers.host}`);
        const urlParams = urlObj.searchParams;
        
        let rawBody = {};
        if (req.method === 'POST' && typeof req.body === 'string') {
            rawBody = Object.fromEntries(new URLSearchParams(req.body));
        } else if (req.method === 'POST') {
            rawBody = req.body || {};
        }
        const query = { ...Object.fromEntries(urlParams.entries()), ...rawBody };
        const getParam = (key) => Array.isArray(query[key]) ? query[key][query[key].length - 1] : query[key];

        const phone = getParam('ApiPhone') || getParam('ApiEnterID') || 'unknown';
        const callId = getParam('ApiCallId') || `sim_${Date.now()}`;

        // --------- מכונת המצבים החכמה: מציאת הפעולה *האחרונה* בלבד ---------
        const allKeys = Array.from(urlParams.keys());
        if (req.method === 'POST' && typeof req.body !== 'string') allKeys.push(...Object.keys(rawBody));
        
        // סינון פרמטרים מערכתיים של ימות, נשארים רק עם הלחצנים/הקלטות שלנו
        const customKeys = allKeys.filter(k => !k.startsWith('Api') && k !== 'token');
        
        // הפרמטר האחרון הוא המצב הנוכחי!
        const currentStep = customKeys.length > 0 ? customKeys[customKeys.length - 1] : null;
        const stepValue = currentStep ? getParam(currentStep) : null;

        console.log(`[Flow] Step: ${currentStep}, Value: ${stepValue}, Phone: ${phone}`);

        const ivr = new IVRBuilder();

        // 1. טיפול בהקלטת שמע מלקוח
        if (currentStep === 'UserAudio' && stepValue && stepValue.includes('.wav')) {
            console.log(`[Flow] Processing Audio...`);
            
            // המשתנה stepValue מכיל את הנתיב המדויק שימות שמרה, למשל: /ApiRecords/q_123.wav
            const base64Audio = await YemotAPI.downloadAudio(stepValue);
            const userData = await StorageAPI.getUser(phone);
            
            let currentChat = userData.chats.find(c => c.id === userData.currentChatId);
            if (!currentChat) {
                currentChat = { id: Date.now().toString(), date: new Date().toISOString(), messages:[] };
                userData.chats.push(currentChat);
                userData.currentChatId = currentChat.id;
            }

            const historyContext = currentChat.messages.slice(-5);
            const geminiResponse = await GeminiAPI.generateContent(base64Audio, historyContext);
            
            currentChat.messages.push({ q: "הודעה קולית", a: geminiResponse });
            await StorageAPI.saveUser(phone, userData);

            ivr.addTTS(geminiResponse);
            ivr.addReadDigits("להמשך השיחה הקישו 7 לחזרה לתפריט הראשי הקישו 8", "ActionChoice", 1, 1);
            return sendIvrResponse(res, ivr.build());
        }

        // 2. טיפול בלחצני המשך/חזרה (אחרי תשובת בוט)
        if (currentStep === 'ActionChoice') {
            if (stepValue === '7') {
                ivr.addRecord("אנא הקליטו שוב לאחר הצליל", "UserAudio", callId);
                return sendIvrResponse(res, ivr.build());
            } else {
                return redirectMainMenu(res, ivr);
            }
        }

        // 3. טיפול בבחירת שיחה מהיסטוריה
        if (currentStep === 'HistoryChoice') {
            if (stepValue === '0') return redirectMainMenu(res, ivr);

            const userData = await StorageAPI.getUser(phone);
            const recentChats = userData.chats.slice(-9).reverse();
            const selectedIndex = parseInt(stepValue) - 1;

            if (selectedIndex < 0 || selectedIndex >= recentChats.length) {
                ivr.addTTS("הבחירה שגויה");
                return redirectMainMenu(res, ivr);
            }

            const selectedChat = recentChats[selectedIndex];
            userData.currentChatId = selectedChat.id;
            await StorageAPI.saveUser(phone, userData);

            let playbackText = "היסטוריית שיחה ";
            selectedChat.messages.forEach((msg, i) => {
                playbackText += `תשובה מספר ${i + 1} הייתה ${msg.a} `;
            });

            ivr.addTTS(playbackText);
            ivr.addReadDigits("להמשך שיחה זו הקישו 7 לחזרה לתפריט הקישו 8", "ActionChoice", 1, 1);
            return sendIvrResponse(res, ivr.build());
        }

        // 4. טיפול בתפריט הראשי (שיחה חדשה או היסטוריה)
        if (currentStep === 'MenuChoice') {
            if (stepValue === '1') {
                const userData = await StorageAPI.getUser(phone);
                const newChatId = `chat_${Date.now()}`;
                userData.chats.push({ id: newChatId, date: new Date().toISOString(), messages:[] });
                userData.currentChatId = newChatId;
                await StorageAPI.saveUser(phone, userData);

                ivr.addRecord("אנא הקליטו את שאלתכם לאחר הצליל", "UserAudio", callId);
                return sendIvrResponse(res, ivr.build());
            } 
            else if (stepValue === '2') {
                const userData = await StorageAPI.getUser(phone);
                if (userData.chats.length === 0) {
                    ivr.addTTS("אין לכם היסטוריית שיחות");
                    return redirectMainMenu(res, ivr);
                }

                const recentChats = userData.chats.slice(-9).reverse();
                let menuText = "תפריט היסטוריה ";
                recentChats.forEach((chat, index) => {
                    menuText += `לשיחה מספר ${index + 1} הקישו ${index + 1} `;
                });
                menuText += "לחזרה הקישו 0";

                ivr.addReadDigits(menuText, "HistoryChoice", 1, 1);
                return sendIvrResponse(res, ivr.build());
            }
        }

        // 5. דיפולט - תפריט פתיחה
        ivr.addTTS("ברוכים הבאים למערכת הבינה המלאכותית");
        return redirectMainMenu(res, ivr);

    } catch (error) {
        console.error(`[CRITICAL ERROR]`, error);
        const errorIvr = new IVRBuilder();
        errorIvr.addTTS("אירעה שגיאה אנא נסו שוב מאוחר יותר");
        errorIvr.addGoTo("/");
        return sendIvrResponse(res, errorIvr.build());
    }
}

// ============================================================================
// 7. פונקציות עזר (Helpers)
// ============================================================================
function sendIvrResponse(res, ivrString) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(200).send(ivrString);
}

function redirectMainMenu(res, ivrBuilder) {
    ivrBuilder.addReadDigits("לשיחה חדשה הקישו 1 לשמיעת היסטוריית שיחות הקישו 2", "MenuChoice", 1, 1);
    return sendIvrResponse(res, ivrBuilder.build());
}
