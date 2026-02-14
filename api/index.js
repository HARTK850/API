export default function handler(req, res) {
    // שליפת הספרות שהוקשו (אם הוקשו)
    const { user_id } = req.query;

    // הגדרת כותרת טקסט פשוט
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    if (!user_id) {
        // שלב א: המאזין נכנס בפעם הראשונה.
        // אנחנו מפעילים את מודול ההקשה (read). 
        // שים לב: 'digits' בסוף הפקודה מגדיר למערכת להשתמש במקלדת ספרות.
        console.log("מאזין נכנס - שולח בקשה להקשת ספרות");
        const readCmd = "read=t-נא להקיש את מספר הזיהוי ובסיום סולמית,user_id,1,20,1,digits,yes,no";
        return res.status(200).send(readCmd);
    } else {
        // שלב ב: המאזין הקיש את הספרות והן חזרו לשרת בתוך user_id
        console.log("התקבלו ספרות מהמאזין: " + user_id);
        
        // ביצוע כניסה עם המספר שהוקש ומעבר לשלוחת התור (4/1/1)
        const response = `id_send_login=${user_id}\ngo_to_folder=/4/1/1`;
        return res.status(200).send(response);
    }
}
