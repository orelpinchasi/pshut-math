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
NAV_NEW = ('<a class="snap" href="solve.html" aria-label="צלמו שאלה">📸<span class="t"> צלמו שאלה</span></a>\n      '
           '<a class="snap" href="lesson.html" aria-label="שיעור פרטי">🎓<span class="t"> שיעור פרטי</span></a>\n      ' + NAV_OLD)

HERO_OLD = '<div class="lp-day" id="lpDay"></div>'
HERO_NEW = ('<a class="snapcta" href="solve.html"><span class="i">📸</span><div><b>נתקעתם בשאלה?</b>'
            '<span>צלמו אותה וקבלו שיעור קצר עם הסבר, שלב אחרי שלב</span></div><span class="go">צלמו ←</span></a>\n      '
            '<a class="snapcta" href="lesson.html"><span class="i">🎓</span><div><b>רוצים לתרגל?</b>'
            '<span>שיעור פרטי: תרגילים מקל ועד קשה, פותרים ביחד שלב אחרי שלב</span></div><span class="go">מתרגלים ←</span></a>\n      '
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


# ===== באנר גדול: שיעור פרטי בחינם =====
FREE_MARK = "<!-- free-lesson-banner -->"
FREE_CSS = """<style>
.freeles{position:relative;overflow:hidden;background:radial-gradient(700px 300px at 15% 0%,rgba(255,215,122,.35),transparent 60%),linear-gradient(135deg,#f5b83d,#ffcf5c 55%,#f5b83d);color:#141b3a;padding:34px 0 30px}
.freeles::before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.18;background-image:radial-gradient(2px 2px at 10% 20%,#fff 50%,transparent 51%),radial-gradient(2px 2px at 85% 30%,#fff 50%,transparent 51%),radial-gradient(1.5px 1.5px at 60% 80%,#fff 50%,transparent 51%)}
.freeles .wrap{position:relative;display:grid;gap:18px;align-items:center}
.freeles .tag{display:inline-block;background:#141b3a;color:#ffd77a;font-weight:800;border-radius:999px;padding:5px 14px;font-size:14px;letter-spacing:.3px}
.freeles h2{font-family:"Secular One",Rubik,sans-serif;font-weight:400;font-size:clamp(34px,8vw,58px);line-height:1.05;margin:10px 0 6px}
.freeles h2 .free{display:inline-block;background:#141b3a;color:#ffd77a;border-radius:16px;padding:0 14px;transform:rotate(-2deg)}
.freeles p.sub{font-size:clamp(17px,4.2vw,21px);margin:0;max-width:640px;font-weight:500}
.freeles .feats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:4px 0 0;padding:0;list-style:none}
.freeles .feats li{background:rgba(255,255,255,.55);border-radius:16px;padding:10px 12px;font-weight:600;font-size:15px;line-height:1.35}
.freeles .feats li b{display:block;font-size:22px;line-height:1.1;margin-bottom:3px}
.freeles .bigbtn{display:inline-flex;align-items:center;justify-content:center;gap:10px;background:#141b3a;color:#fff;text-decoration:none;font-family:"Secular One",Rubik,sans-serif;font-size:clamp(20px,5vw,26px);border-radius:20px;padding:16px 28px;box-shadow:0 14px 30px rgba(20,27,58,.35);transition:transform .15s}
.freeles .bigbtn:hover{transform:translateY(-2px)}
.freeles .bigbtn em{font-style:normal;color:#ffd77a}
.freeles .note{font-size:13.5px;opacity:.8;margin-top:6px}
.freeles .pulse{animation:flp 2.2s ease-in-out infinite}
@keyframes flp{0%,100%{box-shadow:0 14px 30px rgba(20,27,58,.35),0 0 0 0 rgba(20,27,58,.35)}50%{box-shadow:0 14px 30px rgba(20,27,58,.35),0 0 0 12px rgba(20,27,58,0)}}
@media (min-width:900px){.freeles .wrap{grid-template-columns:1.25fr 1fr}.freeles .feats{grid-template-columns:repeat(4,1fr)}.freeles .cta{text-align:center}}
nav.links a.free-nav{background:#f5b83d;color:#141b3a;opacity:1;font-weight:800;border-radius:999px}
</style>"""
FREE_SECTION = """<section class="freeles" id="private-lesson" aria-label="שיעור פרטי בחינם">
  <div class="wrap">
    <div>
      <span class="tag">🎁 חדש באתר</span>
      <h2>שיעור פרטי<br><span class="free">בחינם.</span> באמת.</h2>
      <p class="sub">בוחרים נושא – או מצלמים את החומר שלכם – ומתרגלים איתי מתרגילים קלים ועד קשים, שלב אחרי שלב. טעיתם? מקבלים רמז, לא תשובה.</p>
      <ul class="feats">
        <li><b>🟢🟡🔴</b>מקל ועד קשה – בקצב שלכם</li>
        <li><b>💡</b>רמז ברגע שנתקעים</li>
        <li><b>📷</b>מצלמים את המחברת – ואני מראה איפה הטעות</li>
        <li><b>🎬</b>הסרטונים שלי באמצע השיעור</li>
      </ul>
    </div>
    <div class="cta">
      <a class="bigbtn pulse" href="lesson.html">🎓 <span>מתחילים <em>שיעור פרטי</em> עכשיו</span></a>
      <div class="note">בלי הרשמה · בלי תשלום · מכיתה ז׳ ועד 5 יח״ל</div>
    </div>
  </div>
</section>
"""
FREE_AFTER = '<section id="path"></section>'


def free_patch(h: str) -> str:
    if FREE_MARK in h:
        return h
    assert FREE_AFTER in h, "missing <section id=path> – update tools/solve_patch.py"
    h = h.replace('</head>', FREE_CSS + '\n</head>', 1)
    h = h.replace(FREE_AFTER, FREE_MARK + '\n' + FREE_SECTION + FREE_AFTER, 1)
    h = h.replace('<a class="snap" href="lesson.html" aria-label="שיעור פרטי">🎓<span class="t"> שיעור פרטי</span></a>',
                  '<a class="snap free-nav" href="lesson.html" aria-label="שיעור פרטי בחינם">🎓<span class="t"> שיעור פרטי בחינם</span></a>', 1)
    h = h.replace('<b>רוצים לתרגל?</b><span>שיעור פרטי: תרגילים מקל ועד קשה, פותרים ביחד שלב אחרי שלב</span></div><span class="go">מתרגלים ←</span>',
                  '<b>🎁 שיעור פרטי – בחינם!</b><span>תרגילים מקל ועד קשה, פותרים ביחד שלב אחרי שלב</span></div><span class="go">מתחילים ←</span>', 1)
    return h


if __name__ == "__main__":
    path = sys.argv[1]
    s = open(path, encoding="utf-8").read()
    open(path, "w", encoding="utf-8").write(free_patch(patch(s)))
    print("ok")
