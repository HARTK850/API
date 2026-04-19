// =======================================
// IVR AI FULL SYSTEM (BLOB VERSION)
// =======================================

import { put, get } from "@vercel/blob";

// =========================
// API KEYS
// =========================

const API_KEYS = process.env.GEMINI_KEYS.split(",");
let keyIndex = 0;

function getNextKey() {
  const key = API_KEYS[keyIndex];
  keyIndex = (keyIndex + 1) % API_KEYS.length;
  return key;
}

// =========================
// GEMINI
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

    } catch {}
  }

  return "שגיאה, נסו שוב";
}

// =========================
// DB דרך BLOB
// =========================

async function getUser(phone) {
  try {
    const res = await get(`users/${phone}.json`);
    return JSON.parse(await res.text());
  } catch {
    return { sessions: [] };
  }
}

async function saveUser(phone, data) {
  await put(`users/${phone}.json`, JSON.stringify(data), {
    access: "public"
  });
}

// =========================
// STT (placeholder)
// =========================

async function speechToText() {
  return "שאלה מהמשתמש";
}

// =========================
// יצירת שם שיחה
// =========================

function createSessionName(text) {
  return text.slice(0, 15);
}

// =========================
// תפריט היסטוריה
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
// MAIN HANDLER
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
  // שאלה
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

  res.send("tts=שגיאה");
}
