"""
Locução do filme (voz sintética local, Piper TTS, pt-BR "edresson").
Gera cada fala separada, trata o áudio (upsample, EQ, compressão, ambiência)
e grava assets/audio/vo/NN.wav + vo.json com as durações.

uso: python3 tools/voiceover.py /caminho/pt-br-edresson-low.onnx
"""
import json, os, subprocess, sys, wave
import numpy as np

LINES = [
    "Sua marca já foi a novidade.",
    "Mas o mercado mudou... e ela ficou parada no tempo.",
    "Hoje, quem não se conecta, desaparece no feed.",
    "É aí que entra a Nexus.",
    "A gente reposiciona a sua marca:",
    "estratégia, identidade e presença digital.",
    "Uma nova história, contada do jeito certo.",
    "Que conecta com as pessoas, e gera resultado de verdade.",
    "Mais alcance. Mais valor. Mais clientes.",
    "Nexus Agency.",
    "Ideias que conectam. Ações que transformam.",
    "Reposicione a sua marca. Fale com a gente.",
]

model = sys.argv[1]
root = os.path.join(os.path.dirname(__file__), '..')
out = os.path.join(root, 'assets', 'audio', 'vo')
os.makedirs(out, exist_ok=True)

from piper import PiperVoice, SynthesisConfig
voice = PiperVoice.load(model)
cfg = SynthesisConfig(length_scale=1.06, noise_scale=0.6, noise_w_scale=0.7)

# cadeia de tratamento (ffmpeg): 16 kHz -> 44,1 kHz, corte de graves, corpo,
# presença, ar, compressão, leve ambiência e normalização
CHAIN = ("aresample=44100:resampler=soxr,highpass=f=80,"
         "equalizer=f=180:t=q:w=1.0:g=2.5,equalizer=f=3200:t=q:w=1.2:g=3,"
         "equalizer=f=6500:t=q:w=1.5:g=-2,"
         "acompressor=threshold=-20dB:ratio=3.5:attack=5:release=80:makeup=4,"
         "aecho=0.8:0.5:28|46:0.10|0.07,"
         "loudnorm=I=-16:TP=-1.5:LRA=7")
meta = []
for i, text in enumerate(LINES):
    raw = os.path.join(out, f'_raw{i:02d}.wav')
    with wave.open(raw, 'wb') as w:
        voice.synthesize_wav(text, w, syn_config=cfg)
    dst = os.path.join(out, f'{i:02d}.wav')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', CHAIN,
                    '-ar', '44100', '-ac', '1', dst], check=True)
    os.remove(raw)
    # apara silêncio das pontas
    with wave.open(dst) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32)
    env = np.convolve(np.abs(x), np.ones(441) / 441, 'same')
    idx = np.where(env > 300)[0]
    a, b = max(0, idx[0] - 600), min(len(x), idx[-1] + 2600)
    y = x[a:b]
    with wave.open(dst, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(44100)
        w.writeframes(y.astype(np.int16).tobytes())
    meta.append({'i': i, 'text': text, 'dur': round(len(y) / 44100, 3)})
    print(f'{i:02d} {len(y)/44100:5.2f}s  {text}')
json.dump(meta, open(os.path.join(out, 'vo.json'), 'w'), ensure_ascii=False, indent=1)
