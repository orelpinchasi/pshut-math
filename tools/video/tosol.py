# יוצר את קובץ הפתרון הכתוב sol/<מפתח>.json מתוך תסריטי הסרטונים של הבחינה.
# שימוש: מתוך תיקיית הבחינה: python3 ../../tosol.py <מפתח> [גרסה]
import sys,os,re,json,glob,importlib
HERE=os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0,HERE); sys.path.insert(0,os.getcwd())
key=sys.argv[1]; ver=sys.argv[2] if len(sys.argv)>2 else "א"
ROOT=os.path.dirname(os.path.dirname(HERE))
import html
TEX={"·":r"\cdot ","−":"-","≥":r"\ge ","≤":r"\le ","⇒":r"\Rightarrow ","≈":r"\approx ","′":"'","√":r"\sqrt ","μ":r"\mu ","σ":r"\sigma ","Φ":r"\Phi ","∠":r"\angle ","⊥":r"\perp ","°":r"^\circ ","²":"^2","³":"^3","π":r"\pi ","α":r"\alpha ","∞":r"\infty ","ˣ":"^x","⁴":"^4","⁰":"^0","ⁿ":"^n","₁":"_1","₂":"_2","₀":"_0","″":"''","≠":r"\ne ","←":r"\leftarrow ","→":r"\to ","∫":r"\int ","ℓ":r"\ell ","∢":r"\measuredangle ","↔":r"\leftrightarrow ","%":r"\%"}
SUP={"⁵":"5","⁶":"6","⁷":"7","⁸":"8","⁹":"9","ˡ":"l","²":"2","³":"3","⁴":"4","⁰":"0","¹":"1","ⁿ":"n","ˣ":"x","⁻":"-"}
def tex(x):
  x=re.sub("["+"".join(SUP)+"]+",lambda m:"^{"+"".join(SUP[c] for c in m.group(0))+"}",x)   # e²ˣ → e^{2x}
  return "".join(TEX.get(ch,ch) for ch in x)
def strip(h):
  # סגנון 2: שברים ושורשים הופכים ל-LaTeX, כדי שבפתרון הכתוב באתר יופיעו כמו בסרטון
  for _ in range(30):
    h0=h
    h=re.sub(r'<span class="sq"><i>√</i><span>([^<]*)</span></span>',lambda m:"\\sqrt{"+m.group(1)+"}",h)
    h=re.sub(r'<span class="fr"><span>([^<]*)</span><span>([^<]*)</span></span>',lambda m:"\\frac{"+m.group(1)+"}{"+m.group(2)+"}",h)
    h=re.sub(r'<span class="(?:hm|ho|hg|lb)">([^<]*)</span>',lambda m:m.group(1)+(" " if 'lb' in m.group(0) else ""),h)
    h=re.sub(r'<span class="m">([^<]*)</span>',lambda m:"$"+tex(m.group(1))+"$",h)
    if h==h0: break
  h=re.sub(r"</?span[^>]*>"," ",h)
  h=re.sub(r"\s+"," ",h).strip()
  # טקסט רגיל עובר escape; נוסחאות בין $...$ נשארות כמו שהן (KaTeX מקבל אותן כטקסט)
  return "$".join(x if i%2 else html.escape(html.unescape(x),quote=False) for i,x in enumerate(h.split("$")))
Q=[]
for fn in sorted(glob.glob("q[0-9]*.py"),key=lambda f:int(f[1:-3])):
  m=importlib.import_module(fn[:-3]); n=int(fn[1:-3])
  title=next((s["cover"][1] for s in m.SC if "cover" in s and s["cover"][1]),"")
  parts=[]
  for s in m.SC:
    h=s.get("h","")
    mm=re.match(r"סעיף ([א-ת])",h)
    if not mm or "L" not in s: continue
    L=[(l[0],l[1]) for l in s["L"] if l[1]]
    steps=[strip(t) for c,t in L if c not in ("box","rule","ask")]
    ans=[strip(t) for c,t in L if c=="box"]
    if parts and parts[-1]["l"]==mm.group(1):   # כמה סצנות לאותו סעיף מתאחדות
      parts[-1]["b"]+=steps; parts[-1]["_a"]+=ans; continue
    parts.append({"l":mm.group(1),"b":steps,"_a":ans})
  for pt in parts:
    a=pt.pop("_a"); pt["a"]="||".join(a) or (pt["b"].pop() if pt["b"] else "")
  e={"n":n,"p":getattr(m,"PG",1),"t":title,"s":parts}
  chf=os.path.join("out",f"{key}_{n}.ch.json")
  if os.path.exists(chf): e["ch"]=json.load(open(chf,encoding="utf-8"))   # עצירות "הבנת?" בסרטון
  Q.append(e)
out=os.path.join(ROOT,"sol",key+".json")
json.dump({"ver":ver,"q":Q},open(out,"w",encoding="utf-8"),ensure_ascii=False,separators=(",",":"))
print("wrote",out,len(Q),"questions")
