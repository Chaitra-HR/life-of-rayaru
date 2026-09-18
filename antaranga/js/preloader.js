// ANTARANGA · BrindavanaPreloader
// An architectural drafting of the Brindavana in rust ink on warm paper. The
// sheet is ruled, the construction geometry is struck, the outline is traced
// to completion, and only then are the interior forms and the carved detail
// drawn into it.
//
// The artwork is the SVG in index.html; it is only ever READ here. Every path
// is measured and laid out in progress space, then the drawing itself runs on
// a canvas owned by a worker (js/preloader-worker.js → preloader-draw.js), so
// the hand keeps moving while this thread parses three.js and builds the
// world. Where a worker cannot draw, the same engine runs on the page.
//
// The hand draws on its own clock and waits only for the last of the carved
// detail, which lands the moment the first scene is renderable.

import { createDrafting } from './preloader-draw.js';

export const PRELOADER_TIMING = {
  exit: .85,        // the sheet lifts away into the first scene (css #preloader transition)
};

/* the drawing in progress-space: construction, then outline, then detail */
const OUTLINE = [27, 60];
const FORMS   = [60, 84];
const FINE    = [84, 100];

const wait = (s) => new Promise(r => setTimeout(r, s * 1000));

/* one record per drawn piece. A path holding several disconnected pieces
   (absolute M commands) is split so each piece is drawn as its own line;
   pieces of one original travel together, one after another. */
function readStrokes(svg) {
  const out = [];
  let setId = 0;
  const matrixOf = (p) => {
    const list = p.transform && p.transform.baseVal;
    const c = list && list.numberOfItems ? list.consolidate() : null;
    if (!c) return null;
    const m = c.matrix;
    return [m.a, m.b, m.c, m.d, m.e, m.f];
  };
  const clsOf = (p) => {
    for (const c of p.classList) if (c.startsWith('bx-')) return c;
    return p.classList.contains('s') ? 's' : p.classList.contains('d') ? 'd' : 'f';
  };
  const probe = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  svg.appendChild(probe);
  const lengthOf = (d) => { probe.setAttribute('d', d); return probe.getTotalLength(); };
  for (const p of svg.querySelectorAll('path')) {
    if (p === probe) continue;
    const d = p.getAttribute('d') || '';
    const cls = clsOf(p);
    const guide = cls.startsWith('bx-');
    const sheet = cls === 'bx-grid' || cls === 'bx-dot';
    const grp = p.closest('g[data-a]');
    const base = { cls, guide, sheet, m: matrixOf(p),
      a: grp ? parseFloat(grp.dataset.a) : 0, b: grp ? parseFloat(grp.dataset.b) : 0 };
    const pieces = (sheet || /m/.test(d)) ? [d] : d.split(/(?=M)/).map(s => s.trim()).filter(Boolean);
    const set = pieces.length > 1 ? `s${++setId}` : null;
    for (const piece of pieces) out.push({ ...base, d: piece, set, len: lengthOf(piece) });
  }
  probe.remove();
  return out;
}

/* consecutive pieces cut from one original are one unit */
function toUnits(strokes) {
  const units = [];
  let cur = null;
  for (const s of strokes) {
    if (cur && s.set && cur.set === s.set) cur.els.push(s);
    else units.push(cur = { set: s.set, els: [s] });
  }
  for (const u of units) u.len = Math.max(...u.els.map(e => e.len));
  return units;
}

/* Lay a run of units across a window of progress: a long cornice visibly
   travels while a short tick lands quickly, consecutive strokes overlap, and
   the phase closes exactly on `to`. Within a unit the pieces take the window
   one after another, in proportion to their length: one pen per unit. */
function allocate(units, from, to) {
  const span = to - from, lead = span * .74;
  const w = units.map(u => Math.pow(Math.max(u.len, 1), .55));
  const total = w.reduce((a, b) => a + b, 0) || 1;
  let cum = 0;
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    u.start = from + (cum / total) * lead;
    u.span = Math.max((w[i] / total) * lead * 2.1, span * .1);
    cum += w[i];
  }
  const end = Math.max(...units.map(u => u.start + u.span), from + 1);
  const k = span / (end - from);
  for (const u of units) {
    u.start = from + (u.start - from) * k;
    u.span *= k;
    const sum = u.els.reduce((a, e) => a + e.len, 0) || 1;
    let c = 0;
    for (const e of u.els) {
      e.start = u.start + u.span * (c / sum);
      e.span = Math.max(u.span * (e.len / sum), 1e-4);
      c += e.len;
    }
  }
}

function layout(strokes) {
  const guides = strokes.filter(s => s.guide);
  const build = strokes.filter(s => !s.guide);
  /* the construction frame, over its authored windows; the ruled grid is the
     paper and is simply there on the first frame */
  const windows = new Map();
  for (const s of guides) {
    if (s.cls === 'bx-grid') { s.instant = true; s.start = 0; s.span = 1; continue; }
    if (s.sheet) { s.start = s.a; s.span = Math.max(s.b - s.a, 1); continue; }
    const key = `${s.a}:${s.b}`;
    if (!windows.has(key)) windows.set(key, []);
    windows.get(key).push(s);
  }
  for (const [key, list] of windows) {
    const [a, b] = key.split(':').map(Number);
    allocate(toUnits(list), a, b);
  }
  allocate(toUnits(build.filter(s => s.cls === 's')), ...OUTLINE);
  allocate(toUnits(build.filter(s => s.cls === 'f')), ...FORMS);
  allocate(toUnits(build.filter(s => s.cls === 'd')), ...FINE);
  return strokes.map(({ d, m, cls, guide, sheet, instant = false, start, span, len }) =>
    ({ d, m, cls, guide, sheet, instant, start, span, len: len + .75 }));
}

export class BrindavanaPreloader {
  constructor(root = document.getElementById('preloader')) {
    this.root = root;
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.target = 0;
    this.finished = new Promise(res => { this._resolve = res; });
    /* resolves when the hand has finished: the heavy world work may begin */
    this.drawn = new Promise(res => { this._drawnRes = res; });

    /* a reload in the same session gets a brief pass, not the full ceremony */
    let seen = false;
    try { seen = sessionStorage.getItem('antaranga-drawn') === '1'; } catch (e) {}
    this.swift = seen;
    if (this.reduced) root.classList.add('reduced');

    const svg = root.querySelector('svg');
    const vb = svg.viewBox.baseVal;
    const data = { w: vb.width, h: vb.height, strokes: layout(readStrokes(svg)) };
    svg.remove();                              // the source is read; only the canvas paints

    const mark = root.querySelector('.pre-mark');
    const newCanvas = () => {
      if (this.canvas) this.canvas.remove();
      this.canvas = document.createElement('canvas');
      this.canvas.setAttribute('aria-hidden', 'true');
      mark.appendChild(this.canvas);
      return this.canvas;
    };
    newCanvas();

    const onMsg = (m) => {
      if (m.type === 'waiting') root.classList.toggle('waiting', m.on);
      else if (m.type === 'drawn') { if (this._drawnRes) { this._drawnRes(); this._drawnRes = null; } }
      else if (m.type === 'held') { root.style.setProperty('--hold', `${m.ms}ms`); root.classList.add('held'); }
      else if (m.type === 'cleared') { this.stats = { ...m.stats, ms: m.ms }; this.exit(); }
    };
    const size = () => {
      const r = this.canvas.getBoundingClientRect();
      return { w: r.width, h: r.height, dpr: Math.min(window.devicePixelRatio || 1, 2.5) };
    };
    this.size = size;
    const opts = { reduced: this.reduced, swift: this.swift };

    /* the page draws it: same engine, rAF plus a timer so a throttled tab
       still finishes */
    const onPage = () => {
      if (this.worker) { this.worker.terminate(); this.worker = null; }
      const engine = createDrafting(newCanvas().getContext('2d'), data, { ...opts, post: onMsg });
      engine.setTarget(this.target);
      const s = size();
      engine.resize(s.w, s.h, s.dpr);
      let alive = true, lastStep = 0;
      const tick = () => { lastStep = performance.now(); alive = engine.step(); };
      const loop = () => { if (!alive) return; tick(); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
      this.timer = setInterval(() => {
        if (!alive) return clearInterval(this.timer);
        if (performance.now() - lastStep > 90) tick();
      }, 60);
      this.send = (m) => {
        if (m.type === 'target') engine.setTarget(m.p);
        else if (m.type === 'resize') engine.resize(m.w, m.h, m.dpr);
      };
    };

    /* normally a worker owns the canvas, so the hand keeps its frames while
       this thread is busy */
    const canWorker = typeof Worker !== 'undefined' && 'transferControlToOffscreen' in this.canvas;
    if (canWorker) {
      try {
        const s = size();
        const off = this.canvas.transferControlToOffscreen();
        this.worker = new Worker(new URL('./preloader-worker.js', import.meta.url), { type: 'module' });
        this.worker.onmessage = (e) => onMsg(e.data);
        this.worker.onerror = () => { if (!this.exiting) onPage(); };
        this.worker.postMessage({ type: 'init', canvas: off, data, ...opts, ...s }, [off]);
        this.send = (m) => this.worker.postMessage(m);
      } catch (e) {
        onPage();
      }
    } else {
      onPage();
    }
    window.addEventListener('resize', this._onResize = () => this.send({ type: 'resize', ...size() }));

    /* never trap the visitor: if the world fails to report, finish anyway */
    this.watchdog = setTimeout(() => this.setTarget(1), 20000);
    requestAnimationFrame(() => root.classList.add('plotted'));
  }

  /* real progress 0..1, monotonic. The hand's last strokes wait on this. */
  setTarget(p) {
    const next = Math.max(this.target, Math.min(1, p));
    if (next === this.target) return;
    this.target = next;
    this.send({ type: 'target', p: next });
    /* the world is ready: whatever happens to the drawing, the visitor is
       never kept behind the sheet for long */
    if (next >= 1 && !this.readyGuard) this.readyGuard = setTimeout(() => this.exit(), 4000);
  }

  async exit() {
    if (this.exiting) return;
    this.exiting = true;
    clearTimeout(this.watchdog);
    clearTimeout(this.readyGuard);
    try { sessionStorage.setItem('antaranga-drawn', '1'); } catch (e) {}
    /* the sheet lifts away like a page, the world underneath */
    this.root.classList.add('done');
    this._resolve();
    await wait(PRELOADER_TIMING.exit + .1);
    window.removeEventListener('resize', this._onResize);
    if (this.worker) this.worker.terminate();
    this.root.remove();
  }
}
