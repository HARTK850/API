import { put, get } from "@vercel/blob";

// =====================
// API KEYS ROTATION
// =====================
const KEYS = process.env.GEMINI_KEYS.split(",");
let keyIndex = 0;

function nextKey() {
  const key = KEYS[keyIndex];
  keyIndex = (keyIndex + 1) % KEYS.length;
  return key;
}

// =====================
// GEMINI
// =====================
async function askAI(text) {
  for (let i = 0; i < KEYS.length; i++) {
    const key = nextKey();

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text }] }]
          })
        }
      );

      const data = await res.json();
      const answer =
        data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (answer) return answer;

    } catch {}
  }

  return "אירעה שגיאה";
}

// =====================
// DB (BLOB)
// =====================
async function getUser(phone) {
  try {
    const file = await get(`users/${phone}.json`);
    return JSON.parse(await file.text());
  } catch {
    return { sessions: [] };
  }
}

async function saveUser(phone, data) {
  await put(`users/${phone}.json`, JSON.stringify(data), {
    access: "public"
  });
}

// =====================
// STT (placeholder)
// =====================
async function speechToText() {
  return "שאלה מהמשתמש";
}

// =====================
// HELPERS
// =====================
function sessionName(text) {
  return text.slice(0, 20);
}

function historyMenu(sessions) {
  let out = "tts=בחר שיחה ";

  sessions.forEach((s, i) => {
    out += `tts=לשיחה ${s.name} הקש ${i + 1} `;
  });

  out += `
  tts=לחזרה הקש כוכבית
  read=choice,1,2,1,Number
  `;

  return out;
}

// =====================
// MAIN
// =====================
export default async function handler(req, res) {

  const phone = req.body.ApiPhone || "unknown";
  const input = req.body;

  let user = await getUser(phone);

  // =====================
  // תפריט ראשי
  // =====================
  if (!input.stage) {
    return res.send(`
      tts=ברוכים הבאים למערכת
      tts=לצאט חדש הקש 1
      tts=להיסטוריה הקש 2
      read=menu,1,1,1,Number
      if(menu==1) goto=new
      if(menu==2) goto=history
    `);
  }

  // =====================
  // היסטוריה
  // =====================
  if (input.stage === "history") {
    return res.send(historyMenu(user.sessions));
  }

  // =====================
  // בחירת שיחה
  // =====================
  if (input.choice) {
    const index = parseInt(input.choice) - 1;
    const session = user.sessions[index];

    if (!session) {
      return res.send("tts=בחירה לא תקינה");
    }

    // מקריא את כל השיחה
    let playback = "";

    session.messages.forEach(m => {
      playback += `tts=${encodeURIComponent(m.q)} `;
      playback += `tts=${encodeURIComponent(m.a)} `;
    });

    return res.send(`
      ${playback}
      tts=להמשך שיחה הקש 7
      read=cont,1,1,1,Number
      if(cont==7) goto=continue_${index}
    `);
  }

  // =====================
  // שאלה חדשה / המשך
  // =====================
  if (input.question) {

    const text = await speechToText();
    const answer = await askAI(text);

    let session;

    // המשך שיחה
    if (input.stage?.startsWith("continue_")) {
      const index = parseInt(input.stage.split("_")[1]);
      session = user.sessions[index];
    } else {
      session = {
        name: sessionName(text),
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
