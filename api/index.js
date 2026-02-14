export default function handler(req, res) {
    // שליפת המשתנה user_id שיחזור מהמאזין
    const { user_id } = req.query;

    // הגדרת כותרות טקסט נקי
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    if (!user_id) {
        // שלב א: המאזין נכנס.
        // אנחנו מבקשים הקשה (read). 
        // השתמשתי ב- "read=f-none" - זה אומר אל תשמיע כלום, פשוט תחכה להקשה.
        console.log("Waiting for user digits...");
        return res.status(200).send("read=f-none,user_id,1,20,1,digits,yes,no,no");
    } else {
        // שלב ב: המאזין הקיש מספר.
        console.log("Received ID: " + user_id);
        
        // פקודת כניסה ומעבר לשלוחה 4/1/1
        // הוספתי בכוונה את התווים הנדרשים בלבד
        const response = `id_send_login=${user_id}\ngo_to_folder=/4/1/1`;
        return res.status(200).send(response);
    }
}
