#!/usr/bin/env python3
"""סרטון שיווק יומי לאתר "פשוט להצליח במתמטיקה".

שימוש (מתוך תיקיית הריפו):
    python3 promo/make_daily.py                 # בוחר פיצ'ר לפי התאריך של היום
    python3 promo/make_daily.py --feature snap --var 1 --out /tmp/x.mp4
    python3 promo/make_daily.py --plan          # רק מדפיס מה ייבחר היום

פיצ'רים: snap path bag lesson vids yes ws full
הסקריפט מצלם את האתר מקומית (http.server על שורש הריפו), מרנדר את promo/reel.html
עם #feature/var, מוסיף מוזיקה ואפקטים, ושומר MP4 אנכי 1080x1920.
דורש: python3, playwright (chromium), ffmpeg, numpy, Pillow.
"""
import argparse, datetime, glob, http.server, json, os, random, shutil, socketserver, subprocess, sys, threading

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
WORK = os.path.join(HERE, "work")
FEATURES = ["snap", "path", "bag", "lesson", "vids", "yes", "ws", "full"]
NAMES = {"snap": "צלמו שאלה", "path": "מסלול למידה", "bag": "שאלוני בגרות", "lesson": "שיעור פרטי בחינם",
         "vids": "סרטוני הסבר", "yes": "יסודי א׳–ו׳", "ws": "דפי עבודה", "full": "כל האתר"}


def plan(day=None):
    day = day or datetime.date.today()
    n = (day - datetime.date(2026, 11, 22)).days  # 22.11.2026 = היום הראשון של הסבב
    return FEATURES[n % len(FEATURES)], (n // len(FEATURES)) % 2


def serve(port):
    os.chdir(ROOT)
    h = http.server.SimpleHTTPRequestHandler
    h.log_message = lambda *a: None
    srv = socketserver.TCPServer(("127.0.0.1", port), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def shoot(port):
    from playwright.sync_api import sync_playwright
    B = f"http://127.0.0.1:{port}/"
    with sync_playwright() as p:
        b = p.chromium.launch()
        c = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1080 / 390,
                          is_mobile=True, has_touch=True, service_workers="block")

        def shot(url, name, clip_sel=None, h=None, wait=2500):
            pg = c.new_page(); pg.goto(B + url); pg.wait_for_timeout(wait)
            out = os.path.join(WORK, name + ".jpg")
            if clip_sel:
                y = pg.evaluate(f"document.querySelector('{clip_sel}').getBoundingClientRect().top+scrollY")
                pg.screenshot(path=out, clip={"x": 0, "y": y, "width": 390, "height": h}, full_page=True, type="jpeg", quality=92)
            else:
                full = h is None
                if h:
                    pg.screenshot(path=out, clip={"x": 0, "y": 0, "width": 390, "height": h}, full_page=True, type="jpeg", quality=92)
                else:
                    pg.screenshot(path=out, full_page=False, type="jpeg", quality=92)
            pg.close()
        grade = random.choice(["z", "h", "t", "y4", "y5"])
        shot(f"index.html#p-{grade}", "path", "#path", 2600, 3000)
        shot("solve.html", "solve")
        shot("lesson.html", "lesson", h=1000)
        shot("bagrut.html#" + random.choice(["35471", "35571", "35371"]), "bagrut", h=4000)
        shot("yesodi.html", "yesodi", h=1400)
        shot("worksheets.html#" + random.choice(["z", "h", "t"]), "worksheets", h=1500)
        b.close()


def wall():
    from PIL import Image
    fs = sorted(glob.glob(os.path.join(ROOT, "t", "*.webp"))); random.shuffle(fs)
    tw, th, cols, rows, g = 360, 203, 5, 24, 14
    M = Image.new("RGB", (cols * (tw + g), rows * (th + g)), (18, 26, 61))
    for k in range(min(len(fs), cols * rows)):
        im = Image.open(fs[k]).convert("RGB").resize((tw, th))
        M.paste(im, ((k % cols) * (tw + g), (k // cols) * (th + g)))
    M.save(os.path.join(WORK, "wall.jpg"), quality=86)


def page_info(feature, var):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--allow-file-access-from-files"])
        pg = b.new_page(); pg.goto(f"file://{HERE}/reel.html#{feature}/{var}"); pg.wait_for_timeout(300)
        r = pg.evaluate("[window.END, window.SEQ]"); b.close(); return r


def render(feature, var, end, out, fps=30):
    from playwright.sync_api import sync_playwright
    grab = "(t)=>{window.render(t);return document.getElementById('c').toDataURL('image/jpeg',0.93)}"
    import base64
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--disable-web-security", "--allow-file-access-from-files"])
        pg = b.new_page(viewport={"width": 1080, "height": 1920})
        pg.goto(f"file://{HERE}/reel.html#{feature}/{var}")
        pg.wait_for_function("[...document.images].every(i=>i.complete)"); pg.wait_for_timeout(500)
        ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "image2pipe", "-framerate", str(fps), "-c:v", "mjpeg", "-i", "-",
                               "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
        for i in range(int(end * fps)):
            d = pg.evaluate(grab, i / fps)
            ff.stdin.write(base64.b64decode(d.split(",", 1)[1]))
        ff.stdin.close(); ff.wait(); b.close()
        if ff.returncode: sys.exit("ffmpeg failed")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--feature"); ap.add_argument("--var", type=int)
    ap.add_argument("--out"); ap.add_argument("--plan", action="store_true"); ap.add_argument("--port", type=int, default=8899)
    a = ap.parse_args()
    f0, v0 = plan()
    feature = a.feature or f0; var = v0 if a.var is None else a.var
    if a.plan:
        print(json.dumps({"feature": feature, "var": var, "name": NAMES[feature]}, ensure_ascii=False)); return
    out = os.path.abspath(a.out or os.path.join(WORK, f"promo-{datetime.date.today()}.mp4"))
    os.makedirs(WORK, exist_ok=True)
    srv = serve(a.port); shoot(a.port); srv.shutdown()
    wall()
    end, seq = page_info(feature, var)
    starts, t = {}, 0.0
    for n, d in seq: starts[n] = t; t += d
    cuts = [starts[n] for n, _ in seq][1:]
    crash = [c for c in [starts.get(n) for n in ("snap", "happy", "share")] if c]
    tmpv = os.path.join(WORK, "v.tmp.mp4"); render(feature, var, end, tmpv)
    music = os.path.join(WORK, "music.wav"); sfx = os.path.join(WORK, "sfx.wav"); ev = os.path.join(WORK, "ev.json")
    subprocess.run([sys.executable, os.path.join(HERE, "music.py"), music, str(end), json.dumps(crash)], check=True, stdout=subprocess.DEVNULL)
    pops = [c + d for c in cuts for d in (.08, .38)]
    if "how" in starts: pops += [starts["how"] + .7 + i * .75 for i in range(3)]
    if "share" in starts: pops += [starts["share"] + 1.25 + i * .22 for i in range(5)]
    pops += [starts["out"] + .5 + i * .16 for i in range(6)]
    json.dump({"whoosh": [c - .05 for c in cuts], "pop": pops, "ding": [3.0] + crash + [starts["out"] + 1.6]}, open(ev, "w"))
    subprocess.run([sys.executable, os.path.join(HERE, "make_sfx.py"), ev, sfx, "--dur", str(end)], check=True, stdout=subprocess.DEVNULL)
    tmp = out[:-4] + ".tmp.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmpv, "-i", music, "-i", sfx, "-filter_complex",
                    "[1]volume=0.9[m];[2]volume=0.7[s];[m][s]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.93[a]",
                    "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "-shortest", tmp], check=True)
    os.replace(tmp, out)
    print(json.dumps({"out": out, "feature": feature, "var": var, "name": NAMES[feature], "seconds": end}, ensure_ascii=False))


if __name__ == "__main__":
    main()
