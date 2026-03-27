import { Buffer } from 'buffer';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { put } from "@vercel/blob";
import * as googleTTS from 'google-tts-api';
import formidable from 'formidable';
import fs from 'fs/promises';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
    // הגדרת Header קריטי לימות המשיח [1]
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    try {
        console.log("Request received, method:", req.method);

        if (req.method !== 'POST') {
            return res.status(200).send("id_list_message=t-נא להתקשר דרך המערכת בלבד");
        }

        const form = formidable();
        const [fields, files] = await form.parse(req);
        
        // שליפה בטוחה של הקובץ מהמערך ש-Formidable מחזיר
        const audioFile = Array.isArray(files.audio_file) ? files.audio_file : files.audio_file;

        if (!audioFile) {
            console.error("No audio file found in request");
            return res.status(200).send("id_list_message=t-שגיאה. לא התקבלה הקלטה בשרת");
        }

        // אתחול Gemini עם המודל הספציפי שדרשת
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

        const audioData = await fs.readFile(audioFile.filepath);
        const base64Audio = audioData.toString('base64');

        const prompt = "המשתמש דיבר בהקלטה המצורפת. זהה את השאלה וענה עליה בעברית קצרה מאוד. אם לא ברור - בקש חזרה.";

        console.log("Sending to Gemini...");
        const result = await model.generateContent([
            prompt,
            { inlineData: { data: base64Audio, mimeType: "audio/wav" } }
        ]);
        const responseText = result.response.text();
        console.log("Gemini response:", responseText);

        const ttsUrl = googleTTS.getAudioUrl(responseText, {
            lang: 'he',
            slow: false,
            host: 'https://translate.google.com',
        });

        const ttsResponse = await fetch(ttsUrl);
        const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
        const blob = await put(`responses/${Date.now()}.mp3`, audioBuffer, { access: 'public' });

        console.log("Blob created:", blob.url);
        // החזרת פקודה להשמעת הקובץ [2]
        return res.status(200).send(`id_list_message=f-${blob.url}`);

    } catch (error) {
        console.error("CRITICAL ERROR:", error);
        // החזרת השגיאה כטקסט להקראה בטלפון כדי שתדע מה קרה
        return res.status(200).send(`id_list_message=t-שגיאת שרת. ${error.message.replace(/[^א-תa-zA-Z0-9 ]/g, '')}`);
    }
}
