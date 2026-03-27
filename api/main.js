import { Buffer } from 'buffer';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { put } from "@vercel/blob";
import * as googleTTS from 'google-tts-api';
import formidable from 'formidable';
import fs from 'fs/promises';

export const config = { api: { bodyParser: false, maxDuration: 60 } }; // הגדלת זמן ריצה ל-Gemini

export default async function handler(req, res) {
    // הגדרה קריטית לימות המשיח - טקסט פשוט בלבד [2]
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    const url = new URL(req.url, `http://${req.headers.host}`);

    try {
        // --- Endpoint: process-audio ---
        if (url.pathname.includes('process-audio') && req.method === 'POST') {
            const form = formidable();
            const [fields, files] = await form.parse(req);
            const audioFile = Array.isArray(files.audio_file) ? files.audio_file : files.audio_file;

            if (!audioFile) return res.send("id_list_message=t-שגיאה לא התקבל קובץ שמע");

            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

            const audioData = await fs.readFile(audioFile.filepath);
            const result = await model.generateContent([
                "זהה את השאלה בהקלטה וענה בעברית קצרה מאוד. אם לא ברור - בקש לחזור.",
                { inlineData: { data: audioData.toString('base64'), mimeType: "audio/wav" } }
            ]);
            
            const responseText = result.response.text();
            const ttsUrl = googleTTS.getAudioUrl(responseText, { lang: 'he' });
            
            const ttsRes = await fetch(ttsUrl);
            const blob = await put(`res-${Date.now()}.mp3`, Buffer.from(await ttsRes.arrayBuffer()), { access: 'public' });

            return res.send(`id_list_message=f-${blob.url}`); // השמעת קובץ ה-TTS [3, 4]
        }

        // --- Endpoint: tts ---
        if (url.pathname.includes('tts')) {
            const text = url.searchParams.get('text') || "בדיקה";
            const ttsUrl = googleTTS.getAudioUrl(text, { lang: 'he' });
            return res.send(`id_list_message=f-${ttsUrl}`);
        }

        // --- Endpoints: save/get config (לוגיקה בסיסית בזיכרון) ---
        if (url.pathname.includes('save-config')) return res.send("OK");
        if (url.pathname.includes('get-config')) return res.send("Language=Hebrew");

        res.status(404).send("Not Found");
    } catch (e) {
        console.error("ERROR:", e.message);
        res.send(`id_list_message=t-שגיאת שרת ${e.message.replace(/[^א-תa-z0-9 ]/gi, '')}`);
    }
}
