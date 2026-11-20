// פשוט להצליח במתמטיקה – service worker
const CACHE = "pshut-v32";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "solve.html", "learn.html", "lesson.html", "bagrut.html", "worksheets.html", "yesodi.html"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  // סרטונים: תמיד ישירות מהרשת (בקשות Range לא עובדות דרך המטמון, במיוחד באייפון)
  if (req.headers.has("range") || /\.(mp4|webm|mov|mp3)$/i.test(url.pathname)) return;
  // דפים: קודם רשת (כדי לקבל עדכונים), ואם אין אינטרנט – מהמטמון
  if (req.mode === "navigate") {
    // כל דף נשמר בנפרד (index.html / solve.html), כדי שדף אחד לא ידרוס את השני במטמון
    const page = (url.pathname.match(/([\w-]+\.html)$/) || [, "index.html"])[1];
    e.respondWith(fetch(req).then(r => { const c = r.clone(); if (r.ok) caches.open(CACHE).then(x => x.put(page, c)); return r; })
      .catch(() => caches.match(page)));
    return;
  }
  // קובצי נתונים (שאלונים, פתרונות, שיעורים): קודם רשת, כדי שתוכן חדש יופיע מיד; בלי אינטרנט – מהמטמון
  if (url.origin === location.origin && /(\.json|^\/[^?]*yesodi-[\w-]+\.js)$/i.test(url.pathname)) {
    e.respondWith(fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); } return r; })
      .catch(() => caches.match(req)));
    return;
  }
  // תמונות ממוזערות, גופנים וקבצי האפליקציה: מהמטמון, ומתעדכן ברקע
  if (url.origin === location.origin || /(^|\.)(gstatic\.com|googleapis\.com)$/.test(url.hostname)) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
  }
});
