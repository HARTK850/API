import { put } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('POST only');

    const form = await req.formData();
    const userInput = form.get('user_input') || '';           // תמלול מה-read voice
    const apiExtension = form.get('ApiExtension') || '/1';    // ל-GOTO לולאה
    const callId = form.get('ApiCallId');

    let textToSpeak = userInput ? 
        `המשתמש אמר: ${userInput}. ענה בקצרה (1-2 משפטים), בעברית, בצורה טבעית.` :
        'שלום! אני העוזר הקולי שלך. מה השאלה?';

    // 1. Gemini text → תשובה
    const textRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ contents: [{ parts: [{ text: textToSpeak }] }] })
    });
    const data = await textRes.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'לא הבנתי, תחזור?';

    // 2. Gemini 2.5 TTS (כמו ב-podcast_generator.html)
    const ttsBody = {
        contents: [{ parts: [{ text: answer }] }],
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { multiSpeakerVoiceConfig: { speakerVoiceConfigs: [{ speaker: "man", voiceConfig: { prebuiltVoiceConfig: { voiceName: "Sadaltager" } } }] } } }
    };
    const ttsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${GEMINI_KEY}`, {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(ttsBody)
    });
    const ttsData = await ttsRes.json();
    const b64 = ttsData.candidates[0].content.parts[0].inlineData.data;
    const pcm = Uint8Array.from(atob(b64), c => c.charCodeAt(0));

    // 3. WAV + העלאה ל-Vercel Blob
    const wavBuffer = createWav(pcm);
    const blob = await put(`ivr/${uuidv4()}.wav`, wavBuffer, { access: 'public', token: BLOB_TOKEN });

    // 4. תשובה לימות (PLAY + GOTO לולאה)
    const responseText = `PLAY=${blob.url}\nGOTO=${apiExtension}`;
    res.setHeader('Content-Type', 'text/plain');
    res.send(responseText);
}

function createWav(pcm) {
    const buffer = new ArrayBuffer(44 + pcm.length);
    const view = new DataView(buffer);
    view.setString = (o,s) => { for(let i=0;i<s.length;i++) view.setUint8(o+i,s.charCodeAt(i)); };
    view.setString(0,'RIFF'); view.setUint32(4,36+pcm.length,true); view.setString(8,'WAVE');
    view.setString(12,'fmt '); view.setUint32(16,16,true); view.setUint16(20,1,true);
    view.setUint16(22,1,true); view.setUint32(24,24000,true); view.setUint32(28,48000,true);
    view.setUint16(32,2,true); view.setUint16(34,16,true); view.setString(36,'data');
    view.setUint32(40,pcm.length,true);
    new Uint8Array(buffer,44).set(pcm);
    return buffer;
}
