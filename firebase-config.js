/* חיבור לחשבונות תלמידים (Firebase) – ראו ACCOUNTS.md
   כל עוד PSHUT_FIREBASE ריק (null), האתר עובד כרגיל: ההתקדמות נשמרת רק במכשיר, וכפתור ההרשמה מוסתר.
   את ההגדרות מעתיקים מ-Firebase ← Project settings ← Your apps ← SDK setup and configuration ← Config.
   (ההגדרות האלה לא סודיות – מותר שיהיו בקוד של האתר. ההגנה על המידע היא בכללי האבטחה, firestore.rules) */
window.PSHUT_FIREBASE = null;
/* דוגמה:
window.PSHUT_FIREBASE = {
  apiKey: "AIza...",
  authDomain: "pshut-math.firebaseapp.com",
  projectId: "pshut-math",
  appId: "1:123:web:abc"
};
*/

/* כתובות המייל של המורים שרשאים לראות את דף "מבט מורה" (admin.html).
   חייבות להיות זהות לרשימה ב-firestore.rules. */
window.PSHUT_ADMINS = [];

/* כניסה בקישור למייל (בלי Google). במסלול החינמי של Firebase מוגבל ל-5 מיילים ביום,
   ולכן כבוי. להפעלה: true (מומלץ רק אחרי חיבור אמצעי תשלום ב-Firebase, מסלול Blaze). */
window.PSHUT_EMAIL_LINK = false;
