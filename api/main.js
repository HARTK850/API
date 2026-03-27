import { Buffer } from 'buffer';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { put } from "@vercel/blob";
import * as googleTTS from 'google-tts-api';
import formidable from 'formidable';
import fs from 'fs/promises';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// שימוש במודל הספציפי שביקשת
const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
    const { method } = req;
    
    // הגדרת תגובה כטקסט פשוט עבור ימות המשיח
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    try {
        if (method === 'POST') {
            const form = formidable();
            const [fields, files] = await form.parse(req);
            
            // בדיקה אם הקובץ הגיע (formidable לעיתים מחזיר מערך)
            const audioFile = Array.isArray(files.audio_file) ? files.audio_file : files.audio_file;

            if (!audioFile) {
                return res.status(200).send("id_list_message=t-לא התקבל קובץ שמע מהמערכת");
            }

            const audioData = await fs.readFile(audioFile.filepath);
            const base64Audio = audioData.toString('base64');

            const prompt = "המשתמש דיבר בהקלטה המצורפת. זהה את השאלה וענה עליה בעברית קצרה מאוד. אם הדיבור לא ברור - בקש מהמשתמש לחזור על דבריו.";

            // שליחה ל-Gemini
            const result = await model.generateContent([
                prompt,
                { inlineData: { data: base64Audio, mimeType: "audio/wav" } }
            ]);
            const responseText = result.response.text();

            // יצירת קובץ שמע (TTS)
            const ttsUrl = googleTTS.getAudioUrl(responseText, {
                lang: 'he',
                slow: false,
                host: 'https://translate.google.com',
            });

            const ttsResponse = await fetch(ttsUrl);
            const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
            const blob = await put(`responses/${Date.now()}.mp3`, audioBuffer, { access: 'public' });

            // החזרת URL להשמעה בימות המשיח
            return res.status(200).send(`id_list_message=f-${blob.url}`);
        } 

        return res.status(404).send("Not Found");

    } catch (error) {
        console.error("Gemini/Vercel Error:", error);
        // החזרת שגיאה בצורת TTS למחייג כדי שלא יחזור לתפריט הראשי בלי הסבר
        return res.status(200).send(`id_list_message=t-חלה שגיאה בשרת. ${error.message}`);
    }
}
