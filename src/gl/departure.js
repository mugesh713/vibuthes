import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * The closing act: departure.
 *
 * One ship at dusk, seen from above. Scroll shrinks it toward the horizon
 * while a single column of copy scrolls straight through the frame —
 * WHY US, the headline, two rows of feature pairs, one centered row,
 * then the closing line. No WebGL: a pinned DOM section, a GSAP
 * ScrollTrigger scrub, and CSS transforms do all the work.
 *
 * v2 — the sea and ship now move on their own (wake, glint, a gentle
 * bob) instead of only reacting to scroll, so the scene feels alive
 * even while you're reading, not just while you're scrolling.
 *
 * Usage:
 *   import { createDeparture } from './departure.js';
 *   const departure = createDeparture(document.querySelector('#departure'));
 *   // departure.destroy() to tear down when the section unmounts.
 */

const STYLE_ID = 'departure-styles';

const DEFAULT_CONTENT = {
  eyebrow: 'WHY US',
  headline: ['SHIPPING BUILT', 'AROUND THE WAY', 'YOUR BUSINESS', 'ACTUALLY MOVES.'],
  pairs: [
    [
      { icon: 'target', title: 'One point of contact', body: 'No juggling vendors — one team owns your shipment start to finish.' },
      { icon: 'eye',     title: 'Full shipment visibility', body: 'Track freight in real time and hear about problems before they cost you days.' },
    ],
    [
      { icon: 'shield', title: 'Compliance, handled', body: 'Licensed brokers keep every lane inside regulation, region by region.' },
      { icon: 'dollar', title: 'Pricing with no fine print', body: 'One clear quote, backed by a team that still picks up the phone.' },
    ],
  ],
  single: { icon: 'bolt', title: 'Fast when things go wrong', body: "We don't point fingers — we act first, and protect your timeline." },
  final: { title: 'One ship, every lane you ship to.', body: 'Same team, same standard, from the first container to the last mile.' },
};

const ICONS = {
  target: ['00100', '01110', '11011', '01110', '00100'],
  eye:    ['00000', '01110', '11111', '01110', '00000'],
  shield: ['01110', '11011', '11011', '01110', '00100'],
  dollar: ['00100', '01111', '01010', '11110', '00100'],
  bolt:   ['00110', '01100', '11111', '00110', '01100'],
};

const SHIP_PALETTE = ['#e63946', '#1d3557', '#2a9d8f', '#e9c46a', '#f4a261', '#f1faee', '#6a4c93', '#e76f51'];

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .dep-root{ position:relative; height:100%; width:100%; overflow:hidden;
      background:transparent; color:#f2f7fb; font-family:'Manrope',sans-serif; }

    /* ---------- sea ---------- */
    .dep-ocean{ position:absolute; inset:0; z-index:0;
      background:
        radial-gradient(140% 100% at 50% 42%, #123a5e 0%, #0d2a4a 45%, #061428 78%),
        linear-gradient(180deg, #0d2a4a, #020814 100%); }
    .dep-ocean .swell-a, .dep-ocean .swell-b{ position:absolute; inset:-20%; mix-blend-mode:overlay; }
    .dep-ocean .swell-a{ opacity:.4;
      background-image: repeating-linear-gradient(112deg, rgba(255,255,255,.07) 0 2px, transparent 2px 40px);
      animation: dep-drift-a 22s linear infinite; }
    .dep-ocean .swell-b{ opacity:.3;
      background-image: repeating-linear-gradient(64deg, rgba(255,255,255,.06) 0 1px, transparent 1px 34px);
      animation: dep-drift-b 34s linear infinite; }
    @keyframes dep-drift-a{ from{transform:translate3d(0,0,0);} to{transform:translate3d(-7%,5%,0);} }
    @keyframes dep-drift-b{ from{transform:translate3d(0,0,0);} to{transform:translate3d(6%,-6%,0);} }
    .dep-glint{ position:absolute; width:60%; height:60%; left:20%; top:10%; border-radius:50%; opacity:.14;
      background:radial-gradient(circle, rgba(255,220,190,.9), transparent 65%);
      filter:blur(30px); animation: dep-glint-move 16s ease-in-out infinite; }
    @keyframes dep-glint-move{
      0%,100%{ transform:translate(-8%,-6%) scale(1); }
      50%{ transform:translate(10%,8%) scale(1.15); } }

    .dep-vignette{ position:absolute; inset:0; z-index:2; pointer-events:none;
      background:radial-gradient(58% 52% at 50% 46%, transparent 40%, rgba(2,7,17,.7) 100%); }
    .dep-clouds{ position:absolute; inset:0; z-index:1; pointer-events:none; opacity:0; }
    .dep-clouds i{ position:absolute; border-radius:50%; filter:blur(50px); display:block;
      background:radial-gradient(circle, rgba(210,228,240,.75), rgba(210,228,240,0) 70%); }
    .dep-clouds i:nth-child(1){ width:52vw; height:52vw; top:-16vw; left:-18vw; }
    .dep-clouds i:nth-child(2){ width:44vw; height:44vw; bottom:-14vw; right:-14vw; }
    .dep-clouds i:nth-child(3){ width:30vw; height:30vw; top:55%; right:8%; }

    /* ---------- ship ---------- */
    .dep-ship-layer{ position:absolute; inset:0; z-index:3; display:flex; align-items:center; justify-content:center; }
    .dep-rig{ position:relative; transform-origin:50% 50%; will-change:transform; } /* scroll scale lives here */
    .dep-bob{ animation: dep-bob 4.6s ease-in-out infinite; }                        /* continuous life lives here */
    @keyframes dep-bob{
      0%,100%{ transform:translateY(0) rotate(0deg); }
      50%{ transform:translateY(4px) rotate(.6deg); } }
    .dep-glow{ position:absolute; left:50%; top:50%; width:280px; height:280px; transform:translate(-50%,-50%);
      background:radial-gradient(circle, rgba(255,178,122,.14), transparent 70%); pointer-events:none; }
    .dep-ship{ display:block; filter:drop-shadow(0 10px 22px rgba(0,0,0,.5)); }
    .dep-wake{ position:absolute; left:50%; top:100%; transform:translateX(-50%); pointer-events:none; }
    .dep-wake path{ fill:none; stroke:rgba(220,233,242,.4); stroke-width:2; stroke-linecap:round;
      stroke-dasharray:6 10; animation: dep-wake-flow 2.4s linear infinite; }
    .dep-wake path:nth-child(2){ animation-duration:3.1s; opacity:.6; }
    @keyframes dep-wake-flow{ to{ stroke-dashoffset:-160; } }

    .dep-compass{ position:absolute; z-index:4; left:calc(50% - 96px); top:calc(50% - 8px); width:56px; height:56px; pointer-events:none; }
    .dep-compass .ring{ animation:dep-spin 8s linear infinite; transform-origin:28px 28px; }
    @keyframes dep-spin{ to{ transform:rotate(360deg); } }

    /* ---------- scrolling text column ---------- */
    .dep-track{ position:absolute; z-index:5; left:0; right:0; top:0; will-change:transform; }
    .dep-row{ min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:4vh 6vw; }
    .dep-row.eyebrow{ min-height:64vh; justify-content:flex-end; padding-bottom:2vh; }
    .dep-row.eyebrow span{ letter-spacing:.18em; font-size:.78rem; color:#9fb4c8; }
    .dep-row.headline{ min-height:78vh; justify-content:flex-start; padding-top:2vh; }
    .dep-row.headline h1{ font-weight:700; margin:0; line-height:1.04;
      font-size:clamp(2rem,6vw,4.6rem); letter-spacing:-.01em; text-shadow:0 6px 26px rgba(0,0,0,.4); }
    .dep-row.pair{ min-height:78vh; }
    .dep-pair-grid{ display:flex; justify-content:space-between; width:min(980px,88vw); gap:6vw; }
    .dep-pair-grid .col{ flex:1; max-width:300px; }
    .dep-pair-grid .col.left{ text-align:right; margin-left:auto; }
    .dep-pair-grid .col.right{ text-align:left; margin-right:auto; }
    .dep-icon{ display:inline-grid; grid-template-columns:repeat(5,4px); grid-auto-rows:4px; gap:2px; margin-bottom:14px; }
    .dep-pair-grid .col.left .dep-icon{ margin-left:auto; }
    .dep-pair-grid .col.right .dep-icon{ margin-right:auto; }
    .dep-icon i{ background:transparent; border-radius:1px; }
    .dep-icon i.on{ background:#ffb27a; }
    .dep-row h3{ font-weight:600; font-size:1.15rem; margin:0 0 .5rem; }
    .dep-row p{ margin:0; color:#9fb4c8; font-size:.92rem; line-height:1.55; }
    .dep-row.single{ min-height:72vh; }
    .dep-row.single .dep-icon{ margin:0 auto 14px; }
    .dep-row.single p{ max-width:38ch; }
    .dep-row.final{ min-height:60vh; }
    .dep-row.final h2{ font-weight:600; font-size:clamp(1.3rem,3vw,2rem); margin:0 0 .5rem; }
    .dep-row.final p{ max-width:34ch; }

    @media (prefers-reduced-motion: reduce){
      .dep-ocean .swell-a, .dep-ocean .swell-b, .dep-glint, .dep-bob, .dep-wake path, .dep-compass .ring{ animation:none !important; }
    }
  `;
  document.head.appendChild(style);
}

function buildIconGrid(key) {
  const grid = document.createElement('div');
  grid.className = 'dep-icon';
  const rows = ICONS[key] || ICONS.target;
  rows.forEach((row) => {
    row.split('').forEach((ch) => {
      const cell = document.createElement('i');
      if (ch === '1') cell.classList.add('on');
      grid.appendChild(cell);
    });
  });
  return grid;
}

function buildShipSvg() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'dep-ship');
  svg.setAttribute('viewBox', '0 0 100 620');
  svg.setAttribute('width', '150');
  svg.setAttribute('height', '930');

  const cols = 4, rows = 15, cw = 18, ch = 30, gap = 2;
  const hullW = cols * (cw + gap) + gap;
  const hullTop = 46;
  const hullH = rows * (ch + gap) + gap;
  const w = hullW, x0 = (100 - w) / 2, yTop = hullTop, yBot = hullTop + hullH + 30;

  const hull = document.createElementNS(NS, 'path');
  hull.setAttribute('d', `M${x0 + w / 2} 2 L${x0 + w} ${yTop} L${x0 + w} ${yBot - 20} Q${x0 + w} ${yBot} ${x0 + w / 2} ${yBot + 16} Q${x0} ${yBot} ${x0} ${yBot - 20} L${x0} ${yTop} Z`);
  hull.setAttribute('fill', '#12324f');
  hull.setAttribute('stroke', '#2a4f70');
  hull.setAttribute('stroke-width', '1.2');
  svg.appendChild(hull);

  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed % 1000) / 1000; };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const rect = document.createElementNS(NS, 'rect');
      rect.setAttribute('x', x0 + gap + c * (cw + gap));
      rect.setAttribute('y', hullTop + 14 + gap + r * (ch + gap));
      rect.setAttribute('width', cw);
      rect.setAttribute('height', ch);
      rect.setAttribute('rx', 1.5);
      rect.setAttribute('fill', SHIP_PALETTE[Math.floor(rand() * SHIP_PALETTE.length)]);
      rect.setAttribute('opacity', '.96');
      svg.appendChild(rect);
    }
  }

  const bridge = document.createElementNS(NS, 'rect');
  bridge.setAttribute('x', x0 + w / 2 - 10);
  bridge.setAttribute('y', yBot - 16);
  bridge.setAttribute('width', 20);
  bridge.setAttribute('height', 12);
  bridge.setAttribute('rx', 2);
  bridge.setAttribute('fill', '#dce9f2');
  bridge.setAttribute('opacity', '.9');
  svg.appendChild(bridge);

  return svg;
}

function buildWakeSvg() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'dep-wake');
  svg.setAttribute('viewBox', '0 0 120 200');
  svg.setAttribute('width', '150');
  svg.setAttribute('height', '250');
  svg.innerHTML = `
    <path d="M46 0 Q20 90 32 200" />
    <path d="M74 0 Q100 90 88 200" />
  `;
  return svg;
}

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const range = (p, a, b) => clamp((p - a) / (b - a));

export class Departure {
  constructor(el, track, content = {}) {
    this.el = el;
    this.track = track || el;
    this.content = { ...DEFAULT_CONTENT, ...content };
    this.maxScroll = 0;

    injectStyles();
    this._buildDom();
    this._bindScroll();
    this._onResize = () => this._measure();
    window.addEventListener('resize', this._onResize);
  }

  _buildDom() {
    this.el.classList.add('dep-root');

    this.ocean = document.createElement('div');
    this.ocean.className = 'dep-ocean';
    this.ocean.innerHTML = '<div class="swell-a"></div><div class="swell-b"></div><div class="dep-glint"></div>';
    this.el.appendChild(this.ocean);

    this.vignette = document.createElement('div');
    this.vignette.className = 'dep-vignette';
    this.el.appendChild(this.vignette);

    this.clouds = document.createElement('div');
    this.clouds.className = 'dep-clouds';
    this.clouds.innerHTML = '<i></i><i></i><i></i>';
    this.el.appendChild(this.clouds);

    const shipLayer = document.createElement('div');
    shipLayer.className = 'dep-ship-layer';

    const compass = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    compass.setAttribute('class', 'dep-compass');
    compass.setAttribute('viewBox', '0 0 56 56');
    compass.setAttribute('fill', 'none');
    compass.innerHTML = '<circle class="ring" cx="28" cy="28" r="19" stroke="#ffb27a" stroke-width="1.3" stroke-dasharray="3 6" opacity=".75"/>';
    shipLayer.appendChild(compass);

    // outer .dep-rig takes the scroll-driven scale; inner .dep-bob keeps
    // its own continuous life so the two transforms never fight.
    this.rig = document.createElement('div');
    this.rig.className = 'dep-rig';
    const bob = document.createElement('div');
    bob.className = 'dep-bob';
    const glow = document.createElement('div');
    glow.className = 'dep-glow';
    bob.appendChild(glow);
    bob.appendChild(buildShipSvg());
    bob.appendChild(buildWakeSvg());
    this.rig.appendChild(bob);
    shipLayer.appendChild(this.rig);
    this.el.appendChild(shipLayer);

    this.trackEl = document.createElement('div');
    this.trackEl.className = 'dep-track';
    this._buildRows();
    this.el.appendChild(this.trackEl);
  }

  _buildRows() {
    const { eyebrow, headline, pairs, single, final } = this.content;

    const eyebrowRow = document.createElement('div');
    eyebrowRow.className = 'dep-row eyebrow';
    eyebrowRow.innerHTML = `<span>${eyebrow}</span>`;
    this.trackEl.appendChild(eyebrowRow);

    const headlineRow = document.createElement('div');
    headlineRow.className = 'dep-row headline';
    const h1 = document.createElement('h1');
    h1.innerHTML = headline.join('<br>');
    headlineRow.appendChild(h1);
    this.trackEl.appendChild(headlineRow);

    pairs.forEach(([left, right]) => {
      const row = document.createElement('div');
      row.className = 'dep-row pair';
      const grid = document.createElement('div');
      grid.className = 'dep-pair-grid';
      [['left', left], ['right', right]].forEach(([side, data]) => {
        const col = document.createElement('div');
        col.className = `col ${side}`;
        col.appendChild(buildIconGrid(data.icon));
        const h3 = document.createElement('h3'); h3.textContent = data.title;
        const p = document.createElement('p'); p.textContent = data.body;
        col.appendChild(h3); col.appendChild(p);
        grid.appendChild(col);
      });
      row.appendChild(grid);
      this.trackEl.appendChild(row);
    });

    const singleRow = document.createElement('div');
    singleRow.className = 'dep-row single';
    singleRow.appendChild(buildIconGrid(single.icon));
    const sh = document.createElement('h3'); sh.textContent = single.title;
    const sp = document.createElement('p'); sp.textContent = single.body;
    singleRow.appendChild(sh); singleRow.appendChild(sp);
    this.trackEl.appendChild(singleRow);

    const finalRow = document.createElement('div');
    finalRow.className = 'dep-row final';
    const fh = document.createElement('h2'); fh.textContent = final.title;
    const fp = document.createElement('p'); fp.textContent = final.body;
    finalRow.appendChild(fh); finalRow.appendChild(fp);
    this.trackEl.appendChild(finalRow);
  }

  _measure() {
    this.maxScroll = Math.max(0, this.trackEl.scrollHeight - window.innerHeight);
  }

  _bindScroll() {
    this._measure();
    this.scrollTrigger = ScrollTrigger.create({
      trigger: this.track,
      start: 'top top',
      end: 'bottom bottom',
      pin: this.el,
      scrub: 0.5,
      onUpdate: (self) => this.update(self.progress),
    });
  }

  /** Drives every scroll-linked visual from a single 0–1 progress value.
   *  The wake, glint and bob keep running on their own via CSS —
   *  this only handles what should change as you scroll. */
  update(p) {
    gsap.set(this.trackEl, { y: -this.maxScroll * p });

    const scale = gsap.utils.interpolate(1, 0.2, gsap.parseEase('power1.inOut')(p));
    gsap.set(this.rig, { scale });

    gsap.set(this.clouds, { opacity: range(p, 0.74, 0.96) * 0.9 });
  }

  destroy() {
    window.removeEventListener('resize', this._onResize);
    if (this.scrollTrigger) this.scrollTrigger.kill();
    this.el.innerHTML = '';
    this.el.classList.remove('dep-root');
  }
}

export function createDeparture(el, track, content) {
  return new Departure(el, track, content);
}