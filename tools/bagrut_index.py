# מסמן בקובץ bagrut-data.json אילו מועדים יש להם פתרון מלא בתיקייה sol/
import json,os
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p=os.path.join(root,"bagrut-data.json");D=json.load(open(p,encoding="utf-8"))
have={f[:-5] for f in os.listdir(os.path.join(root,"sol")) if f.endswith(".json")}
n=0
for q in D["q"]:
  for s in q["ss"]:
    s.pop("fs",None)
    if s["k"] in have: s["fs"]=1;n+=1
json.dump(D,open(p,"w",encoding="utf-8"),ensure_ascii=False,separators=(",",":"))
print(n,"sessions with full solutions")
