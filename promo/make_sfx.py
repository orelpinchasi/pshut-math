#!/usr/bin/env python3
"""Synthesize a soft SFX track (mono 48k WAV) from an event list.

  python3 make_sfx.py events.json OUT.wav --dur 68

events.json:
{
  "pop":    [0.15, 2.4, 6.4],          # element pops in
  "whoosh": [0.05, 3.35, 28.3],        # scene / card transitions
  "ding":   [62.1],                    # the answer / big reveal
  "buzz":   [19.3],                    # warning banner
  "ticks":  [[44.75, 9, 0.6]]          # [start, count, total_duration] — counting cells
}
Levels are deliberately low; the mux step also ducks SFX under the voice.
"""
import json, sys, wave, argparse
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("events"); ap.add_argument("out"); ap.add_argument("--dur", type=float, required=True)
a = ap.parse_args()
ev = json.load(open(a.events))
sr = 48000
out = np.zeros(int(sr * a.dur))
rng = np.random.default_rng(3)

def put(sig, t, g):
    i = int(t * sr); n = min(len(sig), len(out) - i)
    if n > 0: out[i:i + n] += sig[:n] * g

def pop():
    tt = np.arange(int(sr * .09)) / sr; f = np.linspace(900, 380, len(tt))
    return np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-tt * 38)
def whoosh(d=.45):
    n = int(sr * d); w = rng.standard_normal(n)
    return np.convolve(w, np.ones(18) / 18, 'same') * np.hanning(n) * 1.4
def tick():
    tt = np.arange(int(sr * .035)) / sr; return np.sin(2 * np.pi * 2100 * tt) * np.exp(-tt * 120)
def ding():
    tt = np.arange(int(sr * 1.4)) / sr
    return (np.sin(2*np.pi*1318.5*tt) + .7*np.sin(2*np.pi*1975.5*tt) + .4*np.sin(2*np.pi*2637*tt)) * np.exp(-tt*3.2) / 2
def buzz():
    tt = np.arange(int(sr * .25)) / sr; return np.sign(np.sin(2 * np.pi * 150 * tt)) * np.exp(-tt * 10) * .5

for t in ev.get("pop", []): put(pop(), t, .22)
for t in ev.get("whoosh", []): put(whoosh(), t, .10)
for t in ev.get("ding", []): put(ding(), t, .28); put(whoosh(.8), t, .08)
for t in ev.get("buzz", []): put(buzz(), t, .12)
for start, n, d in ev.get("ticks", []):
    for i in range(int(n)): put(tick(), start + i * d / n, .07)

out = np.clip(out, -1, 1)
with wave.open(a.out, 'w') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes((out * 32767).astype('<i2').tobytes())
print("sfx ->", a.out)
