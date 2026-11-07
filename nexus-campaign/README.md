# Nexus Agency · "Reposicione. Renasça."

Comercial em motion design (48 s) para a Nexus Agency, agência de reposicionamento digital e rebranding.

| Arquivo | O que é |
|---|---|
| `output/nexus-reposicione-16x9.mp4` | Filme 1920×1080, 30 fps, H.264 + AAC |
| `output/nexus-reposicione-9x16.mp4` | Filme 1080×1920 para Reels, TikTok e Stories |
| `output/stills/` | Quadros-chave em PNG |
| `CAMPANHA.md` | Plataforma, roteiro, locução, cortes, desdobramento, legendas, métricas |
| `index.html` | Player interativo da campanha (16:9 / 9:16, capítulos, trilha) |
| `film.js` | O filme: cada quadro é uma função do tempo (`NexusFilm.mount(el).seek(t)`) |
| `tools/soundtrack.py` | Trilha original sintetizada (numpy + scipy) |
| `tools/render.js` | Renderização quadro a quadro com Playwright + ffmpeg |

## Renderizar de novo

```bash
pip install numpy scipy
python3 tools/soundtrack.py                 # gera assets/audio/nexus-soundtrack.{wav,mp3}
node tools/render.js 16x9 30                # output/nexus-reposicione-16x9.mp4
node tools/render.js 9x16 30                # output/nexus-reposicione-9x16.mp4
node tools/render.js 9x16 30 --from 24 --to 32          # corte parcial
node tools/render.js 16x9 30 --stills 24.6,46.6         # quadros avulsos
```

Para trocar o domínio ou a chamada final, edite `CONFIG` no topo de `film.js`.

Para assistir no navegador, sirva a pasta (`npx serve .` ou `python3 -m http.server`) e abra `index.html`.
