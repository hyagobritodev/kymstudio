/*
 * NEXUS AGENCY — filme de lançamento "Reposicione sua marca"
 * 49 s, 120 BPM, com locução. Identidade: pílula vermelho→rosa, raio, Bebas Neue + Poppins.
 *
 * Cada quadro é função pura do tempo: NexusFilm.mount(el).seek(t)
 * Funciona em 16:9 e 9:16 (unidade u = menor lado / 100).
 */
(function () {
  'use strict';

  const CONFIG = {
    site: 'nexusagency.com.br',
    insta: '@nexus.agency',
    duration: 49,
  };

  // início de cada fala (s) — igual a VO_AT em tools/soundtrack.py
  const VO = [0.6, 3.7, 8.6, 13.1, 15.5, 18.9, 24.0, 27.0, 32.2, 36.6, 38.4, 42.8];

  // ------------------------------------------------------------ util
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const P = (t, a, b) => clamp((t - a) / (b - a));
  const lerp = (a, b, p) => a + (b - a) * p;
  const E = {
    outExpo: p => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
    inExpo: p => (p <= 0 ? 0 : Math.pow(2, 10 * p - 10)),
    outCubic: p => 1 - Math.pow(1 - p, 3),
    inCubic: p => p * p * p,
    inOut: p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    inOutQuint: p => (p < 0.5 ? 16 * p ** 5 : 1 - Math.pow(-2 * p + 2, 5) / 2),
    // mola com leve overshoot (assinatura do motion "fintech")
    spring: p => (p <= 0 ? 0 : p >= 1 ? 1 : 1 - Math.exp(-6.2 * p) * Math.cos(10.5 * p)),
    springSoft: p => (p <= 0 ? 0 : p >= 1 ? 1 : 1 - Math.exp(-7.5 * p) * Math.cos(7 * p)),
  };
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  const C = {
    ink: '#0D0D0D', ink2: '#1A1A1A', ink3: '#262626', red: '#FF0050', pink: '#FF2D9A', mag: '#FF00B4',
    purple: '#8A2BE2', white: '#F5F5F5', pure: '#FFFFFF',
  };
  const GRAD = `linear-gradient(120deg,${C.red} 0%,${C.pink} 55%,${C.purple} 100%)`;

  // ------------------------------------------------------------ estilos
  const CSS = `
@font-face{font-family:'Bebas Neue';font-weight:400;font-display:block;src:url(assets/fonts/BebasNeue-400.woff2) format('woff2')}
@font-face{font-family:'Poppins';font-weight:300;font-display:block;src:url(assets/fonts/Poppins-300.woff2) format('woff2')}
@font-face{font-family:'Poppins';font-weight:400;font-display:block;src:url(assets/fonts/Poppins-400.woff2) format('woff2')}
@font-face{font-family:'Poppins';font-weight:500;font-display:block;src:url(assets/fonts/Poppins-500.woff2) format('woff2')}
@font-face{font-family:'Poppins';font-weight:600;font-display:block;src:url(assets/fonts/Poppins-600.woff2) format('woff2')}
@font-face{font-family:'Poppins';font-weight:700;font-display:block;src:url(assets/fonts/Poppins-700.woff2) format('woff2')}
@font-face{font-family:'Poppins';font-weight:800;font-display:block;src:url(assets/fonts/Poppins-800.woff2) format('woff2')}
.nx{--u:10px;position:absolute;inset:0;overflow:hidden;background:${C.ink};color:${C.white};
  font-family:'Poppins',Arial,sans-serif;-webkit-font-smoothing:antialiased;contain:strict;user-select:none}
.nx *{box-sizing:border-box}
.nx .sc{position:absolute;inset:0;overflow:hidden;display:none}
.nx .a{position:absolute;left:50%;top:50%;transform-origin:50% 50%}
.nx .ov{position:absolute;inset:0;pointer-events:none}
.nx svg{display:block;overflow:visible}
.nx .bb{font-family:'Bebas Neue',Impact,sans-serif;font-weight:400;line-height:.9;letter-spacing:.005em;white-space:nowrap;display:inline-block}
.nx .pp{font-family:'Poppins',Arial,sans-serif;white-space:nowrap;display:inline-block}
.nx .m{display:inline-block;overflow:hidden;vertical-align:top;padding:.1em .03em .06em;margin:-.1em -.03em -.06em}
.nx .wi{display:inline-block;will-change:transform}
.nx .hi{color:${C.pink}}
.nx .gtxt{background:${GRAD};-webkit-background-clip:text;background-clip:text;color:transparent}
.nx .card{position:absolute;border-radius:calc(var(--u)*2.2);overflow:hidden;box-shadow:0 calc(var(--u)*2.4) calc(var(--u)*6) rgba(0,0,0,.35)}
.nx .chip{display:inline-flex;align-items:center;gap:calc(var(--u)*.8);border-radius:99px;white-space:nowrap;font-weight:600}
.nx .phone{position:absolute;border-radius:calc(var(--u)*4.6);background:#050505;padding:calc(var(--u)*1);
  box-shadow:0 0 0 calc(var(--u)*.35) #2c2c2c,0 calc(var(--u)*4) calc(var(--u)*9) rgba(0,0,0,.55)}
.nx .screen{position:absolute;inset:calc(var(--u)*1);border-radius:calc(var(--u)*3.6);overflow:hidden}
.nx .notch{position:absolute;left:50%;top:calc(var(--u)*1.8);width:28%;height:calc(var(--u)*2.2);margin-left:-14%;border-radius:99px;background:#050505;z-index:3}
.nx .face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:calc(var(--u)*2.2);overflow:hidden}
.nx .lbl{font-family:'Poppins',Arial,sans-serif;font-weight:500;letter-spacing:.32em;text-transform:uppercase;white-space:nowrap}
`;

  // ------------------------------------------------------------ peças gráficas
  const BOLT_D = 'M735 60 L793 34 L778 128 L806 128 L757 302 L765 176 L727 176 Z';
  // logo Nexus vetorial (recriada a partir do arquivo da marca)
  const LOGO = (k, dark) => {
    const fg = dark ? C.white : '#111111';
    return `<svg viewBox="40 20 780 300" data-k="${k}" style="width:100%;height:auto">
  <defs>
    <linearGradient id="g${k}" x1="0" x2="1"><stop offset="0" stop-color="#FF0A12"/><stop offset=".5" stop-color="#FA0256"/><stop offset="1" stop-color="#FD00B4"/></linearGradient>
    <clipPath id="c${k}"><rect x="46" y="62" width="430" height="213" rx="106.5"/></clipPath>
  </defs>
  <rect data-k="${k}pill" x="46" y="62" width="430" height="213" rx="106.5" fill="url(#g${k})" style="transform-box:fill-box;transform-origin:50% 50%"/>
  <g clip-path="url(#c${k})"><text data-k="${k}nex" x="260" y="220" text-anchor="middle" font-family="Poppins" font-weight="800" font-size="194" letter-spacing="-7" fill="#fff">nex</text></g>
  <text data-k="${k}us" x="485" y="220" font-family="Poppins" font-weight="800" font-size="194" letter-spacing="-9" fill="${fg}">us</text>
  <text data-k="${k}ag" x="494" y="270" font-family="Poppins" font-weight="300" font-size="30" letter-spacing="16.5" fill="${fg}">agency</text>
  <path data-k="${k}bolt" d="${BOLT_D}" fill="${fg}" style="transform-box:fill-box;transform-origin:50% 0%"/>
</svg>`;
  };
  const BOLT = (fill, k = '') => `<svg viewBox="724 30 86 276" ${k ? `data-k="${k}"` : ''} style="width:100%;height:100%"><path d="${BOLT_D}" fill="${fill}"/></svg>`;

  // logo "antigo" fictício do cliente (WordArt 2009)
  const OLD_DEFS = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
 <linearGradient id="nxog1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7fe0ff"/><stop offset=".55" stop-color="#1f6fd1"/><stop offset="1" stop-color="#0a2a6b"/></linearGradient>
 <linearGradient id="nxog2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7c2"/><stop offset=".45" stop-color="#ffc21a"/><stop offset="1" stop-color="#a35a00"/></linearGradient>
 <linearGradient id="nxog3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7a7a"/><stop offset="1" stop-color="#b3001b"/></linearGradient>
 <filter id="nxosh" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="3" dy="5" stdDeviation="2.2" flood-color="#000" flood-opacity=".6"/></filter>
 <symbol id="nxold" viewBox="0 0 400 210">
  <path d="M18 150 C 90 30, 300 0, 392 62 C 300 30, 120 58, 18 150 Z" fill="url(#nxog1)" filter="url(#nxosh)"/>
  <path d="M40 168 C 140 120, 290 118, 380 140 C 280 136, 150 140, 40 168 Z" fill="url(#nxog3)" opacity=".95"/>
  <text x="200" y="128" text-anchor="middle" font-family="Georgia,'DejaVu Serif','Times New Roman',serif" font-weight="700" font-style="italic" font-size="66" fill="url(#nxog2)" stroke="#5a2d00" stroke-width="1.6" filter="url(#nxosh)">Sua Marca</text>
  <text x="352" y="84" font-family="Arial,sans-serif" font-size="20" fill="#ffd23f">®</text>
  <text x="200" y="198" text-anchor="middle" font-family="'Comic Sans MS','Comic Neue','DejaVu Sans',cursive" font-style="italic" font-size="17" fill="#cfe8ff" filter="url(#nxosh)">Qualidade e Confiança desde 2009</text>
 </symbol>
</defs></svg>`;
  const OLD = `<svg viewBox="0 0 400 210" style="width:100%;height:auto"><use href="#nxold"/></svg>`;
  // a "nova" marca do cliente depois do rebrand
  const NEWMARK = (fg, size) => `<div class="pp" style="font-weight:800;letter-spacing:-.05em;font-size:${size};color:${fg};line-height:1">sua marca<span class="gtxt">.</span></div>`;

  // texto cinético (palavras em máscara); *x* = destaque rosa
  function mk(text) {
    return text.split(' ').map(w => {
      const h = /^\*(.+)\*$/.exec(w);
      return `<span class="m"><span class="wi${h ? ' hi' : ''}">${h ? h[1] : w}</span></span>`;
    }).join(' ');
  }
  const lines = arr => arr.map(l => `<div>${mk(l)}</div>`).join('');

  const ICON = {
    target: c => `<svg viewBox="0 0 48 48" style="width:100%;height:100%"><circle cx="22" cy="26" r="17" fill="none" stroke="${c}" stroke-width="3.5"/><circle cx="22" cy="26" r="10" fill="none" stroke="${c}" stroke-width="3.5"/><circle cx="22" cy="26" r="3.5" fill="${c}"/><path d="M22 26 L40 8 M33 8 H40 V15" fill="none" stroke="${c}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    play: c => `<svg viewBox="0 0 48 48" style="width:100%;height:100%"><path d="M14 8 Q14 5 17 6.5 L40 21.5 Q43 24 40 26.5 L17 41.5 Q14 43 14 40 Z" fill="${c}"/></svg>`,
    bubble: c => `<svg viewBox="0 0 48 48" style="width:100%;height:100%"><path d="M8 8 H40 Q44 8 44 12 V30 Q44 34 40 34 H22 L12 42 V34 H8 Q4 34 4 30 V12 Q4 8 8 8 Z" fill="none" stroke="${c}" stroke-width="3.5" stroke-linejoin="round"/></svg>`,
    heart: c => `<svg viewBox="0 0 24 24" style="width:100%;height:100%"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.3 3 4.5 6.6 4.5c2.1 0 3.6 1.2 4.4 2.6.8-1.4 2.3-2.6 4.4-2.6 3.6 0 5.7 3.8 4.2 7.3C19.5 16.4 12 21 12 21z" fill="${c}"/></svg>`,
    user: c => `<svg viewBox="0 0 24 24" style="width:100%;height:100%"><circle cx="12" cy="8" r="4.2" fill="${c}"/><path d="M3.5 21c.8-4.5 4.3-7 8.5-7s7.7 2.5 8.5 7z" fill="${c}"/></svg>`,
    msg: c => `<svg viewBox="0 0 24 24" style="width:100%;height:100%"><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="${c}"/></svg>`,
    up: c => `<svg viewBox="0 0 24 24" style="width:100%;height:100%"><path d="M4 17 L10 11 L14 15 L20 8 M14 8 H20 V14" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    pause: c => `<svg viewBox="0 0 24 24" style="width:100%;height:100%"><rect x="5" y="4" width="5" height="16" rx="1.5" fill="${c}"/><rect x="14" y="4" width="5" height="16" rx="1.5" fill="${c}"/></svg>`,
  };

  // ------------------------------------------------------------ HTML
  function html() {
    const POSTS = [
      `linear-gradient(135deg,#FF7A59,#FF2D9A)`, `linear-gradient(135deg,#00C2FF,#6E44FF)`, `linear-gradient(135deg,#1DE9B6,#00B0FF)`,
      `linear-gradient(135deg,#FFD166,#FF6B6B)`, `linear-gradient(135deg,#8A2BE2,#FF2D9A)`, `linear-gradient(135deg,#00E676,#00897B)`,
    ];
    const feedPost = (bg, i) => `<div data-k="fp${i}" style="position:absolute;left:4%;right:4%;height:40%;border-radius:calc(var(--u)*1.4);overflow:hidden;background:#151515">
        <div style="position:absolute;left:5%;top:5%;width:9%;aspect-ratio:1;border-radius:50%;background:${bg}"></div>
        <div style="position:absolute;left:17%;top:6.5%;width:35%;height:3.5%;border-radius:9px;background:#333"></div>
        <div style="position:absolute;left:0;right:0;top:17%;bottom:14%;background:${bg}"></div>
        <div style="position:absolute;left:5%;bottom:4%;width:7%;height:6%">${ICON.heart('#FF2D9A')}</div></div>`;
    return `${OLD_DEFS}
<!-- A · o antes -->
<div class="sc" id="sA" style="background:radial-gradient(ellipse at 50% 40%,#232323,#0e0e0e 75%)">
  <div class="ov" data-k="chips"></div>
  <div class="a bb" data-k="year" style="font-size:calc(var(--u)*7);color:#7a7a7a;letter-spacing:.06em"></div>
  <div class="a" data-k="star" style="width:calc(var(--u)*17);height:calc(var(--u)*17)">
    <svg viewBox="-50 -50 100 100" style="width:100%;height:100%"><polygon fill="#FFD400" stroke="#E2001A" stroke-width="2.5" points="${Array.from({ length: 28 }, (_, i) => { const r = i % 2 ? 37 : 49, a = i / 28 * Math.PI * 2; return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`; }).join(' ')}"/>
    <text x="0" y="7" text-anchor="middle" font-family="Impact,'Arial Black',sans-serif" font-size="17" font-weight="900" fill="#E2001A" transform="rotate(-12)">NOVIDADE!</text></svg>
  </div>
  <div class="a" data-k="oldA">${OLD}</div>
  <div class="a" data-k="pauseA" style="width:calc(var(--u)*9);height:calc(var(--u)*9);border-radius:50%;background:rgba(245,245,245,.92);padding:calc(var(--u)*2.2)">${ICON.pause('#111')}</div>
  <div class="a chip" data-k="frozen" style="background:#2a2a2a;color:#bdbdbd;padding:calc(var(--u)*.8) calc(var(--u)*1.8);font-size:calc(var(--u)*1.7)">pausada em 2009</div>
  <div class="a bb" data-k="a1" data-fs="12" data-fit="92,150" style="text-align:center">${lines(['SUA MARCA JÁ FOI', 'A *NOVIDADE.*'])}</div>
  <div class="a bb" data-k="a2" data-fs="12" data-fit="92,150" style="text-align:center">${mk('MAS O MERCADO *MUDOU.*')}</div>
  <div class="a bb" data-k="a3" data-fs="12" data-fit="92,150" style="text-align:center;color:#bdbdbd">${lines(['E ELA FICOU', 'PARADA NO TEMPO.'])}</div>
  <div class="ov" data-k="flashA" style="background:#fff;opacity:0"></div>
</div>
<!-- B · o feed -->
<div class="sc" id="sB" style="background:radial-gradient(ellipse at 50% 50%,#1b1b1b,#090909 70%)">
  <div class="a" data-k="phB">
    <div class="phone" style="inset:0"><div class="notch"></div><div class="screen" style="background:#0b0b0b" data-k="feed">
      ${POSTS.map((p, i) => feedPost(p, i)).join('')}
      <div data-k="oldPost" style="position:absolute;left:4%;right:4%;height:40%;border-radius:calc(var(--u)*1.4);overflow:visible;background:#cfcfcf">
        <div style="position:absolute;left:5%;top:5%;width:9%;aspect-ratio:1;border-radius:50%;background:#9a9a9a"></div>
        <div style="position:absolute;left:17%;top:6.5%;width:35%;height:3.5%;border-radius:9px;background:#9a9a9a"></div>
        <div style="position:absolute;left:8%;right:8%;top:24%">${OLD}</div>
        <div data-k="dust" style="position:absolute;inset:0"></div>
      </div>
    </div></div>
  </div>
  <div class="a bb" data-k="b1" data-fs="12" data-fit="92,80" style="line-height:.92">${lines(['QUEM NÃO SE', '*CONECTA,*'])}</div>
  <div class="a bb" data-k="b2" data-fs="12" data-fit="92,80" style="line-height:.92">${lines(['DESAPARECE', 'NO FEED.'])}</div>
</div>
<!-- C · entra a Nexus -->
<div class="sc" id="sC" style="background:${C.ink}">
  <div class="ov" data-k="cglow" style="background:radial-gradient(circle at 50% 50%,rgba(255,45,154,.35),rgba(255,0,80,0) 55%)"></div>
  <div class="a" data-k="cbolt" style="width:calc(var(--u)*16);height:calc(var(--u)*52)">${BOLT(C.white)}</div>
  <div class="a pp" data-k="c1" style="font-size:calc(var(--u)*4.2);font-weight:500">${mk('É aí que entra a')}</div>
  <div class="a" data-k="cl">${LOGO('L1', true)}</div>
  <div class="a" data-k="wipe" style="background:${GRAD}"></div>
  <div class="ov" data-k="flashC" style="background:#fff;opacity:0"></div>
</div>
<!-- D · o que a Nexus faz -->
<div class="sc" id="sD" style="background:${C.red}">
  <div class="ov" data-k="aur" style="background:${GRAD}"></div>
  <div class="ov" data-k="aur1"></div><div class="ov" data-k="aur2"></div>
  <div class="ov" data-k="dpat"></div>
  <div class="a bb" data-k="d1" data-fs="13" data-fit="88,84" style="line-height:.9">${lines(['A GENTE', 'REPOSICIONA', 'A SUA MARCA'])}</div>
  <div class="a" data-k="flip" style="transform-style:preserve-3d">
    <div class="face" style="background:#fff;display:flex;align-items:center;justify-content:center;padding:10%"><div style="width:100%;filter:saturate(.75)">${OLD}</div></div>
    <div class="face" style="background:${C.ink};transform:rotateY(180deg);display:flex;align-items:center;justify-content:center">${NEWMARK(C.white, 'calc(var(--u)*6.4)')}</div>
  </div>
  ${['ESTRATÉGIA', 'IDENTIDADE', 'PRESENÇA DIGITAL'].map((w, i) => `
  <div class="a pp" data-k="dn${i}" style="font-size:calc(var(--u)*1.8);font-weight:600;letter-spacing:.2em;opacity:.85">0${i + 1} / 03</div>
  <div class="a bb" data-k="dw${i}" data-fs="15" data-fit="88,86" style="line-height:.88">${i === 2 ? lines(['PRESENÇA', 'DIGITAL']) : mk(w)}</div>`).join('')}
  <div class="a card" data-k="v0" style="background:#fff;color:#111">
    <div class="a" data-k="v0t" style="width:44%;aspect-ratio:1">${ICON.target(C.red)}</div>
    <div class="a pp" data-k="v0a" style="font-size:calc(var(--u)*2.2);font-weight:700;color:#111">posicionamento</div>
    <div class="a pp" data-k="v0b" style="font-size:calc(var(--u)*1.6);font-weight:500;color:#777">público · tom · diferencial</div>
  </div>
  <div class="a card" data-k="v1" style="background:#fff;color:#111">
    <div class="a" data-k="v1m">${NEWMARK('#111', 'calc(var(--u)*5)')}</div>
    ${[C.red, C.pink, C.purple, C.ink].map((c, i) => `<div class="a" data-k="v1s${i}" style="width:calc(var(--u)*5.6);height:calc(var(--u)*5.6);border-radius:50%;background:${c}"></div>`).join('')}
    <div class="a pp" data-k="v1aa" style="font-size:calc(var(--u)*5.5);font-weight:700;color:#111;letter-spacing:-.02em">Aa <span style="font-weight:300">Aa</span></div>
  </div>
  <div class="a" data-k="v2">
    <div class="phone" style="inset:0"><div class="notch"></div><div class="screen" style="background:#fff">
      <div style="position:absolute;left:8%;top:12%;width:22%;aspect-ratio:1;border-radius:50%;background:${C.ink};display:flex;align-items:center;justify-content:center;overflow:hidden"><div style="transform:scale(.55)">${NEWMARK(C.white, 'calc(var(--u)*2)')}</div></div>
      <div class="pp" style="position:absolute;left:35%;top:13%;font-weight:700;font-size:calc(var(--u)*1.8);color:#111">suamarca</div>
      <div class="pp" style="position:absolute;left:35%;top:17.5%;font-size:calc(var(--u)*1.3);color:#777">nova fase</div>
      <div style="position:absolute;left:8%;right:8%;top:26%;height:5.5%;border-radius:99px;background:${GRAD}"></div>
      <div data-k="v2grid" style="position:absolute;left:0;right:0;top:35%;display:grid;grid-template-columns:repeat(3,1fr);gap:1.5%">
        ${Array.from({ length: 12 }, (_, i) => `<div style="aspect-ratio:1;background:${[C.red, C.ink, C.pink, C.purple, C.ink, C.red][i % 6]};display:flex;align-items:center;justify-content:center">${i % 3 === 1 ? `<div style="width:30%;height:52%">${BOLT('#fff')}</div>` : ''}</div>`).join('')}
      </div>
    </div></div>
  </div>
  ${[['heart', 'curtiu sua publicação'], ['user', 'começou a seguir você'], ['msg', 'quero um orçamento!']].map((n, i) => `
  <div class="a chip" data-k="nt${i}" style="background:#fff;color:#111;padding:calc(var(--u)*1) calc(var(--u)*1.8) calc(var(--u)*1) calc(var(--u)*1);font-size:calc(var(--u)*1.7);box-shadow:0 calc(var(--u)*1) calc(var(--u)*3) rgba(0,0,0,.25)">
    <span style="width:calc(var(--u)*3.6);height:calc(var(--u)*3.6);border-radius:50%;background:${GRAD};padding:calc(var(--u)*.85);display:block">${ICON[n[0]]('#fff')}</span>${n[1]}</div>`).join('')}
</div>
<!-- E · nova história -->
<div class="sc" id="sE" style="background:${C.ink}">
  <div class="ov" data-k="eglow" style="background:radial-gradient(ellipse 70% 60% at 50% 55%,rgba(138,43,226,.45),rgba(255,0,80,.12) 45%,rgba(0,0,0,0) 72%)"></div>
  <div class="a" data-k="eplay" style="width:calc(var(--u)*12);height:calc(var(--u)*12);border-radius:50%;background:${GRAD};padding:calc(var(--u)*3)">${ICON.play('#fff')}</div>
  ${[0, 1, 2].map(i => `<div class="a card" data-k="st${i}" style="background:${[GRAD, C.white, C.ink2][i]};border:${i === 2 ? '1px solid #333' : '0'}">
    <div style="position:absolute;left:7%;right:7%;top:3.5%;height:1.3%;border-radius:9px;background:rgba(${i === 1 ? '0,0,0' : '255,255,255'},.3)"><div data-k="sp${i}" style="height:100%;border-radius:9px;background:${i === 1 ? '#111' : '#fff'};transform-origin:0 50%"></div></div>
    ${i === 0 ? `<div class="bb" style="position:absolute;left:9%;bottom:9%;font-size:calc(var(--u)*5.2);color:#fff;line-height:.9">CAPÍTULO<br>NOVO</div>`
      : i === 1 ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">${NEWMARK('#111', 'calc(var(--u)*3.2)')}</div>`
        : `<div style="position:absolute;left:22%;right:22%;top:30%;aspect-ratio:1">${ICON.bubble(C.pink)}</div><div class="pp" style="position:absolute;left:0;right:0;bottom:16%;text-align:center;font-weight:600;font-size:calc(var(--u)*1.8);color:#fff">conte com a gente</div>`}
  </div>`).join('')}
  <div class="a bb" data-k="e1" data-fs="12" data-fit="92,120">${mk('UMA *NOVA* HISTÓRIA,')}</div>
  <div class="a pp" data-k="e2" data-fs="4" data-fit="90,120" style="font-weight:600">${mk('contada do *jeito* *certo.*')}</div>
</div>
<!-- F · conexão e resultado -->
<div class="sc" id="sF" style="background:${C.white};color:#111">
  <svg class="a" data-k="netsvg"></svg>
  <div class="a" data-k="hub" style="width:calc(var(--u)*13);height:calc(var(--u)*13);border-radius:50%;background:${C.ink};display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 calc(var(--u)*1.2) rgba(255,45,154,.18)"><div style="transform:scale(.72)">${NEWMARK(C.white, 'calc(var(--u)*2.6)')}</div></div>
  ${Array.from({ length: 8 }, (_, i) => `<div class="a" data-k="av${i}" style="width:calc(var(--u)*7);height:calc(var(--u)*7);border-radius:50%;background:${[C.red, C.pink, C.purple, '#111'][i % 4]};padding:calc(var(--u)*1.4);overflow:hidden">${ICON.user('#fff')}</div>`).join('')}
  <div class="a card" data-k="dash" style="background:#fff;box-shadow:0 calc(var(--u)*2) calc(var(--u)*6) rgba(0,0,0,.12)">
    <div class="pp" style="position:absolute;left:6%;top:7%;font-weight:700;font-size:calc(var(--u)*2.1)">Resultados</div>
    <div class="pp" style="position:absolute;right:6%;top:8%;font-weight:500;font-size:calc(var(--u)*1.4);color:#888">depois do reposicionamento</div>
    <svg viewBox="0 0 100 50" preserveAspectRatio="none" style="position:absolute;left:6%;top:24%;width:88%;height:66%">
      <defs><linearGradient id="nxarea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.pink}" stop-opacity=".45"/><stop offset="1" stop-color="${C.pink}" stop-opacity="0"/></linearGradient>
        <linearGradient id="nxline" x1="0" x2="1"><stop offset="0" stop-color="${C.red}"/><stop offset="1" stop-color="${C.purple}"/></linearGradient>
        <clipPath id="nxchc"><rect data-k="chclip" x="0" y="-10" width="0" height="70"/></clipPath></defs>
      ${[12.5, 25, 37.5].map(y => `<line x1="0" x2="100" y1="${y}" y2="${y}" stroke="#eee" stroke-width=".4"/>`).join('')}
      <g clip-path="url(#nxchc)">
        <path d="M0 44 C 12 42, 18 40, 26 38 S 40 36, 48 30 S 62 26, 70 18 S 86 8, 100 3 L100 50 L0 50 Z" fill="url(#nxarea)"/>
        <path d="M0 44 C 12 42, 18 40, 26 38 S 40 36, 48 30 S 62 26, 70 18 S 86 8, 100 3" fill="none" stroke="url(#nxline)" stroke-width="5" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
      </g>
    </svg>
  </div>
  ${['Alcance', 'Engajamento', 'Vendas'].map((k, i) => `<div class="a chip" data-k="kp${i}" style="background:${C.ink};color:#fff;padding:calc(var(--u)*.9) calc(var(--u)*1.8) calc(var(--u)*.9) calc(var(--u)*1);font-size:calc(var(--u)*1.9)"><span style="width:calc(var(--u)*3.4);height:calc(var(--u)*3.4);border-radius:50%;background:${GRAD};padding:calc(var(--u)*.7);display:block">${ICON.up('#fff')}</span>${k}</div>`).join('')}
  <div class="a bb" data-k="f1" data-fs="11" data-fit="92,150">${mk('QUE *CONECTA* COM AS PESSOAS')}</div>
  <div class="a bb" data-k="f2" data-fs="11" data-fit="92,150">${mk('E GERA *RESULTADO* DE VERDADE')}</div>
</div>
<!-- G · mais -->
<div class="sc" id="sG">
  ${[['ALCANCE.', C.red], ['VALOR.', C.pink], ['CLIENTES.', C.purple]].map((w, i) => `
  <div class="ov" data-k="g${i}" style="background:${w[1]};display:none">
    <div class="ov" data-k="gp${i}"></div>
    <div class="a" data-k="gb${i}" style="width:calc(var(--u)*7);height:calc(var(--u)*22);opacity:.95">${BOLT('#fff')}</div>
    <div class="a bb" data-k="gm${i}" style="font-size:calc(var(--u)*8);color:#111">MAIS</div>
    <div class="a bb" data-k="gw${i}" data-fs="30" data-fit="90,150" style="color:#fff">${w[0]}</div>
  </div>`).join('')}
</div>
<!-- H · assinatura -->
<div class="sc" id="sH" style="background:${C.ink}">
  <div class="ov" data-k="hglow" style="background:radial-gradient(ellipse 60% 50% at 50% 42%,rgba(255,0,80,.28),rgba(138,43,226,.12) 45%,rgba(0,0,0,0) 72%)"></div>
  <div class="ov" data-k="hpat"></div>
  <div class="a" data-k="hl">${LOGO('L2', true)}</div>
  <div class="a pp" data-k="h1" data-fs="3.6" data-fit="90,140" style="font-weight:400">${mk('*ideias* que conectam.')}</div>
  <div class="a pp" data-k="h2" data-fs="3.6" data-fit="90,140" style="font-weight:400">${mk('*ações* que transformam.')}</div>
  <div class="a lbl" data-k="h3" data-fit="90,140" style="font-size:calc(var(--u)*1.6);opacity:.8">marketing <span class="hi">•</span> storymaking <span class="hi">•</span> performance</div>
  <div class="a bb" data-k="h4" data-fs="11" data-fit="92,150">${mk('REPOSICIONE *SUA* *MARCA.*')}</div>
  <div class="a chip" data-k="h5" style="background:${GRAD};color:#fff;padding:calc(var(--u)*2) calc(var(--u)*5);font-size:calc(var(--u)*3.4);font-weight:700;box-shadow:0 calc(var(--u)*1.5) calc(var(--u)*4) rgba(255,0,80,.35)">Fale com a gente <span style="display:block;width:calc(var(--u)*2);height:calc(var(--u)*3.4)">${BOLT('#fff')}</span></div>
  <div class="a pp" data-k="h6" data-fit="90,140" style="font-size:calc(var(--u)*2.4);font-weight:500;opacity:.9">${CONFIG.site} <span class="hi">&nbsp;|&nbsp;</span> ${CONFIG.insta}</div>
</div>
<!-- globais -->
<div class="ov" data-k="flash" style="background:#fff;opacity:0"></div>
<canvas class="ov" data-k="grain" style="mix-blend-mode:overlay;opacity:.1;width:100%;height:100%"></canvas>
<div class="ov" style="background:radial-gradient(ellipse at center,rgba(0,0,0,0) 60%,rgba(0,0,0,.28) 100%)"></div>
<div class="ov" data-k="black" style="background:#000;opacity:0"></div>`;
  }

  // ------------------------------------------------------------ montagem
  function mount(root) {
    if (!document.getElementById('nx-style')) {
      const st = document.createElement('style'); st.id = 'nx-style'; st.textContent = CSS; document.head.appendChild(st);
    }
    root.classList.add('nx');
    root.innerHTML = html();
    const K = {};
    root.querySelectorAll('[data-k]').forEach(el => { K[el.dataset.k] = el; });
    const sc = {};
    root.querySelectorAll('.sc').forEach(el => { sc[el.id] = el; });

    let W = 0, H = 0, u = 1, land = true, hw = 50, hh = 50;
    const grainCtx = K.grain.getContext('2d');
    const grainTiles = [];
    let chips = [], dust = [], net = [];

    function T(el, o) {
      const x = (o.x || 0) * u, y = (o.y || 0) * u;
      const ax = o.ax === undefined ? -50 : o.ax, ay = o.ay === undefined ? -50 : o.ay;
      let s = '';
      if (o.rx || o.ry) s += `perspective(${(o.per || 150) * u}px) `;
      s += `translate(${ax}%,${ay}%) translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
      if (o.ry) s += ` rotateY(${o.ry}deg)`;
      if (o.rx) s += ` rotateX(${o.rx}deg)`;
      if (o.r) s += ` rotate(${o.r}deg)`;
      if (o.s !== undefined && o.s !== 1) s += ` scale(${Math.max(0.0001, o.s)})`;
      el.style.transform = s;
      if (o.o !== undefined) el.style.opacity = clamp(o.o);
    }
    const size = (el, w, h) => { el.style.width = (w * u) + 'px'; if (h !== undefined) el.style.height = (h * u) + 'px'; };
    const show = (el, v) => { const d = v ? (el.classList.contains('sc') ? 'block' : '') : 'none'; if (el.style.display !== d) el.style.display = d; };

    // palavras sobem com mola; tout: saem para cima
    function kin(el, t, tin, tout, opt = {}) {
      const ws = el._ws || (el._ws = Array.from(el.querySelectorAll('.wi')));
      const st = opt.stagger === undefined ? 0.06 : opt.stagger;
      const dur = opt.dur || 0.7;
      ws.forEach((w, i) => {
        const ti = Array.isArray(tin) ? tin[Math.min(i, tin.length - 1)] : tin + i * st;
        const pin = E.spring(P(t, ti, ti + dur));
        let pout = 0;
        if (tout !== undefined) pout = E.inCubic(P(t, tout + i * 0.03, tout + i * 0.03 + 0.3));
        w.style.transform = `translate3d(0,${((1 - pin) * 115 - pout * 115).toFixed(1)}%,0)`;
      });
      const first = Array.isArray(tin) ? tin[0] : tin;
      const gone = tout !== undefined && t > tout + ws.length * 0.03 + 0.35;
      el.style.visibility = t < first - 0.01 || gone ? 'hidden' : 'visible';
    }

    function fitAll() {
      root.querySelectorAll('[data-fit]').forEach(el => {
        const [mp, ml] = el.dataset.fit.split(',').map(Number);
        const max = (land ? Math.min(ml, hw * 2 - 12) : mp) * u;
        const fs = el.dataset.fs ? Number(el.dataset.fs) * u : null;
        const prevT = el.style.transform, pw = el.style.width;
        el.style.transform = 'none'; el.style.zoom = '';
        if (fs) el.style.fontSize = fs + 'px';
        el.style.width = 'max-content';
        for (let it = 0; it < 3; it++) {
          const w = el.getBoundingClientRect().width;
          if (w <= max + 0.5) break;
          if (fs) el.style.fontSize = (parseFloat(el.style.fontSize) * max / w) + 'px';
          else el.style.zoom = ((parseFloat(el.style.zoom) || 1) * max / w).toFixed(4);
        }
        el.style.width = pw; el.style.transform = prevT;
      });
    }

    // padrão da marca: arcos "n" vazados + raios em linha
    function nOutline(cx, cy, w, h, th) {
      const R = w / 2, x0 = cx - R, x1 = cx + R, ya = cy - h / 2 + R, yb = cy + h / 2;
      return `M${x0} ${yb} V${ya} A${R} ${R} 0 0 1 ${x1} ${ya} V${yb} H${x1 - th} V${ya} A${R - th} ${R - th} 0 0 0 ${x0 + th} ${ya} V${yb} Z`;
    }
    function boltOutline(cx, cy, s) {
      const pts = [[735, 60], [793, 34], [778, 128], [806, 128], [757, 302], [765, 176], [727, 176]];
      return 'M' + pts.map(([x, y]) => `${(cx + (x - 766) * s).toFixed(2)} ${(cy + (y - 168) * s).toFixed(2)}`).join(' L') + ' Z';
    }
    function pattern(seed, colA, colB, dens) {
      const r = rng(seed);
      let p = '';
      const n = Math.round((land ? 7 : 6) * dens);
      for (let i = 0; i < n; i++) {
        const cx = (r() - 0.5) * hw * 2.2, cy = (r() - 0.5) * hh * 2.2;
        const w = 18 + r() * 26;
        if (i % 2 === 0) p += `<path class="pt" pathLength="1" d="${nOutline(cx, cy, w, w * 1.25, w * 0.24)}" stroke="${i % 4 ? colA : colB}"/>`;
        else p += `<path class="pt" pathLength="1" d="${boltOutline(cx, cy, w / 120)}" stroke="${i % 3 ? colB : colA}"/>`;
      }
      return `<svg viewBox="${-hw} ${-hh} ${hw * 2} ${hh * 2}" style="position:absolute;inset:0;width:100%;height:100%"><g fill="none" stroke-width=".22" stroke-linejoin="round" stroke-dasharray="1 1">${p}</g></svg>`;
    }

    function buildChips() {
      const r = rng(5);
      const names = ['Reels', 'IA generativa', 'Pix', 'Stories', 'Shorts', 'Live', 'Collab', 'Threads', 'UGC', 'Podcast', 'Creators', 'TikTok Shop', 'Social commerce', 'WhatsApp', 'Trends', 'Memes', 'Influência', 'Comunidade'];
      const rows = land ? 7 : 11;
      let h = ''; chips = [];
      for (let j = 0; j < rows; j++) for (let k = 0; k < 4; k++) {
        const nm = names[Math.floor(r() * names.length)];
        const depth = 0.55 + r() * 0.6;
        const pink = r() > 0.82;
        h += `<div class="chip" style="position:absolute;left:0;top:0;background:${pink ? GRAD : '#2b2b2b'};color:${pink ? '#fff' : '#cfcfcf'};padding:${0.9 * u}px ${2 * u}px;font-size:${2 * depth * u}px;opacity:${(0.35 + depth * 0.5).toFixed(2)}">${nm}</div>`;
        chips.push({ y: (j - (rows - 1) / 2) * (hh * 2 / rows), x0: r() * 2 - 1 + k * 0.75, speed: (60 + r() * 60) * depth * (j % 2 ? 1 : -1) });
      }
      K.chips.innerHTML = h;
      Array.from(K.chips.children).forEach((el, i) => { chips[i].el = el; });
    }
    function buildDust() {
      const r = rng(9); let h = ''; dust = [];
      for (let i = 0; i < 70; i++) {
        const x = r() * 100, y = r() * 100, s = 4 + r() * 7;
        h += `<i style="position:absolute;left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;width:${s.toFixed(1)}%;aspect-ratio:1;background:${['#cfcfcf', '#9a9a9a', '#ffd23f', '#1f6fd1'][i % 4]};display:block;opacity:0"></i>`;
        dust.push({ dx: (r() - 0.5) * 2, dy: -0.5 - r(), rot: (r() - 0.5) * 720, d: r() * 0.5 });
      }
      K.dust.innerHTML = h;
      Array.from(K.dust.children).forEach((el, i) => { dust[i].el = el; });
    }
    function buildNet() {
      const R = land ? 26 : 30;
      net = Array.from({ length: 8 }, (_, i) => {
        const a = -Math.PI / 2 + i / 8 * Math.PI * 2 + 0.2;
        return [Math.cos(a) * R * (land ? 1.35 : 1), Math.sin(a) * R * (land ? 0.82 : 1)];
      });
      K.netsvg.setAttribute('viewBox', `${-hw} ${-hh} ${hw * 2} ${hh * 2}`);
      size(K.netsvg, hw * 2, hh * 2);
      K.netsvg.innerHTML = net.map(([x, y], i) => {
        const mx = x * 0.5 + (i % 2 ? 6 : -6), my = y * 0.5 - 8;
        return `<path data-k="ln${i}" d="M0 0 Q ${mx} ${my} ${x} ${y}" pathLength="1" fill="none" stroke="${i % 2 ? C.pink : C.red}" stroke-width=".45" stroke-linecap="round" stroke-dasharray="1 1"/>
          <circle data-k="pl${i}" r=".9" fill="${C.purple}"/>`;
      }).join('');
      K.netsvg.querySelectorAll('[data-k]').forEach(el => { K[el.dataset.k] = el; });
    }
    function buildGrain() {
      grainTiles.length = 0;
      for (let k = 0; k < 6; k++) {
        const c = document.createElement('canvas'); c.width = c.height = 192;
        const g = c.getContext('2d'); const im = g.createImageData(192, 192); const r = rng(100 + k);
        for (let i = 0; i < 192 * 192; i++) { const v = Math.floor(r() * 255); im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
        g.putImageData(im, 0, 0); grainTiles.push(c);
      }
    }

    function layout() {
      const r = root.getBoundingClientRect();
      W = r.width; H = r.height; u = Math.min(W, H) / 100; land = W >= H; hw = W / 2 / u; hh = H / 2 / u;
      root.style.setProperty('--u', u + 'px');
      size(K.oldA, land ? 46 : 70);
      size(K.phB, land ? 40 : 50, land ? 80 : 100);
      size(K.cl, land ? 66 : 86);
      size(K.hl, land ? 70 : 86);
      size(K.flip, land ? 44 : 60, land ? 28 : 38);
      size(K.v0, land ? 46 : 60, land ? 46 : 48);
      size(K.v1, land ? 46 : 60, land ? 46 : 48);
      size(K.v2, land ? 30 : 36, land ? 61 : 73);
      [0, 1, 2].forEach(i => size(K['st' + i], land ? 24 : 27, land ? 43 : 48));
      size(K.dash, land ? 74 : 84, land ? 46 : 50);
      K.aur1.style.background = `radial-gradient(circle at 20% 25%,rgba(255,255,255,.28),rgba(255,255,255,0) 40%)`;
      K.aur2.style.background = `radial-gradient(circle at 80% 80%,rgba(138,43,226,.7),rgba(138,43,226,0) 50%)`;
      K.dpat.innerHTML = pattern(3, 'rgba(255,255,255,.35)', 'rgba(255,255,255,.2)', 1);
      K.hpat.innerHTML = pattern(7, C.pink, C.purple, 1.4);
      [0, 1, 2].forEach(i => { K['gp' + i].innerHTML = pattern(20 + i, 'rgba(255,255,255,.3)', 'rgba(0,0,0,.25)', 0.9); });
      K.grain.width = Math.ceil(W / 2); K.grain.height = Math.ceil(H / 2);
      buildChips(); buildDust(); buildNet();
      const hidden = [];
      root.querySelectorAll('*').forEach(el => {
        if (el.style.display === 'none' || el.classList.contains('sc')) { hidden.push([el, el.style.display]); el.style.display = el.classList.contains('sc') ? 'block' : ''; }
      });
      fitAll();
      hidden.forEach(([el, d]) => { el.style.display = d; });
      root.querySelectorAll('[data-k]').forEach(el => { delete el._ws; });
    }

    // montagem animada da logo (prefixo L1/L2) a partir de t0
    function logoAnim(k, t, t0) {
      const pp = E.spring(P(t, t0, t0 + 0.7));
      K[k + 'pill'].style.transform = `scale(${lerp(0.2, 1, pp).toFixed(3)})`;
      K[k + 'pill'].style.opacity = P(t, t0, t0 + 0.06);
      const pn = E.spring(P(t, t0 + 0.1, t0 + 0.8));
      K[k + 'nex'].setAttribute('transform', `translate(0 ${((1 - pn) * 190).toFixed(1)})`);
      const pu = E.spring(P(t, t0 + 0.22, t0 + 0.9));
      K[k + 'us'].setAttribute('transform', `translate(${((1 - pu) * -60).toFixed(1)} 0)`);
      K[k + 'us'].style.opacity = P(t, t0 + 0.22, t0 + 0.35);
      const pb = E.spring(P(t, t0 + 0.32, t0 + 1.0));
      K[k + 'bolt'].style.transform = `scale(${Math.max(0.0001, pb).toFixed(3)})`;
      const pa = E.outCubic(P(t, t0 + 0.45, t0 + 1.2));
      K[k + 'ag'].style.opacity = pa;
      K[k + 'ag'].setAttribute('letter-spacing', lerp(40, 16.5, pa).toFixed(1));
    }
    const drawPattern = (scope, t, t0, step, dur) => {
      root.querySelectorAll(scope + ' .pt').forEach((el, i) => { el.style.strokeDashoffset = (1 - E.inOut(P(t, t0 + i * step, t0 + i * step + dur))).toFixed(3); });
    };

    // ---------------------------------------------------------- cenas
    function sceneA(t) {
      K.flashA.style.opacity = t >= 0.6 && t < 0.78 ? (1 - P(t, 0.6, 0.78)) * 0.85 : 0;
      const po = E.spring(P(t, 0.6, 1.3));
      const ly = land ? -14 : -12;
      const gray = E.outCubic(P(t, 5.0, 6.0));
      T(K.oldA, { y: ly, s: lerp(0.3, 1, po) * (1 + Math.max(0, t - 0.6) * 0.012), r: lerp(-8, 0, po), o: P(t, 0.6, 0.65) });
      K.oldA.style.filter = `grayscale(${gray.toFixed(2)}) brightness(${(1 - gray * 0.3).toFixed(2)})`;
      const sp = E.spring(P(t, 0.75, 1.4));
      T(K.star, { x: land ? 21 : 27, y: ly - (land ? 10 : 12), s: sp * (1 - E.inCubic(P(t, 3.5, 3.8))), r: -12 + t * 8 });
      const yp = E.inOut(P(t, 3.85, 4.75));
      K.year.textContent = Math.round(lerp(2009, 2026, yp));
      K.year.style.color = yp >= 1 ? C.pink : '#7a7a7a';
      T(K.year, { y: -hh + (land ? 12 : 14), o: P(t, 3.7, 3.85), s: 1 + (yp >= 1 ? 0.15 * (1 - P(t, 4.75, 5.1)) : 0) });
      K.chips.style.opacity = P(t, 3.7, 4.0);
      if (t >= 3.6) chips.forEach(c => {
        const x = ((c.x0 * hw + c.speed * (t - 3.7)) % (hw * 3) + hw * 4.5) % (hw * 3) - hw * 1.5;
        c.el.style.transform = `translate3d(${(W / 2 + x * u).toFixed(1)}px,${(H / 2 + c.y * u).toFixed(1)}px,0) translate(-50%,-50%)`;
      });
      const pz = E.spring(P(t, 6.3, 6.9));
      T(K.pauseA, { y: ly, s: pz, o: pz > 0 ? 1 : 0 });
      T(K.frozen, { y: ly + (land ? 14 : 16), s: E.spring(P(t, 6.5, 7.1)), o: P(t, 6.5, 6.6) });
      const ty = land ? 24 : 32;
      kin(K.a1, t, [0.95, 1.1, 1.25, 1.4, 2.25, 2.4], 3.45);
      T(K.a1, { y: ty });
      kin(K.a2, t, [3.75, 3.9, 4.05, 4.2], 4.95);
      T(K.a2, { y: ty });
      kin(K.a3, t, [5.2, 5.3, 5.45, 6.5, 6.62, 6.74], 8.1);
      T(K.a3, { y: ty });
    }

    function sceneB(t) {
      const lt = t - 8.4;
      const pin = E.springSoft(P(t, 8.4, 9.2));
      const px = land ? -26 : 0, py = land ? 2 : 16;
      T(K.phB, { x: px, y: py + (1 - pin) * 60 + Math.sin(t * 1.4) * 0.8, ry: (land ? 14 : 10) - lt * 1.5, rx: 6, r: land ? -3 : -2, per: 220 });
      const off = 18 * lt * lt + 20 * lt;
      const items = [K.fp0, K.fp1, K.fp2, K.oldPost, K.fp3, K.fp4, K.fp5];
      const pitch = 43;
      items.forEach((el, i) => {
        let y;
        if (el === K.oldPost) y = 8 + i * pitch - Math.min(off, 140) * 0.92;
        else { y = 8 + i * pitch - off; y = ((y % (pitch * 7)) + pitch * 7) % (pitch * 7) - pitch; }
        el.style.top = y.toFixed(2) + '%';
      });
      const fadeUI = 1 - E.outCubic(P(t, 10.8, 11.2));
      K.oldPost.style.background = `rgba(207,207,207,${fadeUI.toFixed(2)})`;
      Array.from(K.oldPost.children).forEach(ch => { if (ch !== K.dust) ch.style.opacity = fadeUI; });
      dust.forEach(p => {
        const q = E.outCubic(P(t, 10.85 + p.d * 0.4, 11.9 + p.d * 0.4));
        p.el.style.opacity = t < 10.85 ? 0 : (1 - q);
        p.el.style.transform = `translate(${(p.dx * q * 300).toFixed(1)}%,${(p.dy * q * 400).toFixed(1)}%) rotate(${(p.rot * q).toFixed(0)}deg)`;
      });
      const tpos = land ? { x: 10, y: 0, ax: 0 } : { x: 0, y: -hh + 6, ax: -50, ay: 0 };
      kin(K.b1, t, [8.6, 8.7, 8.82, 9.3], 10.6);
      T(K.b1, tpos);
      kin(K.b2, t, [10.85, 11.3, 11.45], 12.1, { stagger: 0.04 });
      T(K.b2, tpos);
      K.b1.style.textAlign = K.b2.style.textAlign = land ? 'left' : 'center';
      sc.sB.style.opacity = 1 - E.inCubic(P(t, 12.0, 12.3));
    }

    function sceneC(t) {
      const pb = E.outExpo(P(t, 13.1, 13.3));
      const shrink = E.inOut(P(t, 14.2, 14.55));
      const shake = t > 13.1 && t < 13.5 ? (hash(Math.floor(t * 60)) - 0.5) * 3 * (1 - P(t, 13.1, 13.5)) : 0;
      T(K.cbolt, { x: shake, y: lerp(-hh - 40, 0, pb) + shake, s: lerp(1, 0.2, shrink), r: 8, o: t < 13.1 ? 0 : 1 - P(t, 14.45, 14.55) });
      K.cbolt.style.filter = `drop-shadow(0 0 ${(4 * u).toFixed(1)}px ${C.pink}) drop-shadow(0 0 ${(1 * u).toFixed(1)}px #fff)`;
      K.flashC.style.opacity = t >= 13.1 && t < 13.35 ? 1 - P(t, 13.1, 13.35) : 0;
      K.cglow.style.opacity = P(t, 13.1, 13.3) * (0.7 + 0.3 * Math.sin(t * 9));
      kin(K.c1, t, 13.2, 14.15, { stagger: 0.05 });
      T(K.c1, { y: land ? -24 : -26 });
      T(K.cl, { y: 0, s: 1 + Math.max(0, t - 14.35) * 0.03, o: t >= 14.33 ? 1 : 0 });
      logoAnim('L1', t, 14.35);
      // a pílula vira a tela
      const pw = E.inOutQuint(P(t, 14.95, 15.35));
      const lw = (land ? 66 : 86) * (1 + Math.max(0, t - 14.35) * 0.03);
      const k = lw / 780;
      const pillW = 430 * k, pillH = 213 * k;
      const pillCx = (46 + 215 - 40 - 390) * k, pillCy = (62 + 106.5 - 20 - 150) * k;
      size(K.wipe, lerp(pillW, hw * 2 + 4, pw), lerp(pillH, hh * 2 + 4, pw));
      K.wipe.style.borderRadius = `${(lerp(pillH / 2, 0, pw) * u).toFixed(1)}px`;
      T(K.wipe, { x: lerp(pillCx, 0, pw), y: lerp(pillCy, 0, pw), o: t >= 14.95 ? 1 : 0 });
    }

    function sceneD(t) {
      K.aur.style.backgroundSize = '200% 200%';
      K.aur.style.backgroundPosition = `${(50 + Math.sin(t * 0.6) * 30).toFixed(1)}% ${(50 + Math.cos(t * 0.45) * 30).toFixed(1)}%`;
      K.aur1.style.transform = `translate(${(Math.sin(t * .7) * 6 * u).toFixed(1)}px,${(Math.cos(t * .5) * 4 * u).toFixed(1)}px)`;
      K.aur2.style.transform = `translate(${(Math.cos(t * .6) * 8 * u).toFixed(1)}px,${(Math.sin(t * .4) * 5 * u).toFixed(1)}px)`;
      K.dpat.style.transform = `translate(${((t - 15) * -1.2 * u).toFixed(1)}px,0) scale(1.1)`;
      drawPattern('#sD', t, 15.1, 0.12, 1.5);
      const tx = land ? -hw + 8 : -hw + 7;
      const on1 = t < 19.0;
      show(K.d1, on1); show(K.flip, on1);
      if (on1) {
        kin(K.d1, t, [15.5, 15.65, 16.2, 17.5, 17.62, 17.75], 18.6);
        T(K.d1, land ? { x: tx, y: 0, ax: 0 } : { x: tx, y: -hh + 12, ax: 0, ay: 0 });
        const fin = E.springSoft(P(t, 15.25, 16.1));
        const flp = E.inOutQuint(P(t, 17.45, 18.05));
        const out = E.inCubic(P(t, 18.55, 18.9));
        T(K.flip, { x: land ? 30 : 0, y: (land ? 0 : 22) + (1 - fin) * 50 - out * 10, ry: 0.001 + lerp(-14, 0, fin) + flp * 180, rx: 6 * (1 - flp) + 0.001, s: lerp(0.9, 1, fin) * (1 + 0.08 * Math.sin(flp * Math.PI)), o: 1 - out, per: 200 });
      }
      const WIN = [[18.9, 20.43], [20.43, 21.43], [21.43, 24.0]];
      WIN.forEach(([a, b], i) => {
        const on = t >= a - 0.02 && t < b + 0.35;
        show(K['dw' + i], on); show(K['dn' + i], on);
        if (!on) return;
        kin(K['dw' + i], t, i === 2 ? [a, a + 0.12] : a, i < 2 ? b - 0.12 : 23.7, { stagger: 0.05 });
        const wy = land ? 2 : -hh + 22;
        T(K['dw' + i], land ? { x: tx, y: wy, ax: 0, ay: i === 2 ? -50 : -50 } : { x: tx, y: wy, ax: 0, ay: 0 });
        T(K['dn' + i], land ? { x: tx, y: wy - (i === 2 ? 16 : 10), ax: 0 } : { x: tx, y: wy - 4, ax: 0, ay: 0 });
        K['dn' + i].style.opacity = (P(t, a, a + 0.2) * (1 - P(t, b - 0.1, b + 0.1)) * 0.85).toFixed(2);
      });
      const vx = land ? 30 : 0, vy = land ? 0 : 22;
      const v0on = t >= 18.7 && t < 20.6;
      show(K.v0, v0on);
      if (v0on) {
        const pin = E.springSoft(P(t, 18.75, 19.4)), out = E.inCubic(P(t, 20.25, 20.55));
        T(K.v0, { x: vx, y: vy + (1 - pin) * 40 - out * 30, r: lerp(6, 0, pin), o: 1 - out });
        const pt = E.spring(P(t, 19.0, 19.6));
        T(K.v0t, { y: -6, s: pt, r: lerp(-30, 0, pt) });
        T(K.v0a, { y: 15, o: P(t, 19.3, 19.5) });
        T(K.v0b, { y: 19.5, o: P(t, 19.45, 19.65) });
      }
      const v1on = t >= 20.3 && t < 21.6;
      show(K.v1, v1on);
      if (v1on) {
        const pin = E.springSoft(P(t, 20.35, 20.9)), out = E.inCubic(P(t, 21.3, 21.55));
        T(K.v1, { x: vx, y: vy + (1 - pin) * 40 - out * 30, r: lerp(-6, 0, pin), o: 1 - out });
        T(K.v1m, { y: -11, s: E.spring(P(t, 20.45, 21.0)) });
        [0, 1, 2, 3].forEach(i => T(K['v1s' + i], { x: -11.25 + i * 7.5, y: 3, s: E.spring(P(t, 20.55 + i * 0.07, 21.0 + i * 0.07)) }));
        T(K.v1aa, { y: 14, o: P(t, 20.8, 20.95) });
      }
      const v2on = t >= 21.3;
      show(K.v2, v2on);
      [0, 1, 2].forEach(i => show(K['nt' + i], v2on));
      if (v2on) {
        const pin = E.springSoft(P(t, 21.35, 22.2)), out = E.inCubic(P(t, 23.6, 24.0));
        T(K.v2, { x: vx + (land ? 4 : 0), y: vy + (land ? 0 : 6) + (1 - pin) * 70 - out * 10, ry: -16 + Math.sin(t) * 3, rx: 6, r: 3, s: 1 - out * 0.1, o: 1 - out, per: 180 });
        K.v2grid.style.transform = `translateY(${(-E.inOut(P(t, 22.4, 23.6)) * 18).toFixed(2)}%)`;
        const NP = land ? [[-18, -18], [20, -4], [-16, 14]] : [[-16, -2], [14, 14], [-12, 30]];
        [0, 1, 2].forEach(i => {
          const ti = 21.9 + i * 0.45;
          const p = E.spring(P(t, ti, ti + 0.6));
          T(K['nt' + i], { x: vx + NP[i][0], y: vy + NP[i][1] - out * 8, s: lerp(0.5, 1, p), o: P(t, ti, ti + 0.1) * (1 - out) });
        });
      }
    }

    function sceneE(t) {
      const pin = E.spring(P(t, 24.0, 24.6));
      const out = E.inCubic(P(t, 24.75, 25.05));
      T(K.eplay, { y: land ? -2 : -6, s: pin * (1 - out), r: lerp(-90, 0, pin) });
      K.eglow.style.opacity = P(t, 24.0, 24.5);
      const sx = land ? 27 : 29;
      [0, 1, 2].forEach(i => {
        const ti = 24.85 + i * 0.16;
        const p = E.springSoft(P(t, ti, ti + 0.8));
        T(K['st' + i], { x: (i - 1) * sx + (1 - p) * 60, y: (land ? 4 : 2) + Math.sin((t - 24) * 1.3 + i) * 0.8, r: (i - 1) * 3 * p + (1 - p) * 10, o: P(t, ti, ti + 0.1) });
        K['sp' + i].style.transform = `scaleX(${clamp((t - ti - 0.3) / 1.6).toFixed(3)})`;
      });
      kin(K.e1, t, [24.05, 24.2, 24.45], 26.65);
      T(K.e1, { y: land ? -hh + 13 : -hh + 22 });
      kin(K.e2, t, [25.3, 25.45, 25.65, 25.85], 26.75);
      T(K.e2, { y: land ? hh - 8 : hh - 22 });
    }

    function sceneF(t) {
      const cam = E.inOutQuint(P(t, 28.95, 29.6));
      const hubX = lerp(0, land ? -hw + 18 : 0, cam), hubY = lerp(land ? 5 : 6, land ? -20 : -hh + 32, cam);
      const hs = lerp(1, 0.7, cam);
      T(K.hub, { x: hubX, y: hubY, s: E.spring(P(t, 27.0, 27.6)) * hs, o: 1 - P(t, 29.3, 29.6) });
      T(K.netsvg, { x: hubX, y: hubY, s: hs, o: 1 - P(t, 29.0, 29.4) });
      net.forEach(([x, y], i) => {
        const ti = 27.35 + i * 0.12;
        const p = E.spring(P(t, ti, ti + 0.6));
        T(K['av' + i], { x: hubX + x * hs, y: hubY + y * hs, s: p * lerp(1, 0.6, cam), o: (p > 0 ? 1 : 0) * (1 - P(t, 29.0, 29.4)) });
        K['ln' + i].style.strokeDashoffset = (1 - E.inOut(P(t, ti + 0.1, ti + 0.6))).toFixed(3);
        let q = ((t - ti - 0.6) * 0.8) % 1; if (q < 0) q = 0;
        const mx = x * 0.5 + (i % 2 ? 6 : -6), my = y * 0.5 - 8;
        K['pl' + i].setAttribute('cx', (2 * (1 - q) * q * mx + q * q * x).toFixed(2));
        K['pl' + i].setAttribute('cy', (2 * (1 - q) * q * my + q * q * y).toFixed(2));
        K['pl' + i].style.opacity = t > ti + 0.6 ? 1 : 0;
      });
      const dp = E.springSoft(P(t, 29.1, 29.9));
      T(K.dash, { x: land ? 16 : 0, y: (land ? 6 : 4) + (1 - dp) * 60, o: P(t, 29.1, 29.2) });
      K.chclip.setAttribute('width', (E.inOut(P(t, 29.5, 31.2)) * 100).toFixed(2));
      const KP = land ? [[-62, -10], [-64, 4], [-60, 18]] : [[-28, 33], [0, 33], [28, 33]];
      [0, 1, 2].forEach(i => {
        const ti = 30.0 + i * 0.3;
        T(K['kp' + i], { x: (land ? 16 : 0) + KP[i][0], y: (land ? 6 : 4) + KP[i][1], s: E.spring(P(t, ti, ti + 0.6)), o: P(t, ti, ti + 0.08) });
      });
      kin(K.f1, t, [27.0, 27.15, 27.3, 27.45, 27.6], 28.85);
      T(K.f1, { y: -hh + (land ? 12 : 16) });
      kin(K.f2, t, [29.0, 29.15, 29.35, 29.6, 29.75], 31.95);
      T(K.f2, { y: -hh + (land ? 12 : 16) });
    }

    const GW = [[32.2, 33.56], [33.56, 34.79], [34.79, 36.4]];
    function sceneG(t) {
      GW.forEach(([a, b], i) => {
        const on = t >= a && t < b;
        show(K['g' + i], on);
        if (!on) return;
        const lt = t - a;
        const sh = lt < 0.18 ? (hash(Math.floor(t * 60) + i) - 0.5) * 2.2 * (1 - lt / 0.18) : 0;
        const p = E.spring(P(lt, 0, 0.55));
        T(K['gw' + i], { x: sh, y: (land ? 6 : 4) + sh, s: lerp(1.35, 1, p) + lt * 0.03 });
        T(K['gm' + i], { x: sh, y: land ? -19 : -16, s: E.spring(P(lt, 0.05, 0.5)) });
        T(K['gb' + i], { x: (land ? hw - 14 : hw - 12) + sh, y: land ? -hh + 18 : -hh + 22, s: E.spring(P(lt, 0.1, 0.6)), r: 10 });
        K['gp' + i].style.transform = `scale(${(1.1 + lt * 0.05).toFixed(3)}) rotate(${(lt * 2).toFixed(2)}deg)`;
        drawPattern(`[data-k="gp${i}"]`, lt, 0, 0.04, 0.6);
      });
      K.flash.style.opacity = GW.reduce((o, [a]) => (t >= a && t < a + 0.12 ? Math.max(o, 0.5 * (1 - (t - a) / 0.12)) : o), 0);
    }

    function sceneH(t) {
      K.hpat.style.transform = `scale(${(1.05 + (t - 36.4) * 0.008).toFixed(4)}) translate(${((t - 36.4) * -0.5 * u).toFixed(1)}px,0)`;
      drawPattern('#sH', t, 36.6, 0.1, 2.0);
      K.hglow.style.opacity = P(t, 36.4, 37) * (0.85 + 0.15 * Math.sin(t * 2.2)) + (t > 46.4 ? 0.4 * (1 - P(t, 46.4, 47.4)) : 0);
      const up = E.inOutQuint(P(t, 42.5, 43.1));
      T(K.hl, { y: lerp(land ? -8 : -12, land ? -24 : -30, up), s: lerp(1, land ? 0.6 : 0.72, up) * (1 + (t - 36.5) * 0.004) });
      logoAnim('L2', t, 36.55);
      const ty = land ? 17 : 14;
      kin(K.h1, t, [38.4, 38.55, 38.7], 42.4);
      kin(K.h2, t, [40.56, 40.72, 40.88], 42.45);
      if (land) { T(K.h1, { x: -1, y: ty, ax: -100 }); T(K.h2, { x: 1, y: ty, ax: 0 }); }
      else { T(K.h1, { y: ty }); T(K.h2, { y: ty + 6 }); }
      T(K.h3, { y: land ? ty + 8 : ty + 14, o: P(t, 41.2, 41.6) * (1 - P(t, 42.3, 42.6)) * 0.8 });
      kin(K.h4, t, [42.8, 43.0, 43.15]);
      T(K.h4, { y: land ? 2 : -2 });
      const pb = E.spring(P(t, 44.87, 45.5));
      const press = t > 45.3 && t < 45.5 ? 0.94 : 1;
      T(K.h5, { y: land ? 17 : 13, s: pb * press, o: P(t, 44.87, 44.95) });
      K.h5.style.boxShadow = t > 45.3 ? `0 0 0 ${(P(t, 45.3, 46) * 3 * u).toFixed(1)}px rgba(255,45,154,${(0.5 * (1 - P(t, 45.3, 46))).toFixed(2)}),0 ${(1.5 * u).toFixed(1)}px ${(4 * u).toFixed(1)}px rgba(255,0,80,.35)` : '';
      T(K.h6, { y: land ? 27 : 23, o: E.outCubic(P(t, 45.3, 45.7)) * 0.9 });
      K.black.style.opacity = E.inOut(P(t, 48.2, 49.0));
    }

    const SCENES = [
      ['sA', 0, 8.4, sceneA], ['sB', 8.4, 12.35, sceneB], ['sC', 12.35, 15.36, sceneC],
      ['sD', 15.3, 24.0, sceneD], ['sE', 24.0, 27.0, sceneE], ['sF', 27.0, 32.2, sceneF],
      ['sG', 32.2, 36.4, sceneG], ['sH', 36.4, 99, sceneH],
    ];

    function grain(t) {
      if (!grainTiles.length) return;
      const f = Math.floor(t * 24) % grainTiles.length, g = grainCtx;
      g.fillStyle = g.createPattern(grainTiles[f], 'repeat');
      g.setTransform(1, 0, 0, 1, (hash(f) * 192) | 0, (hash(f + 9) * 192) | 0);
      g.fillRect(-192, -192, K.grain.width + 384, K.grain.height + 384);
      g.setTransform(1, 0, 0, 1, 0, 0);
    }

    let last = -1;
    function seek(t) {
      t = clamp(t, 0, CONFIG.duration - 0.001);
      K.flash.style.opacity = 0;
      SCENES.forEach(([id, a, b, fn]) => { const on = t >= a && t < b; show(sc[id], on); if (on) fn(t); });
      if (t >= 36.4 && t < 36.65) K.flash.style.opacity = 1 - P(t, 36.4, 36.65);
      if (t >= 15.3 && t < 15.5) K.flash.style.opacity = 0.35 * (1 - P(t, 15.3, 15.5));
      if (t < 48.2) K.black.style.opacity = 0;
      grain(t);
      last = t;
    }

    buildGrain();
    layout();
    return { seek, layout, get time() { return last; }, duration: CONFIG.duration, config: CONFIG, vo: VO };
  }

  const ready = () => Promise.all([
    document.fonts.load('400 40px "Bebas Neue"'), document.fonts.load('800 40px Poppins'), document.fonts.load('700 40px Poppins'),
    document.fonts.load('600 40px Poppins'), document.fonts.load('500 40px Poppins'), document.fonts.load('400 40px Poppins'), document.fonts.load('300 40px Poppins'),
  ]).then(() => document.fonts.ready).catch(() => {});

  window.NexusFilm = { mount, ready, CONFIG };
})();
