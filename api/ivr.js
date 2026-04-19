import { put } from "@vercel/blob";

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
// DOWNLOAD RECORD
// =============================
async function fetchRecording(path) {

  const url = `https://www.call2all.co.il/ym/api/DownloadFile?token=${CALL2ALL_TOKEN}&path=${path}`;

  const res = await fetch(url);

  if (!res.ok) throw new Error("download failed");

  return await res.arrayBuffer();
}

// =============================
// LOAD USER (FIXED)
// =============================
async function getUser(phone) {
  try {

    const res = await fetch(`https://blob.vercel-storage.com/users/${phone}.json`);

    if (!res.ok) throw new Error();

    return await res.json();

  } catch {
    return { sessions: [] };
  }
}

// =============================
// SAVE USER
// =============================
async function saveUser(phone, data) {

  const blob = await put(
    `users/${phone}.json`,
    JSON.stringify(data),
    { access: "public" }
  );

  return blob.url;
}

// =============================
// BUILD CONTEXT (🔥 חכם!)
// =============================
function buildContext(session) {

  if (!session || !session.messages.length) return "";

  // ניקח רק 5 הודעות אחרונות
  const last = session.messages.slice(-5);

  let context = "היסטוריית שיחה:\n";

  last.forEach(m => {
    context += `שאלה: ${m.q}\nתשובה: ${m.a}\n`;
  });

  return context;
}

// =============================
// GEMINI (עם הקשר!)
// =============================
async function askGeminiAudio(buffer, context) {

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
                  text: `${context}
זה קובץ אודיו של שאלה. תמלל וענה בהתאם להקשר.
אם לא הבנת - תגיד שלא הבנת.`
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

  return "לא הצלחתי להבין, נסה שוב";
}

// =============================
// MAIN
// =============================
export default async function handler(req, res) {

  try {

    const phone = req.body.ApiPhone || "unknown";
    const input = req.body;

    let user = await getUser(phone);

    // =========================
    // ENTRY
    // =========================
    if (!input.stage) {
      return res.send(`
tts=ברוכים הבאים
tts=לצאט חדש הקש 1
tts=להיסטוריה הקש 2
read=menu,1,1,1,Number
`);
    }

    // =========================
    // NEW CHAT
    // =========================
    if (input.menu == "1") {
      return res.send(`
tts=הקלט שאלה
record=question,/recordings,q.wav
`);
    }

    // =========================
    // HISTORY
    // =========================
    if (input.menu == "2") {

      if (!user.sessions.length) {
        return res.send("tts=אין שיחות");
      }

      let txt = "tts=בחר שיחה ";

      user.sessions.forEach((s, i) => {
        txt += `tts=לשיחה ${s.name} הקש ${i + 1} `;
      });

      txt += `read=choice,1,${user.sessions.length},1,Number`;

      return res.send(txt);
    }

    // =========================
    // QUESTION
    // =========================
    if (input.question) {

      const audio = await fetchRecording(input.question);

      let session = user.sessions.at(-1);

      if (!session) {
        session = {
          name: "שיחה חדשה",
          messages: []
        };
        user.sessions.push(session);
      }

      const context = buildContext(session);

      const answer = await askGeminiAudio(audio, context);

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

    return res.send("tts=שגיאה");

  } catch (err) {

    console.log(err);

    return res.send("tts=אירעה שגיאה");
  }
}
