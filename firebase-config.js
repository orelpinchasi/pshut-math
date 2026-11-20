/* חיבור לחשבונות תלמידים (Firebase, פרויקט pshut-math) – ראו ACCOUNTS.md
   ההגדרות האלה לא סודיות – מותר שיהיו בקוד של האתר. ההגנה על המידע היא בכללי האבטחה (firestore.rules).
   כדי לכבות זמנית את ההרשמה והחסימה: window.PSHUT_FIREBASE = null; */
window.PSHUT_FIREBASE = {
  apiKey: "AIzaSyBcBl1cPr0adkAZXTsG6gKuMIbY1C9irZU",
  authDomain: "pshut-math.firebaseapp.com",
  projectId: "pshut-math",
  storageBucket: "pshut-math.firebasestorage.app",
  messagingSenderId: "948214285322",
  appId: "1:948214285322:web:4e0f7025ff18283ff58bf3"
};

/* מי רשאי לראות את דף המורה (admin.html). חייב להיות זהה לרשימה ב-firestore.rules. */
window.PSHUT_ADMINS = ["orelpinchasi@gmail.com"];
