import { put, get } from "@vercel/blob";

// =============================
// ENV
// =============================
const KEYS = process.env.GEMINI_KEYS.split(",");
const CALL2ALL_TOKEN = process.env.CALL2ALL_TOKEN;

let keyIndex = 0;

// =============================
// ROTATION
// =============================
function getKey() {
  const key = KEYS[keyIndex];
  keyIndex = (keyIndex + 1) % KEYS.length;
  return key;
}

// =============================
// FETCH RECORD FROM YEMOT
// =============================
async function fetchRecording(path) {

  const url = `https://www.call2all.co.il/ym/api/DownloadFile?token=${CALL2ALL_TOKEN}&path=${path}`;

  const res = await fetch(url);

  if (!res.ok) throw new Error("failed download");

  return await res.arrayBuffer();
}

// =============================
// GEMINI AUDIO
// =============================
async function askGeminiAudio(buffer) {

  const base64 = Buffer.from(buffer).toString("base64");

  for (let i = 0; i < KEYS.length; i++) {

    const key = getKey();

    try {

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  text: "זה קובץ אודיו של שאלה. תמלל וענה. אם לא הבנת תגיד שלא הבנת ובקש לחזור."
                },
                {
                  inlineData: {
                    mimeType: "audio/wav",
                    data: base64
                  }
                }
              ]
            }]
          })
        }
      );

      const data = await res.json();

      const answer =
        data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (answer) return answer;

    } catch {}
  }

  return "לא הצלחתי להבין, נסו שוב";
}

// =============================
// DB
// =============================
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

// =============================
// HELPERS
// =============================
function newSession() {
  return {
    name: "שיחה " + new Date().toLocaleTimeString(),
    messages: []
  };
}

function mainMenu() {
  return `
tts=ברוכים הבאים למערכת AI
tts=לצאט חדש הקש 1
tts=להיסטוריה הקש 2
read=menu,1,1,1,Number
`;
}

function historyMenu(user) {

  if (!user.sessions.length) {
    return `
tts=אין שיחות קודמות
goto=menu
`;
  }

  let txt = "tts=בחר שיחה ";

  user.sessions.forEach((s, i) => {
    txt += `tts=לשיחה ${s.name} הקש ${i + 1} `;
  });

  txt += `
read=choice,1,${user.sessions.length},1,Number
`;

  return txt;
}

// =============================
// MAIN
// =============================
export default async function handler(req, res) {

  const phone = req.body.ApiPhone || "unknown";
  const input = req.body;

  let user = await getUser(phone);

  // =========================
  // ENTRY
  // =========================
  if (!input.stage) {
    return res.send(mainMenu());
  }

  // =========================
  // MENU
  // =========================
  if (input.menu == "1") {
    return res.send(`
tts=בחרת צאט חדש
tts=הקלט שאלה לאחר הצליל
record=question,/recordings,q.wav
`);
  }

  if (input.menu == "2") {
    return res.send(historyMenu(user));
  }

  // =========================
  // HISTORY SELECT
  // =========================
  if (input.choice) {

    const index = parseInt(input.choice) - 1;
    const session = user.sessions[index];

    if (!session) return res.send("tts=שגיאה");

    let playback = "";

    session.messages.forEach(m => {
      playback += `tts=${encodeURIComponent(m.q)} `;
      playback += `tts=${encodeURIComponent(m.a)} `;
    });

    return res.send(`
${playback}
tts=להמשך שיחה הקש 7
read=cont,1,1,1,Number
`);
  }

  // =========================
  // CONTINUE
  // =========================
  if (input.cont == "7") {
    return res.send(`
tts=הקלט שאלה להמשך
record=question,/recordings,q.wav
`);
  }

  // =========================
  // QUESTION
  // =========================
  if (input.question) {

    const path = input.question;

    const audio = await fetchRecording(path);

    const answer = await askGeminiAudio(audio);

    let session = user.sessions.at(-1);

    if (!session) {
      session = newSession();
      user.sessions.push(session);
    }

    session.messages.push({
      q: "שאלה מוקלטת",
      a: answer
    });

    await saveUser(phone, user);

    return res.send(`
play=/music/wait
tts=${encodeURIComponent(answer)}
goto=menu
`);
  }

  // =========================
  // DEFAULT
  // =========================
  return res.send("tts=שגיאה כללית");
}
