import json,sys,os,hashlib,subprocess,asyncio,importlib
HERE=os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0,HERE)
sys.path.insert(0,os.getcwd()); mod=importlib.import_module(sys.argv[1]); OUT=sys.argv[2]
TTS=os.environ.get("TTS_CACHE","/tmp/pshut-tts"); os.makedirs(TTS,exist_ok=True);os.makedirs("w",exist_ok=True)
W="https://pshut-solve.pshut-math.workers.dev/"
V2=hasattr(mod,"IMG")   # סגנון 2: השאלה המקורית כתמונה, מרקרים, כתיבה הדרגתית, עצירות "הבנת?"
YT=bool(os.environ.get("YT"))   # YT=1: גרסה ליוטיוב, בלי שאלות "הבנת?"
def tts(t):
  p=TTS+"/"+hashlib.md5(t.encode()).hexdigest()+".wav"
  for k in range(6):
    if os.path.exists(p) and os.path.getsize(p)>2000: return p
    subprocess.run(["curl","-sS","-m","90","-X","POST",W,"-H","Content-Type: application/json","-H","Origin: https://orelpinchasi.github.io","--data-binary",json.dumps({"tts":t}),"-o",p])
    if not (os.path.exists(p) and os.path.getsize(p)>2000): import time; time.sleep(3*(k+1))
  raise SystemExit("tts failed: "+t)
def dur(p): return float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",p],capture_output=True,text=True).stdout)
def tup(l): return (l[0],l[1],l[2],(l[3] if len(l)>3 else {}))
# states: (render-dict, say, pad, animate?, section)
ST=[]
for s in mod.SC:
  if "cover" in s: ST.append(({"cover":s["cover"]},s["say"],1.0,False,None));continue
  if not V2:
    for j in range(len(s["L"])):
      lines=[{"c":c,"t":t} for c,t,_ in s["L"][:j+1]]
      ST.append(({"qh":mod.QH,"q":mod.Q,"h":s["h"],"hl":s.get("hl",[]),"done":s.get("done",[]),"fig":s.get("fig"),"lines":lines},s["L"][j][2],0.9 if j==len(s["L"])-1 else 0.45,False,None))
    continue
  img=s.get("img",mod.IMG); mk=list(s.get("mk",[])); fig=s.get("fig"); lines=[]
  LL=[l for l in s["L"] if not (YT and l[0]=="ask")]   # ליוטיוב: בלי "הבנת?" (אין שם עצירות)
  if not LL: continue
  for j,l in enumerate(LL):
    c,t,say,o=tup(l)
    img=o.get("img",img); fig=o.get("fig",fig)
    newmk=o.get("mk",[]); mk=(o["mkset"] if "mkset" in o else mk)+newmk
    if t: lines.append({"c":c,"t":t})
    anim=bool(t) or bool(newmk)
    R={"qh":mod.QH,"img":img,"mk":list(mk),"mkNew":bool(newmk),"h":s["h"],"fig":fig,"lines":list(lines),"keep":s.get("keep",5)}
    if not t and lines: R["lineDone"]=1
    ST.append((R,say,0.9 if j==len(LL)-1 else 0.55,anim,s.get("sec")))
from concurrent.futures import ThreadPoolExecutor
with ThreadPoolExecutor(2) as ex: wavs=list(ex.map(tts,[x[1] for x in ST]))
if V2 and YT:  # פרקים ליוטיוב (chapters): זמן ההתחלה של כל סצנה, לפי אורכי הקריינות (כמו ברינדור למטה)
  import re as _re
  _ch=[];_t=0.0;_i=0;_lastsec=None
  for s in mod.SC:
    if "cover" in s: lab="פתיחה" if _i==0 else "סיום"
    else:
      if not [l for l in s["L"] if not l[0]=="ask"]: continue
      lab=_re.sub(r"<[^>]+>","",s["h"]).replace("·","–").replace(" (1)","").strip()
    n=1 if "cover" in s else len([l for l in s["L"] if l[0]!="ask"])
    sec=s.get("sec")
    if not (sec and sec==_lastsec) and lab not in ("לפני שמתחילים","סיימנו!","סיום"): _ch.append({"t":round(_t,2),"l":lab})
    _lastsec=sec
    for k in range(n): _t+=round(dur(wavs[_i])+ST[_i][2],3); _i+=1
  _f="yt_chapters.json"; _all=json.load(open(_f,encoding="utf-8")) if os.path.exists(_f) else {}
  _all[sys.argv[1]]=_ch; json.dump(_all,open(_f,"w",encoding="utf-8"),ensure_ascii=False,indent=0)
  if os.environ.get("CH_ONLY"): print("chapters",sys.argv[1],_ch); sys.exit()
PROG=[0.2,0.4,0.6,0.8]
from playwright.async_api import async_playwright
async def shots():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path="/usr/bin/google-chrome")
    pg=await b.new_page(viewport={"width":1920,"height":1080})
    await pg.goto("file://"+os.path.join(HERE,"page2.html" if V2 else "page.html")); await pg.evaluate("document.fonts.load('30px \"Secular One\"')"); await pg.evaluate("document.fonts.ready.then(()=>1)"); await pg.wait_for_timeout(1500)
    for i,(S,_,_,anim,_) in enumerate(ST):
      if V2 and anim:
        for k,pr in enumerate(PROG):
          await pg.evaluate("S=>render(S)",{**S,"prog":pr}); await pg.wait_for_timeout(30)
          await pg.screenshot(path=f"w/s{i:03d}_{k}.jpg",type="jpeg",quality=90)
      await pg.evaluate("S=>render(S)",S); await pg.wait_for_timeout(60)
      await pg.screenshot(path=f"w/s{i:03d}.jpg",type="jpeg",quality=92)
    await b.close()
for f in os.listdir("w"):
  if f.startswith("s") and f.endswith(".jpg"): os.remove("w/"+f)
asyncio.run(shots())
if os.environ.get("SHOTS_ONLY"): sys.exit()
vl=open("w/v.txt","w");al=open("w/a.txt","w"); T=0.0; CH=[]
FPS=30
for i,(S,say,pad,anim,sec) in enumerate(ST):
  D=round(dur(wavs[i])+pad,3)
  subprocess.run(["ffmpeg","-v","error","-y","-i",wavs[i],"-af",f"apad=whole_dur={D}","-ar","24000","-ac","1",f"w/a{i:03d}.wav"],check=True)
  frames=sorted(f for f in os.listdir("w") if f.startswith(f"s{i:03d}_"))
  with open(f"w/c{i:03d}.txt","w") as cl:
    rest=D
    for f in frames: cl.write(f"file '{f}'\nduration 0.1\n"); rest-=0.1
    cl.write(f"file 's{i:03d}.jpg'\nduration {max(rest,0.2):.3f}\nfile 's{i:03d}.jpg'\n")
  subprocess.run(["ffmpeg","-v","error","-y","-f","concat","-safe","0","-i",f"w/c{i:03d}.txt","-vf",f"scale=1280:720:flags=lanczos,fps={FPS},format=yuv420p,trim=duration={D}","-c:v","libx264","-crf","28","-tune","stillimage","-x264-params","keyint=600:min-keyint=30","-preset","veryfast","-pix_fmt","yuv420p","-r",str(FPS),f"w/t{i:03d}.mp4"],check=True)
  os.replace(f"w/t{i:03d}.mp4",f"w/v{i:03d}.mp4")
  vl.write(f"file 'v{i:03d}.mp4'\n");al.write(f"file 'a{i:03d}.wav'\n")
  if sec:
    if CH and CH[-1]["l"]==sec: CH[-1]["t1"]=round(T+D,2)
    else: CH.append({"l":sec,"t0":round(T,2),"t1":round(T+D,2)})
  T+=D
vl.close();al.close()
subprocess.run(["ffmpeg","-v","error","-y","-f","concat","-safe","0","-i","w/v.txt","-c","copy","w/vid.mp4"],check=True)
subprocess.run(["ffmpeg","-v","error","-y","-f","concat","-safe","0","-i","w/a.txt","-c","copy","w/aud.wav"],check=True)
subprocess.run(["ffmpeg","-v","error","-y","-i","w/vid.mp4","-i","w/aud.wav","-map","0:v","-map","1:a","-c:v","copy","-c:a","aac","-b:a","32k","-shortest","-movflags","+faststart",OUT+".tmp.mp4"],check=True)
os.replace(OUT+".tmp.mp4",OUT)
if V2 and not YT:  # עצירות "הבנת?" בסוף כל סעיף (באתר: "הבנתי" או "לראות שוב")
  json.dump(CH,open(OUT[:-4]+".ch.json","w",encoding="utf-8"),ensure_ascii=False)
print("done",OUT,dur(OUT),"s,",len(ST),"states")
