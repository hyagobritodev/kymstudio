"""
Trilha + efeitos + locução do filme Nexus Agency (49 s, 120 BPM, Ré maior).
Tudo sintetizado do zero; a locução vem de tools/voiceover.py.

Mapa (o mesmo de film.js, constante VO):
  0–8,4    "antes": acordes abafados, relógio, mundo passando rápido
  8,4–12,3 feed rolando, tensão; 12,3 tape-stop e silêncio
  13,1     raio (trovão) -> revelação da logo
  15,0     DROP: groove completo (D – A – Bm – G)
  32,2     "Mais alcance / valor / clientes": stabs
  36,4     raio + assinatura; groove leve sob o slogan
  42,8     CTA; acorde final aos 46,4

uso: python3 tools/soundtrack.py -> assets/audio/nexus-soundtrack.{wav,mp3}
"""
import json, os, subprocess, wave
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 44100
DUR = 49.0
N = int(SR * DUR)
B = 0.5  # 1 tempo
rng = np.random.default_rng(3)
ROOT = os.path.join(os.path.dirname(__file__), '..')

# início de cada fala (s) — igual a VO em film.js
VO_AT = [0.6, 3.7, 8.6, 13.1, 15.5, 18.9, 24.0, 27.0, 32.2, 36.6, 38.4, 42.8]

M = np.zeros((2, N))   # música (sofre ducking pela voz)
D = np.zeros((2, N))   # percussão (ducking leve)
X = np.zeros((2, N))   # efeitos (sem ducking)
V = np.zeros(N)        # voz
REV = np.zeros((2, N))


def ta(d): return np.arange(int(SR * d)) / SR
def hz(n): return 440.0 * 2 ** ((n - 69) / 12)
def lp(x, f, o=2): return sosfilt(butter(o, min(f, SR / 2 - 200), 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, a, b, o=2): return sosfilt(butter(o, [a, min(b, SR / 2 - 200)], 'band', fs=SR, output='sos'), x)


def put(bus, sig, t0, g=1.0, pan=0.0, rev=0.0):
    i = int(t0 * SR)
    if i >= N or i < 0:
        return
    if isinstance(sig, tuple):
        l, r = sig
    else:
        l = r = sig
    n = min(len(l), N - i)
    gl, gr = g * np.cos((pan + 1) * np.pi / 4), g * np.sin((pan + 1) * np.pi / 4)
    bus[0, i:i + n] += l[:n] * gl
    bus[1, i:i + n] += r[:n] * gr
    if rev:
        REV[0, i:i + n] += l[:n] * gl * rev
        REV[1, i:i + n] += r[:n] * gr * rev


def saw(f, d, ph=None):
    return 2 * ((f * ta(d) + (rng.random() if ph is None else ph)) % 1) - 1


def adsr(d, a=.01, de=.1, s=.7, r=.1):
    n = int(SR * d); e = np.full(n, s, float)
    na, nd, nr = max(1, int(SR * a)), int(SR * de), int(SR * r)
    e[:na] = np.linspace(0, 1, na)
    seg = e[na:na + nd]; e[na:na + nd] = np.linspace(1, s, len(seg))
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e


# ------------------------------------------------------------ instrumentos
def kick(p=1.0):
    t = ta(.5); f = 48 + 120 * np.exp(-t * 30)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    c = hp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 260) * .3
    return np.tanh((s + c) * 1.7 * p) * .95


def clap():
    t = ta(.3); nz = bp(rng.standard_normal(len(t)), 1000, 4000); e = np.zeros(len(t))
    for k, o in enumerate((0, .01, .021)):
        i = int(o * SR); e[i:] += np.exp(-t[:len(t) - i] * (100 if k < 2 else 18))
    return nz * e * .55


def hat(op=False):
    d = .22 if op else .05; t = ta(d)
    return hp(rng.standard_normal(len(t)), 8000, 4) * np.exp(-t * (16 if op else 80)) * .25


def shaker():
    t = ta(.07); return bp(rng.standard_normal(len(t)), 5000, 12000) * np.sin(np.pi * t / .07) ** 2 * .12


def bass(f, d, cut=800):
    s = saw(f, d) * .5 + np.sin(2 * np.pi * f * ta(d)) * .8
    return lp(s, cut, 3) * adsr(d, .004, .06, .85, .04) * .6


def pluck(f, d=.35, cut=5000):
    t = ta(d); s = saw(f, d) * .6 + np.sin(2 * np.pi * 2 * f * t) * .2
    return lp(s * np.exp(-t * 9), cut) * .45


def keys(f, d):
    """piano elétrico simples (FM)"""
    t = ta(d); m = np.sin(2 * np.pi * f * 2 * t) * 1.2 * np.exp(-t * 3)
    return np.sin(2 * np.pi * f * t + m) * np.exp(-t * 1.6) * .35


def supersaw(fs, d, cut=3000, a=.04, r=.3, v=5, det=.011):
    L, R = np.zeros(int(SR * d)), np.zeros(int(SR * d))
    for f in fs:
        for k in range(v):
            s = saw(f * (1 + det * (k - (v - 1) / 2) / ((v - 1) / 2)), d)
            if k % 2: L += s
            else: R += s
    e = adsr(d, a, .25, .8, r); nrm = 1 / (len(fs) * v)
    return lp(L * e * nrm, cut), lp(R * e * nrm, cut)


def impact(d=2.5):
    t = ta(d); f = 30 + 45 * np.exp(-t * 5)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6)
    nz = lp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 6) * .6
    return np.tanh((s + nz) * 1.8) * .9


def thunder(d=2.2):
    t = ta(d)
    crack = hp(rng.standard_normal(len(t)), 1800) * np.exp(-t * 30) * 1.2
    crackle = bp(rng.standard_normal(len(t)), 300, 3000) * (np.abs(np.sin(t * 90)) ** 6) * np.exp(-t * 4) * .5
    boom = lp(rng.standard_normal(len(t)), 160, 3) * np.exp(-t * 1.5) * 2.5
    return np.tanh(crack + crackle + boom + impact(d) * .6) * .9


def whoosh(d=.5, peak=.65, f=1800):
    t = ta(d); nz = bp(rng.standard_normal(len(t)), f * .4, f * 2.5)
    e = np.where(t < d * peak, (t / (d * peak)) ** 2, np.exp(-(t - d * peak) * 11))
    return nz * e * .6


def riser(d, f0=300, f1=9000):
    n = int(SR * d); nz = rng.standard_normal(n); out = np.zeros(n)
    ed = np.linspace(0, n, 41).astype(int)
    for c in range(40):
        fc = f0 * (f1 / f0) ** (c / 40)
        y = bp(nz[max(0, ed[c] - 2048):ed[c + 1]], fc * .6, fc * 1.6)
        out[ed[c]:ed[c + 1]] = y[-(ed[c + 1] - ed[c]):]
    t = ta(d)
    tone = np.sin(2 * np.pi * np.cumsum(200 * 2 ** (t / d * 3)) / SR) * .12
    return (out + tone) * (t / d) ** 2.2 * .6


def pop(f=900):
    t = ta(.12); fr = f * (1 + 1.5 * np.exp(-t * 60))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 40) * .5


def click():
    t = ta(.025); return np.sin(2 * np.pi * 3200 * t) * np.exp(-t * 300) * .4


def blip(f=1320):
    t = ta(.25)
    return (np.sin(2 * np.pi * f * t) + .5 * np.sin(2 * np.pi * f * 1.5 * t)) * np.exp(-t * 14) * .3


def tick(f=2400):
    t = ta(.03); return np.sin(2 * np.pi * f * t) * np.exp(-t * 200) * .35


def shimmer(base=86):
    out = np.zeros(int(SR * 2.5))
    for k, n in enumerate((0, 4, 7, 12, 16)):
        t = ta(2.5 - k * .05); s = np.sin(2 * np.pi * hz(base + n) * t) * np.exp(-t * 2.5) * .18
        i = int(k * .05 * SR); out[i:i + len(s)] += s
    return out


def flash():
    t = ta(.4)
    return hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 18) * .5 + np.sin(2 * np.pi * 4000 * t) * np.exp(-t * 40) * .1


# Ré maior: D – A – Bm – G
PROG = [(38, [62, 66, 69]), (33, [61, 64, 69]), (35, [62, 66, 71]), (31, [62, 67, 71])]

# ============================================================ ARRANJO
# 0–8,4: o "antes" — acordes abafados e oscilando (fita velha)
for b in range(4):
    t0 = b * 2.0 + .1
    root, ch = PROG[b % 4]
    for n in ch:
        k = keys(hz(n), 2.2)
        put(M, lp(k, 900), t0, .7, rev=.3)
    put(M, lp(bass(hz(root), 1.9, 300), 300), t0, .5)
for k in range(int(8.4 / B)):
    put(X, tick(2400 if k % 2 == 0 else 1900), k * B + .1, .45, pan=.2 if k % 2 else -.2)
put(X, flash(), .6, .9)
put(X, pop(700), .62, .9)
# "o mercado mudou": mundo passando rápido
for k in range(int(4.6 / .125)):
    put(D, hat(), 3.7 + k * .125, .35 + .3 * (k % 2), pan=np.sin(k) * .6)
for k, tm in enumerate(np.arange(3.8, 8.2, .42)):
    put(X, whoosh(.35, .7, 2500 + 300 * (k % 4)), tm, .32, pan=-.8 + (k % 5) * .4)
for k in range(10):   # contador de anos rolando
    put(X, click(), 3.9 + k * .09, .5)
put(X, impact(1.2) * .5, 5.5, .5)          # "parada no tempo" (congela)

# 8,4–12,3: feed
for k in range(int(3.9 / .25)):
    tm = 8.4 + k * .25
    root, ch = PROG[(k // 8) % 4]
    put(M, lp(pluck(hz(ch[k % 3] + 12), .3), 1500 + k * 120), tm, .5, pan=-.3 + .6 * (k % 2), rev=.3)
    put(X, click(), tm + .12, .25)
put(M, riser(3.8, 300, 7000), 8.5, .55)
put(X, whoosh(.6, .7, 1500), 10.8, .6)      # post se desfaz

# 13,1: raio + revelação
put(X, thunder(2.4), 13.1, 1.1, rev=.4)
put(M, riser(1.85, 500, 12000), 13.15, .7)
for k, tm in enumerate((14.45, 14.55, 14.65)):  # "n" "e" "x"
    put(X, pop(800 + k * 200), tm, .8, pan=-.3 + k * .3)
put(X, whoosh(.4, .6, 2200), 14.75, .6)
put(X, shimmer(86), 14.9, .8, rev=.6)

# 15–32: DROP
for b in range(9):  # 15,17,...,31
    t0 = 15.0 + b * 2.0
    root, ch = PROG[b % 4]
    light = 24.0 <= t0 < 27.0          # respiro na "nova história"
    for k in range(4):
        tm = t0 + k * B
        if not light or k == 0:
            put(D, kick(1.1), tm, 1.0)
        put(D, hat(True), tm + .25, .45, pan=.15)
        if k in (1, 3):
            put(D, clap(), tm, .8 if not light else .5, rev=.3)
    for k in range(16):
        put(D, shaker(), t0 + k * .125, .8, pan=-.4 + .8 * (k % 2))
    for k in range(8):
        put(M, bass(hz(root + (12 if k % 2 else 0)), .22, 900), t0 + k * .25, .85)
    put(M, supersaw([hz(n) for n in ch] + [hz(ch[0] + 12)], 2.05, cut=1800 if light else 3600), t0, .5, rev=.4)
    arp = ch + [ch[0] + 12, ch[1] + 12, ch[2] + 12]
    for k in range(8):
        put(M, pluck(hz(arp[(k * 2) % len(arp)] + 12), .3), t0 + k * .25, .32, pan=.35 * (1 if k % 2 else -1), rev=.35)
for tm in (15.0, 18.9, 20.43, 21.43, 24.0, 27.0, 29.0):
    put(X, whoosh(.5, .7, 2000), tm - .35, .55)
put(X, impact(1.6) * .8, 15.0, .9, rev=.3)
put(X, flash(), 17.6, .6)                   # cartão vira
for k, tm in enumerate(np.arange(21.9, 23.7, .3)):   # notificações
    put(X, blip(1175 + 220 * (k % 3)), tm, .45, pan=-.4 + .16 * k, rev=.3)
for k, tm in enumerate(np.arange(27.4, 28.9, .25)):  # conexões
    put(X, pop(1000 + 90 * k), tm, .35, pan=-.5 + .17 * k)
put(X, riser(2.4, 400, 6000), 29.2, .45)
put(M, riser(1.0, 600, 12000), 31.2, .7)

# 32,2–36,3: "Mais alcance / valor / clientes"
for tm, ch in ((32.2, [62, 66, 69, 74]), (33.56, [61, 64, 69, 73]), (34.79, [59, 62, 66, 71])):
    put(D, kick(1.3), tm, 1.0); put(X, impact(1.4) * .8, tm, .8)
    put(M, supersaw([hz(n) for n in ch], .9, cut=4500, a=.005, r=.4), tm, .9, rev=.5)
    put(X, whoosh(.3, .8, 3000), tm - .25, .5)
for k in range(8):
    if 32.45 + k * B < 36.0:
        put(D, hat(True), 32.45 + k * B, .4)

# 36,4: raio + assinatura
put(X, thunder(2.6), 36.4, 1.1, rev=.45)
put(X, shimmer(81), 36.7, .8, rev=.7)
for b in range(5):  # groove leve 36,4–46,4
    t0 = 36.4 + b * 2.0
    root, ch = PROG[b % 4]
    put(M, supersaw([hz(n) for n in ch], 2.05, cut=1400, a=.4, r=.4), t0, .45, rev=.6)
    put(M, bass(hz(root), 1.9, 400), t0, .6)
    if 38.4 <= t0 < 46.4:
        for k in range(4):
            if k % 2 == 0:
                put(D, kick(.9), t0 + k * B, .7)
            put(D, hat(), t0 + k * B + .25, .35)
            if k in (1, 3):
                put(D, clap(), t0 + k * B, .45, rev=.3)
put(X, whoosh(.5, .7, 2000), 42.45, .5)
put(X, pop(1100), 44.9, .8)                  # botão
put(X, click(), 45.3, .6)
put(D, kick(1.3), 46.4, 1.0)
put(X, impact(2.6), 46.4, .9, rev=.5)
put(M, supersaw([hz(n) for n in (50, 62, 66, 69, 74, 78)], 2.6, cut=3200, a=.01, r=2.0), 46.4, .7, rev=.8)
put(X, shimmer(90), 46.45, .6, rev=.8)

# ============================================================ VOZ
meta = json.load(open(os.path.join(ROOT, 'assets/audio/vo/vo.json')))
for m, t0 in zip(meta, VO_AT):
    with wave.open(os.path.join(ROOT, f"assets/audio/vo/{m['i']:02d}.wav")) as w:
        v = np.frombuffer(w.readframes(w.getnframes()), np.int16) / 32768.0
    i = int(t0 * SR); n = min(len(v), N - i)
    V[i:i + n] += v[:n]

# ============================================================ MIX
# tape-stop: corta música/percussão aos 12,3 e silencia até 13,1
for bus in (M, D):
    i0, i1 = int(12.3 * SR), int(13.12 * SR)
    fade = np.linspace(1, 0, int(.25 * SR)) ** 2
    bus[:, i0:i0 + len(fade)] *= fade
    bus[:, i0 + len(fade):i1] = 0

ir_t = ta(2.4)
irs = [lp(rng.standard_normal(len(ir_t)), 7000) * np.exp(-ir_t * 2.8) for _ in range(2)]
wet = np.stack([fftconvolve(REV[c], irs[c] / np.sqrt(np.sum(irs[c] ** 2)))[:N] for c in range(2)]) * .8

# ducking pela voz
env = lp(np.abs(V), 8, 1)
env = env / (env.max() + 1e-9)
duck = lp(1 - .62 * np.clip(env * 3.0, 0, 1), 6, 1)
music = (M + wet) * duck * .9 + D * (0.75 + .25 * duck) * .85 + X * .8
mix = music + np.stack([V, V]) * 1.15
mix = hp(mix, 25)
pk = np.max(np.abs(mix)); mix = mix / pk * 1.35
mix = np.tanh(mix) / np.tanh(1.35)
tail = int(1.0 * SR); mix[:, -tail:] *= np.linspace(1, 0, tail) ** 1.5
mix *= 10 ** (-1.0 / 20)

out = os.path.join(ROOT, 'assets', 'audio'); os.makedirs(out, exist_ok=True)
wav = os.path.join(out, 'nexus-soundtrack.wav')
with wave.open(wav, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
mp3 = os.path.join(out, 'nexus-soundtrack.mp3')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '192k', mp3], check=True)
print('ok', wav)
