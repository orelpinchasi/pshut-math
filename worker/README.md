# "צלם שאלה" – הפעלת השרת (פעם אחת, כ-15 דקות)

הדף `solve.html` כבר עובד במצב הדגמה. כדי שיפתור שאלות אמיתיות צריך שרת קטן שמחזיק את מפתח ה-API בסוד.
**לעולם לא שמים את המפתח בקוד של האתר** – כל מי שנכנס לאתר היה יכול לראות אותו ולהשתמש בו על חשבונך.

## 1. מפתח API של Claude
1. נכנסים ל-https://console.anthropic.com ונרשמים.
2. Billing → מוסיפים אמצעי תשלום וקרדיט התחלתי (מספיק לבדיקות רבות).
3. **מומלץ:** Limits → מגדירים תקרת הוצאה חודשית, כדי שלא יהיו הפתעות.
4. API Keys → Create Key → מעתיקים (מתחיל ב-`sk-ant-`). שומרים אותו רק אצלכם.

## 2. השרת ב-Cloudflare (חינם)
1. נרשמים ב-https://dash.cloudflare.com
2. Compute (Workers) → **Create** → **Start with Hello World** → שם: `pshut-solve` → Deploy.
3. **Edit code** → מוחקים הכל → מדביקים את כל התוכן של `solve-worker.js` → **Deploy**.
4. חוזרים ל-Worker → **Settings → Variables and Secrets → Add**:
   - Type: **Secret**, Name: `ANTHROPIC_API_KEY`, Value: המפתח משלב 1 → Save.
5. מעתיקים את כתובת ה-Worker (משהו כמו `https://pshut-solve.<שם>.workers.dev`).
   פתיחה שלה בדפדפן צריכה להציג `{"ok":true,...}`.

### מגבלה יומית (מומלץ מאוד לפני פרסום)
Storage & Databases → KV → Create → שם `LIMITS`.
ואז ב-Worker → Settings → Bindings → Add → KV namespace → Variable name: `LIMITS` → בוחרים את מה שיצרתם.
ברירת המחדל: 15 שאלות ביום לכל משתמש (אפשר לשנות עם משתנה `DAILY_LIMIT`).

## 3. חיבור הדף לשרת
ב-`solve.html` מחפשים את השורה:
```js
const WORKER_URL = "";
```
ומדביקים בין המירכאות את הכתובת משלב 2.5. שומרים ומעלים. זהו.

## הגדרות נוספות (רשות)
| משתנה | מה עושה | ברירת מחדל |
|---|---|---|
| `MODEL` | איזה מודל פותר | `claude-sonnet-5-5` |
| `ALLOWED_ORIGINS` | מאילו אתרים מותר לפנות לשרת | האתר ב-GitHub Pages + localhost |
| `DAILY_LIMIT` | שאלות ביום למשתמש (עם KV) | 15 |

## איך משנים את סגנון ההסבר
כל ההוראות למורה הדיגיטלי נמצאות ב-`SYSTEM_PROMPT` בראש `solve-worker.js` – בעברית.
אפשר לערוך שם עקרונות, ביטויים קבועים שלך, או דוגמאות, ולעשות Deploy מחדש.
