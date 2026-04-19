// =======================================
// IVR AI FULL SYSTEM (VERCEL + KV)
// =======================================

import { kv } from "@vercel/kv";

// =========================
// API KEYS (מהסביבה)
// =========================

const API_KEYS = process.env.GEMINI_KEYS.split(",");
let keyIndex = 0;

// =========================
// בחירת מפתח
// =========================

function getNextKey() {
  const key = API_KEYS[keyIndex];
  keyIndex = (keyIndex + 1) % API_KEYS.length;
  return key;
}

// =========================
// קריאה ל-Gemini עם fallback
// =========================

async function askGemini(question) {
  for (let i = 0; i < API_KEYS.length; i++) {
    const key = getNextKey();

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: question }] }]
          })
        }
      );

      const data = await res.json();

      const text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (text) return text;

    } catch (e) {}
  }

  return "אירעה שגיאה, נסו שוב";
}

// =========================
// STT (פשוט - placeholder)
// =========================

async function speechToText() {
  return "שאלה מהמשתמש"; // תחליף בהמשך ל-VOSK אם תרצה
}

// =========================
// שמירת DB
// =========================

async function getUser(phone) {
  return (await kv.get(phone)) || { sessions: [] };
}

async function saveUser(phone, data) {
  await kv.set(phone, data);
}

// =========================
// יצירת שם שיחה
// =========================

function createSessionName(text) {
  return text.slice(0, 15);
}

// =========================
// יצירת תפריט היסטוריה
// =========================

function buildHistoryMenu(sessions) {
  let txt = "tts=בחר שיחה ";

  sessions.forEach((s, i) => {
    txt += `tts=לשיחה ${s.name} הקש ${i + 1} `;
  });

  txt += "read=choice,1,1,1,Number";
  return txt;
}

// =========================
// handler
// =========================

export default async function handler(req, res) {

  const phone = req.body.ApiPhone || "unknown";
  const input = req.body;

  let user = await getUser(phone);

  // =========================
  // תפריט ראשי
  // =========================

  if (!input.step) {
    return res.send(`
      tts=ברוכים הבאים
      tts=לצאט חדש הקש 1
      tts=להיסטוריה הקש 2
      read=menu,1,1,1,Number
      if(menu==1) goto=new
      if(menu==2) goto=history
    `);
  }

  // =========================
  // היסטוריה
  // =========================

  if (input.step === "history") {
    return res.send(buildHistoryMenu(user.sessions));
  }

  // =========================
  // שאלה חדשה
  // =========================

  if (input.question) {

    const text = await speechToText();
    const answer = await askGemini(text);

    let session = user.sessions.at(-1);

    if (!session) {
      session = {
        name: createSessionName(text),
        messages: []
      };
      user.sessions.push(session);
    }

    session.messages.push({ q: text, a: answer });

    await saveUser(phone, user);

    return res.send(`
      play=/music/wait
      tts=${encodeURIComponent(answer)}
      goto=menu
    `);
  }

  // =========================
  // fallback
  // =========================

  res.send("tts=שגיאה");
}
