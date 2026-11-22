# תמונה ממוזערת (thumbnail) לסרטון בגרות: ליוטיוב ולגוגל (VideoObject).
# שימוש: python3 tools/video/thumb.py <מפתח> <מספר שאלה> [<מספר שאלה> ...]   ← יוצר media/thumbs/<מפתח>_<N>.jpg
import sys,os,re,asyncio,base64
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(os.path.dirname(HERE))
K=sys.argv[1]; NS=[int(x) for x in sys.argv[2:]]
qid,y,m=K.split("_"); y=int(y); m=int(m)
SEAS={8:"קיץ · מועד ב",6:"קיץ · מועד א",1:"חורף"}[m]
LV={"3":"3 יח״ל","4":"4 יח״ל","5":"5 יח״ל"}[qid[2]]
HY={2022:'תשפ״ב',2023:'תשפ״ג',2024:'תשפ״ד',2025:'תשפ״ה',2026:'תשפ״ו',2027:'תשפ״ז'}.get(y,"")
font=base64.b64encode(open(os.path.join(HERE,"SecularOne.ttf"),"rb").read()).decode()
logo=open(os.path.join(HERE,"logo.svg"),encoding="utf-8").read()
def topic(n):
  t=open(os.path.join(HERE,"exams",K,f"q{n}.py"),encoding="utf-8").read()
  if "intro2(" not in t and os.path.exists(os.path.join(HERE,"exams",K,f"s{n}.py")): t=open(os.path.join(HERE,"exams",K,f"s{n}.py"),encoding="utf-8").read()
  mm=re.search(r'intro2\(\s*\d+\s*,\s*"([^"]*)"',t); return mm.group(1) if mm else ""
def html(n):
  return f"""<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><style>
@font-face{{font-family:S;src:url(data:font/ttf;base64,{font})}}
*{{margin:0;box-sizing:border-box}}body{{width:1280px;height:720px;font-family:S,sans-serif;color:#fff;overflow:hidden;
background:radial-gradient(circle at 78% 22%,#2b3b80 0,#141b3a 62%);position:relative}}
.lg{{position:absolute;top:36px;right:44px;display:flex;align-items:center;gap:18px;font-size:34px}}
.lg svg{{width:84px;height:84px;border-radius:20px}}
.lv{{position:absolute;top:44px;left:48px;background:#f5b83d;color:#141b3a;font-size:38px;padding:8px 26px;border-radius:40px}}
.num{{position:absolute;top:150px;right:44px;font-size:250px;line-height:1;color:#f5b83d;letter-spacing:4px;direction:ltr;text-shadow:0 8px 0 #0004}}
.q{{position:absolute;top:175px;left:52px;background:#fff;color:#c8242f;font-size:92px;padding:6px 44px 18px;border-radius:30px;box-shadow:0 10px 0 #0005}}
.ss{{position:absolute;top:420px;right:48px;font-size:62px}}
.tp{{position:absolute;top:510px;right:48px;left:48px;font-size:54px;color:#cfe0ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.ft{{position:absolute;bottom:0;left:0;right:0;height:88px;background:#16824f;font-size:46px;display:flex;align-items:center;justify-content:center}}
</style></head><body>
<div class="lg">{logo}<span>פשוט להצליח במתמטיקה</span></div><div class="lv">{LV}</div>
<div class="num">{qid}</div><div class="q">שאלה {n}</div>
<div class="ss">בגרות {SEAS} {y} ({HY})</div><div class="tp">{topic(n)}</div>
<div class="ft">✓ פתרון מלא, צעד אחרי צעד</div></body></html>"""
async def main():
  from playwright.async_api import async_playwright
  os.makedirs(os.path.join(ROOT,"media","thumbs"),exist_ok=True)
  async with async_playwright() as p:
    b=await p.chromium.launch(); pg=await b.new_page(viewport={"width":1280,"height":720})
    for n in NS:
      await pg.set_content(html(n)); await pg.wait_for_timeout(300)
      out=os.path.join(ROOT,"media","thumbs",f"{K}_{n}.jpg")
      await pg.screenshot(path=out,type="jpeg",quality=86); print(out,os.path.getsize(out))
    await b.close()
asyncio.run(main())
