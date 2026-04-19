import { put } from "@vercel/blob";

const KEYS = process.env.GEMINI_KEYS.split(",");
const TOKEN = process.env.CALL2ALL_TOKEN;

let keyIndex = 0;

function nextKey() {
  const key = KEYS[keyIndex];
  keyIndex = (keyIndex + 1) % KEYS.length;
  return key;
}

// ======================
// RESPONSE BUILDER
// ======================
function ivr(lines) {
  return lines.join("\n");
}

// ======================
// FETCH RECORD
// ======================
async function getAudio(path) {
  const url = `https://www.call2all.co.il/ym/api/DownloadFile?token=${TOKEN}&path=${path}`;
  const res = await fetch(url);
  return await res.arrayBuffer();
}

// ======================
// AI
// ======================
async function ask(buffer, context) {

  const base64 = Buffer.from(buffer).toString("base64");

  for (let i = 0; i < KEYS.length; i++) {

    const key = nextKey();

    try {

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: context + "\nזה אודיו של שאלה. תמלל וענה." },
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

      const txt =
        data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (txt) return txt;

    } catch {}
  }

  return "לא הבנתי, נסה שוב";
}

// ======================
// MEMORY
// ======================
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

// ======================
// CONTEXT
// ======================
function ctx(session) {
  if (!session) return "";

  return session.messages.slice(-5).map(m =>
    `שאלה:${m.q}\nתשובה:${m.a}`
  ).join("\n");
}

// ======================
// MAIN
// ======================
export default async function handler(req, res) {

  const phone = req.body.ApiPhone || "unknown";
  const body = req.body;

  let user = await load(phone);

  // ======================
  // ENTRY
  // ======================
  if (!body.menu && !body.question && !body.choice) {

    return res.send(ivr([
      "tts=ברוכים הבאים",
      "tts=לצאט חדש הקש 1",
      "tts=להיסטוריה הקש 2",
      "read=menu,1,1,1,Number"
    ]));
  }

  // ======================
  // MENU
  // ======================
  if (body.menu == "1") {

    return res.send(ivr([
      "tts=הקלט שאלה",
      "record=question,/recordings,q.wav"
    ]));
  }

  if (body.menu == "2") {

    if (!user.sessions.length) {
      return res.send(ivr([
        "tts=אין שיחות",
        "goto=menu"
      ]));
    }

    let lines = ["tts=בחר שיחה"];

    user.sessions.forEach((s, i) => {
      lines.push(`tts=לשיחה ${s.name} הקש ${i + 1}`);
    });

    lines.push(`read=choice,1,${user.sessions.length},1,Number`);

    return res.send(ivr(lines));
  }

  // ======================
  // QUESTION
  // ======================
  if (body.question) {

    const audio = await getAudio(body.question);

    let session = user.sessions.at(-1);

    if (!session) {
      session = { name: "שיחה חדשה", messages: [] };
      user.sessions.push(session);
    }

    const answer = await ask(audio, ctx(session));

    session.messages.push({
      q: "שאלה",
      a: answer
    });

    await save(phone, user);

    return res.send(ivr([
      "play=/music/wait",
      "tts=" + encodeURIComponent(answer),
      "goto=menu"
    ]));
  }

  return res.send("tts=שגיאה");
}
