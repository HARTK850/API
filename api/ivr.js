import { put } from "@vercel/blob";

// ========================
// ENV
// ========================
const KEYS = process.env.GEMINI_KEYS.split(",");
const TOKEN = process.env.CALL2ALL_TOKEN;

let keyIndex = 0;

function getKey() {
  const key = KEYS[keyIndex];
  keyIndex = (keyIndex + 1) % KEYS.length;
  return key;
}

// ========================
// FETCH AUDIO
// ========================
async function fetchRecording(path) {

  const url = `https://www.call2all.co.il/ym/api/DownloadFile?token=${TOKEN}&path=${path}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("download failed");

  return await res.arrayBuffer();
}

// ========================
// GEMINI
// ========================
async function askAI(buffer, context) {

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
זה אודיו של שאלה. תמלל וענה. אם לא ברור - תגיד שלא הבנת.`
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

      const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (txt) return txt;

    } catch {}
  }

  return "לא הבנתי את השאלה";
}

// ========================
// DB
// ========================
async function save(phone, data) {
  await put(`users/${phone}.json`, JSON.stringify(data), { access: "public" });
}

async function load(phone) {
  try {
    const res = await fetch(`https://blob.vercel-storage.com/users/${phone}.json`);
    return await res.json();
  } catch {
    return { sessions: [] };
  }
}

// ========================
// CONTEXT
// ========================
function context(session) {

  if (!session) return "";

  return session.messages
    .slice(-5)
    .map(m => `שאלה: ${m.q}\nתשובה: ${m.a}`)
    .join("\n");
}

// ========================
// MAIN
// ========================
export default async function handler(req, res) {

  try {

    const phone = req.body.ApiPhone || "unknown";
    const user = await load(phone);

    // ======================
    // ENTRY
    // ======================
    if (!req.body.action) {
      return res.send(`
go_to_folder=1
`);
    }

    // ======================
    // MENU ACTION
    // ======================
    if (req.body.action === "menu") {

      if (req.body.key === "1") {
        return res.send(`
go_to_folder=2
`);
      }

      if (req.body.key === "2") {
        return res.send(`
go_to_folder=3
`);
      }
    }

    // ======================
    // RECORD RESULT
    // ======================
    if (req.body.record) {

      const audio = await fetchRecording(req.body.record);

      let session = user.sessions.at(-1);

      if (!session) {
        session = { name: "שיחה", messages: [] };
        user.sessions.push(session);
      }

      const ctx = context(session);

      const answer = await askAI(audio, ctx);

      session.messages.push({
        q: "שאלה",
        a: answer
      });

      await save(phone, user);

      return res.send(`
tts=${encodeURIComponent(answer)}
go_to_folder=1
`);
    }

    // ======================
    // DEFAULT
    // ======================
    return res.send(`
go_to_folder=1
`);

  } catch (e) {

    console.log(e);

    return res.send(`
tts=אירעה שגיאה
go_to_folder=1
`);
  }
}
