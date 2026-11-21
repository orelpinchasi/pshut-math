# יוצר את קובץ הפתרון הכתוב sol/<מפתח>.json מתוך תסריטי הסרטונים של הבחינה.
# שימוש: מתוך תיקיית הבחינה: python3 ../../tosol.py <מפתח> [גרסה]
import sys,os,re,json,glob,importlib
HERE=os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0,HERE); sys.path.insert(0,os.getcwd())
key=sys.argv[1]; ver=sys.argv[2] if len(sys.argv)>2 else "א"
ROOT=os.path.dirname(os.path.dirname(HERE))
import html
strip=lambda h:html.escape(re.sub(r"\s+"," ",re.sub(r"</?span[^>]*>"," ",h)).strip(),quote=False)
Q=[]
for fn in sorted(glob.glob("q[0-9]*.py"),key=lambda f:int(f[1:-3])):
  m=importlib.import_module(fn[:-3]); n=int(fn[1:-3])
  title=next((s["cover"][1] for s in m.SC if "cover" in s and s["cover"][1]),"")
  parts=[]
  for s in m.SC:
    h=s.get("h","")
    mm=re.match(r"סעיף ([א-ת])",h)
    if not mm or "L" not in s: continue
    steps=[strip(t) for c,t,_ in s["L"] if c not in ("box","rule")]
    ans=[strip(t) for c,t,_ in s["L"] if c=="box"]
    parts.append({"l":mm.group(1),"b":steps,"a":"||".join(ans) or (steps.pop() if steps else "")})
  Q.append({"n":n,"p":getattr(m,"PG",1),"t":title,"s":parts})
out=os.path.join(ROOT,"sol",key+".json")
json.dump({"ver":ver,"q":Q},open(out,"w",encoding="utf-8"),ensure_ascii=False,separators=(",",":"))
print("wrote",out,len(Q),"questions")
