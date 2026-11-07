// Renderiza o filme quadro a quadro e codifica em MP4 (H.264 + AAC).
// uso: node tools/render.js [16x9|9x16] [fps] [--stills t1,t2,...] [--from s --to s]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const fmt = args[0] || '16x9';
const fps = Number(args[1] || 30);
const [W, H] = fmt === '9x16' ? [1080, 1920] : [1920, 1080];
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const stills = opt('--stills');
const from = Number(opt('--from') || 0), to = Number(opt('--to') || 48);
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'output');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error') console.error('[page]', m.text()); });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  await page.goto('file://' + path.join(root, 'render.html'));
  await page.waitForFunction(() => window.__ready === true);
  if (stills) {
    const dir = opt('--dir') || path.join(out, 'stills-' + fmt);
    fs.mkdirSync(dir, { recursive: true });
    for (const s of stills.split(',')) {
      const t = Number(s);
      await page.evaluate(t => film.seek(t), t);
      await page.screenshot({ path: path.join(dir, `t${t.toFixed(2).padStart(5, '0')}.png`) });
    }
    await browser.close();
    return;
  }
  const file = path.join(out, `nexus-reposicione-${fmt}.mp4`);
  const audio = path.join(root, 'assets/audio/nexus-soundtrack.wav');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-ss', String(from), '-t', String(to - from), '-i', audio,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '192k', '-shortest', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round((to - from) * fps);
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const t = from + i / fps;
    await page.evaluate(t => film.seek(t), t);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 60 === 0) process.stdout.write(`\r${fmt} ${i}/${n} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log(`\n${file}`);
})();
