# Nexus Agency · "Reposicione sua marca"

Comercial em motion design (49 s, com locução) para a Nexus Agency, com a identidade oficial da marca.

| Arquivo | O que é |
|---|---|
| `output/nexus-reposicione-16x9.mp4` | Filme 1920×1080, 30 fps, H.264 + AAC |
| `output/nexus-reposicione-9x16.mp4` | Filme 1080×1920 para Reels, TikTok e Stories |
| `CAMPANHA.md` | Plataforma, roteiro, locução, cortes, desdobramento, legendas, métricas |
| `index.html` | Player da campanha (16:9 / 9:16, capítulos, trilha) |
| `film.js` | O filme: cada quadro é uma função do tempo (`NexusFilm.mount(el).seek(t)`) |
| `tools/voiceover.py` | Locução com voz sintética local (Piper TTS, pt-BR) |
| `tools/soundtrack.py` | Trilha, efeitos e mixagem com a locução (numpy + scipy) |
| `tools/render.js` | Renderização quadro a quadro com Playwright + ffmpeg |
| `assets/brand/nexus-logo-ref.png` | Logo original enviada; a versão vetorial animada está em `film.js` |

## Renderizar de novo

```bash
pip install numpy scipy piper-tts
# voz pt-BR: https://github.com/rhasspy/piper/releases/download/v0.0.2/voice-pt-br-edresson-low.tar.gz
python3 tools/voiceover.py caminho/pt-br-edresson-low.onnx   # assets/audio/vo/*.wav
python3 tools/soundtrack.py                                  # assets/audio/nexus-soundtrack.{wav,mp3}
node tools/render.js 16x9 30
node tools/render.js 9x16 30
node tools/render.js 9x16 30 --from 13 --to 24               # corte parcial
node tools/render.js 16x9 30 --stills 14.9,46               # quadros avulsos
```

Para trocar site, @ ou textos finais, edite `CONFIG` no topo de `film.js`. Para usar uma locução gravada, substitua os arquivos de `assets/audio/vo/` (mesma ordem de falas) e rode `tools/soundtrack.py`.

Créditos: voz "edresson" do Piper (dataset TTS-Portuguese-Corpus, CC BY 4.0). Fontes Bebas Neue e Poppins (OFL).
