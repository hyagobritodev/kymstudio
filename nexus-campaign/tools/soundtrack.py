"""
Trilha original do filme "Reposicione. Renasça." (Nexus Agency).
Sintetizada do zero (sem samples), 120 BPM, Lá menor, 48 s.

O mapa de tempo é o mesmo do index.html: cada corte do filme cai num tempo
musical (1 tempo = 0,5 s, 1 compasso = 2 s).

  0–12 s   tensão: drone, relógio, feed acelerando, glitch
  12 s     impacto + ponto de virada (sino)
  14–24 s  build: kick, baixo, arpejo  (Am – F – C – G)
  24 s     DROP: revelação da nova marca
  38–42 s  stabs das palavras-manifesto
  42–48 s  assinatura Nexus, acorde final e cauda

Uso:  python3 tools/soundtrack.py  ->  assets/audio/nexus-soundtrack.{wav,mp3}
"""
import os
import subprocess
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 44100
DUR = 48.0
N = int(SR * DUR)
BEAT = 0.5
rng = np.random.default_rng(7)

L = np.zeros(N)
R = np.zeros(N)
DL = np.zeros(N)      # bus de percussão (não sofre ducking)
DR = np.zeros(N)
send_L = np.zeros(N)  # envio para o reverb
send_R = np.zeros(N)
duck = np.ones(N)     # sidechain do kick


def t_arr(d):
    return np.arange(int(SR * d)) / SR


def note(n):
    """MIDI -> Hz"""
    return 440.0 * 2 ** ((n - 69) / 12)


def lp(x, f, order=2):
    return sosfilt(butter(order, min(f, SR / 2 - 100), 'low', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), x)


def bp(x, f1, f2, order=2):
    return sosfilt(butter(order, [f1, f2], 'band', fs=SR, output='sos'), x)


def add(sig, start, gain=1.0, pan=0.0, rev=0.0, drum=False):
    """Mistura um sinal mono (ou tupla estéreo) na posição `start` (s)."""
    i = int(start * SR)
    if i >= N:
        return
    if isinstance(sig, tuple):
        sl, sr_ = sig
    else:
        sl = sr_ = sig
    n = min(len(sl), N - i)
    gl = gain * np.cos((pan + 1) * np.pi / 4)
    gr = gain * np.sin((pan + 1) * np.pi / 4)
    tl, tr = (DL, DR) if drum else (L, R)
    tl[i:i + n] += sl[:n] * gl
    tr[i:i + n] += sr_[:n] * gr
    if rev:
        send_L[i:i + n] += sl[:n] * gl * rev
        send_R[i:i + n] += sr_[:n] * gr * rev


def saw(f, d, phase=0.0):
    t = t_arr(d)
    return 2 * ((f * t + phase) % 1.0) - 1


def env_adsr(d, a=0.01, dec=0.1, s=0.7, r=0.2):
    n = int(SR * d)
    e = np.ones(n) * s
    na, nd, nr = int(SR * a), int(SR * dec), int(SR * r)
    na = max(na, 1)
    e[:na] = np.linspace(0, 1, na)
    e[na:na + nd] = np.linspace(1, s, len(e[na:na + nd]))
    if nr > 0:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


# ---------------------------------------------------------------- instrumentos
def kick(punch=1.0):
    t = t_arr(0.55)
    f = 45 + 115 * np.exp(-t * 32)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 6.5)
    click = hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 300) * 0.25
    return np.tanh((body + click) * 1.6 * punch) * 0.9


def clap():
    t = t_arr(0.35)
    nz = bp(rng.standard_normal(len(t)), 900, 3200)
    e = np.zeros(len(t))
    for k, off in enumerate((0, 0.011, 0.022)):
        i = int(off * SR)
        e[i:] += np.exp(-(t[: len(t) - i]) * (90 if k < 2 else 16))
    return nz * e * 0.5


def hat(open_=False):
    d = 0.25 if open_ else 0.06
    t = t_arr(d)
    nz = hp(rng.standard_normal(len(t)), 7500, 4)
    return nz * np.exp(-t * (14 if open_ else 70)) * 0.22


def tick(f=2600):
    t = t_arr(0.03)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 180) * 0.35


def thump():
    t = t_arr(0.6)
    f = 70 + 60 * np.exp(-t * 18)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) * 0.8


def impact(len_=3.0):
    t = t_arr(len_)
    f = 28 + 42 * np.exp(-t * 4)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.4)
    nz = lp(rng.standard_normal(len(t)), 1800) * np.exp(-t * 5) * 0.6
    return np.tanh((sub + nz) * 1.8) * 0.85


def bell(f, d=2.5):
    t = t_arr(d)
    s = (np.sin(2 * np.pi * f * t) + 0.45 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 3)
         + 0.25 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 6))
    return s * np.exp(-t * 2.2) * 0.3


def riser(d, f0=300, f1=9000):
    """Ruído com filtro passa-banda subindo + seno ascendente."""
    n = int(SR * d)
    nz = rng.standard_normal(n)
    out = np.zeros(n)
    chunks = 48
    edges = np.linspace(0, n, chunks + 1).astype(int)
    for c in range(chunks):
        fc = f0 * (f1 / f0) ** (c / chunks)
        seg = nz[max(0, edges[c] - 2048): edges[c + 1]]
        y = bp(seg, fc * 0.6, min(fc * 1.6, SR / 2 - 200))
        out[edges[c]: edges[c + 1]] = y[-(edges[c + 1] - edges[c]):]
    t = t_arr(d)
    tone = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (t / d * 3)) / SR) * 0.15
    e = (t / d) ** 2.2
    return (out * 0.9 + tone) * e * 0.55


def whoosh(d=0.6, peak=0.6, f=1500):
    t = t_arr(d)
    nz = bp(rng.standard_normal(len(t)), f * 0.5, f * 2.5)
    e = np.where(t < d * peak, (t / (d * peak)) ** 2, np.exp(-(t - d * peak) * 10))
    return nz * e * 0.5


def reverse_cymbal(d=1.5):
    t = t_arr(d)
    nz = hp(rng.standard_normal(len(t)), 5000)
    return (nz * np.exp(-t * 3.5))[::-1] * 0.3


def supersaw(freqs, d, cutoff=1400, voices=5, detune=0.012, attack=0.25, release=0.6):
    left = np.zeros(int(SR * d))
    right = np.zeros(int(SR * d))
    for f in freqs:
        for v in range(voices):
            dt = 1 + detune * (v - (voices - 1) / 2) / ((voices - 1) / 2)
            s = saw(f * dt, d, phase=rng.random())
            if v % 2:
                left += s
            else:
                right += s
    e = env_adsr(d, a=attack, dec=0.3, s=0.85, r=release)
    norm = 1.0 / (len(freqs) * voices)
    return lp(left * e * norm, cutoff), lp(right * e * norm, cutoff)


def bass(f, d, cutoff=500):
    s = saw(f, d) * 0.6 + np.sin(2 * np.pi * f / 2 * t_arr(d)) * 0.7
    return lp(s, cutoff, 3) * env_adsr(d, 0.005, 0.08, 0.8, 0.05) * 0.55


def pluck(f, d=0.3, cutoff=3500):
    t = t_arr(d)
    s = saw(f, d) * 0.5 + np.sign(np.sin(2 * np.pi * f * 1.003 * t)) * 0.3
    return lp(s * np.exp(-t * 11), cutoff) * 0.5


def stab(freqs, d=0.45):
    t = t_arr(d)
    s = sum(saw(f, d) + saw(f * 1.007, d) for f in freqs) / (2 * len(freqs))
    return lp(s, 2600) * np.exp(-t * 5) * 0.9


# ---------------------------------------------------------------- harmonia
# Am  F  C  G   (raízes em MIDI, oitava do baixo 33=A1)
PROG = [
    (33, [57, 60, 64]),  # Am
    (29, [57, 60, 65]),  # F
    (36, [55, 60, 64]),  # C
    (31, [55, 59, 62]),  # G
]


def chord_at(bar):
    return PROG[bar % 4]


# ================================================================ ARRANJO
# 0–12 s : o mundo antigo ------------------------------------------------
t = t_arr(12.0)
drone = (np.sin(2 * np.pi * 55 * t) * 0.5 + np.sin(2 * np.pi * 82.41 * t) * 0.25
         + lp(rng.standard_normal(len(t)), 220) * 0.6)
drone *= (0.55 + 0.45 * np.sin(2 * np.pi * 0.25 * t)) * np.minimum(1, t / 1.5)
drone *= np.where(t > 11.5, np.maximum(0, 1 - (t - 11.5) / 0.15), 1)
add(lp(drone, 900), 0, 0.45, rev=0.3)

# chiado de fita / CRT
hiss = hp(rng.standard_normal(int(SR * 6)), 4000) * 0.03
hiss *= np.minimum(1, t_arr(6) / 0.4) * np.minimum(1, (6 - t_arr(6)) / 0.5)
add(hiss, 0, 1.0)

# relógio: tic-tac em cada tempo até o glitch
for k in range(int(10 / BEAT)):
    add(tick(2600 if k % 2 == 0 else 2050), k * BEAT, 0.5, pan=0.25 if k % 2 else -0.25, rev=0.2)

# palavras do gancho
for tm in (2.0, 2.5, 3.0, 4.0, 4.5):
    add(thump(), tm, 0.8, rev=0.15)
add(whoosh(0.9, 0.7, 900), 4.4, 0.6, rev=0.3)   # "ficam para trás"
add(whoosh(0.6, 0.8, 2500), 5.5, 0.5)           # match-cut para o feed

# feed: chimbal em semicolcheias com filtro abrindo
for k in range(int(4.0 / 0.125)):
    tm = 6.0 + k * 0.125
    g = 0.25 + 0.75 * (k / 32)
    add(hat(), tm, g * (1.0 if k % 2 else 0.6), pan=0.3 * np.sin(k), drum=True)
for tm in (6.3, 7.5, 8.8):
    add(thump(), tm, 0.55)
add(riser(4.0, 400, 5000), 6.0, 0.35)

# glitch 10–11.6 s
g_rng = np.random.default_rng(404)
for k in range(int(1.6 / 0.0625)):
    tm = 10.0 + k * 0.0625
    d = 0.0625
    tt = t_arr(d)
    f = g_rng.choice([110, 220, 440, 880, 1760, 3520])
    blip = np.sign(np.sin(2 * np.pi * f * tt)) * 0.25
    crush = np.round(g_rng.standard_normal(len(tt)) * 3) / 3 * 0.15
    seg = (blip + crush) * np.exp(-tt * 20) * (1 - k / 26)
    add(seg, tm, 0.7, pan=g_rng.uniform(-0.7, 0.7))
add(impact(1.2) * 0.6, 10.0, 0.6, drum=True)

# 12 s : ponto de virada ---------------------------------------------------
add(impact(3.5), 12.0, 1.0, rev=0.5, drum=True)
add(bell(note(88)), 12.0, 0.9, rev=0.8)          # E6
add(bell(note(81)), 13.0, 0.6, pan=0.3, rev=0.8)  # A5
add(reverse_cymbal(1.6), 12.4, 0.8)
add(riser(1.6, 600, 10000), 12.4, 0.7)

# 14–24 s : build --------------------------------------------------------
for b in range(5):  # compassos 14,16,18,20,22
    t0 = 14.0 + b * 2.0
    root, ch = chord_at(b)
    for k in range(4):
        add(kick(0.9), t0 + k * BEAT, 0.8, drum=True)
        i = int((t0 + k * BEAT) * SR)
        n = int(0.35 * SR)
        duck[i:i + n] = np.minimum(duck[i:i + n], 0.25 + 0.75 * np.linspace(0, 1, n) ** 0.6)
        add(hat(), t0 + k * BEAT + 0.25, 0.7, pan=0.2, drum=True)
    # baixo em colcheias
    for k in range(8):
        add(bass(note(root), 0.22, 300 + 120 * b), t0 + k * 0.25, 0.8)
    # arpejo com delay (colcheia pontuada)
    arp = ch + [ch[0] + 12, ch[1] + 12]
    for k in range(8):
        f = note(arp[(k * 3) % len(arp)] + 12)
        p = pluck(f, 0.3, 2000 + 600 * b)
        tm = t0 + k * 0.25
        add(p, tm, 0.45, pan=-0.3, rev=0.4)
        add(p * 0.35, tm + 0.375, 0.45, pan=0.4, rev=0.4)
    # pad crescendo
    pl, pr = supersaw([note(n) for n in ch], 2.05, cutoff=600 + 350 * b, attack=0.4, release=0.3)
    add((pl, pr), t0, 0.35 + 0.08 * b, rev=0.5)
    # palavra de cada capítulo
    add(whoosh(0.5, 0.7, 2000), t0 - 0.3 + (b % 2) * 0.0, 0.0)
for tm in (14.0, 16.5, 19.0, 21.5):
    add(impact(1.0) * 0.5, tm, 0.5, rev=0.2, drum=True)
    add(whoosh(0.45, 0.8, 2200), tm - 0.36, 0.55)
# caixa em rolo 23–24
for k in range(16):
    tm = 23.0 + k * 0.0625
    add(clap() * (0.3 + 0.7 * k / 16), tm, 0.6, drum=True)
add(riser(2.0, 300, 12000), 22.0, 0.9)
add(reverse_cymbal(1.2), 22.8, 1.0)

# 24 s : DROP ------------------------------------------------------------
add(impact(3.0), 24.0, 1.1, rev=0.4, drum=True)
add(bell(note(93), 2.0), 24.0, 0.5, rev=0.7)
for b in range(7):  # 24..38 => 7 compassos
    t0 = 24.0 + b * 2.0
    root, ch = chord_at(b)
    for k in range(4):
        tm = t0 + k * BEAT
        add(kick(1.15), tm, 1.0, drum=True)
        i = int(tm * SR)
        n = int(0.4 * SR)
        duck[i:i + n] = np.minimum(duck[i:i + n], 0.15 + 0.85 * np.linspace(0, 1, n) ** 0.5)
        add(hat(open_=True), tm + 0.25, 0.55, pan=0.15, drum=True)
        add(hat(), tm + 0.125, 0.35, pan=-0.35, drum=True)
        add(hat(), tm + 0.375, 0.35, pan=0.35, drum=True)
        if k in (1, 3):
            add(clap(), tm, 0.9, rev=0.35, drum=True)
    for k in range(8):
        oct_ = 12 if k % 2 else 0
        add(bass(note(root + oct_), 0.22, 900), t0 + k * 0.25, 0.85)
    pl, pr = supersaw([note(n) for n in ch] + [note(ch[0] + 12)], 2.05, cutoff=2600, attack=0.05, release=0.25)
    add((pl, pr), t0, 0.55, rev=0.45)
    lead_notes = [ch[2] + 12, ch[1] + 12, ch[0] + 12, ch[1] + 12]
    for k, nn in enumerate(lead_notes):
        add(pluck(note(nn + 12), 0.45, 4500), t0 + k * 0.5 + 0.25, 0.3, pan=0.1, rev=0.5)
# whooshes dos cortes do mosaico de touchpoints
for tm in range(25, 32):
    add(whoosh(0.35, 0.8, 3000), tm - 0.28, 0.4, pan=0.5 if tm % 2 else -0.5)
add(whoosh(0.8, 0.7, 1200), 31.6, 0.6)  # entra o antes/depois
add(whoosh(0.8, 0.7, 1200), 33.6, 0.5)

# 38–42 s : stabs das palavras -------------------------------------------
for tm, ch in ((38.0, [57, 60, 64, 69]), (39.333, [53, 57, 60, 65]), (40.667, [55, 59, 62, 67])):
    add(stab([note(n) for n in ch], 1.0), tm, 0.9, rev=0.6)
    add(kick(1.2), tm, 1.0, drum=True)
    add(impact(1.2) * 0.6, tm, 0.6, drum=True)
pad = supersaw([note(n) for n in (45, 52, 57)], 4.1, cutoff=900, attack=1.0, release=0.5)
add(pad, 38.0, 0.35, rev=0.5)
add(riser(1.3, 800, 12000), 40.7, 0.8)

# 42–48 s : assinatura Nexus ---------------------------------------------
add(impact(5.5), 42.0, 1.15, rev=0.6, drum=True)
add(kick(1.3), 42.0, 1.0, drum=True)
fin_l, fin_r = supersaw([note(n) for n in (45, 57, 60, 64, 71)], 6.0, cutoff=1800, attack=0.02, release=2.5)
fade = np.exp(-t_arr(6.0) * 0.3)
add((fin_l * fade, fin_r * fade), 42.0, 0.7, rev=0.8)
add(bass(note(33), 3.0, 400) * np.exp(-t_arr(3.0) * 0.8), 42.0, 0.9)
# brilho dos nós do símbolo (43,2 s) e do wordmark
for k, nn in enumerate((81, 84, 88, 93, 96)):
    add(bell(note(nn), 2.0), 43.2 + k * 0.07, 0.35, pan=-0.5 + k * 0.25, rev=0.9)
add(whoosh(0.7, 0.6, 2500), 43.0, 0.5)
add(bell(note(76), 3.0), 44.5, 0.4, rev=0.9)   # "Reposicione. Renasça."
add(tick(3200), 45.8, 0.6, rev=0.5)            # CTA

# ================================================================ MIX
# aplica sidechain do kick só nos elementos tonais seria o ideal; aqui o
# ducking é aplicado no bus inteiro menos a parte de kick (aproximação boa)
dry_L, dry_R = L.copy(), R.copy()

# reverb: convolução com resposta impulsiva sintética estéreo
ir_t = t_arr(2.8)
ir_l = lp(rng.standard_normal(len(ir_t)), 6000) * np.exp(-ir_t * 2.4)
ir_r = lp(rng.standard_normal(len(ir_t)), 6000) * np.exp(-ir_t * 2.4)
ir_l /= np.sqrt(np.sum(ir_l ** 2))
ir_r /= np.sqrt(np.sum(ir_r ** 2))
wet_L = fftconvolve(send_L, ir_l)[:N] * 0.9
wet_R = fftconvolve(send_R, ir_r)[:N] * 0.9

duck_s = lp(duck, 40, 1)
mix_L = (dry_L + wet_L) * (0.35 + 0.65 * duck_s) + DL
mix_R = (dry_R + wet_R) * (0.35 + 0.65 * duck_s) + DR

# glue: leve saturação + limitador suave
mix = np.stack([mix_L, mix_R], axis=1)
mix = hp(mix.T, 25, 2).T
peak = np.max(np.abs(mix))
mix = mix / peak * 1.4
mix = np.tanh(mix) / np.tanh(1.4)
# fade final
tail = int(1.2 * SR)
mix[-tail:] *= np.linspace(1, 0, tail)[:, None] ** 1.5
mix *= 10 ** (-1.0 / 20)

out_dir = os.path.join(os.path.dirname(__file__), '..', 'assets', 'audio')
os.makedirs(out_dir, exist_ok=True)
wav = os.path.join(out_dir, 'nexus-soundtrack.wav')
pcm = (mix * 32767).astype(np.int16)
import wave
with wave.open(wav, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
m4a = os.path.join(out_dir, 'nexus-soundtrack.mp3')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '192k', m4a], check=True)
print('ok', wav, m4a)
