export default function handler(req, res) {
    // שליפת הספרות - ימות המשיח שולחת את זה ב-Query String
    const { user_id } = req.query;

    // הגדרת כותרות - חשוב מאוד לימות המשיח!
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    if (!user_id) {
        // שלב א: בקשת הקשה. 
        // אם אין לך TTS, החלפתי את "t-טקסט" ב-"תפוח" (שם של קובץ שמע שלא קיים) 
        // המערכת פשוט תשתוק ותחכה להקשה - זה מצוין לבדיקה!
        console.log("Requesting digits from user...");
        
        // כאן הגדרתי את מודול ההקשה במצב ספרות (digits)
        const readCommand = "read=f-empty,user_id,1,20,1,digits,yes,no";
        return res.status(200).send(readCommand);
    } else {
        // שלב ב: המשתמש הקיש ספרות
        console.log("Received digits: " + user_id);
        
        // ביצוע לוגין ומעבר לשלוחה 4/1/1
        const response = `id_send_login=${user_id}\ngo_to_folder=/4/1/1`;
        return res.status(200).send(response);
    }
}
