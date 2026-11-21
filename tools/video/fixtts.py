import importlib,hashlib,subprocess,json,os,sys,statistics
HERE=os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0,HERE); sys.path.insert(0,os.getcwd())
TTS=os.environ.get("TTS_CACHE","/tmp/pshut-tts")
W="https://pshut-solve.pshut-math.workers.dev/"
def dur(p):
  try: return float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",p],capture_output=True,text=True).stdout)
  except: return 99
says=[]
import glob
for fn in sorted(glob.glob("q[0-9]*.py")):
  i=int(fn[1:-3]); m=importlib.import_module(fn[:-3])
  says+=[(i,s["say"]) for s in m.SC if "cover" in s]+[(i,l[2]) for s in m.SC if "L" in s for l in s["L"]]
R=[]
for i,t in says:
  p=TTS+"/"+hashlib.md5(t.encode()).hexdigest()+".wav"; R.append((len(t)/dur(p),i,t,p))
med=statistics.median(r[0] for r in R); print("median chars/s",round(med,1),"n",len(R))
fix=[r for r in R if r[0]<med*0.75]
print("to fix:",len(fix))
changed=set()
for r0,i,t,p in fix:
  best=(dur(p),None)
  for k in range(3):
    q=f"/tmp/fx{k}.wav"
    subprocess.run(["curl","-sS","-m","90","-X","POST",W,"-H","Content-Type: application/json","-H","Origin: https://orelpinchasi.github.io","--data-binary",json.dumps({"tts":t}),"-o",q])
    d=dur(q)
    if d<best[0] and d>len(t)/(med*1.6): best=(d,q)
    if len(t)/d>=med*0.85: break
  if best[1]: os.replace(best[1],p); changed.add(i)
  print(i,round(len(t)/dur(p),1),t[:40])
print("CHANGED",sorted(changed))
