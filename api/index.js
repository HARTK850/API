export default function handler(req, res) {
    // לוג לבדיקה - תראה ב-Vercel מה המערכת שולחת בכתובת
    console.log("Query parameters received:", req.query);

    const { user_id } = req.query;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    if (!user_id) {
        // שלב א: בקשת הקשה
        // הפרמטרים: f-none (שקט), שם המשתנה, מינימום 1, מקסימום 20, ניסיון 1, מצב ספרות, אישור ב-1, ללא הקראת ספרות, המתנה של 15 שניות!
        console.log("שולח פקודת הקשה למערכת - ממתין 15 שניות");
        const readCommand = "read=f-none,user_id,1,20,1,digits,yes,no,15";
        return res.status(200).send(readCommand);
    } else {
        // שלב ב: המשתמש הקיש ספרות
        console.log("התקבל זיהוי מהמשתמש: " + user_id);
        const response = `id_send_login=${user_id}\ngo_to_folder=/4/1/1`;
        return res.status(200).send(response);
    }
}
