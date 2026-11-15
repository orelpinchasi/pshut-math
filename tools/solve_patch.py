"""מוסיף לאתר את הכניסה ל"צלמו שאלה" (solve.html) וקישורים ישירים לנושא (?topic=...).
נקרא אוטומטית מתוך build.py. אפשר גם להריץ ישירות: python3 tools/solve_patch.py index.html
הפעולה בטוחה להרצה חוזרת (לא מוסיפה פעמיים)."""
import sys

MARK = "<!-- solve-entry -->"

CSS = '''/* צלמו שאלה */
nav.links a.snap{background:rgba(245,184,61,.16);border:1px solid rgba(245,184,61,.5);color:#ffd77a;opacity:1;font-weight:700}
nav.links a{white-space:nowrap}
@media (max-width:760px){nav.links a.snap{display:inline-block;padding:7px 11px}nav.links a.snap .t{display:none}}
.snapcta{display:flex;align-items:center;gap:12px;max-width:560px;margin:14px 0 0;text-decoration:none;background:rgba(255,255,255,.08);border:1px solid rgba(245,184,61,.45);border-radius:18px;padding:12px 16px;color:#fff;transition:.15s}
.snapcta:hover{background:rgba(255,255,255,.13)}
.snapcta .i{font-size:28px;line-height:1}
.snapcta b{display:block;color:#ffd77a;font-size:16px}
.snapcta span{font-size:14px;opacity:.85}
.snapcta .go{margin-inline-start:auto;background:#f5b83d;color:#141b3a;font-weight:700;border-radius:999px;padding:7px 14px;white-space:nowrap;font-size:14px;opacity:1}
</style>'''

NAV_OLD = '<a class="cta" href="#contact">שיעור אישי</a>'
NAV_NEW = '<a class="snap" href="solve.html" aria-label="צלמו שאלה">📸<span class="t"> צלמו שאלה</span></a>\n      ' + NAV_OLD

HERO_OLD = '<div class="lp-day" id="lpDay"></div>'
HERO_NEW = ('<a class="snapcta" href="solve.html"><span class="i">📸</span><div><b>נתקעתם בשאלה?</b>'
            '<span>צלמו אותה וקבלו שיעור קצר עם הסבר, שלב אחרי שלב</span></div><span class="go">צלמו ←</span></a>\n      '
            + HERO_OLD)

DEEPLINK = '''<script>
/* קישור ישיר לנושא או לחיפוש: ?topic=quadratic  או  ?q=אחוזים  (משמש את "צלמו שאלה") */
(function(){
  const p=new URLSearchParams(location.search),t=p.get("topic"),q=p.get("q");
  try{
    if(t&&typeof TOPICS!=="undefined"&&TOPICS[t]){state.level="all";state.group=null;state.topic=t;render();}
    else if(q){document.getElementById("q").value=q;state.q=q;render();}
    else return;
    addEventListener("load",()=>document.getElementById("videos").scrollIntoView());
  }catch(e){}
})();
</script>
</body>'''


def patch(h: str) -> str:
    if MARK in h:
        return h
    assert NAV_OLD in h and HERO_OLD in h, "header/hero markup changed – update tools/solve_patch.py"
    h = h.replace('</style>', CSS, 1)
    h = h.replace(NAV_OLD, NAV_NEW, 1)
    h = h.replace(HERO_OLD, HERO_NEW, 1)
    i = h.rindex('</body>')
    h = h[:i] + MARK + '\n' + DEEPLINK + h[i + 7:]
    return h


if __name__ == "__main__":
    path = sys.argv[1]
    s = open(path, encoding="utf-8").read()
    open(path, "w", encoding="utf-8").write(patch(s))
    print("ok")
