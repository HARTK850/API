const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { kv } = require('@vercel/kv');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// אתחול מודל ה-AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_NAME = "gemini-3.1-flash-lite-preview";

app.get('/api/bot', async (req, res) => {
    try {
        const phone = req.query.ApiPhone;
        const action = req.query.action || 'main_menu';
        const userInput = req.query.user_input; // טקסט מזיהוי הדיבור
        const userChoice = req.query.user_choice; // בחירת מקש

        // 1. תפריט ראשי
        if (action === 'main_menu') {
            const menuText = "ברוכים הבאים לבינה המלאכותית. לשיחה חדשה הקישו 1. לשמיעת היסטוריית שיחות הקישו 2.";
            return res.send(`read=t-${menuText}=user_choice,no,1,1,7,Number,yes,no,*/&api_add_0=action=handle_menu_choice`);
        }

        // 2. טיפול בבחירת התפריט הראשי
        if (action === 'handle_menu_choice') {
            if (userChoice === '1') {
                // שיחה חדשה
                const promptText = "אנא אמרו את שאלתכם לאחר הצליל.";
                return res.send(`read=t-${promptText}=user_input,no,voice,he-IL,no&api_add_0=action=ask_gemini&api_add_1=chat_id=new`);
            } else if (userChoice === '2') {
                // היסטוריית שיחות
                const userHistory = await kv.get(`history_${phone}`) ||[];
                if (userHistory.length === 0) {
                    return res.send(`id_list_message=t-אין לכם היסטוריית שיחות.&api_add_0=action=main_menu`);
                }
                
                let historyMenu = "היסטוריית השיחות שלכם. ";
                userHistory.forEach((chat, index) => {
                    historyMenu += `לשיחה בנושא ${chat.title}, הקישו ${index + 1}. `;
                });
                
                return res.send(`read=t-${historyMenu}=user_choice,no,1,1,7,Number,yes,no,*/&api_add_0=action=play_history`);
            } else {
                return res.send(`id_list_message=t-בחירה שגויה&api_add_0=action=main_menu`);
            }
        }

        // 3. שליחת השאלה ל-Gemini והקראת התשובה
        if (action === 'ask_gemini') {
            if (!userInput) return res.send(`id_list_message=t-לא זיהיתי קול.&api_add_0=action=main_menu`);

            let chatId = req.query.chat_id;
            let userChats = await kv.get(`history_${phone}`) ||[];
            let currentChat = { title: userInput.substring(0, 20), history:[] }; // שם השיחה הוא 20 התווים הראשונים
            let chatIndex = -1;

            if (chatId !== 'new') {
                chatIndex = parseInt(chatId);
                currentChat = userChats[chatIndex];
            }

            // יצירת היסטוריית מודל בפורמט של גוגל
            const formattedHistory = currentChat.history.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts:[{ text: msg.text }]
            }));

            // פנייה ל-Gemini
            const model = genAI.getGenerativeModel({ model: MODEL_NAME });
            const chat = model.startChat({ history: formattedHistory });
            const result = await chat.sendMessage(userInput);
            let aiResponse = result.response.text();

            // ניקוי טקסט מסימנים שגורמים ל-TTS של ימות המשיח לקרוס
            aiResponse = aiResponse.replace(/[*#=\-.:]/g, ' ').trim();

            // שמירת ההיסטוריה המעודכנת
            currentChat.history.push({ role: 'user', text: userInput });
            currentChat.history.push({ role: 'model', text: aiResponse });

            if (chatId === 'new') {
                userChats.push(currentChat);
                chatIndex = userChats.length - 1; // ID של השיחה החדשה
            } else {
                userChats[chatIndex] = currentChat;
            }
            await kv.set(`history_${phone}`, userChats);

            // הקראת התשובה ותפריט המשך
            const nextMenu = `${aiResponse}. להקלטת שאלת המשך הקישו 7. לחזרה לתפריט הראשי הקישו 8.`;
            return res.send(`read=t-${nextMenu}=user_choice,no,1,1,7,Number,yes,no,*/&api_add_0=action=handle_after_answer&api_add_1=chat_id=${chatIndex}`);
        }

        // 4. טיפול בתפריט שאחרי התשובה
        if (action === 'handle_after_answer') {
            if (userChoice === '7') {
                const promptText = "אמרו את שאלת ההמשך לאחר הצליל.";
                return res.send(`read=t-${promptText}=user_input,no,voice,he-IL,no&api_add_0=action=ask_gemini&api_add_1=chat_id=${req.query.chat_id}`);
            } else {
                return res.send(`id_list_message=t-חוזר לתפריט.&api_add_0=action=main_menu`);
            }
        }

        // 5. השמעת היסטוריית שיחה ספציפית
        if (action === 'play_history') {
            const chatIndex = parseInt(userChoice) - 1;
            const userChats = await kv.get(`history_${phone}`) ||[];
            
            if (!userChats[chatIndex]) {
                return res.send(`id_list_message=t-שיחה לא קיימת.&api_add_0=action=main_menu`);
            }

            const currentChat = userChats[chatIndex];
            let playbackText = "הנה השיחה שלכם: ";
            currentChat.history.forEach(msg => {
                const speaker = msg.role === 'user' ? "אתם אמרתם:" : "הבינה המלאכותית ענתה:";
                playbackText += `${speaker} ${msg.text}. `;
            });

            const nextMenu = `${playbackText}. להקלטת שאלת המשך לשיחה זו הקישו 7. לתפריט הראשי הקישו 8.`;
            return res.send(`read=t-${nextMenu}=user_choice,no,1,1,7,Number,yes,no,*/&api_add_0=action=handle_after_answer&api_add_1=chat_id=${chatIndex}`);
        }

        // ברירת מחדל לכל דבר אחר
        res.send(`id_list_message=t-שגיאה.&api_add_0=action=main_menu`);

    } catch (error) {
        console.error("Error:", error);
        res.send(`id_list_message=t-התרחשה שגיאה בעת פנייה לשרת.&api_add_0=action=main_menu`);
    }
});

// ייצוא עבור Vercel
module.exports = app;
