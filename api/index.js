export default function handler(req, res) {
    // שליפת המשתנה user_id
    const { user_id } = req.query;

    // הגדרת כותרות טקסט נקי - חובה!
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    if (!user_id) {
        // שלב א: המאזין נכנס ל-API.
        // אנחנו מפעילים את ה"מקלדת" (read).
        // הפרמטרים:
        // t- .  -> משמיע שקט קצר (במקום טקסט שיכול להיתקע)
        // user_id -> שם המשתנה שיחזור לשרת
        // 1,20 -> מינימום ומקסימום ספרות
        // 1 -> מספר ניסיונות
        // digits -> מצב מקלדת ספרות (כמו שביקשת!)
        // yes -> לבקש אישור (הקשת... לאישור הקש 1)
        // no -> לא להקריא את הספרות אחרי ההקשה
        // 15 -> זמן המתנה של 15 שניות
        
        console.log("Entering Input Mode - Waiting for digits");
        const readCommand = "read=t-.,user_id,1,20,1,digits,yes,no,15";
        return res.status(200).send(readCommand);
    } else {
        // שלב ב: המשתמש הקיש ספרות ואישר ב-1
        console.log("User entered ID: " + user_id);
        
        // ביצוע לוגין ומעבר לשלוחה 4/1/1
        const response = `id_send_login=${user_id}\ngo_to_folder=/4/1/1`;
        return res.status(200).send(response);
    }
}
