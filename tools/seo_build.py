#!/usr/bin/env python3
"""בונה דפים קבועים שגוגל יכול לקרוא (SEO):
  m/<כיתה>.html      – דף לכל כיתה / שאלון (ז, ח, ט, 371 ... 572)
  m/topic-<id>.html  – דף לכל נושא
  bagrut/<id>.html   – דף לכל שאלון בגרות: כל המועדים + סרטוני הנושאים
  bagrut/<k>.html    – דף לכל מועד שיש לו פתרון מלא (sol/<k>.json)
  sitemap.xml, robots.txt, וקישורים קבועים בתחתית index.html

מריצים מתיקיית האתר אחרי כל שינוי ב-videos.json / bagrut-data.json / sol:
  python3 tools/seo_build.py
"""
import json, re, os, html, datetime, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://orelpinchasi.github.io/pshut-math/"
SITE = "פשוט להצליח במתמטיקה"
os.chdir(ROOT)
E = lambda s: html.escape(str(s), quote=True)
TODAY = datetime.date.today().isoformat()

# ---------- נתונים ----------
idx = open("index.html", encoding="utf-8").read()
def js_obj(name):
    m = re.search(r"const %s = (\{.*?\n\});" % name, idx, re.S)
    s = m.group(1)
    s = re.sub(r"/\*.*?\*/", "", s, flags=re.S)
    s = re.sub(r'([{,]\s*)([A-Za-z_][\w-]*)\s*:', r'\1"\2":', s)       # מפתחות בלי מרכאות
    s = re.sub(r",(\s*[}\]])", r"\1", s)
    return json.loads(s)
TOPICS = js_obj("TOPICS")
CURR = js_obj("CURRICULUM")
YTIDS = json.load(open("tools/video/youtube.json", encoding="utf-8")) if os.path.exists("tools/video/youtube.json") else {}   # סרטוני בגרות שעלו ליוטיוב
VIDEOS = json.load(open("videos.json", encoding="utf-8"))            # [id, topic, codes, title]
BAG = json.load(open("bagrut-data.json", encoding="utf-8"))

GROUPS = [  # code, slug, שם קצר, שם מלא, כיתות, level-key
    ("z",  "kita-z",  "כיתה ז׳", "מתמטיקה לכיתה ז׳", "ז׳", ("mid", "ז")),
    ("h",  "kita-h",  "כיתה ח׳", "מתמטיקה לכיתה ח׳", "ח׳", ("mid", "ח")),
    ("t",  "kita-t",  "כיתה ט׳", "מתמטיקה לכיתה ט׳", "ט׳", ("mid", "ט")),
    ("3a", "371", "שאלון 371", "3 יחידות – שאלון 371 (35371)", "י׳–י״א", ("u3", "371")),
    ("3b", "372", "שאלון 372", "3 יחידות – שאלון 372 (35372)", "י״ב", ("u3", "372")),
    ("4a", "471", "שאלון 471", "4 יחידות – שאלון 471 (35471)", "י׳–י״א", ("u4", "471")),
    ("4b", "472", "שאלון 472", "4 יחידות – שאלון 472 (35472)", "י״ב", ("u4", "472")),
    ("5a", "571", "שאלון 571", "5 יחידות – שאלון 571 (35571)", "י׳–י״א", ("u5", "571")),
    ("5b", "572", "שאלון 572", "5 יחידות – שאלון 572 (35572)", "י״ב", ("u5", "572")),
]
GNAME = {g[0]: g[2] for g in GROUPS}
GSLUG = {g[0]: g[1] for g in GROUPS}
BAG_FOR = {"3a": "35371", "3b": "35372", "4a": "35471", "4b": "35472", "5a": "35571", "5b": "35572"}
TITLE = {v[0]: v[3] for v in VIDEOS}
def codes(v): return v[2].split() if isinstance(v[2], str) else v[2]
def thumb(i): return f"t/{i}.webp" if os.path.exists(f"t/{i}.webp") else f"https://i.ytimg.com/vi/{i}/mqdefault.jpg"

# ---------- תבנית ----------
def page(path, title, desc, h1, body, crumbs, extra_ld=None):
    depth = path.count("/")
    up = "../" * depth
    canon = BASE + path
    bc = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": BASE + u} for i, (n, u) in enumerate(crumbs)]}
    lds = [bc] + (extra_ld or [])
    ld = "\n".join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in lds)
    crumb_html = " › ".join(f'<a href="{up}{u}">{E(n)}</a>' for n, u in crumbs[:-1]) + f" › <span>{E(crumbs[-1][0])}</span>"
    out = f"""<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{E(title)}</title>
<meta name="description" content="{E(desc)}">
<link rel="canonical" href="{canon}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#141b3a">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{SITE}">
<meta property="og:locale" content="he_IL">
<meta property="og:title" content="{E(title)}">
<meta property="og:description" content="{E(desc)}">
<meta property="og:url" content="{canon}">
<meta property="og:image" content="{BASE}og-image.jpg">
<link rel="icon" href="{up}icons/icon-192.png" type="image/png">
<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700&family=Secular+One&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{up}m/seo.css">
{ld}
</head>
<body>
<header class="top"><div class="wrap"><a class="brand" href="{up}index.html">✦ {SITE}</a>
<nav><a href="{up}m/">כל הנושאים</a><a href="{up}bagrut/">בגרות</a><a class="cta" href="{up}join.html">הצטרפות בחינם</a></nav></div></header>
<main class="wrap">
<p class="crumbs">{crumb_html}</p>
<h1>{E(h1)}</h1>
{body}
</main>
<footer><div class="wrap">{SITE} · אוראל פנחסי · <a href="{up}index.html">לאתר</a> · <a href="{up}m/">כל הנושאים</a> · <a href="{up}bagrut/">בחינות בגרות</a> · <a href="{up}privacy.html">פרטיות</a></div></footer>
</body>
</html>
"""
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    open(path, "w", encoding="utf-8").write(out)
    PAGES.append(path)

def vcard(i, up):
    t = TITLE.get(i, "")
    return (f'<a class="v" href="{up}index.html?v={i}"><img src="{up if not thumb(i).startswith("http") else ""}{thumb(i)}" alt="{E(t)}" loading="lazy" width="320" height="180">'
            f'<span>{E(t)}</span></a>')

def vlist(ids, up):
    return '<div class="grid">' + "".join(vcard(i, up) for i in ids) + "</div>"

def itemlist(ids):
    return {"@context": "https://schema.org", "@type": "ItemList", "itemListElement": [
        {"@type": "ListItem", "position": n + 1, "name": TITLE.get(i, ""), "url": f"https://www.youtube.com/watch?v={i}"}
        for n, i in enumerate(ids[:100])]}

CTA = lambda up: (f'<div class="cta-box"><div><b>רוצים לעקוב אחרי ההתקדמות?</b><span>נרשמים בחינם, וכל סרטון שראיתם מסומן ✓. ממשיכים מכל מכשיר.</span></div>'
                  f'<a class="btn" href="{up}join.html">הצטרפות בחינם ←</a></div>')

PAGES = []

# ---------- דפי נושא ----------
topic_groups = {}
for v in VIDEOS:
    for c in codes(v):
        topic_groups.setdefault(v[1], set()).add(c)
ORDER = list(GNAME)
for tid, t in TOPICS.items():
    ids = [v[0] for v in VIDEOS if v[1] == tid]
    if not ids: continue
    name = t["name"]
    gs = sorted(topic_groups.get(tid, []), key=lambda c: ORDER.index(c) if c in ORDER else 99)
    where = ", ".join(GNAME[g] for g in gs if g in GNAME)
    up = "../"
    sections = ""
    for g in gs:
        gid = [v[0] for v in VIDEOS if v[1] == tid and g in codes(v)]
        if gid:
            sections += f'<h2>{E(name)} – {E(GNAME.get(g, g))} <a class="more" href="{GSLUG[g]}.html">כל הנושאים של {E(GNAME[g])} ←</a></h2>' + vlist(gid, up)
    intro = (f"<p class=\"lead\">{len(ids)} סרטוני הסבר ותרגול בנושא <b>{E(name)}</b>"
             + (f" – ל{E(where)}" if where else "")
             + ". כל נושא מוסבר מהקל אל הקשה: קודם הרעיון, אחר כך תרגילים, ובסוף שאלות בסגנון בגרות. הכול בחינם, בשיטת \"פשוט להצליח\".</p>")
    page(f"m/topic-{tid}.html",
         f"{name} – {len(ids)} סרטוני הסבר ותרגול במתמטיקה | {SITE}",
         f"{name}: {len(ids)} סרטוני הסבר, תרגול ושאלות בגרות פתורות" + (f" ל{where}" if where else "") + ". לומדים בחינם, צעד אחרי צעד.",
         f"{name} – סרטוני הסבר ותרגול",
         intro + CTA(up) + sections,
         [(SITE, "index.html"), ("כל הנושאים", "m/"), (name, f"m/topic-{tid}.html")],
         [itemlist(ids)])

# ---------- דפי כיתה / שאלון ----------
for code, slug, short, full, grades, (lv, gk) in GROUPS:
    tids = CURR[lv][gk]
    up = "../"
    allids, sections = [], ""
    for tid in tids:
        ids = [v[0] for v in VIDEOS if v[1] == tid and code in codes(v)]
        if not ids: continue
        allids += ids
        sections += f'<h2 id="{tid}">{E(TOPICS[tid]["name"])} <small>({len(ids)})</small> <a class="more" href="topic-{tid}.html">לכל הסרטונים בנושא ←</a></h2>' + vlist(ids, up)
    toc = '<ul class="toc">' + "".join(f'<li><a href="#{t}">{E(TOPICS[t]["name"])}</a></li>' for t in tids if any(v[1] == t and code in codes(v) for v in VIDEOS)) + "</ul>"
    bag = ""
    if code in BAG_FOR:
        bag = f'<p class="note">📝 בחינות בגרות קודמות עם פתרונות: <a href="../bagrut/{BAG_FOR[code]}.html">שאלון {BAG_FOR[code]} – כל המועדים</a></p>'
    is_mid = lv == "mid"
    lead = (f"<p class=\"lead\">כל סרטוני ההסבר במתמטיקה ל<b>{E(short)}</b> – {len(allids)} סרטונים לפי הנושאים בתוכנית הלימודים: "
            + ", ".join(E(TOPICS[t]["name"]) for t in tids[:8]) + (" ועוד" if len(tids) > 8 else "") + ". "
            + ("מתאים לתרגול לקראת מבחנים ולחזרה על החומר." if is_mid else f"מתאים לכיתות {E(grades)} ולהכנה לבגרות.") + "</p>")
    page(f"m/{slug}.html",
         f"{full} – כל סרטוני ההסבר והתרגול | {SITE}",
         f"{full}: {len(allids)} סרטוני הסבר ותרגול לפי נושאים – " + ", ".join(TOPICS[t]["name"] for t in tids[:5]) + ". בחינם.",
         f"{full} – סרטוני הסבר לפי נושא",
         lead + toc + bag + CTA(up) + sections,
         [(SITE, "index.html"), ("כל הנושאים", "m/"), (short, f"m/{slug}.html")],
         [itemlist(allids)])

# ---------- אינדקס נושאים ----------
cards = "".join(f'<a class="box" href="{g[1]}.html"><b>{E(g[2])}</b><span>{E(g[3])}</span></a>' for g in GROUPS)
tl = "".join(f'<li><a href="topic-{tid}.html">{E(t["name"])}</a> <small>({sum(1 for v in VIDEOS if v[1]==tid)})</small></li>'
             for tid, t in TOPICS.items() if any(v[1] == tid for v in VIDEOS))
page("m/index.html", f"סרטוני מתמטיקה לפי כיתה ונושא – ז׳ עד י״ב, 3/4/5 יח״ל | {SITE}",
     f"{len(VIDEOS)} סרטוני הסבר במתמטיקה: חטיבת ביניים (ז׳–ט׳) ותיכון 3, 4 ו-5 יחידות. בוחרים כיתה או נושא ולומדים בחינם.",
     "סרטוני מתמטיקה לפי כיתה ונושא",
     f'<p class="lead">{len(VIDEOS)} סרטוני הסבר, תרגול ושאלות בגרות פתורות – מכיתה ז׳ ועד 5 יחידות. בחרו כיתה או שאלון:</p><div class="boxes">{cards}</div>'
     + CTA("../") + f'<h2>כל הנושאים</h2><ul class="cols">{tl}</ul>',
     [(SITE, "index.html"), ("כל הנושאים", "m/")])

# ---------- בגרות ----------
SEASON = {"1": "חורף", "6": "קיץ מועד א", "8": "קיץ מועד ב"}
def sess_name(s): return s["lbl"].replace(" · ", " ")
bag_cards = ""
for q in BAG["q"]:
    qid = q["id"]; lv = q["lv"].replace('"', "״"); nm = q["nm"]; gr = q["gr"].replace('"', "״")
    up = "../"
    parts = ""
    pids = []
    for p in q["parts"]:
        ids = [x[0] for x in p["v"]]; pids += ids
        parts += f'<h3>{E(p["t"])} <small>{E(p.get("d",""))}</small></h3>' + vlist(ids, up)
    rows = ""
    for s in q["ss"]:
        full = os.path.exists(f"sol/{s['k']}.json")
        sol_link = f'<a class="go" href="{s["k"]}.html">▶ פתרון מלא בווידאו</a>' if full else ""
        rows += (f'<tr><td><b>{E(sess_name(s))}</b> <small>{E(s.get("hy","").replace(chr(34),"״"))}</small></td>'
                 f'<td><a href="{E(s["pdf"])}" target="_blank" rel="noopener">השאלון</a></td>'
                 f'<td><a href="{E(s["sol"])}" target="_blank" rel="noopener">פתרון רשמי</a></td><td>{sol_link}</td></tr>')
    years = sorted({s["k"].split("_")[1] for s in q["ss"]})
    title = f"בגרות במתמטיקה {qid} ({lv} {nm}) – כל המועדים {years[0]}–{years[-1]} עם פתרונות | {SITE}"
    desc = f"שאלון {qid} – {lv}, {nm} (כיתה {gr}): כל בחינות הבגרות {years[0]}–{years[-1]}, חורף וקיץ, עם השאלון והפתרון, וסרטוני הסבר לכל נושא בשאלון."
    page(f"bagrut/{qid}.html", title, desc, f"שאלון {qid} – {lv}, {nm}",
         f'<p class="lead">שאלון <b>{qid}</b> הוא {E(nm)} של מתמטיקה ב<b>{E(lv)}</b> (כיתה {E(gr)}, {E(q.get("w",""))} מהציון). '
         f'כאן כל הבחינות מהשנים {years[0]}–{years[-1]} – השאלון והפתרון הרשמי של משרד החינוך לכל מועד – וסרטוני הסבר על כל נושא שמופיע בבחינה.</p>'
         + CTA(up)
         + f'<h2>בחינות קודמות ופתרונות</h2><div class="tw"><table><thead><tr><th>מועד</th><th>שאלון</th><th>פתרון</th><th></th></tr></thead><tbody>{rows}</tbody></table></div>'
         + f'<p class="note">דף נוסחאות: <a href="{E(BAG["formula"].get(lv[0], ""))}" target="_blank" rel="noopener">דף הנוסחאות ל{E(lv)}</a></p>'
         + f'<h2>סרטוני הסבר לפי הנושאים בשאלון</h2>{parts}',
         [(SITE, "index.html"), ("בחינות בגרות", "bagrut/"), (f"שאלון {qid}", f"bagrut/{qid}.html")],
         [itemlist(pids)])
    bag_cards += f'<a class="box" href="{qid}.html"><b>{qid}</b><span>{E(lv)} · {E(nm)} · כיתה {E(gr)}</span></a>'

    # דפי מועד עם פתרון מלא
    for s in q["ss"]:
        fp = f"sol/{s['k']}.json"
        if not os.path.exists(fp): continue
        d = json.load(open(fp, encoding="utf-8"))
        nm_s = sess_name(s)
        qs, vids = "", []
        for x in d["q"]:
            steps = "".join(
                f'<div class="part"><b>סעיף {E(st["l"])}</b>'
                + ("<ul>" + "".join(f"<li dir=\"auto\">{E(b)}</li>" for b in st.get("b", [])) + "</ul>" if st.get("b") else "")
                + f'<p class="ans">תשובה: ' + "<br>".join(E(a) for a in st.get("a", "").split("||")) + "</p></div>"
                for st in x.get("s", []))
            mp4 = f"media/bagrut/{s['k']}_{x['n']}.mp4"
            vid = ""
            if x.get("mp4") and os.path.exists(mp4):
                vid = f'<video controls preload="none" playsinline src="../{mp4}"></video>'
                vk = f"{s['k']}_{x['n']}"; th = f"media/thumbs/{vk}.jpg"; yid = YTIDS.get(vk)
                if os.path.exists(th): vid = vid.replace('<video ', f'<video poster="../{th}" ', 1)
                if yid: vid += f'<p class="note">▶️ <a href="https://www.youtube.com/watch?v={yid}" target="_blank" rel="noopener">לצפייה בסרטון ביוטיוב</a></p>'
                vo = {"@type": "VideoObject", "name": f"פתרון בגרות {qid} {nm_s} – שאלה {x['n']}: {x.get('t','')}",
                      "description": f"פתרון מלא בווידאו לשאלה {x['n']} ({x.get('t','')}) בבחינת הבגרות במתמטיקה {qid}, {nm_s}: כל סעיף צעד אחרי צעד.",
                      "thumbnailUrl": BASE + (th if os.path.exists(th) else "og-image.jpg"), "uploadDate": (subprocess.run(["git","log","-1","--format=%cs","--",mp4],capture_output=True,text=True).stdout.strip() or TODAY),
                      "contentUrl": BASE + mp4, "inLanguage": "he", "url": f"{BASE}bagrut/{s['k']}.html#q{x['n']}"}
                try:
                    sec = float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",mp4],capture_output=True,text=True).stdout)
                    vo["duration"] = f"PT{int(sec)//60}M{int(sec)%60}S"
                except Exception: pass
                if yid: vo["embedUrl"] = f"https://www.youtube.com/embed/{yid}"; vo["sameAs"] = f"https://www.youtube.com/watch?v={yid}"
                if x.get("ch"):   # רגעים מרכזיים בגוגל: כל סעיף הוא קטע בסרטון
                    vo["hasPart"] = [{"@type": "Clip", "name": f"סעיף {c['l']}", "startOffset": int(c["t0"]), "endOffset": int(c["t1"]),
                                      "url": f"{BASE}bagrut/{s['k']}.html?t={int(c['t0'])}#q{x['n']}"} for c in x["ch"]]
                vids.append(vo)
            qs += f'<section class="q" id="q{x["n"]}"><h2>שאלה {x["n"]} – {E(x.get("t",""))}</h2>{vid}{steps}</section>'
        toc = '<ul class="toc">' + "".join(f'<li><a href="#q{x["n"]}">שאלה {x["n"]} – {E(x.get("t",""))}</a></li>' for x in d["q"]) + "</ul>"
        title = f"פתרון בגרות {qid} {nm_s} – פתרון מלא בווידאו לכל השאלות | {SITE}"
        desc = f"פתרון מלא לבחינת הבגרות במתמטיקה {qid} ({lv}) {nm_s}: סרטון הסבר לכל שאלה, פתרון כתוב לכל סעיף ותשובות סופיות."
        page(f"bagrut/{s['k']}.html", title, desc, f"פתרון בגרות {qid} – {nm_s}",
             f'<p class="lead">פתרון מלא לבחינת הבגרות <b>{qid}</b> ({E(lv)}, {E(nm)}) – <b>{E(nm_s)}</b>. לכל שאלה: סרטון הסבר, הדרך בכל סעיף והתשובה הסופית.</p>'
             f'<p class="note"><a href="{E(s["pdf"])}" target="_blank" rel="noopener">השאלון המקורי</a> · <a href="{E(s["sol"])}" target="_blank" rel="noopener">הפתרון הרשמי של משרד החינוך</a> · <a href="{qid}.html">כל המועדים של שאלון {qid}</a></p>'
             + toc + CTA(up) + qs
             + '<script>(function(){var t=+new URLSearchParams(location.search).get("t"),v=location.hash&&document.querySelector(location.hash+" video");if(t&&v){v.preload="metadata";v.addEventListener("loadedmetadata",function(){v.currentTime=t},{once:true});v.load()}})()</script>',
             [(SITE, "index.html"), ("בחינות בגרות", "bagrut/"), (f"שאלון {qid}", f"bagrut/{qid}.html"), (nm_s, f"bagrut/{s['k']}.html")],
             [{"@context": "https://schema.org", "@graph": vids}] if vids else None)

page("bagrut/index.html", f"בחינות בגרות במתמטיקה עם פתרונות – 3, 4 ו-5 יחידות | {SITE}",
     "כל בחינות הבגרות במתמטיקה בתוכנית החדשה: שאלונים 35371, 35372, 35471, 35472, 35571, 35572 – כל המועדים עם שאלון, פתרון וסרטוני הסבר.",
     "בחינות בגרות במתמטיקה – שאלונים ופתרונות",
     f'<p class="lead">בחרו שאלון: כל המועדים משנת 2022 ועד היום, עם השאלון, הפתרון הרשמי וסרטוני הסבר לכל נושא. לחלק מהמועדים יש גם פתרון מלא בווידאו.</p><div class="boxes">{bag_cards}</div>' + CTA("../")
     + f'<p class="note">רוצים לתרגל לפי נושא? <a href="../m/">כל הסרטונים לפי כיתה ונושא</a> · <a href="../bagrut.html">עמוד הבגרות באתר</a></p>',
     [(SITE, "index.html"), ("בחינות בגרות", "bagrut/")])

# ---------- sitemap + robots ----------
MAIN = ["", "join.html", "bagrut.html", "solve.html", "worksheets.html", "yesodi.html", "learn.html", "lesson.html", "privacy.html"]
urls = [BASE + u for u in MAIN if u == "" or os.path.exists(u)] + [BASE + (p[:-10] if p.endswith("index.html") else p) for p in PAGES]
sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + \
     "".join(f"  <url><loc>{u}</loc><lastmod>{TODAY}</lastmod></url>\n" for u in urls) + "</urlset>\n"
open("sitemap.xml", "w", encoding="utf-8").write(sm)
open("robots.txt", "w", encoding="utf-8").write(f"User-agent: *\nAllow: /\n\nSitemap: {BASE}sitemap.xml\n")

# ---------- קישורים קבועים בתחתית עמוד הבית ----------
links = ('<nav class="seo-links" aria-label="מפת האתר"><div class="wrap">'
         '<div><b>לפי כיתה ושאלון</b>' + "".join(f'<a href="m/{g[1]}.html">{E(g[3])}</a>' for g in GROUPS) + '</div>'
         '<div><b>בחינות בגרות</b>' + "".join(f'<a href="bagrut/{q["id"]}.html">שאלון {q["id"]} – {E(q["lv"].replace(chr(34),"״"))}</a>' for q in BAG["q"]) + '</div>'
         '<div><b>נושאים</b>' + "".join(f'<a href="m/topic-{tid}.html">{E(t["name"])}</a>' for tid, t in TOPICS.items() if any(v[1]==tid for v in VIDEOS)) + '</div>'
         '</div></nav>')
s = open("index.html", encoding="utf-8").read()
block = f"<!--seo-links-->{links}<!--/seo-links-->"
if "<!--seo-links-->" in s:
    s = re.sub(r"<!--seo-links-->.*?<!--/seo-links-->", lambda m: block, s, flags=re.S)
else:
    s = s.replace("</footer>", block + "\n</footer>", 1) if "</footer>" in s else s.replace("</body>", block + "\n</body>", 1)
open("index.html", "w", encoding="utf-8").write(s)
print(f"{len(PAGES)} pages, {len(urls)} sitemap urls")
