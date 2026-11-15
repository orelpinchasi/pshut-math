# "צלמו שאלה" – הפעלת השרת (פעם אחת, כ-15 דקות, בחינם)

הדף `solve.html` כבר באוויר במצב הדגמה. כדי שיפתור שאלות אמיתיות צריך:
1. מפתח של "מוח" שפותר (Gemini – חינם).
2. שרת קטן שמחזיק את המפתח בסוד (Cloudflare – חינם).

**לעולם לא שמים את המפתח בקוד של האתר**, כי כל מי שנכנס לאתר יוכל לראות אותו.

## שלב 1: מפתח חינמי של Gemini
1. נכנסים ל-https://aistudio.google.com עם חשבון גוגל.
2. לוחצים **Get API key** ואז **Create API key**.
3. מעתיקים את המפתח (מתחיל ב-`AIza`) ושומרים אותו רק אצלכם.

> במסלול החינמי יש מכסה יומית מוגבלת, וגוגל רשאית להשתמש בתוכן לשיפור המודלים שלה.
> אם בעתיד תרצו יותר שאלות או פרטיות מלאה: אפשר להוסיף גם מפתח של Claude (ראו בהמשך), וללא שינוי בקוד.

## שלב 2: השרת ב-Cloudflare
1. נרשמים ב-https://dash.cloudflare.com
2. **Compute (Workers)** ← **Create** ← **Start with Hello World** ← שם: `pshut-solve` ← **Deploy**.
3. **Edit code** ← מוחקים הכל ← מדביקים את כל התוכן של `solve-worker.js` ← **Deploy**.
4. חוזרים ל-Worker ← **Settings** ← **Variables and Secrets** ← **Add**:
   - Type: **Secret**, Name: `GEMINI_API_KEY`, Value: המפתח משלב 1 ← **Deploy**.
5. מעתיקים את כתובת ה-Worker (משהו כמו `https://pshut-solve.<שם>.workers.dev`).
   כשפותחים אותה בדפדפן צריך להופיע `{"ok":true,...}`.

## שלב 3: חיבור הדף לשרת
שולחים את הכתובת משלב 2 ל-Claude ("תחבר את צלמו שאלה לכתובת ..."), או עורכים לבד:
ב-`solve.html` מחפשים את השורה `const WORKER_URL = "";` ומדביקים את הכתובת בין המירכאות.

## מגבלה יומית לכל תלמיד (מומלץ)
כדי שתלמיד אחד לא ינצל את כל המכסה החינמית:
1. **Storage & Databases** ← **KV** ← **Create** ← שם `LIMITS`.
2. ב-Worker: **Settings** ← **Bindings** ← **Add** ← **KV namespace** ← Variable name: `LIMITS`.

ברירת המחדל היא 15 שאלות ביום לתלמיד. אפשר לשנות עם המשתנה `DAILY_LIMIT`, למשל `3`.

## בעתיד: Claude כגיבוי או כספק ראשי (בתשלום)
מוסיפים Secret נוסף בשם `ANTHROPIC_API_KEY`, עם מפתח מ-https://console.anthropic.com (שם גם כדאי להגדיר תקרת הוצאה חודשית).
כשמוגדרים שני המפתחות, Gemini עונה קודם, ו-Claude נכנס רק כשהמכסה החינמית נגמרת.
כדי ש-Claude יענה תמיד: מוסיפים משתנה `PROVIDER` = `claude`.

## כל ההגדרות
| משתנה | מה עושה | ברירת מחדל |
|---|---|---|
| `GEMINI_API_KEY` | מפתח Gemini (Secret) | – |
| `ANTHROPIC_API_KEY` | מפתח Claude (Secret, רשות) | – |
| `PROVIDER` | `gemini` או `claude` | Gemini, ואז Claude כגיבוי |
| `GEMINI_MODEL` | איזה מודל Gemini | `gemini-flash-latest` |
| `MODEL` | איזה מודל Claude | `claude-sonnet-5-5` |
| `DAILY_LIMIT` | שאלות ביום לתלמיד (עם KV) | 15 |
| `ALLOWED_ORIGINS` | אתרים שמותר להם לפנות לשרת | האתר ב-GitHub Pages |

## איך משנים את סגנון ההסבר
כל ההוראות למורה הדיגיטלי נמצאות ב-`SYSTEM_PROMPT` בראש `solve-worker.js`, בעברית.
אפשר לערוך שם עקרונות וביטויים קבועים שלכם, ואז ללחוץ שוב **Deploy**.
