# כלים משותפים לתסריטי הסרטונים. כל תסריט שאלה קורא ל-setx(שאלון, שנה, חודש) בתחילתו.
M=lambda s:f'<span class="m">{s}</span>'
LB=lambda s:f'<span class="lb">{s}</span>'
HY={2022:'תשפ״ב',2023:'תשפ״ג',2024:'תשפ״ד',2025:'תשפ״ה',2026:'תשפ״ו',2027:'תשפ״ז'}
YSAY={2022:'אלפיים עשרים ושתיים',2023:'אלפיים עשרים ושלוש',2024:'אלפיים עשרים וארבע',2025:'אלפיים עשרים וחמש',2026:'אלפיים עשרים ושש',2027:'אלפיים עשרים ושבע'}
CUR={"id":"35471","y":2026,"m":8}
def setx(qid,y,m): CUR.update(id=str(qid),y=int(y),m=int(m))
def sess():
  y,m=CUR["y"],CUR["m"]
  return {1:f"חורף {HY[y]}",6:f"קיץ {HY[y]} מועד א",8:f"קיץ {HY[y]} מועד ב"}.get(m,f"{HY[y]}")
def sess_say():
  y,m=CUR["y"],CUR["m"]
  return {1:f"חורף {YSAY[y]}",6:f"קיץ {YSAY[y]}, מועד א",8:f"קיץ {YSAY[y]}, מועד ב"}.get(m,YSAY[y])
def lv(): return {"3":"3 יח״ל","4":"4 יח״ל","5":"5 יח״ל"}[CUR["id"][2]]
def QH(n): return f"שאלון {CUR['id']} · {sess()} · שאלה {n}"
def intro(n,topic,sub,say): return {"cover":[f"{lv()} · שאלון {CUR['id']} · {sess()} · שאלה {n}",topic,sub],"say":say}
OUT={"cover":["","נתראה בשאלה הבאה!","פשוט להצליח במתמטיקה · אוראל פנחסי"],"say":"פשוט להצליח במתמטיקה. נתראה בשאלה הבאה!"}
# ---- סגנון 2 ----
FR=lambda a,b:f'<span class="fr"><span>{a}</span><span>{b}</span></span>'   # שבר: מונה מעל מכנה
SQ=lambda a:f'<span class="sq"><i>√</i><span>{a}</span></span>'             # שורש שמכסה את כל הביטוי
HM=lambda s,c="hm":f'<span class="{c}">{s}</span>'                         # מרקר על חלק מהשורה (hm צהוב, ho כתום, hg ירוק)
def intro2(n,topic,sub,say): return {"cover":[f"{lv()} · שאלון {CUR['id']} · {sess()} · שאלה {n}",topic,sub],"say":say}
