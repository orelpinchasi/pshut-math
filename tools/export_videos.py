"""מייצא את רשימת הסרטונים מ-index.html לקובץ videos.json (משמש את "צלמו שאלה" להתאמת סרטונים).
נקרא אוטומטית מ-build.py. הרצה ידנית: python3 tools/export_videos.py index.html videos.json"""
import json, re, sys


def export(html: str) -> list:
    m = re.search(r'const RAW = `(.*?)`', html, re.S)
    assert m, "RAW video list not found in index.html"
    out = []
    for line in m.group(1).strip().split("\n"):
        parts = line.split("|", 3)
        if len(parts) != 4:
            continue
        vid, topic, codes, title = parts
        if topic == "inspire":
            continue
        out.append([vid, topic, codes, title.strip()])
    return out


def write(html: str, path: str) -> int:
    vids = export(html)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(vids, f, ensure_ascii=False, separators=(",", ":"))
    return len(vids)


if __name__ == "__main__":
    src, dst = sys.argv[1], sys.argv[2]
    print("videos:", write(open(src, encoding="utf-8").read(), dst))
