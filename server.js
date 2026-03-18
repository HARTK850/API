const express = require('express');
const cors = require('cors');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const SHEET_ID = process.env.SHEET_ID;
const GOOGLE_SERVICE_ACCOUNT = process.env.GOOGLE_SERVICE_ACCOUNT;

async function getDoc() {
    if (!GOOGLE_SERVICE_ACCOUNT || !SHEET_ID) {
        throw new Error("חסרים נתוני התחברות לגוגל");
    }
    const credentials = JSON.parse(GOOGLE_SERVICE_ACCOUNT);
    const serviceAccountAuth = new JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    return doc;
}

app.all('/api/ymotAddText', async (req, res) => {
    try {
        const id = req.query.new_id;
        const content = req.query.new_content;
        if (!id || !content) return res.send("id_list_message=t-שגיאה, חסרים נתונים");
        const doc = await getDoc();
        const sheet = doc.sheetsByIndex[0];
        await sheet.addRow({ ID: id, Content: content });
        res.send("id_list_message=t-הנתונים נשמרו בהצלחה למערכת");
    } catch (error) { res.send("id_list_message=t-חלה שגיאה בשמירת הנתונים"); }
});

app.get('/api/ymotGetText', async (req, res) => {
    try {
        const id = req.query.id_to_search;
        if (!id) return res.send("id_list_message=t-לא התקבל מזהה לחיפוש");
        const doc = await getDoc();
        const sheet = doc.sheetsByIndex[0];
        const rows = await sheet.getRows();
        const row = rows.find(r => r.get('ID') === String(id));
        if (row) res.send(`id_list_message=t-${row.get('Content')}`);
        else res.send("id_list_message=t-המזהה לא נמצא באקסל");
    } catch (error) { res.send("id_list_message=t-חלה שגיאת מערכת בחיפוש"); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
module.exports = app;
