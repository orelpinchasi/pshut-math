"""בונה את index.html של האפליקציה מתוך קובץ ה-HTML של האתר ב-Claude.
שימוש: python3 tools/build.py source.html index.html"""
import re, sys
src, out = sys.argv[1], sys.argv[2]
h = open(src, encoding="utf-8").read()
h = re.sub(r'</?untrusted-document-[0-9a-f]+>', '', h).strip()
assert h.startswith('<!DOCTYPE'), "not an HTML page"

head_add = '''<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#141b3a">
<meta name="description" content="כל הסרטונים של הערוץ במקום אחד – הסברים, תרגול ושאלות בגרות פתורות, לפי כיתה, שאלון ונושא.">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon-192.png" type="image/png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="פשוט להצליח">
<meta property="og:type" content="website">
<meta property="og:site_name" content="פשוט להצליח במתמטיקה">
<meta property="og:title" content="פשוט להצליח במתמטיקה – כל הסרטונים במקום אחד">
<meta property="og:description" content="הסברים, תרגול ושאלות בגרות פתורות – לפי כיתה, שאלון ונושא. חטיבת ביניים, 3, 4 ו-5 יח״ל.">
<meta property="og:url" content="https://orelpinchasi.github.io/pshut-math/">
<meta property="og:image" content="https://orelpinchasi.github.io/pshut-math/og-star.jpg">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="512">
<meta property="og:image:height" content="512">
<meta property="og:locale" content="he_IL">
<meta name="twitter:card" content="summary">
<meta name="twitter:image" content="https://orelpinchasi.github.io/pshut-math/og-star.jpg">'''
h, n = re.subn(r'<meta name="viewport"[^>]*>', head_add, h, count=1); assert n

h = h.replace('</style>', '''/* app mode */
header.top{padding-top:env(safe-area-inset-top)}
body{padding-bottom:env(safe-area-inset-bottom)}
@media (display-mode:standalone){html{overscroll-behavior-y:none}}
.install-bar{position:fixed;inset-inline:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:50;background:var(--night);color:#fff;border-radius:16px;padding:12px 14px;display:flex;gap:12px;align-items:center;box-shadow:0 10px 30px rgba(0,0,0,.3);max-width:520px;margin:0 auto}
.install-bar[hidden]{display:none}
.install-bar p{margin:0;flex:1;font-size:14px;line-height:1.4}
.install-bar b{color:var(--gold2)}
.install-bar button{border:0;font:inherit;border-radius:999px;padding:8px 16px;cursor:pointer}
.install-bar .go{background:var(--gold);color:var(--night);font-weight:700}
.install-bar .x{background:transparent;color:#fff;opacity:.7;padding:8px}
</style>''', 1)

# תמונות ממוזערות: ישירות מיוטיוב, טעינה עצלה של הדפדפן עצמו
old = '<img data-th="${tid}" alt="" hidden>'
assert old in h, "thumbnail markup changed"
h = h.replace(old, '<img src="https://i.ytimg.com/vi/${tid}/mqdefault.jpg" alt="" loading="lazy" decoding="async" onerror="this.remove()">')
a = h.index('/* תמונות ממוזערות'); b = h.index('function hydrate()')
c = h.index('\n', b)
h = h[:a] + '/* תמונות ממוזערות – נטענות ישירות מיוטיוב */\nfunction hydrate(){}' + h[c:]
assert 'th/${k}' not in h

install = '''<div class="install-bar" id="installBar" hidden>
  <p id="installText"><b>התקינו את האפליקציה</b><br>גישה מהירה לכל הסרטונים ממסך הבית</p>
  <button class="go" id="installGo">התקנה</button>
  <button class="x" id="installX" aria-label="סגירה">✕</button>
</div>
<script>
if("serviceWorker" in navigator){addEventListener("load",()=>navigator.serviceWorker.register("sw.js").then(r=>r.update()).catch(()=>{}));}
(function(){
  const bar=document.getElementById("installBar"),go=document.getElementById("installGo"),x=document.getElementById("installX");
  const standalone=matchMedia("(display-mode: standalone)").matches||navigator.standalone;
  let dismissed=false;try{dismissed=localStorage.getItem("installDismissed")==="1"}catch(e){}
  if(standalone||dismissed)return;
  let deferred=null;
  addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;bar.hidden=false;});
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
  if(ios){document.getElementById("installText").innerHTML='<b>התקינו את האפליקציה</b><br>לחצו על <b>שיתוף</b> ⬆ ואז <b>״הוספה למסך הבית״</b>';go.hidden=true;setTimeout(()=>bar.hidden=false,2500);}
  go.onclick=async()=>{if(!deferred)return;deferred.prompt();await deferred.userChoice;deferred=null;bar.hidden=true;};
  x.onclick=()=>{bar.hidden=true;try{localStorage.setItem("installDismissed","1")}catch(e){}};
  addEventListener("appinstalled",()=>bar.hidden=true);
})();
</script>
</body>'''
i = h.rindex('</body>'); h = h[:i] + install + h[i+7:]
open(out, 'w', encoding="utf-8").write(h)
print("ok", len(h))
