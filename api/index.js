export default function handler(req, res) {
    // קבלת הפרמטרים מימות המשיח (הם מגיעים ב-Query String)
    const { digits } = req.query;

    // הגדרת כותרות כדי שימות המשיח יזהה את זה כטקסט פשוט
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    if (!digits) {
        // שלב א: המשתמש עוד לא הקיש. נפעיל את מודול הקשה (במצב ספרות)
        // הפקודה "read" מבצעת הקשה של טקסט/ספרות
        const readCommand = "read=t-נא להקיש את מספר הזיהוי ובסיום סולמית,digits,1,20,1,digits,yes,no";
        return res.status(200).send(readCommand);
    } else {
        // שלב ב: המשתמש הקיש ספרות. נבצע לוגין ונעבור לתור
        const response = `id_send_login=${digits}\ngo_to_folder=/4/1/1`;
        return res.status(200).send(response);
    }
}