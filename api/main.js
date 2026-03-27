import { Buffer } from 'buffer';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { put } from "@vercel/blob";
import * as googleTTS from 'google-tts-api';
import formidable from 'formidable';
import fs from 'fs/promises';

// אתחול Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

// אובייקט הגדרות זמני (בייצור מומלץ להשתמש ב-Vercel KV)
let userConfig = { language: 'he', voice_speed: 1.0 };

export const config = { api: { bodyParser: false } }; // ביטול bodyParser עבור העלאת קבצים

export default async function handler(req, res) {
    const { method } = req;
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;

    try {
        // 1. Endpoint: process-audio - עיבוד שמע מ-Gemini
        if (path === '/api/process-audio' && method === 'POST') {
            const form = formidable();
            const [fields, files] = await form.parse(req);
            const audioFile = files.audio_file;

            // קריאת הקובץ והמרה ל-Base64 עבור Gemini
            const audioData = await fs.readFile(audioFile.filepath);
            const base64Audio = audioData.toString('base64');

            const prompt = "המשתמש דיבר בהקלטה המצורפת. זהה את השאלה וענה עליה בעברית. אם הדיבור לא ברור - בקש מהמשתמש לחזור על דבריו.";

            // שליחה ל-Gemini (Multimodal)
            const result = await model.generateContent([
                prompt,
                { inlineData: { data: base64Audio, mimeType: "audio/wav" } }
            ]);
            const responseText = result.response.text();

            // המרה ל-TTS וקבלת URL של קובץ שמע
            const ttsUrl = googleTTS.getAudioUrl(responseText, {
                lang: 'he',
                slow: false,
                host: 'https://translate.google.com',
            });

            // שמירת קובץ ה-TTS ב-Vercel Blob כדי שיהיה URL נגיש לימות המשיח
            const ttsResponse = await fetch(ttsUrl);
            const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
            const blob = await put(`responses/${Date.now()}.mp3`, audioBuffer, { access: 'public' });

            // החזרת תשובה בפורמט ימות המשיח להשמעת קובץ
            // מקור: מודול API > תשובת שרת עם כל ההגדרות [1, 2]
            res.status(200).send(`id_list_message=f-${blob.url}`);
        }

        // 2. Endpoint: tts - קבלת טקסט והחזרת URL שמע
        else if (path === '/api/tts') {
            const text = url.searchParams.get('text') || "אין טקסט";
            const ttsUrl = googleTTS.getAudioUrl(text, { lang: 'he' });
            res.status(200).send(`id_list_message=f-${ttsUrl}`);
        }

        // 3. Endpoint: save-config - שמירת הגדרות
        else if (path === '/api/save-config') {
            const lang = url.searchParams.get('lang');
            if (lang) userConfig.language = lang;
            res.status(200).send("Configuration Saved");
        }

        // 4. Endpoint: get-config - שליפת הגדרות
        else if (path === '/api/get-config') {
            res.status(200).json(userConfig);
        }

        else {
            res.status(404).send("Not Found");
        }

    } catch (error) {
        console.error(error);
        res.status(500).send("id_list_message=t-חלה שגיאה בעיבוד הנתונים");
    }
}
