import json,sys,os,hashlib,subprocess,asyncio,importlib
HERE=os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0,HERE)
sys.path.insert(0,os.getcwd()); mod=importlib.import_module(sys.argv[1]); OUT=sys.argv[2]
TTS=os.environ.get("TTS_CACHE","/tmp/pshut-tts"); os.makedirs(TTS,exist_ok=True);os.makedirs("w",exist_ok=True)
W="https://pshut-solve.pshut-math.workers.dev/"
def tts(t):
  p=TTS+"/"+hashlib.md5(t.encode()).hexdigest()+".wav"
  for _ in range(4):
    if os.path.exists(p) and os.path.getsize(p)>2000: return p
    subprocess.run(["curl","-sS","-m","90","-X","POST",W,"-H","Content-Type: application/json","-H","Origin: https://orelpinchasi.github.io","--data-binary",json.dumps({"tts":t}),"-o",p])
  raise SystemExit("tts failed: "+t)
def dur(p): return float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",p],capture_output=True,text=True).stdout)
# states
ST=[]
for s in mod.SC:
  if "cover" in s: ST.append(({"cover":s["cover"]},s["say"],1.0));continue
  for j in range(len(s["L"])):
    lines=[{"c":c,"t":t} for c,t,_ in s["L"][:j+1]]
    ST.append(({"qh":mod.QH,"q":mod.Q,"h":s["h"],"hl":s.get("hl",[]),"done":s.get("done",[]),"fig":s.get("fig"),"lines":lines},s["L"][j][2],0.9 if j==len(s["L"])-1 else 0.45))
from concurrent.futures import ThreadPoolExecutor
with ThreadPoolExecutor(3) as ex: wavs=list(ex.map(tts,[x[1] for x in ST]))
from playwright.async_api import async_playwright
async def shots():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path="/usr/bin/google-chrome")
    pg=await b.new_page(viewport={"width":1920,"height":1080})
    await pg.goto("file://"+os.path.join(HERE,"page.html")); await pg.evaluate("document.fonts.load('30px \"Secular One\"')"); await pg.evaluate("document.fonts.ready.then(()=>1)"); await pg.wait_for_timeout(1500)
    for i,(S,_,_) in enumerate(ST):
      await pg.evaluate("S=>render(S)",S); await pg.wait_for_timeout(60)
      await pg.screenshot(path=f"w/s{i:03d}.jpg",type="jpeg",quality=92)
    await b.close()
asyncio.run(shots())
if os.environ.get("SHOTS_ONLY"): sys.exit()
vl=open("w/v.txt","w");al=open("w/a.txt","w")
for i,(S,say,pad) in enumerate(ST):
  D=round(dur(wavs[i])+pad,3)
  subprocess.run(["ffmpeg","-v","error","-y","-i",wavs[i],"-af",f"apad=whole_dur={D}","-ar","24000","-ac","1",f"w/a{i:03d}.wav"],check=True)
  subprocess.run(["ffmpeg","-v","error","-y","-framerate","30","-i",f"w/s{i:03d}.jpg","-vf",f"scale=1280:720:flags=lanczos,format=yuv420p,loop=-1:1,trim=duration={D}","-c:v","libx264","-crf","28","-tune","stillimage","-x264-params","keyint=600:min-keyint=600","-preset","veryfast","-pix_fmt","yuv420p","-r","30",f"w/t{i:03d}.mp4"],check=True)
  os.replace(f"w/t{i:03d}.mp4",f"w/v{i:03d}.mp4")
  vl.write(f"file 'v{i:03d}.mp4'\n");al.write(f"file 'a{i:03d}.wav'\n")
vl.close();al.close()
subprocess.run(["ffmpeg","-v","error","-y","-f","concat","-safe","0","-i","w/v.txt","-c","copy","w/vid.mp4"],check=True)
subprocess.run(["ffmpeg","-v","error","-y","-f","concat","-safe","0","-i","w/a.txt","-c","copy","w/aud.wav"],check=True)
subprocess.run(["ffmpeg","-v","error","-y","-i","w/vid.mp4","-i","w/aud.wav","-map","0:v","-map","1:a","-c:v","copy","-c:a","aac","-b:a","32k","-shortest","-movflags","+faststart",OUT+".tmp.mp4"],check=True)
os.replace(OUT+".tmp.mp4",OUT); print("done",OUT,dur(OUT),"s,",len(ST),"states")
