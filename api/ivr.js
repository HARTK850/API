// ==========================
// IVR AI SERVER (VERCEL)
// ==========================

import fs from "fs";
import path from "path";

// ==========================
// הגדרות
// ==========================

const DATA_FILE = "/tmp/data.json";

// ==========================
// עזר: קריאה/שמירה
// ==========================

function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE));
  } catch {
    return {};
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ==========================
// SpeechRecognition (mock)
// ==========================

async function speechToText(filePath) {
  // ⚠️ כאן תחליף לספרייה אמיתית
  return "שאלה לדוגמה מהמשתמש";
}

// ==========================
// Gemini API
// ==========================

async function askGemini(question) {
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: question }] }]
    })
  });

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "לא נמצאה תשובה";
}

// ==========================
// יצירת TTS פשוט (ללא API)
// ==========================

function textToSpeech(text) {
  return `tts=${encodeURIComponent(text)}`;
}

// ==========================
// יצירת שם שיחה
// ==========================

function generateSessionName(text) {
  return text.slice(0, 20);
}

// ==========================
// handler ראשי
// ==========================

export default async function handler(req, res) {
  const data = loadData();

  const phone = req.body.ApiPhone || "unknown";

  if (!data[phone]) {
    data[phone] = { sessions: [] };
  }

  const input = req.body;

  // ==========================
  // תפריט ראשי
  // ==========================

  if (!input.question) {
    return res.send(`
      tts=ברוכים הבאים למערכת AI
      read=menu,1,1,1,Number
      if(menu==1) goto=new
      if(menu==2) goto=history
    `);
  }

  // ==========================
  // קובץ קול
  // ==========================

  const filePath = "/tmp/record.wav";

  // ==========================
  // המרה לטקסט
  // ==========================

  const text = await speechToText(filePath);

  // ==========================
  // שליחה ל-AI
  // ==========================

  const answer = await askGemini(text);

  // ==========================
  // שמירה
  // ==========================

  let session = data[phone].sessions.at(-1);

  if (!session) {
    session = {
      name: generateSessionName(text),
      messages: []
    };
    data[phone].sessions.push(session);
  }

  session.messages.push({ q: text, a: answer });

  saveData(data);

  // ==========================
  // תשובה למערכת
  // ==========================

  res.send(`
    play=/music/wait
    ${textToSpeech(answer)}
    goto=menu
  `);
}
