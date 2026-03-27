import formidable from 'formidable';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
    // הגדרת Header כטקסט פשוט חובה לימות המשיח
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    try {
        console.log("--- New Request Received ---"); // זה חייב להופיע בלוגים
        
        const form = formidable();
        const [fields, files] = await form.parse(req);

        if (!files.audio_file) {
            return res.status(200).send("id_list_message=t-השרת פועל אך לא התקבל קובץ שמע");
        }

        // אם הגעת לכאן, ה-API עובד! ננסה להפעיל את Gemini
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

        return res.status(200).send("id_list_message=t-התקבל קובץ. אני שולח למודל שלושים נקודה אחת פלאש");

    } catch (error) {
        console.error("Internal Error:", error);
        return res.status(200).send(`id_list_message=t-שגיאה בתוך השרת. ${error.message}`);
    }
}
