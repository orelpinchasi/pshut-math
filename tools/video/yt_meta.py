# כותרת, תיאור (עם פרקים) ותגיות לסרטון בגרות ביוטיוב — כדי שיופיע בחיפושים כמו "35371 קיץ 2026 מועד ב שאלה 1".
# שימוש: python3 tools/video/yt_meta.py <מפתח> <מספר שאלה>   ← מדפיס JSON {title, description, tags, thumbnail, video}
import sys,os,re,json
HERE=os.path.dirname(os.path.abspath(__file__)); BASE="https://orelpinchasi.github.io/pshut-math/"
K=sys.argv[1]; n=int(sys.argv[2]); qid,y,m=K.split("_"); y=int(y); m=int(m)
SEAS={8:"קיץ מועד ב",6:"קיץ מועד א",1:"חורף"}[m]
HY={2022:'תשפ"ב',2023:'תשפ"ג',2024:'תשפ"ד',2025:'תשפ"ה',2026:'תשפ"ו',2027:'תשפ"ז'}.get(y,"")
LV=qid[2]+' יח"ל'
src=open(os.path.join(HERE,"exams",K,f"q{n}.py"),encoding="utf-8").read()
if "intro2(" not in src and os.path.exists(os.path.join(HERE,"exams",K,f"s{n}.py")): src=open(os.path.join(HERE,"exams",K,f"s{n}.py"),encoding="utf-8").read()   # דוגמת סגנון 2
mm=re.search(r'intro2\(\s*\d+\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"',src)
topic,sub=(mm.group(1),mm.group(2)) if mm else ("","")
title=f"בגרות {qid} {SEAS} {y} שאלה {n} – {topic} | פתרון מלא"
if len(title)>100: title=f"בגרות {qid} {SEAS} {y} שאלה {n} | פתרון מלא"
def ts(t): t=int(t); return f"{t//60}:{t%60:02d}"
chf=os.path.join(HERE,"exams",K,"yt_chapters.json")
ch=json.load(open(chf,encoding="utf-8")).get(f"q{n}",[]) if os.path.exists(chf) else []
D=[f"פתרון מלא לשאלה {n} בבחינת הבגרות במתמטיקה {qid} ({LV}), {SEAS} {y} ({HY}).",
   f"{topic}: {sub.replace(' · ',', ')}.",
   "כל סעיף נפתר לאט, צעד אחרי צעד, עם הסבר למה עושים כל צעד.","",
   f"📄 כל השאלות של הבחינה, פתרון כתוב ותשובות סופיות: {BASE}bagrut/{K}.html",
   f"📚 כל המועדים של שאלון {qid}: {BASE}bagrut/{qid}.html",""]
if len(ch)>=3: D+=["פרקים:"]+[f"{ts(c['t'])} {c['l']}" for c in ch]+[""]
D+=["פשוט להצליח במתמטיקה · אוראל פנחסי",f"#בגרות #מתמטיקה #{qid} #בגרות_במתמטיקה"]
tags=[f"בגרות {qid}",f"{qid} {SEAS} {y}",f"{qid} {y}",f"פתרון בגרות {qid}",f"בגרות במתמטיקה {LV}",f"בגרות {SEAS} {y}",
      f"בגרות {HY}",topic,"בגרות במתמטיקה","פתרון בגרות","פשוט להצליח במתמטיקה","אוראל פנחסי"]
out={"title":title,"description":"\n".join(D),"tags":[t.replace('"',"״").replace(",","") for t in tags if t],
     "video":f"{BASE}media/yt/yt_{K}_{n}.mp4","thumbnail":f"{BASE}media/thumbs/{K}_{n}.jpg"}
print(json.dumps(out,ensure_ascii=False,indent=1))
