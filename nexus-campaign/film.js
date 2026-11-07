/*
 * NEXUS AGENCY — "Reposicione. Renasça."
 * Filme publicitário em motion design, 48 s, 120 BPM (1 tempo = 0,5 s).
 *
 * Todo quadro é uma função pura do tempo: NexusFilm.mount(el).seek(t).
 * Isso permite tocar em tempo real no navegador (sincronizado com a trilha)
 * e renderizar quadro a quadro para MP4 (tools/render.js), em 16:9 ou 9:16.
 *
 * Unidade de layout: u = menor lado do palco / 100.
 */
(function () {
  'use strict';

  // ------------------------------------------------------------ config
  const CONFIG = {
    site: 'nexus.agency',          // troque pelo domínio real
    cta: 'Agende seu diagnóstico de marca',
    duration: 48,
  };

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
    outBack: p => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
    outQuart: p => 1 - Math.pow(1 - p, 4),
  };
  // pseudo-aleatório determinístico
  const hash = n => { let x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const mixHex = (a, b, p) => {
    const pa = [1, 3, 5].map(i => parseInt(a.substr(i, 2), 16));
    const pb = [1, 3, 5].map(i => parseInt(b.substr(i, 2), 16));
    return `rgb(${pa.map((v, i) => Math.round(lerp(v, pb[i], p))).join(',')})`;
  };

  const C = {
    ink: '#0B0A14', ink2: '#16152A', ultra: '#2D2AFF', ultraDeep: '#1B18C9',
    paper: '#EEF0FF', amber: '#FF9F1C', lilac: '#B9B6FF', mute: '#2A2940',
  };

  // ------------------------------------------------------------ estilos
  const CSS = `
@font-face{font-family:'Archivo';font-style:normal;font-weight:100 900;font-stretch:62% 125%;font-display:block;src:url(assets/fonts/Archivo-var.woff2) format('woff2')}
@font-face{font-family:'Instrument Serif';font-style:normal;font-weight:400;font-display:block;src:url(assets/fonts/InstrumentSerif-400.woff2) format('woff2')}
@font-face{font-family:'Instrument Serif';font-style:italic;font-weight:400;font-display:block;src:url(assets/fonts/InstrumentSerif-400-italic.woff2) format('woff2')}
@font-face{font-family:'JetBrains Mono';font-style:normal;font-weight:100 800;font-display:block;src:url(assets/fonts/JetBrainsMono-var.woff2) format('woff2')}
.nx{--u:10px;position:absolute;inset:0;overflow:hidden;background:${C.ink};color:${C.paper};
  font-family:'Archivo','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;
  font-kerning:normal;contain:strict;user-select:none}
.nx *{box-sizing:border-box}
.nx .sc{position:absolute;inset:0;overflow:hidden;display:none}
.nx .a{position:absolute;left:50%;top:50%;transform-origin:50% 50%}
.nx .mono{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;text-transform:uppercase;letter-spacing:.08em;font-weight:500;white-space:nowrap}
.nx .hl{font-weight:800;line-height:1;white-space:nowrap;letter-spacing:-.025em;display:inline-block}
.nx .m{display:inline-block;overflow:hidden;vertical-align:top;padding:.08em .02em .16em;margin:-.08em -.02em -.16em}
.nx .wi{display:inline-block;will-change:transform}
.nx .acc{font-family:'Instrument Serif',Georgia,serif;font-style:italic;font-weight:400;letter-spacing:-.01em;font-size:1.14em;line-height:.88}
.nx svg{display:block;overflow:visible}
.nx .hud{font-size:calc(var(--u)*1.6);color:${C.paper};opacity:.5}
.nx .scan{position:absolute;inset:0;pointer-events:none;
  background:repeating-linear-gradient(0deg,rgba(0,0,0,.28) 0 2px,transparent 2px 4px);mix-blend-mode:multiply}
.nx .card{position:absolute;left:0;top:0;border-radius:calc(var(--u)*1.2);background:#1A1928;overflow:hidden}
.nx .card i{position:absolute;left:8%;top:6%;width:13%;aspect-ratio:1;border-radius:50%;background:#2B2A3D}
.nx .card b{position:absolute;left:26%;height:3.2%;border-radius:9px;background:#2B2A3D}
.nx .card .im{position:absolute;left:6%;right:6%;top:20%;bottom:16%;border-radius:calc(var(--u)*.7)}
.nx .card .ft{position:absolute;left:8%;bottom:6%;width:40%;height:3%;border-radius:9px;background:#26253A}
.nx .card .ol{position:absolute;left:4%;right:4%;top:28%;display:none}
.nx .card.hot{background:#232234;box-shadow:0 0 0 calc(var(--u)*.25) rgba(238,240,255,.25)}
.nx .card.hot .ol{display:block}.nx .card.hot .im{display:none}
.nx .chip{display:flex;align-items:center;gap:calc(var(--u)*.8);background:${C.ink};color:${C.paper};
  padding:calc(var(--u)*.55) calc(var(--u)*1);border-radius:calc(var(--u)*.4);font-size:calc(var(--u)*1.35)}
.nx .ring{border-radius:50%;border:calc(var(--u)*.22) solid ${C.amber}}
.nx .frame{position:absolute;border-radius:calc(var(--u)*1.3);overflow:hidden;box-shadow:0 calc(var(--u)*2) calc(var(--u)*5) rgba(5,4,30,.45)}
.nx .bar{position:absolute;border-radius:99px}
.nx .lock{display:flex;align-items:center;white-space:nowrap}
.nx .wm{font-weight:800;letter-spacing:-.045em;line-height:1}
.nx .wm em{font-style:normal;color:${C.amber}}
.nx .cut{position:absolute;inset:0;display:none;overflow:hidden}
.nx .lbl{font-size:calc(var(--u)*1.55);opacity:.75}
.nx .sw{display:flex;align-items:center;gap:calc(var(--u)*1.2)}
.nx .sw i{display:block;width:calc(var(--u)*4.4);height:calc(var(--u)*4.4);border-radius:calc(var(--u)*.6);box-shadow:inset 0 0 0 1px rgba(238,240,255,.35)}
.nx .sw span{font-size:calc(var(--u)*1.3);line-height:1.35}
.nx .ov{position:absolute;inset:0;pointer-events:none}
`;

  // ------------------------------------------------------------ peças gráficas
  // Logo "antigo" fictício — propositalmente datado (WordArt, bisel, swoosh).
  const OLD_DEFS = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
 <linearGradient id="nxog1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7fe0ff"/><stop offset=".55" stop-color="#1f6fd1"/><stop offset="1" stop-color="#0a2a6b"/></linearGradient>
 <linearGradient id="nxog2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7c2"/><stop offset=".45" stop-color="#ffc21a"/><stop offset="1" stop-color="#a35a00"/></linearGradient>
 <linearGradient id="nxog3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7a7a"/><stop offset="1" stop-color="#b3001b"/></linearGradient>
 <filter id="nxosh" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="3" dy="5" stdDeviation="2.2" flood-color="#000" flood-opacity=".6"/></filter>
 <symbol id="nxold" viewBox="0 0 400 210">
  <path d="M18 150 C 90 30, 300 0, 392 62 C 300 30, 120 58, 18 150 Z" fill="url(#nxog1)" filter="url(#nxosh)"/>
  <path d="M40 168 C 140 120, 290 118, 380 140 C 280 136, 150 140, 40 168 Z" fill="url(#nxog3)" opacity=".95"/>
  <text x="200" y="128" text-anchor="middle" font-family="Georgia,'DejaVu Serif','Times New Roman',serif" font-weight="700" font-style="italic" font-size="66" fill="url(#nxog2)" stroke="#5a2d00" stroke-width="1.6" filter="url(#nxosh)" letter-spacing="1">Sua Marca</text>
  <text x="352" y="84" font-family="Arial,sans-serif" font-size="20" fill="#ffd23f">®</text>
  <text x="200" y="198" text-anchor="middle" font-family="'Comic Sans MS','Comic Neue','DejaVu Sans',cursive" font-style="italic" font-size="17" fill="#cfe8ff" filter="url(#nxosh)">Qualidade e Confiança desde 2009</text>
 </symbol>
</defs></svg>`;
  const OLD = `<svg viewBox="0 0 400 210" style="width:100%;height:auto"><use href="#nxold"/></svg>`;

  // Novo símbolo de "sua marca": dois semicírculos deslocados (um "s" geométrico)
  const NEWMARK = (a, b, k = '') => `<svg viewBox="0 0 100 100" style="width:100%;height:100%">
   <path data-k="${k}A" d="M8 50 A32 32 0 0 1 72 50 Z" fill="${a}"/>
   <path data-k="${k}B" d="M28 50 A32 32 0 0 0 92 50 Z" fill="${b}"/></svg>`;

  // Símbolo Nexus: um N de três traços conectados por dois nós
  const NEXUS = `<svg viewBox="0 0 100 100" style="width:100%;height:100%">
   <path data-k="nx1" d="M22 82 V18" pathLength="1" fill="none" stroke="${C.paper}" stroke-width="12" stroke-linecap="round" stroke-dasharray="1 1"/>
   <path data-k="nx2" d="M22 18 L78 82" pathLength="1" fill="none" stroke="${C.paper}" stroke-width="12" stroke-linecap="round" stroke-dasharray="1 1"/>
   <path data-k="nx3" d="M78 82 V18" pathLength="1" fill="none" stroke="${C.paper}" stroke-width="12" stroke-linecap="round" stroke-dasharray="1 1"/>
   <circle data-k="nxr1" cx="22" cy="18" r="10" fill="none" stroke="${C.amber}" stroke-width="1.6"/>
   <circle data-k="nxr2" cx="78" cy="82" r="10" fill="none" stroke="${C.amber}" stroke-width="1.6"/>
   <circle data-k="nxn1" cx="22" cy="18" r="10.5" fill="${C.amber}"/>
   <circle data-k="nxn2" cx="78" cy="82" r="10.5" fill="${C.amber}"/></svg>`;

  // texto cinético: cada palavra numa máscara; _trecho_ vira acento serifado
  function mk(text) {
    const units = [];
    text.replace(/_([^_]+)_|(\S+)/g, (m, acc, w) => { units.push(acc ? `<span class="acc">${acc}</span>` : w); return m; });
    return units.map(u => `<span class="m"><span class="wi">${u}</span></span>`).join(' ');
  }
  const lockup = (k, fg, a, b, size) => `<div class="lock" data-k="${k}" style="gap:calc(var(--u)*${size * 0.22})">
     <div style="width:calc(var(--u)*${size});height:calc(var(--u)*${size})">${NEWMARK(a, b, k)}</div>
     <div class="wm" style="font-size:calc(var(--u)*${size * 0.78});color:${fg}">sua marca<em>.</em></div></div>`;

  // ------------------------------------------------------------ cena: HTML
  function html() {
    const D_SUB = [
      'Auditamos marca, mercado e concorrência para achar o que trava o seu crescimento.',
      'Definimos o território que só a sua marca pode ocupar na cabeça do cliente.',
      'Símbolo, cores, tipografia e voz desenhados para o agora e para o que vem.',
      'Site, redes e cada ponto de contato falando a mesma língua.',
    ];
    const D_T = ['Diagnóstico.', 'Estratégia.', 'Identidade.', 'Presença digital.'];
    const posts = [
      [C.ultra, NEWMARK(C.paper, C.amber), ''], [C.amber, '', 'nova<br>fase.'], [C.ink, '', 'sua<br>marca<em>.</em>'],
      [C.paper, NEWMARK(C.ink, C.ultra), ''], [C.ultra, '', 'feita<br>para o<br>agora.'], [C.ink, NEWMARK(C.amber, C.paper), ''],
      [C.amber, NEWMARK(C.ink, C.paper), ''], [C.paper, '', 'oi,<br>de novo.'], [C.ultra, NEWMARK(C.ink, C.amber), ''],
    ];
    return `${OLD_DEFS}
<!-- A · o mundo antigo -->
<div class="sc" id="sA" style="background:${C.ink}">
  <div class="a mono hud" data-k="hudTL">SUA_MARCA_logo_FINAL_v7_agora_vai.jpg</div>
  <div class="a mono hud" data-k="hudTR">1024 × 768 · 72 dpi</div>
  <div class="a mono hud" data-k="hudBL">© 2009</div>
  <div class="a mono hud" data-k="hudBR">última atualização: 2009</div>
  <div class="a" data-k="logoA">${OLD}</div>
  <div class="a hl" data-k="a1" data-fs="10.5" data-fit="88,150">${mk('Marcas não envelhecem.')}</div>
  <div class="a hl" data-k="a2" data-fs="10.5" data-fit="88,150" style="font-weight:300">${mk('Elas ficam _para trás._')}</div>
  <div class="scan"></div>
</div>
<!-- B · o feed infinito -->
<div class="sc" id="sB" style="background:#0F0E1A">
  <div class="a" data-k="grid" style="left:0;top:0;width:100%;height:100%"></div>
  <div class="ov" data-k="scrim" style="background:radial-gradient(ellipse at center,rgba(11,10,20,.86) 0%,rgba(11,10,20,.55) 45%,rgba(11,10,20,0) 75%)"></div>
  <div class="a hl" data-k="b1" data-fs="13" data-fit="88,150">${mk('Um scroll.')}</div>
  <div class="a hl" data-k="b2" data-fs="11" data-fit="90,150">${mk('É o tempo que _você tem._')}</div>
  <div class="a hl" data-k="b3" data-fs="11" data-fit="90,150">${mk('Quem não se reposiciona…')}</div>
  <div class="a hl" data-k="b4" data-fs="19" data-fit="92,150" style="font-weight:900">${'desaparece.'.split('').map(c => `<span class="gl">${c}</span>`).join('')}</div>
  <div class="a mono" data-k="b5" style="font-size:calc(var(--u)*1.7);color:${C.amber}">ERRO 404 · relevância não encontrada</div>
  ${[0, 1, 2, 3, 4, 5].map(i => `<div class="a" data-k="gb${i}" style="left:0;top:0;width:100%"></div>`).join('')}
  <div class="scan"></div>
</div>
<!-- C · ponto de virada -->
<div class="sc" id="sC" style="background:${C.ink}">
  <div class="a ring" data-k="r1" style="width:calc(var(--u)*4);height:calc(var(--u)*4)"></div>
  <div class="a ring" data-k="r2" style="width:calc(var(--u)*4);height:calc(var(--u)*4)"></div>
  <div class="a" data-k="dot" style="width:calc(var(--u)*3.2);height:calc(var(--u)*3.2);border-radius:50%;background:${C.amber};box-shadow:0 0 calc(var(--u)*3) rgba(255,159,28,.7)"></div>
  <div class="a hl" data-k="c1" data-fs="7.4" data-fit="88,140" style="font-weight:300;letter-spacing:-.02em">${mk('E se ela pudesse _renascer?_')}</div>
</div>
<!-- D · método Nexus -->
<div class="sc" id="sD" style="background:${C.ultra}">
  <div class="ov" data-k="dgrid" style="opacity:.14"></div>
  <div class="a" data-k="dzoom" style="left:0;top:0;width:100%;height:100%">
  <div class="a mono lbl" data-k="dTL">Método Nexus</div>
  <div class="a mono lbl" data-k="dTR">Etapa 01 / 04</div>
  ${D_T.map((x, i) => `<div class="a hl" data-k="dt${i}" data-fs="9.4" data-fit="84,74">${mk(x)}</div>`).join('')}
  ${D_SUB.map((x, i) => `<div class="a" data-k="ds${i}" style="font-size:calc(var(--u)*2.5);line-height:1.3;width:calc(var(--u)*52);opacity:.85;text-wrap:balance">${x}</div>`).join('')}
  <div class="a" data-k="dprog" style="display:flex;gap:calc(var(--u)*1.2)">
    ${['01 Diagnóstico', '02 Estratégia', '03 Identidade', '04 Presença'].map((x, i) => `<div style="flex:1">
      <div class="mono" style="font-size:calc(var(--u)*1.15);opacity:.7;margin-bottom:calc(var(--u)*.8)">${x}</div>
      <div style="height:calc(var(--u)*.35);background:rgba(238,240,255,.25);border-radius:9px;overflow:hidden"><div data-k="pf${i}" style="height:100%;background:${C.amber};transform-origin:0 50%"></div></div></div>`).join('')}
  </div>
  <!-- D1 diagnóstico -->
  <div class="a" data-k="dv0">
    <div class="a" data-k="d0card" style="background:${C.paper};border-radius:calc(var(--u)*1.2);overflow:hidden">
      <div class="a" data-k="d0logo">${OLD}</div>
      <div class="a" data-k="d0scan" style="left:0;width:100%;height:calc(var(--u)*7);background:linear-gradient(180deg,rgba(255,159,28,0),rgba(255,159,28,.35));border-bottom:calc(var(--u)*.3) solid ${C.amber}"></div>
    </div>
    ${['tipografia datada', 'efeitos em excesso', 'ilegível no celular', 'sem personalidade'].map((x, i) => `
      <div class="a ring" data-k="d0m${i}" style="width:calc(var(--u)*3);height:calc(var(--u)*3)"></div>
      <div class="a chip mono" data-k="d0c${i}"><span style="color:${C.amber}">✕</span>${x}</div>`).join('')}
    <div class="a chip mono" data-k="d0score" style="background:transparent;padding:0;font-size:calc(var(--u)*1.5)">Saúde da marca <b data-k="d0n" style="color:${C.amber};font-size:calc(var(--u)*3);font-family:Archivo;font-weight:800;letter-spacing:-.02em">100</b><span style="opacity:.6">/100</span></div>
  </div>
  <!-- D2 estratégia -->
  <div class="a" data-k="dv1">
    <div class="a" data-k="d1ax" style="height:2px;background:${C.paper};opacity:.7;transform-origin:50% 50%"></div>
    <div class="a" data-k="d1ay" style="width:2px;background:${C.paper};opacity:.7;transform-origin:50% 50%"></div>
    ${['genérica', 'única', 'desejada', 'esquecível'].map((x, i) => `<div class="a mono lbl" data-k="d1l${i}">${x}</div>`).join('')}
    ${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => `<div class="a" data-k="d1c${i}" style="width:calc(var(--u)*1.3);height:calc(var(--u)*1.3);border-radius:50%;background:${C.lilac};opacity:.55"></div>`).join('')}
    <svg class="a" data-k="d1svg" viewBox="-1 -1 2 2" style="left:0;top:0"><path data-k="d1path" d="M-.5 .45 Q -.15 -.85 .62 -.58" pathLength="1" fill="none" stroke="${C.amber}" stroke-width=".018" stroke-linecap="round" stroke-dasharray="1 1"/></svg>
    <div class="a" data-k="d1now" style="width:calc(var(--u)*2.2);height:calc(var(--u)*2.2);border-radius:50%;background:${C.paper}"></div>
    <div class="a mono lbl" data-k="d1nowl" style="opacity:1">sua marca hoje</div>
    <div class="a ring" data-k="d1ring" style="width:calc(var(--u)*3);height:calc(var(--u)*3)"></div>
    <div class="a" data-k="d1go" style="width:calc(var(--u)*2.6);height:calc(var(--u)*2.6);border-radius:50%;background:${C.amber};box-shadow:0 0 calc(var(--u)*2) rgba(255,159,28,.8)"></div>
    <div class="a mono" data-k="d1gol" style="font-size:calc(var(--u)*1.5);color:${C.amber};font-weight:700">sua marca amanhã</div>
  </div>
  <!-- D3 identidade -->
  <div class="a" data-k="dv2">
    <svg class="a" data-k="d2guides" viewBox="0 0 100 100">
      ${['M0 50 H100', 'M8 0 V100', 'M92 0 V100', 'M40 0 V100', 'M60 0 V100'].map(d => `<path d="${d}" pathLength="1" stroke="${C.paper}" stroke-width=".35" stroke-dasharray="1 1" fill="none" opacity=".6"/>`).join('')}
      <circle cx="40" cy="50" r="32" pathLength="1" stroke="${C.paper}" stroke-width=".35" fill="none" stroke-dasharray="1 1" opacity=".6"/>
      <circle cx="60" cy="50" r="32" pathLength="1" stroke="${C.paper}" stroke-width=".35" fill="none" stroke-dasharray="1 1" opacity=".6"/>
    </svg>
    <div class="a" data-k="d2mark">${NEWMARK(C.paper, C.amber, 'd2')}</div>
    <div class="a mono lbl" data-k="d2cap">r = 32 · deslocamento 20</div>
    <div class="a" data-k="d2sw" style="display:flex;flex-direction:column;gap:calc(var(--u)*1.1)">
      ${[[C.ultra, 'Ultramar', '#2D2AFF'], [C.amber, 'Âmbar', '#FF9F1C'], [C.paper, 'Névoa', '#EEF0FF'], [C.ink, 'Noite', '#0B0A14']].map((s, i) => `
        <div class="sw" data-k="d2s${i}"><i style="background:${s[0]}"></i><span class="mono"><b>${s[1]}</b><br><span style="opacity:.7">${s[2]}</span></span></div>`).join('')}
      <div data-k="d2aa" style="font-size:calc(var(--u)*6.5);font-weight:800;line-height:1;margin-top:calc(var(--u)*.6)">Aa</div>
    </div>
  </div>
  <!-- D4 presença -->
  <div class="a" data-k="dv3">
    <div class="frame a" data-k="d3web" style="background:${C.paper};color:${C.ink}">
      <div style="height:9%;background:#DADDF5;display:flex;align-items:center;gap:1.2%;padding-left:3%">${'<i style="width:1.6%;aspect-ratio:1;border-radius:50%;background:#B7BBE0;display:block"></i>'.repeat(3)}</div>
      <div style="position:absolute;left:6%;top:16%;width:6%;aspect-ratio:1">${NEWMARK(C.ink, C.ultra)}</div>
      ${[0, 1, 2].map(i => `<i class="bar" style="top:18.5%;right:${6 + i * 11}%;width:8%;height:2.2%;background:#C9CCEB"></i>`).join('')}
      <div class="wm" data-k="d3h" style="position:absolute;left:6%;top:36%;font-size:calc(var(--u)*5.6)">sua marca<em>.</em></div>
      <i class="bar" style="left:6%;top:62%;width:40%;height:2.6%;background:#C9CCEB"></i>
      <i class="bar" style="left:6%;top:68%;width:30%;height:2.6%;background:#C9CCEB"></i>
      <i class="bar" style="left:6%;top:78%;width:18%;height:8%;background:${C.ultra}"></i>
      <div style="position:absolute;right:6%;top:30%;width:30%;aspect-ratio:1;border-radius:12%;background:${C.ultra};padding:4%">${NEWMARK(C.paper, C.amber)}</div>
    </div>
    <div class="frame a" data-k="d3phone" style="background:${C.ink};border:calc(var(--u)*.6) solid #22213A;border-radius:calc(var(--u)*3)">
      <div data-k="d3icons" style="position:absolute;inset:14% 10% 10%;display:grid;grid-template-columns:repeat(3,1fr);gap:9%;align-content:start">
        ${Array.from({ length: 12 }, (_, i) => i === 4 ? `<div style="aspect-ratio:1;border-radius:24%;background:${C.ultra};padding:16%;box-shadow:0 0 0 2px ${C.amber}">${NEWMARK(C.paper, C.amber)}</div>` : `<div style="aspect-ratio:1;border-radius:24%;background:#24233A"></div>`).join('')}
      </div>
    </div>
    <div class="frame a" data-k="d3post" style="background:${C.amber};padding:5%">
      <div style="position:absolute;inset:18%">${NEWMARK(C.ink, C.paper)}</div>
      <div class="mono" style="position:absolute;left:7%;bottom:6%;font-size:calc(var(--u)*1.1);color:${C.ink}">@suamarca</div>
    </div>
  </div>
  </div>
</div>
<!-- E · drop: a nova marca no mundo -->
<div class="sc" id="sE" style="background:${C.paper};isolation:isolate">
  <div class="cut" data-k="e0" style="background:${C.paper};color:${C.ink}">
    <div class="a mono lbl" data-k="e0cap" style="color:${C.ink}">sua marca · versão 2026</div>
    <div class="a" data-k="e0lock" data-fit="88,120">${lockup('e0l', C.ink, C.ink, C.ultra, 16)}</div>
    <div class="a mono lbl" data-k="e0sub" style="color:${C.ink}" data-fit="88,140">novo posicionamento · nova identidade · nova presença</div>
  </div>
  <div class="cut" data-k="e1" style="background:${C.ink}">
    ${Array.from({ length: 40 }, (_, i) => `<i class="a" data-k="e1w${i}" style="width:calc(var(--u)*.7);height:calc(var(--u)*1);background:${C.amber};opacity:.0"></i>`).join('')}
    <div class="a" data-k="e1bb" style="perspective:calc(var(--u)*140)">
      <div data-k="e1panel" style="width:100%;height:100%;background:${C.ultra};border-radius:calc(var(--u)*.5);display:flex;flex-direction:column;justify-content:center;padding:0 7%;gap:calc(var(--u)*2);box-shadow:0 0 calc(var(--u)*10) rgba(45,42,255,.55)">
        ${lockup('e1l', C.paper, C.paper, C.amber, 7)}
        <div class="wm" style="font-size:calc(var(--u)*6.2);color:${C.paper}">Feita para o agora.</div>
      </div>
    </div>
  </div>
  <div class="cut" data-k="e2" style="background:${C.ultra}">
    <div class="frame a" data-k="e2ph" style="background:${C.ink};border:calc(var(--u)*.8) solid ${C.paper};border-radius:calc(var(--u)*4.5)">
      <div class="mono" style="position:absolute;left:10%;top:3.5%;font-size:calc(var(--u)*1.2);opacity:.7">9:41</div>
      <div style="position:absolute;inset:20% 9% 8%;display:grid;grid-template-columns:repeat(4,1fr);gap:7%;align-content:start">
        ${Array.from({ length: 20 }, (_, i) => i === 5 ? `<div data-k="e2icon" style="aspect-ratio:1;border-radius:24%;background:${C.ultra};padding:14%;box-shadow:0 0 0 2px ${C.amber},0 0 calc(var(--u)*3) rgba(255,159,28,.6)">${NEWMARK(C.paper, C.amber)}</div>` : `<div style="aspect-ratio:1;border-radius:24%;background:#23223A"></div>`).join('')}
      </div>
      <div data-k="e2note" style="position:absolute;left:5%;right:5%;top:7%;background:${C.paper};color:${C.ink};border-radius:calc(var(--u)*1.6);padding:5% 6%;display:flex;gap:6%;align-items:center">
        <div style="width:18%;aspect-ratio:1;border-radius:24%;background:${C.ultra};padding:3%;flex:none">${NEWMARK(C.paper, C.amber)}</div>
        <div style="font-size:calc(var(--u)*1.55);line-height:1.25"><b>sua marca</b><br>Sua nova experiência chegou.</div>
      </div>
    </div>
  </div>
  <div class="cut" data-k="e3" style="background:${C.paper}">
    <div class="a" data-k="e3grid" style="display:grid;grid-template-columns:repeat(3,1fr)">
      ${posts.map(p => `<div style="aspect-ratio:1;background:${p[0]};position:relative;overflow:hidden;border-radius:calc(var(--u)*.6)">
        ${p[1] ? `<div style="position:absolute;inset:22%">${p[1]}</div>` : `<div class="wm" style="position:absolute;left:10%;bottom:10%;font-size:calc(var(--u)*3.4);line-height:.95;color:${p[0] === C.ink || p[0] === C.ultra ? C.paper : C.ink}">${p[2]}</div>`}</div>`).join('')}
    </div>
  </div>
  <div class="cut" data-k="e4" style="background:${C.amber}">
    ${[[C.ink, C.paper, -14], [C.paper, C.ink, 3], [C.ultra, C.paper, 16]].map((c, i) => `
     <div class="frame a" data-k="e4c${i}" style="background:${c[0]};color:${c[1]};border-radius:calc(var(--u)*.8)">
       <div style="position:absolute;left:8%;top:12%">${lockup('e4l' + i, c[1], c[1], C.amber, 3.6)}</div>
       <div class="mono" style="position:absolute;left:8%;bottom:12%;font-size:calc(var(--u)*1.05);line-height:1.6;opacity:.8">Ana Souza · Diretora<br>ola@suamarca.com</div>
     </div>`).join('')}
  </div>
  <div class="cut" data-k="e5" style="background:${C.ink}">
    <div class="frame a" data-k="e5web" style="background:${C.paper};color:${C.ink}">
      <div style="height:6%;background:#DADDF5"></div>
      <div style="position:absolute;left:6%;top:11%;display:flex;align-items:center;gap:calc(var(--u)*1)">
        <div style="width:calc(var(--u)*3.4);height:calc(var(--u)*3.4)">${NEWMARK(C.ink, C.ultra)}</div>
        <div class="wm" style="font-size:calc(var(--u)*2.2)">sua marca<em>.</em></div></div>
      <div class="mono" style="position:absolute;right:6%;top:12.5%;font-size:calc(var(--u)*1.2);display:flex;gap:calc(var(--u)*2.4)"><span>Sobre</span><span>Serviços</span><span>Contato</span></div>
      <div class="wm" data-k="e5h" style="position:absolute;left:6%;top:30%;line-height:.92;font-size:calc(var(--u)*9)">Feita para<br>o agora<em>.</em></div>
      <div data-k="e5btn" style="position:absolute;left:6%;top:72%;background:${C.ultra};color:${C.paper};border-radius:99px;padding:calc(var(--u)*1.2) calc(var(--u)*3);font-weight:700;font-size:calc(var(--u)*1.8)">Conheça →</div>
      <div style="position:absolute;right:6%;top:30%;width:30%;aspect-ratio:1;border-radius:50%;background:${C.amber};padding:5%">${NEWMARK(C.ink, C.paper)}</div>
      <svg class="a" data-k="e5cur" viewBox="0 0 24 24" style="left:0;top:0;width:calc(var(--u)*3.2)"><path d="M3 2 L20 12 L12 13.5 L8 21 Z" fill="${C.ink}" stroke="${C.paper}" stroke-width="1.4"/></svg>
    </div>
  </div>
  <div class="cut" data-k="e6" style="background:${C.ultra}">
    ${[[C.paper, C.ink], [C.ink, C.paper], [C.amber, C.ink]].map((c, i) => `
     <div class="frame a" data-k="e6s${i}" style="background:${c[0]};color:${c[1]};border-radius:calc(var(--u)*2)">
       <div style="position:absolute;left:6%;right:6%;top:3%;height:1.2%;border-radius:9px;background:${c[1]};opacity:.25"><div data-k="e6p${i}" style="height:100%;background:${c[1]};border-radius:9px;transform-origin:0 50%"></div></div>
       ${i === 0 ? `<div style="position:absolute;inset:28% 14%">${NEWMARK(C.ink, C.ultra)}</div>` : i === 1 ? `<div class="wm" style="position:absolute;left:10%;bottom:12%;font-size:calc(var(--u)*5);line-height:.95">nova<br>fase<em>.</em></div>` : `<div style="position:absolute;left:10%;top:44%">${lockup('e6l', C.ink, C.ink, C.paper, 3.4)}</div>`}
     </div>`).join('')}
  </div>
  <div class="cut" data-k="e7" style="background:${C.ink}">
    <div class="a" data-k="e7pat" style="display:grid"></div>
  </div>
  <div class="a mono lbl" data-k="elbl" style="mix-blend-mode:difference;color:${C.paper}"></div>
  <div class="a hl" data-k="et0" data-fs="11" data-fit="84,120" style="mix-blend-mode:difference;color:${C.paper};font-weight:900">${mk('Mesma essência.')}</div>
  <div class="a hl" data-k="et1" data-fs="11" data-fit="84,120" style="mix-blend-mode:difference;color:${C.paper};font-weight:900">${mk('Nova potência.')}</div>
  <div class="a hl" data-k="et2" data-fs="11" data-fit="84,120" style="mix-blend-mode:difference;color:${C.paper};font-weight:900">${mk('Em todo lugar.')}</div>
</div>
<!-- F · antes / depois + manifesto -->
<div class="sc" id="sF" style="background:${C.ink}">
  <div class="ov" data-k="fB" style="background:${C.ink}">
    <div class="a" data-k="fBlogo">${OLD}</div>
    <div class="a mono lbl" data-k="fBl">Antes · 2009</div>
  </div>
  <div class="ov" data-k="fA" style="background:${C.ultra}">
    <div class="a" data-k="fAlock">${lockup('fl', C.paper, C.paper, C.amber, 10)}</div>
    <div class="a mono lbl" data-k="fAl">Depois · 2026</div>
    <div class="a mono" data-k="f0" style="font-size:calc(var(--u)*1.7);color:${C.lilac}">re·po·si·cio·nar <span style="text-transform:none;font-style:italic">v.</span></div>
    <div class="a hl" data-k="f1" data-fs="10" data-fit="90,150">${mk('Reposicionar é ocupar')}</div>
    <div class="a hl" data-k="f2" data-fs="10" data-fit="90,150">${mk('um _novo lugar_')}</div>
    <div class="a hl" data-k="f3" data-fs="10" data-fit="90,150">${mk('na mente de quem importa.')}</div>
  </div>
  <div class="a" data-k="fdiv" style="background:${C.paper}"></div>
  <div class="a" data-k="fknob" style="width:calc(var(--u)*5.2);height:calc(var(--u)*5.2);border-radius:50%;background:${C.paper};color:${C.ink};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:calc(var(--u)*2.2)">‹ ›</div>
</div>
<!-- G · palavras -->
<div class="sc" id="sG">
  ${[['Clareza.', 'para ser entendida', C.paper, C.ink], ['Relevância.', 'para ser escolhida', C.ink, C.paper], ['Desejo.', 'para ser lembrada', C.amber, C.ink]].map((w, i) => `
  <div class="ov" data-k="g${i}" style="background:${w[2]};color:${w[3]};display:none">
    <div class="a mono lbl" data-k="g${i}n">0${i + 1} / 03</div>
    <div class="a mono lbl" data-k="g${i}r">o que sua marca ganha</div>
    <div class="a hl" data-k="g${i}w" data-fs="17" data-fit="90,150" data-fw="125" style="font-weight:900;letter-spacing:-.04em">${w[0]}</div>
    <div class="a mono" data-k="g${i}s" style="font-size:calc(var(--u)*1.9)">${w[1]}</div>
  </div>`).join('')}
</div>
<!-- H · assinatura -->
<div class="sc" id="sH" style="background:${C.ink}">
  <div class="ov" data-k="hglow" style="background:radial-gradient(ellipse 60% 55% at 50% 42%,rgba(45,42,255,.55),rgba(45,42,255,0) 70%)"></div>
  <div class="a" data-k="hlock" style="display:flex;align-items:center;width:max-content">
    <div data-k="hsym" style="width:calc(var(--u)*20);height:calc(var(--u)*20);flex:none">${NEXUS}</div>
    <div data-k="htxt" style="display:flex;flex-direction:column">
      <div class="m" style="padding-bottom:.05em;flex:none"><div class="wi" data-k="hnx" style="font-weight:800;font-size:calc(var(--u)*13);line-height:.9;letter-spacing:.01em">NEXUS</div></div>
      <div class="mono" data-k="hag" style="font-size:calc(var(--u)*2.3);color:${C.lilac};margin-top:calc(var(--u)*1.2)">Agency</div>
    </div>
  </div>
  <div class="a hl" data-k="h1" data-fs="7" data-fit="88,120" style="font-weight:700">${mk('Reposicione. _Renasça._')}</div>
  <div class="a mono" data-k="h2" style="font-size:calc(var(--u)*1.75);opacity:.8" data-fit="88,140">Reposicionamento digital e rebranding de marcas</div>
  <div class="a" data-k="h3" style="background:${C.amber};color:${C.ink};border-radius:99px;padding:calc(var(--u)*1.3) calc(var(--u)*3);font-weight:700;font-size:calc(var(--u)*2.3);white-space:nowrap;display:flex;gap:calc(var(--u)*1.6);align-items:center">${CONFIG.cta} <span style="opacity:.5">→</span> <span class="mono" style="font-size:.85em;letter-spacing:.02em;text-transform:none">${CONFIG.site}</span></div>
  <div class="a mono" data-k="h4" style="font-size:calc(var(--u)*1.35);opacity:.45;text-transform:none;letter-spacing:.02em" data-fit="88,140">nexus (lat.): o ponto onde tudo se conecta.</div>
</div>
<!-- camadas globais -->
<div class="ov" data-k="flash" style="background:#fff;opacity:0"></div>
<canvas class="ov" data-k="grain" style="mix-blend-mode:overlay;opacity:.16;width:100%;height:100%"></canvas>
<div class="ov" style="background:radial-gradient(ellipse at center,rgba(0,0,0,0) 55%,rgba(0,0,0,.38) 100%)"></div>
<div class="ov" data-k="black" style="background:#000;opacity:0"></div>`;
  }

  // ------------------------------------------------------------ montagem
  function mount(root) {
    if (!document.getElementById('nx-style')) {
      const st = document.createElement('style');
      st.id = 'nx-style';
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    root.classList.add('nx');
    root.innerHTML = html();
    const K = {};
    root.querySelectorAll('[data-k]').forEach(el => { K[el.dataset.k] = el; });
    const sc = {};
    root.querySelectorAll('.sc').forEach(el => { sc[el.id] = el; });

    let W = 0, H = 0, u = 1, land = true, hw = 50, hh = 50;
    let grid = null; // feed
    let pat = [];    // padrão final
    const grainCtx = K.grain.getContext('2d');
    const grainTiles = [];

    // posiciona: x,y em u relativos ao centro; ax/ay = âncora em %
    function T(el, o) {
      const x = (o.x || 0) * u, y = (o.y || 0) * u;
      const ax = o.ax === undefined ? -50 : o.ax, ay = o.ay === undefined ? -50 : o.ay;
      let s = `translate(${ax}%,${ay}%) translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
      if (o.r) s += ` rotate(${o.r}deg)`;
      if (o.s !== undefined && o.s !== 1) s += ` scale(${o.s})`;
      if (o.sx !== undefined) s += ` scale(${o.sx},${o.sy === undefined ? 1 : o.sy})`;
      el.style.transform = s;
      if (o.o !== undefined) el.style.opacity = clamp(o.o);
    }
    const size = (el, w, h) => { el.style.width = (w * u) + 'px'; if (h !== undefined) el.style.height = (h * u) + 'px'; };
    const show = (el, v) => { const d = v ? ((el.classList.contains('sc') || el.classList.contains('cut')) ? 'block' : '') : 'none'; if (el.style.display !== d) el.style.display = d; };

    // revelação de palavras com máscara
    function kin(el, t, tin, tout, opt = {}) {
      const ws = el._ws || (el._ws = Array.from(el.querySelectorAll('.wi')));
      const st = opt.stagger === undefined ? 0.07 : opt.stagger;
      const dur = opt.dur || 0.65;
      ws.forEach((w, i) => {
        const ti = Array.isArray(tin) ? tin[Math.min(i, tin.length - 1)] : tin + i * st;
        const pin = E.outExpo(P(t, ti, ti + dur));
        let pout = 0;
        if (tout !== undefined) pout = E.inCubic(P(t, tout + i * 0.035, tout + i * 0.035 + 0.32));
        const y = (1 - pin) * 112 - pout * 112;
        w.style.transform = `translate3d(0,${y.toFixed(1)}%,0)`;
      });
      el.style.visibility = t < (Array.isArray(tin) ? tin[0] : tin) - 0.01 ? 'hidden' : 'visible';
    }

    function fitAll() {
      root.querySelectorAll('[data-fit]').forEach(el => {
        const [mp, ml] = el.dataset.fit.split(',').map(Number);
        const max = (land ? Math.min(ml, hw * 2 - 12) : mp) * u;
        const fs = el.dataset.fs ? Number(el.dataset.fs) * u : null;
        const prevT = el.style.transform;
        el.style.transform = 'none';
        el.style.zoom = '';
        if (fs) el.style.fontSize = fs + 'px';
        if (el.dataset.fw) el.style.fontStretch = el.dataset.fw + '%';
        const pw = el.style.width;
        el.style.width = 'max-content';
        for (let it = 0; it < 3; it++) {
          const w = el.getBoundingClientRect().width;
          if (w <= max + 0.5) break;
          if (fs) el.style.fontSize = (parseFloat(el.style.fontSize) * max / w) + 'px';
          else el.style.zoom = ((parseFloat(el.style.zoom) || 1) * max / w).toFixed(4);
        }
        el.style.width = pw;
        el.style.transform = prevT;
      });
    }

    function buildGrid() {
      const cols = land ? 7 : 4;
      const gap = 1.6;
      const gw = hw * 2 - 4;
      const cw = (gw - gap * (cols - 1)) / cols;
      const ch = cw * 1.25;
      const rows = Math.ceil((hh * 2) / (ch + gap)) + 3;
      const r = rng(11);
      let h = '';
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const hue = Math.floor(r() * 360);
        h += `<div class="card" style="width:${cw * u}px;height:${ch * u}px"><i></i><b style="top:8%;width:${30 + r() * 30}%"></b><b style="top:12.5%;width:${15 + r() * 20}%;opacity:.6"></b>
          <div class="im" style="background:linear-gradient(${Math.floor(r() * 360)}deg,hsl(${hue},14%,${18 + r() * 8}%),hsl(${(hue + 40) % 360},10%,${13 + r() * 6}%))"></div><div class="ol">${OLD}</div><div class="ft"></div></div>`;
      }
      K.grid.innerHTML = h;
      const cards = Array.from(K.grid.children);
      const ci = Math.floor(cols / 2), rj = Math.floor(rows / 2);
      const hot = cards[rj * cols + ci];
      hot.classList.add('hot');
      grid = { cols, rows, cw, ch, gap, cards, ci, rj, hot,
        delay: cards.map((c, k) => { const i = k % cols, j = Math.floor(k / cols); return Math.hypot(i - ci, (j - rj) * 1.25) * 0.045; }) };
    }

    function buildPattern() {
      const n = land ? 9 : 6, m = land ? 6 : 10;
      const s = (hw * 2 * 1.5) / n;
      const cols = [[C.paper, C.amber], [C.ultra, C.paper], [C.amber, C.ink], [C.lilac, C.ultra]];
      let h = '';
      for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
        const c = cols[(i + j * 2) % 4];
        h += `<div style="width:${s * u}px;height:${s * u}px;padding:${s * 0.14 * u}px;transform:rotate(${((i + j) % 4) * 90}deg)">${NEWMARK(c[0], c[1])}</div>`;
      }
      K.e7pat.style.gridTemplateColumns = `repeat(${n},${s * u}px)`;
      K.e7pat.innerHTML = h;
      pat = { n, m, s };
    }

    function buildGrain() {
      grainTiles.length = 0;
      const S = 192;
      for (let k = 0; k < 6; k++) {
        const c = document.createElement('canvas');
        c.width = c.height = S;
        const g = c.getContext('2d');
        const im = g.createImageData(S, S);
        const r = rng(100 + k);
        for (let i = 0; i < S * S; i++) {
          const v = Math.floor(r() * 255);
          im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v;
          im.data[i * 4 + 3] = 255;
        }
        g.putImageData(im, 0, 0);
        grainTiles.push(c);
      }
    }

    function layout() {
      const r = root.getBoundingClientRect();
      W = r.width; H = r.height;
      u = Math.min(W, H) / 100;
      land = W >= H;
      hw = W / 2 / u; hh = H / 2 / u;
      root.style.setProperty('--u', u + 'px');
      root.classList.toggle('land', land);
      root.classList.toggle('port', !land);
      // tamanhos dependentes da orientação
      const LW = land ? 50 : 76;
      size(K.logoA, LW);
      size(K.fBlogo, land ? 52 : 68);
      // D
      const VS = land ? 64 : 82;
      K.dgrid.style.backgroundImage = `linear-gradient(90deg,${C.paper} 1px,transparent 1px),linear-gradient(0deg,${C.paper} 1px,transparent 1px)`;
      K.dgrid.style.backgroundSize = `${(hw * 2 / 12) * u}px ${(hw * 2 / 12) * u}px`;
      K.dgrid.style.backgroundPosition = `center center`;
      size(K.dprog, land ? hw * 2 - 16 : 84);
      ['ds0', 'ds1', 'ds2', 'ds3'].forEach(k => size(K[k], land ? 50 : 82));
      size(K.d0card, VS * 0.9, VS * 0.56);
      size(K.d0logo, VS * 0.72);
      size(K.d0scan, VS * 0.9);
      const MS = VS * 0.86;
      size(K.d1ax, MS); size(K.d1ay, 0.02, MS); K.d1ay.style.width = '2px';
      size(K.d1svg, MS, MS);
      const GS = VS * 0.56;
      size(K.d2guides, GS, GS); size(K.d2mark, GS, GS);
      size(K.d3web, VS * 0.84, VS * 0.54);
      size(K.d3phone, VS * 0.24, VS * 0.48);
      size(K.d3post, VS * 0.3, VS * 0.3);
      // E
      size(K.e1bb, land ? 82 : 86, land ? 42 : 46);
      size(K.e2ph, land ? 30 : 46, land ? 62 : 94);
      const PS = land ? 21 : 29;
      K.e3grid.style.gridTemplateColumns = `repeat(3,${PS * u}px)`;
      K.e3grid.style.gap = `${u * 1.1}px`;
      [0, 1, 2].forEach(i => size(K['e4c' + i], land ? 36 : 46, land ? 21 : 27));
      size(K.e5web, land ? 120 : 90, land ? 66 : 120);
      [0, 1, 2].forEach(i => size(K['e6s' + i], land ? 26 : 30, land ? 46 : 54));
      // F
      // H
      K.hlock.style.flexDirection = land ? 'row' : 'column';
      K.hlock.style.gap = (land ? 4.5 : 4) * u + 'px';
      K.htxt.style.alignItems = land ? 'flex-start' : 'center';
      size(K.hsym, land ? 21 : 26, land ? 21 : 26);
      K.hnx.style.fontSize = (land ? 15 : 17) * u + 'px';
      K.hnx.style.fontStretch = '125%';
      // grain
      K.grain.width = Math.ceil(W / 2); K.grain.height = Math.ceil(H / 2);
      buildGrid();
      buildPattern();
      // medir exige tudo renderizado: exibe temporariamente o que está oculto
      const hidden = [];
      root.querySelectorAll('*').forEach(el => {
        const cs = el.style.display;
        if (cs === 'none' || el.classList.contains('sc') || el.classList.contains('cut')) {
          hidden.push([el, cs]);
          el.style.display = (el.classList.contains('sc') || el.classList.contains('cut')) ? 'block' : '';
        }
      });
      K.hnx.parentElement.style.width = '';
      K.hnx.style.transform = 'none';
      const wmax = K.hnx.getBoundingClientRect().width * 1.03;
      K.hnx.parentElement.style.width = (wmax + 2) + 'px';
      K.hnx.parentElement.style.textAlign = land ? 'left' : 'center';
      fitAll();
      hidden.forEach(([el, d]) => { el.style.display = d; });
      // limpa caches de palavras (DOM recriado parcialmente)
      root.querySelectorAll('[data-k]').forEach(el => { delete el._ws; });
    }

    // ---------------------------------------------------------- cenas
    function sceneA(t) {
      const fl = t < 0.15 ? 0 : t < 1.1 ? (hash(Math.floor(t * 18)) > 0.3 ? 1 : 0.12) : 1;
      const hudO = 0.5 * (t < 0.3 ? 0 : fl) * (1 - P(t, 5.0, 5.5));
      const m = land ? 5 : 6;
      T(K.hudTL, { x: -hw + m, y: -hh + m, ax: 0, ay: 0, o: hudO });
      T(K.hudTR, { x: hw - m, y: -hh + m, ax: -100, ay: 0, o: hudO });
      T(K.hudBL, { x: -hw + m, y: hh - m, ax: 0, ay: -100, o: hudO });
      T(K.hudBR, { x: hw - m, y: hh - m, ax: -100, ay: -100, o: hudO });
      // logo antigo
      const p1 = E.inOut(P(t, 1.55, 2.05));
      const y0 = land ? -2 : -4, y1 = land ? -22 : -26;
      let y = lerp(y0, y1, p1), s = lerp(1, 0.66, p1);
      const q = E.inOut(P(t, 4.45, 5.6));
      const LW = land ? 50 : 76;
      const target = (grid.cw * 0.92) / LW;
      s = lerp(s, target, q);
      y = lerp(y, 0, q);
      const jx = t < 1.6 ? (hash(Math.floor(t * 30)) - 0.5) * 0.6 : 0;
      T(K.logoA, { x: jx, y, s, o: fl });
      K.logoA.style.filter = `grayscale(${q * 0.9}) brightness(${1 - q * 0.25})`;
      // frases
      kin(K.a1, t, [2.0, 2.5, 3.0], 5.0);
      kin(K.a2, t, [4.0, 4.25, 4.5], 5.15);
      const ly = land ? [6, 19] : [4, 15];
      T(K.a1, { y: ly[0], o: 1 - 0.55 * P(t, 4.0, 4.4) });
      T(K.a2, { y: ly[1] });
      K.a2.style.color = C.lilac;
    }

    function sceneB(t) {
      const g = grid;
      // rolagem acelerando; congela no glitch
      const tt = Math.min(t, 10.0);
      const dt = Math.max(0, tt - 6.35);
      const off = 26 * dt * dt + 14 * dt;
      const pitch = g.ch + g.gap, span = g.rows * pitch;
      const x0 = -((g.cols - 1) / 2) * (g.cw + g.gap);
      const glitch = t >= 10.0;
      g.cards.forEach((c, k) => {
        const i = k % g.cols, j = Math.floor(k / g.cols);
        let yy = (j - g.rj) * pitch - off;
        const wraps = Math.floor((yy + span / 2) / span);
        yy -= wraps * span;
        const pin = E.outBack(P(t, 5.5 + g.delay[k], 5.95 + g.delay[k]));
        const isHot = c === g.hot;
        const x = (x0 + i * (g.cw + g.gap) - g.cw / 2) * u + W / 2;
        const y = (yy - g.ch / 2) * u + H / 2;
        const sc = isHot ? 1 : lerp(0.6, 1, pin);
        c.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${sc.toFixed(3)})`;
        c.style.opacity = isHot ? 1 : pin * (glitch ? 0.45 : 1);
        if (isHot) c.classList.toggle('hot', wraps === 0);
      });
      const speed = 52 * dt + 14;
      K.grid.style.filter = (t > 6.5 && !glitch) ? `blur(${Math.min(3, speed / 90).toFixed(2)}px)` : 'none';
      K.scrim.style.opacity = P(t, 6.1, 6.4);
      // textos
      kin(K.b1, t, [6.3, 6.55], 7.2);
      kin(K.b2, t, 7.5, 8.5, { stagger: 0.1 });
      kin(K.b3, t, 8.8, 9.8, { stagger: 0.09 });
      T(K.b1, {}); T(K.b2, {}); T(K.b3, {});
      // glitch
      const gs = Math.floor(t * 30);
      show(K.b4, glitch);
      show(K.b5, t >= 10.3);
      if (glitch) {
        const j = (hash(gs) - 0.5) * 2;
        const lt = t - 10;
        const spans = K.b4._sp || (K.b4._sp = Array.from(K.b4.children));
        spans.forEach((sp, i) => {
          const die = 10.55 + hash(i * 7.3) * 0.85;
          sp.style.opacity = t > die ? 0 : (t > die - 0.12 ? (gs % 2 ? 1 : 0.2) : 1);
          sp.style.display = 'inline-block';
          sp.style.transform = t > die - 0.12 ? `translateY(${(hash(gs + i) - 0.5) * 30}%)` : '';
        });
        const d = (0.4 + Math.abs(j) * 0.8) * u;
        K.b4.style.textShadow = `${d}px 0 ${C.amber}, ${-d}px 0 ${C.ultra}`;
        T(K.b4, { x: j * 1.2 * (lt < 1.3 ? 1 : 0.3), y: -2 });
        T(K.b5, { y: land ? 12 : 10, o: gs % 6 < 4 ? 1 : 0.2 });
        for (let i = 0; i < 6; i++) {
          const on = hash(gs * 3 + i) > 0.45;
          const el = K['gb' + i];
          el.style.height = (hash(gs + i * 11) * 6 + 0.5) * u + 'px';
          el.style.background = [C.ultra, C.amber, C.paper, '#000'][i % 4];
          el.style.mixBlendMode = i % 2 ? 'difference' : 'normal';
          el.style.transform = `translate3d(${(hash(gs + i) - 0.5) * 8 * u}px,${hash(gs * 7 + i) * H}px,0)`;
          el.style.opacity = on ? 0.85 : 0;
        }
        sc.sB.style.transform = `translate3d(${(j * 0.8 * u).toFixed(1)}px,0,0) skewX(${(j * 2).toFixed(2)}deg)`;
      } else {
        for (let i = 0; i < 6; i++) K['gb' + i].style.opacity = 0;
        sc.sB.style.transform = '';
      }
    }

    function sceneC(t) {
      const p = E.outBack(P(t, 12.0, 12.35));
      const ex = E.inExpo(P(t, 13.5, 14.0));
      const R = Math.hypot(hw, hh) * 2.2 / 3.2;
      const pulse = 1 + 0.08 * Math.sin((t - 12) * Math.PI * 4) * (1 - ex);
      T(K.dot, { s: (t < 12 ? 0 : p) * pulse * lerp(1, R, ex) });
      K.dot.style.background = mixHex(C.amber, C.ultra, P(t, 13.6, 13.95));
      K.dot.style.boxShadow = ex > 0 ? 'none' : '';
      [[K.r1, 12.0], [K.r2, 13.0]].forEach(([el, t0]) => {
        const q = P(t, t0, t0 + 1.3);
        T(el, { s: lerp(0.6, 9, E.outCubic(q)), o: t < t0 ? 0 : (1 - q) * 0.9 });
      });
      kin(K.c1, t, [12.3, 12.38, 12.46, 12.54, 12.95]);
      T(K.c1, { y: land ? 17 : 16, o: 1 - P(t, 13.35, 13.6) });
    }

    const DW = [[14.0, 16.5], [16.5, 19.0], [19.0, 21.5], [21.5, 24.0]];
    function sceneD(t) {
      const m = land ? 7 : 6;
      T(K.dTL, { x: -hw + m, y: -hh + m, ax: 0, ay: 0 });
      const step = t < 16.5 ? 1 : t < 19 ? 2 : t < 21.5 ? 3 : 4;
      K.dTR.textContent = `Etapa 0${step} / 04`;
      T(K.dTR, { x: hw - m, y: -hh + m, ax: -100, ay: 0 });
      T(K.dprog, { x: land ? -hw + 8 : -42, y: hh - (land ? 7 : 9), ax: 0, ay: -100 });
      DW.forEach(([a, b], i) => { K['pf' + i].style.transform = `scaleX(${P(t, a, b).toFixed(3)})`; });
      const tx = land ? -hw + 8 : -42;
      const ty = land ? -9 : -hh + 27;
      DW.forEach(([a, b], i) => {
        const on = t >= a - 0.05 && t < b + 0.05;
        show(K['dt' + i], on); show(K['ds' + i], on); show(K['dv' + i], on);
        if (!on) return;
        kin(K['dt' + i], t, a + 0.02, i < 3 ? b - 0.32 : undefined, { stagger: 0.08 });
        T(K['dt' + i], { x: tx, y: ty, ax: 0, ay: -100 });
        const so = E.outCubic(P(t, a + 0.2, a + 0.6)) * (1 - P(t, b - 0.3, b - 0.05));
        T(K['ds' + i], { x: tx, y: ty + 3 + (1 - so) * 2, ax: 0, ay: 0, o: so * 0.85 });
      });
      const vx = land ? 34 : 0, vy = land ? -3 : 12;
      const VS = land ? 64 : 82;
      // D1 diagnóstico
      if (t < 16.6) {
        const lt = t;
        const pin = E.outExpo(P(lt, 14.05, 14.7)), pout = E.inCubic(P(lt, 16.15, 16.5));
        T(K.dv0, { x: vx, y: vy + (1 - pin) * 12 - pout * 10, o: pin * (1 - pout) });
        T(K.d0card, {});
        T(K.d0logo, {});
        const sp = E.inOut(P(lt, 14.3, 15.2));
        K.d0scan.style.transform = `translate3d(0,${(lerp(-7, VS * 0.56, sp)) * u - 0}px,0)`;
        K.d0scan.style.top = '0'; K.d0scan.style.left = '0';
        K.d0scan.style.opacity = sp > 0 && sp < 1 ? 1 : 0;
        const pts = land
          ? [[-12, -4, -26, -15], [18, -8, 6, -22], [2, 7, 2, 21], [-20, 2, -30, 12]]
          : [[-16, -5, -28, -20], [22, -9, 8, -25], [2, 9, 4, 27], [-26, 3, -30, 15]];
        const k = VS / 64;
        pts.forEach(([mx, my, cx, cy], i) => {
          const ti = 14.85 + i * 0.35;
          const p = E.outBack(P(lt, ti, ti + 0.3));
          T(K['d0m' + i], { x: mx * k, y: my * k, s: p, o: p > 0 ? 1 : 0 });
          T(K['d0c' + i], { x: cx * k, y: cy * k, s: lerp(0.6, 1, p), o: P(lt, ti, ti + 0.12) });
        });
        const n = Math.round(lerp(100, 38, E.outCubic(P(lt, 14.9, 16.1))));
        K.d0n.textContent = n;
        T(K.d0score, { x: -VS * 0.45, y: -VS * 0.28 - 2.5, ax: 0, ay: -100, o: P(lt, 14.8, 15.0) });
      }
      // D2 estratégia
      if (t >= 16.4 && t < 19.1) {
        const lt = t;
        const pin = E.outExpo(P(lt, 16.5, 17.0)), pout = E.inCubic(P(lt, 18.7, 19.0));
        const MS = VS * 0.86, hm = MS / 2;
        T(K.dv1, { x: vx, y: vy, o: 1 - pout, s: lerp(0.94, 1, pin) });
        T(K.d1ax, { sx: E.outExpo(P(lt, 16.55, 17.1)) });
        T(K.d1ay, { sx: 1, sy: E.outExpo(P(lt, 16.65, 17.2)) });
        const lo = P(lt, 16.9, 17.2);
        T(K.d1l0, { x: -hm, y: -1.8, ax: 0, ay: -100, o: lo * 0.7 });
        T(K.d1l1, { x: hm, y: -1.8, ax: -100, ay: -100, o: lo * 0.7 });
        T(K.d1l2, { x: 1.2, y: -hm, ax: 0, ay: 0, o: lo * 0.7 });
        T(K.d1l3, { x: 1.2, y: hm, ax: 0, ay: -100, o: lo * 0.7 });
        const comp = [[-.62, .3], [-.35, .62], [-.72, .66], [-.2, .35], [-.48, .18], [-.12, .72], [-.78, .42], [-.3, .82], [.12, .55]];
        comp.forEach(([cx, cy], i) => {
          const p = E.outBack(P(lt, 16.85 + i * 0.04, 17.15 + i * 0.04));
          T(K['d1c' + i], { x: cx * hm, y: cy * hm, s: p, o: 0.55 * (p > 0 ? 1 : 0) });
        });
        const pn = E.outBack(P(lt, 17.05, 17.35));
        T(K.d1now, { x: -0.5 * hm, y: 0.45 * hm, s: pn });
        T(K.d1nowl, { x: -0.5 * hm + 2, y: 0.45 * hm + 2, ax: 0, ay: 0, o: P(lt, 17.2, 17.4) * (1 - P(lt, 17.6, 17.9) * 0.5) });
        T(K.d1svg, {});
        const pp = E.inOut(P(lt, 17.55, 18.5));
        K.d1path.style.strokeDashoffset = (1 - pp).toFixed(4);
        // ponto sobre a curva Bézier quadrática
        const b = (a, c, d) => (1 - pp) * (1 - pp) * a + 2 * (1 - pp) * pp * c + pp * pp * d;
        const gx = b(-0.5, -0.15, 0.62), gy = b(0.45, -0.85, -0.58);
        T(K.d1go, { x: gx * hm, y: gy * hm, s: pp > 0 ? 1 : 0 });
        const pr = P(lt, 18.5, 19.0);
        T(K.d1ring, { x: 0.62 * hm, y: -0.58 * hm, s: lerp(0.5, 4, E.outCubic(pr)), o: lt > 18.5 ? 1 - pr : 0 });
        T(K.d1gol, { x: 0.62 * hm - 1, y: -0.58 * hm - 3, ax: -100, ay: -100, o: P(lt, 18.45, 18.6) });
      }
      // D3 identidade
      if (t >= 18.9 && t < 21.6) {
        const lt = t;
        const pin = E.outExpo(P(lt, 19.0, 19.5)), pout = E.inCubic(P(lt, 21.2, 21.5));
        T(K.dv2, { x: vx, y: vy, o: 1 - pout, s: lerp(0.96, 1, pin) });
        const GS = VS * 0.56;
        const gx = land ? -VS * 0.2 : -VS * 0.18;
        T(K.d2guides, { x: gx, y: 0 });
        K.d2guides.querySelectorAll('[pathLength]').forEach((el, i) => {
          el.style.strokeDashoffset = (1 - E.inOut(P(lt, 19.05 + i * 0.06, 19.75 + i * 0.06))).toFixed(3);
        });
        T(K.d2mark, { x: gx, y: 0 });
        const pa = E.outExpo(P(lt, 19.55, 20.15)), pb = E.outExpo(P(lt, 19.7, 20.3));
        K.d2A.style.transform = `translate(${lerp(-70, 0, pa)}px,${lerp(-20, 0, pa)}px)`;
        K.d2B.style.transform = `translate(${lerp(70, 0, pb)}px,${lerp(20, 0, pb)}px)`;
        K.d2A.style.transformBox = K.d2B.style.transformBox = 'view-box';
        K.d2A.style.opacity = pa; K.d2B.style.opacity = pb;
        T(K.d2cap, { x: gx, y: GS / 2 + 3, o: P(lt, 20.2, 20.4) * 0.7 });
        T(K.d2sw, { x: gx + GS / 2 + 4, y: 0, ax: 0 });
        for (let i = 0; i < 4; i++) {
          const p = E.outExpo(P(lt, 20.1 + i * 0.1, 20.6 + i * 0.1));
          K['d2s' + i].style.transform = `translateX(${(1 - p) * 10 * u}px)`;
          K['d2s' + i].style.opacity = p;
        }
        const pw = P(lt, 20.6, 21.3);
        K.d2aa.style.fontStretch = lerp(62, 125, E.inOut(pw < 0.5 ? pw * 2 : 2 - pw * 2)) + '%';
        K.d2aa.style.opacity = P(lt, 20.5, 20.7);
      }
      // D4 presença
      if (t >= 21.4) {
        const lt = t;
        const k = VS / 64;
        const z = E.inExpo(P(lt, 23.1, 24.0));
        T(K.dv3, { x: vx, y: vy });
        const fr = [[K.d3web, 21.6, -3, -6, -2], [K.d3phone, 21.85, 21, 8, 7], [K.d3post, 22.1, -22, 12, -6]];
        fr.forEach(([el, ti, x, y, r]) => {
          const p = E.outExpo(P(lt, ti, ti + 0.7));
          T(el, { x: x * k, y: y * k + (1 - p) * 40, r: r * p + (1 - p) * r * 3, o: P(lt, ti, ti + 0.1) });
        });
        K.dzoom.style.transform = `scale(${lerp(1, 1.6, z)})`;
        K.dzoom.style.transformOrigin = `${50 + (vx / (hw * 2)) * 100}% ${50 + (vy / (hh * 2)) * 100}%`;
      } else {
        K.dzoom.style.transform = '';
      }
      K.dgrid.style.transform = `translateY(${(-(t - 14) * 1.2 * u).toFixed(1)}px)`;
    }

    const CUTS = [
      ['e1', 25, '01 · Outdoor'], ['e2', 26, '02 · App'], ['e3', 27, '03 · Social'], ['e4', 28, '04 · Papelaria'],
      ['e5', 29, '05 · Site'], ['e6', 30, '06 · Stories'], ['e7', 31, '07 · Sistema'],
    ];
    function sceneE(t) {
      const lt0 = t - 24;
      show(K.e0, t < 25);
      if (t < 25) {
        const p = E.outExpo(P(t, 24.0, 24.75));
        T(K.e0lock, { y: 0, s: lerp(1.45, 1, p) });
        T(K.e0cap, { y: land ? -14 : -13, o: P(t, 24.25, 24.4) });
        T(K.e0sub, { y: land ? 14 : 13, o: P(t, 24.4, 24.55) });
        const l = K.e0lA, r = K.e0lB;
        const pa = E.outExpo(P(t, 24.0, 24.5));
        l.style.transformBox = r.style.transformBox = 'view-box';
        l.style.transform = `translateX(${lerp(-24, 0, pa)}px)`;
        r.style.transform = `translateX(${lerp(24, 0, pa)}px)`;
      }
      CUTS.forEach(([k, a], i) => {
        const on = t >= a && t < a + 1;
        show(K[k], on);
        if (!on) return;
        const lt = t - a;
        const pop = E.outExpo(P(lt, 0, 0.35));
        if (k === 'e1') {
          T(K.e1bb, { y: -4, s: lerp(1.12, 1.0, pop) + lt * 0.05 });
          K.e1panel.style.transform = `rotateY(${lerp(-24, -12, E.outCubic(lt))}deg) rotateX(4deg)`;
          for (let w = 0; w < 40; w++) {
            const el = K['e1w' + w];
            const x = (hash(w * 3.1) - 0.5) * hw * 2;
            const y = hh - 4 - hash(w * 1.7) * (land ? 16 : 34);
            T(el, { x, y, o: hash(w + Math.floor(t * 8)) > 0.25 ? 0.25 + hash(w) * 0.5 : 0.05 });
          }
        } else if (k === 'e2') {
          T(K.e2ph, { y: lerp(10, 0, pop), s: 1 + lt * 0.04 });
          const pn = E.outExpo(P(lt, 0.25, 0.6));
          K.e2note.style.transform = `translateY(${lerp(-160, 0, pn)}%)`;
          const ic = K.e2icon;
          ic.style.transform = `scale(${1 + 0.12 * Math.max(0, Math.sin(lt * Math.PI * 2))})`;
        } else if (k === 'e3') {
          T(K.e3grid, { y: lerp(8, -2, E.outCubic(lt)), s: lerp(1.15, 1, pop), r: lerp(-3, 0, pop) });
        } else if (k === 'e4') {
          [[-12, -4, -14], [0, 2, 3], [12, 7, 16]].forEach(([x, y, r], j) => {
            const p = E.outExpo(P(lt, j * 0.08, j * 0.08 + 0.5));
            const kk = land ? 1 : 0.9;
            T(K['e4c' + j], { x: x * kk * p, y: y * kk + (1 - p) * 30, r: r * p });
          });
        } else if (k === 'e5') {
          T(K.e5web, { y: lerp(6, 0, pop), s: 1 + lt * 0.03 });
          const pc = E.inOut(P(lt, 0.15, 0.65));
          const bw = K.e5web.getBoundingClientRect ? 1 : 1;
          const WW = land ? 120 : 90, WH = land ? 66 : 120;
          const cx = lerp(WW * 0.75, WW * 0.14, pc), cy = lerp(WH * 0.95, WH * 0.75, pc);
          K.e5cur.style.transform = `translate(${cx * u}px,${cy * u}px) scale(${lt > 0.7 && lt < 0.8 ? 0.85 : 1})`;
          K.e5btn.style.transform = `scale(${lt > 0.7 && lt < 0.85 ? 0.94 : 1})`;
          K.e5btn.style.boxShadow = lt > 0.7 ? `0 0 0 ${(P(lt, 0.7, 1) * 2.4 * u).toFixed(1)}px rgba(45,42,255,${(0.4 * (1 - P(lt, 0.7, 1))).toFixed(2)})` : 'none';
        } else if (k === 'e6') {
          const sx = land ? 29 : 31;
          [-1, 0, 1].forEach((d, j) => {
            const p = E.outExpo(P(lt, j * 0.07, j * 0.07 + 0.5));
            T(K['e6s' + j], { x: d * sx, y: (1 - p) * 40 + (j === 1 ? -3 : 3), r: d * 3 * (1 - p) });
            K['e6p' + j].style.transform = `scaleX(${clamp(lt * 1.2 - j * 0.1)})`;
          });
        } else if (k === 'e7') {
          const z = E.outExpo(P(lt, 0, 1));
          T(K.e7pat, { s: lerp(2.4, 1, z), r: lerp(12, -4, z) });
        }
      });
      // rótulo do touchpoint
      const cur = CUTS.find(([, a]) => t >= a && t < a + 1);
      K.elbl.textContent = cur ? cur[2] : '';
      T(K.elbl, { x: hw - (land ? 6 : 6), y: -hh + (land ? 6 : 7), ax: -100, ay: 0, o: cur ? 1 : 0 });
      // frases com blend difference
      const ex = land ? -hw + 7 : -hw + 6, ey = hh - (land ? 8 : 12);
      [[K.et0, 25.15, 27.75], [K.et1, 28.0, 29.8], [K.et2, 30.0, 31.75]].forEach(([el, a, b]) => {
        const on = t >= a - 0.05 && t < b + 0.45;
        show(el, on);
        if (!on) return;
        kin(el, t, a, b, { stagger: 0.09 });
        T(el, { x: ex, y: ey, ax: 0, ay: -100 });
      });
      K.flash.style.opacity = t >= 24 && t < 24.4 ? 1 - E.outCubic(P(t, 24, 24.4)) : 0;
    }

    function sceneF(t) {
      // divisória: fração da largura onde começa o "depois"
      let d;
      if (t < 32.15) d = 1;
      else if (t < 33.35) d = lerp(1, 0.5, E.outExpo(P(t, 32.15, 32.85)));
      else d = lerp(0.5, 0, E.inOut(P(t, 33.35, 33.85)));
      const axis = land ? 'x' : 'y';
      const half = land ? hw : hh;
      if (land) K.fA.style.clipPath = `inset(0 0 0 ${(d * 100).toFixed(2)}%)`;
      else K.fA.style.clipPath = `inset(${(d * 100).toFixed(2)}% 0 0 0)`;
      const pos = (d - 0.5) * 2 * half;
      const bc = -half + d * half;       // centro do "antes"
      const ac = d * half;               // centro do "depois"
      const o = {};
      o[axis] = bc;
      T(K.fBlogo, { ...o, o: 1 });
      const o2 = {}; o2[axis] = ac;
      const pm = E.inOut(P(t, 33.9, 34.3));
      T(K.fAlock, { ...o2, y: (o2.y || 0) - pm * 6, o: 1 - pm, s: land ? 1 : 0.85 });
      if (land) {
        size(K.fdiv, 0.35, hh * 2);
        T(K.fdiv, { x: pos, o: d > 0.001 && d < 0.999 ? 1 : 0 });
        T(K.fknob, { x: pos, o: d > 0.001 && d < 0.999 ? 1 : 0 });
        T(K.fBl, { x: -hw + 6, y: -hh + 6, ax: 0, ay: 0 });
        T(K.fAl, { x: hw - 6, y: -hh + 6, ax: -100, ay: 0, o: 1 - pm });
      } else {
        size(K.fdiv, hw * 2, 0.35);
        T(K.fdiv, { y: pos, o: d > 0.001 && d < 0.999 ? 1 : 0 });
        T(K.fknob, { y: pos, r: 90, o: d > 0.001 && d < 0.999 ? 1 : 0 });
        T(K.fBl, { x: -hw + 6, y: -hh + 7, ax: 0, ay: 0 });
        T(K.fAl, { x: -hw + 6, y: hh - 7, ax: 0, ay: -100, o: 1 - pm });
      }
      // manifesto
      const ys = land ? [-12, 0, 12] : [-11.5, 0, 11.5];
      T(K.f0, { y: ys[0] - (land ? 12 : 10), o: P(t, 34.15, 34.35) * (1 - P(t, 37.55, 37.8)) });
      kin(K.f1, t, 34.25, 37.55, { stagger: 0.1 });
      kin(K.f2, t, [35.0, 35.18], 37.62);
      kin(K.f3, t, 35.8, 37.7, { stagger: 0.08 });
      T(K.f1, { y: ys[0] }); T(K.f2, { y: ys[1] }); T(K.f3, { y: ys[2] });
      K.f2.querySelector('.acc').style.color = C.amber;
    }

    const GW = [[38.0, 39.333], [39.333, 40.667], [40.667, 42.0]];
    function sceneG(t) {
      GW.forEach(([a, b], i) => {
        const on = t >= a && t < b;
        show(K['g' + i], on);
        if (!on) return;
        const lt = t - a;
        const p = E.outExpo(P(lt, 0, 1.1));
        K['g' + i + 'w'].style.fontStretch = lerp(62, 125, p).toFixed(1) + '%';
        T(K['g' + i + 'w'], { y: -2, s: lerp(1.25, 1, E.outExpo(P(lt, 0, 0.5))) });
        T(K['g' + i + 's'], { y: land ? 13 : 12, o: P(lt, 0.25, 0.45) });
        const m = land ? 6 : 6;
        T(K['g' + i + 'n'], { x: -hw + m, y: -hh + m, ax: 0, ay: 0 });
        T(K['g' + i + 'r'], { x: hw - m, y: -hh + m, ax: -100, ay: 0, o: 0.7 });
      });
    }

    function sceneH(t) {
      K.hglow.style.opacity = E.outCubic(P(t, 42.0, 43.5)) * (0.9 + 0.1 * Math.sin(t * 2));
      T(K.hlock, { y: land ? -13 : -24, s: lerp(1.06, 1, E.outCubic(P(t, 42, 45))) });
      [[K.nx1, 42.05, 42.45], [K.nx2, 42.35, 42.85], [K.nx3, 42.75, 43.15]].forEach(([el, a, b]) => {
        el.style.strokeDashoffset = (1 - E.inOut(P(t, a, b))).toFixed(4);
      });
      [[K.nxn1, 43.15], [K.nxn2, 43.27]].forEach(([el, a]) => {
        const p = E.outBack(P(t, a, a + 0.35));
        el.setAttribute('r', (10.5 * p).toFixed(2));
      });
      [[K.nxr1, 43.15], [K.nxr2, 43.27]].forEach(([el, a]) => {
        const p = P(t, a, a + 1.0);
        el.setAttribute('r', (10 + 30 * E.outCubic(p)).toFixed(2));
        el.style.opacity = t < a ? 0 : 1 - p;
      });
      const pw = E.outExpo(P(t, 43.3, 44.4));
      K.hnx.style.transform = `translateY(${((1 - E.outExpo(P(t, 43.3, 43.9))) * 110).toFixed(1)}%)`;
      K.hnx.style.fontStretch = lerp(62, 125, pw).toFixed(1) + '%';
      K.hnx.style.letterSpacing = lerp(-0.04, 0.02, pw).toFixed(3) + 'em';
      const pa = P(t, 43.8, 44.4);
      K.hag.style.opacity = pa;
      K.hag.style.letterSpacing = lerp(0.3, 0.92, E.outCubic(pa)).toFixed(3) + 'em';
      const ys = land ? [9.5, 18, 27.5] : [8, 17, 27];
      kin(K.h1, t, [44.5, 44.75]);
      T(K.h1, { y: ys[0] });
      K.h1.querySelector('.acc').style.color = C.amber;
      T(K.h2, { y: ys[1], o: E.outCubic(P(t, 45.2, 45.5)) * 0.8 });
      const pc = E.outBack(P(t, 45.8, 46.2));
      T(K.h3, { y: ys[2], s: lerp(0.7, 1, pc), o: P(t, 45.8, 45.9) });
      T(K.h4, { y: hh - (land ? 6 : 8), o: P(t, 46.1, 46.5) * 0.45 });
      K.black.style.opacity = E.inOut(P(t, 47.35, 48.0));
    }

    const SCENES = [
      ['sA', 0, 5.75, sceneA], ['sB', 5.45, 11.55, sceneB], ['sC', 11.55, 14.02, sceneC],
      ['sD', 14.0, 24.0, sceneD], ['sE', 24.0, 32.0, sceneE], ['sF', 32.0, 38.0, sceneF],
      ['sG', 38.0, 42.0, sceneG], ['sH', 42.0, 99, sceneH],
    ];

    function grain(t) {
      if (!grainTiles.length) return;
      const f = Math.floor(t * 24) % grainTiles.length;
      const g = grainCtx;
      const pat = g.createPattern(grainTiles[f], 'repeat');
      g.fillStyle = pat;
      g.setTransform(1, 0, 0, 1, (hash(f) * 192) | 0, (hash(f + 9) * 192) | 0);
      g.fillRect(-192, -192, K.grain.width + 384, K.grain.height + 384);
      g.setTransform(1, 0, 0, 1, 0, 0);
    }

    let last = -1;
    function seek(t) {
      t = clamp(t, 0, CONFIG.duration - 0.001);
      SCENES.forEach(([id, a, b, fn]) => {
        const on = t >= a && t < b;
        show(sc[id], on);
        if (on) fn(t);
      });
      if (t < 24 || t >= 24.4) K.flash.style.opacity = t >= 23.7 && t < 24 ? E.inExpo(P(t, 23.7, 24.0)) : 0;
      if (t < 47.35) K.black.style.opacity = 0;
      grain(t);
      last = t;
    }

    buildGrain();
    layout();
    return { seek, layout, get time() { return last; }, duration: CONFIG.duration, config: CONFIG };
  }

  const ready = () => Promise.all([
    document.fonts.load('800 40px Archivo'), document.fonts.load('italic 40px "Instrument Serif"'),
    document.fonts.load('500 20px "JetBrains Mono"'),
  ]).then(() => document.fonts.ready).catch(() => {});

  window.NexusFilm = { mount, ready, CONFIG };
})();
