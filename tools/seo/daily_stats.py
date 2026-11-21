#!/usr/bin/env python3
"""סטטיסטיקה אנונימית מהאתר (מונים יומיים ב-Firestore, אוסף daily) – לדיווח היומי.
מדפיס JSON: ימים אחרונים, סכומים, סרטונים מובילים, מקורות.
אם הקריאה חסומה (403) – מדפיס {"error": "blocked"}: צריך לפרסם את firestore.rules העדכני ב-Firebase."""
import json, sys, urllib.request, datetime, collections
P = "pshut-math"; KEY = "AIzaSyBcBl1cPr0adkAZXTsG6gKuMIbY1C9irZU"
N = int(sys.argv[1]) if len(sys.argv) > 1 else 7
tz = datetime.timezone(datetime.timedelta(hours=2))
days = [(datetime.datetime.now(tz) - datetime.timedelta(days=i)).date().isoformat() for i in range(N)][::-1]
def val(v):
    if "integerValue" in v: return int(v["integerValue"])
    if "mapValue" in v: return {k: val(x) for k, x in v["mapValue"].get("fields", {}).items()}
    return 0
out = {"days": {}}
for d in days:
    url = f"https://firestore.googleapis.com/v1/projects/{P}/databases/(default)/documents/daily/{d}?key={KEY}"
    try:
        with urllib.request.urlopen(url, timeout=20) as r:
            out["days"][d] = {k: val(v) for k, v in json.load(r).get("fields", {}).items()}
    except urllib.error.HTTPError as e:
        if e.code == 404: out["days"][d] = {}
        elif e.code == 403: print(json.dumps({"error": "blocked"})); sys.exit(0)
        else: raise
tot = collections.Counter(); vids = collections.Counter(); src = collections.Counter()
for d in out["days"].values():
    for k, v in d.items():
        if isinstance(v, int): tot[k] += v
    vids.update(d.get("v", {})); src.update(d.get("src", {}))
titles = {r[0]: r[3] for r in json.load(open("videos.json", encoding="utf-8"))}
out["total"] = dict(tot)
out["top_videos"] = [[titles.get(i, i), n] for i, n in vids.most_common(10)]
out["sources"] = dict(src.most_common())
out["per_day"] = {d: {k: v for k, v in x.items() if isinstance(v, int)} for d, x in out["days"].items()}
del out["days"]
print(json.dumps(out, ensure_ascii=False, indent=1))
