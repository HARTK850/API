/**
 * api/ivr.js
 * ============================================================
 * ENDPOINT ראשי — מחבר בין ימות המשיח ל-Gemini AI
 *
 * ימות המשיח שולח GET/POST עם הפרמטרים הבאים:
 *   ApiPhone   - מספר המתקשר
 *   ApiDID     - מספר המערכת שנקרא
 *   ApiCallId  - מזהה ייחודי לשיחה
 *   ApiExtension - השלוחה הנוכחית
 *   ApiEnterID - מה המשתמש הקיש (אם קיים)
 *   ApiRecordFile - נתיב לקובץ הקלטה בשרת ימות
 *   יכול להגיע גם: read_id (טקסט שהמשתמש הקיש/אמר)
 *
 * המערכת מחזירה טקסט פשוט לימות:
 *   id_list_message=... (להשמעת טקסט TTS)
 *   read=...            (לקבלת קלט נוסף)
 *   go_to_folder=...    (ניתוב לשלוחה)
 * ============================================================
 */

const https = require("https");
const http  = require("http");
const url   = require("url");

// ─── הגדרות גלובליות ────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const YEMOT_BASE     = "https://www.call2all.co.il/ym/api/";

// פרומפט מערכת קבוע — ניתן לדרוס דרך env
const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT ||
  `אתה עוזר קולי חכם המשולב במערכת IVR בעברית.
תפקידך לענות בקצרה ובבהירות על שאלות המשתמשים.
כללים חשובים:
- ענה תמיד בעברית
- עד 2 משפטים קצרים בלבד
- אל תשתמש בסימנים מיוחדים, ניקוד, או HTML
- אם לא הבנת — בקש בנימוס לחזור על הדברים
- ענה בסגנון ישיר ונעים לאוזן בטלפון`;

// ─── פונקציות עזר ────────────────────────────────────────────

/**
 * HTTP GET פשוט — מחזיר Buffer
 */
function httpGet(targetUrl) {
  return new Promise((resolve, reject) => {
    const lib = targetUrl.startsWith("https") ? https : http;
    lib.get(targetUrl, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end",  () => resolve({ buffer: Buffer.concat(chunks), status: res.statusCode, headers: res.headers }));
      res.on("error", reject);
    }).on("error", reject);
  });
}

/**
 * HTTP POST עם JSON body — מחזיר JSON
 */
function httpPostJSON(targetUrl, body) {
  return new Promise((resolve, reject) => {
    const parsed  = new URL(targetUrl);
    const data    = JSON.stringify(body);
    const options = {
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      method:   "POST",
      headers: {
        "Content-Type":   "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };
    const lib = parsed.protocol === "https:" ? https : http;
    const req = lib.request(options, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end",  () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { resolve({ error: "parse_error", raw }); }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

/**
 * הורדת קובץ שמע מימות המשיח ע"י DownloadFile API
 * @param {string} yemotToken  - טוקן API של ימות
 * @param {string} filePath    - נתיב הקובץ (ivr2:/xxx)
 * @returns {Promise<Buffer>}
 */
async function downloadAudioFromYemot(yemotToken, filePath) {
  const dlUrl = `${YEMOT_BASE}DownloadFile?token=${encodeURIComponent(yemotToken)}&path=${encodeURIComponent(filePath)}`;
  const result = await httpGet(dlUrl);
  if (result.status !== 200) {
    throw new Error(`DownloadFile נכשל עם סטטוס ${result.status}`);
  }
  return result.buffer;
}

/**
 * שליחת טקסט + (אופציונלי) אודיו ל-Gemini
 * משתמש ב-gemini-1.5-flash שתומך ב-multimodal
 *
 * @param {string}  userText   - טקסט מהמשתמש (מה הקיש/שאל)
 * @param {Buffer|null} audioBuffer - קובץ שמע (אם קיים)
 * @param {string}  mimeType   - "audio/wav" / "audio/mpeg"
 * @param {Array}   history    - היסטוריית שיחה [{role,text}]
 * @returns {Promise<string>}
