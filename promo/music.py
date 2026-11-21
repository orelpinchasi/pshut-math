import numpy as np, wave, sys, json
# usage: music.py OUT.wav DUR '[crash times]'
SR = 48000; BPM = 120; B = 60 / BPM; DUR = float(sys.argv[2]); CR = json.loads(sys.argv[3])
N = int(SR * DUR); out = np.zeros(N)
rng = np.random.default_rng(3)
def add(sig, t, g=1.0):
    i = int(t * SR); j = min(N, i + len(sig))
    if i < N: out[i:j] += sig[:j - i] * g
def env(n, a=0.005, d=0.2):
    t = np.arange(n) / SR; e = np.minimum(1, t / a) * np.exp(-t / d); return e
def kick():
    n = int(.35 * SR); t = np.arange(n) / SR; f = 50 + 110 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .001, .18)
def clap():
    n = int(.2 * SR); s = rng.normal(0, 1, n) * env(n, .001, .06)
    return np.convolve(s, [1, -1], 'same') * .6
def hat():
    n = int(.06 * SR); s = rng.normal(0, 1, n); s = s - np.convolve(s, np.ones(4) / 4, 'same'); return s * env(n, .001, .02) * .5
def tone(freq, dur, wave='saw', d=.25, a=.004, det=0):
    n = int(dur * SR); t = np.arange(n) / SR; s = 0
    for k, dd in enumerate([0, det, -det] if det else [0]):
        ph = 2 * np.pi * freq * (1 + dd) * t
        if wave == 'saw': s = s + 2 * ((freq * (1 + dd) * t) % 1) - 1
        elif wave == 'sq': s = s + np.sign(np.sin(ph)) * .6
        else: s = s + np.sin(ph) + .3 * np.sin(2 * ph)
    s = s / (3 if det else 1)
    # simple lowpass
    s = np.convolve(s, np.ones(6) / 6, 'same')
    return s * env(n, a, d)
def note(m): return 440 * 2 ** ((m - 69) / 12)
# C - G - Am - F  (one chord per bar = 4 beats = 2s)
prog = [[60, 64, 67], [55, 59, 62, 67], [57, 60, 64], [53, 57, 60, 65]]
roots = [36, 31, 33, 29]
T_DROP = 3.0; T_VID = 5.0; T_OUT = DUR - 4.5
bars = int(DUR / (4 * B)) + 1
for bar in range(bars):
    t0 = bar * 4 * B; ch = prog[bar % 4]; r = roots[bar % 4]
    for beat in range(4):
        tb = t0 + beat * B
        if tb >= DUR: break
        full = tb >= T_DROP - 1e-6
        if full:
            add(kick(), tb, .9)
            if beat in (1, 3): add(clap(), tb, .55)
            for h in (0, .5): add(hat(), tb + h * B, .35 if h else .2)
            # bass: root on 8ths with octave bounce
            for k, m in enumerate([r, r + 12]):
                add(tone(note(m), B * .45, 'sq', d=.12), tb + k * B / 2, .32)
            # offbeat chord stabs
            for m in ch: add(tone(note(m + 12), B * .4, 'saw', d=.09, det=.004), tb + B / 2, .09)
        else:
            # soft intro pad (unsure / stuck): filtered chord swells
            if beat == 0:
                for m in ch: add(tone(note(m), 4 * B, 'sine', d=1.2, a=.4), tb, .07)
# bright lead melody (pentatonic hook) from the video reveal on
hook = [72, 74, 76, 79, 76, 74, 72, 67, 69, 72, 74, 72, 76, 74, 72, 72]
t = T_VID
i = 0
while t < DUR - .5:
    add(tone(note(hook[i % len(hook)] + 12), B * .45, 'sine', d=.18), t, .11); t += B / 2; i += 1
# riser before the reveal + crash on it
n = int(1.2 * SR); s = rng.normal(0, 1, n) * np.linspace(0, 1, n) ** 2; s = s - np.convolve(s, np.ones(8) / 8, 'same')
[add(s * .25, c - 1.2) for c in CR[:1]]
n = int(1.8 * SR); s = rng.normal(0, 1, n) * env(n, .002, .5); [add(s * .3 if i == 0 else s * .2, c) for i, c in enumerate(CR)]
add(kick(), T_VID, 1.0)
# tiny "boom" on the drop
add(kick(), T_DROP, 1.0)
# final hit
add(kick(), (DUR - 1.5), 1.0); n = int(1.5 * SR); add(rng.normal(0, 1, n) * env(n, .002, .4) * .25, (DUR - 1.5))
for m in [60, 64, 67, 72]: add(tone(note(m), 1.4, 'saw', d=.7, det=.004), (DUR - 1.5), .12)
# fade end
fl = int(1.2 * SR); out[-fl:] *= np.linspace(1, 0, fl)
out /= np.max(np.abs(out)) + 1e-9; out *= .85
st = np.stack([out, out], 1)
w = wave.open(sys.argv[1], 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((st * 32767).astype(np.int16).tobytes()); w.close()
print('ok')
