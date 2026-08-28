// ANTARANGA · BrindavanaPreloader
// An architectural drafting of the Brindavana. The sheet is ruled, the
// construction geometry is struck, the outer architectural outline is traced
// to completion, and only then are the interior forms and the carved detail
// drawn into it.
//
// Two rules govern the whole component:
//
//   1 · The sheet opens BLANK. Every animated path is measured and closed
//       behind a full-length dash before the SVG is ever made visible, and the
//       animation only begins on the frame after that. There is no state in
//       which part of the artwork is showing before the drawing starts.
//
//   2 · Lines are DRAWN, not faded. The dash is advanced numerically every
//       frame rather than handed to a CSS transition, so the drawing is a
//       direct function of real load progress, cannot be flattened by a
//       browser that throttles transitions, and is inspectable at any instant.
//       Nothing in the illustration uses opacity to imitate being drawn.

export const PRELOADER_TIMING = {
  drafting: 3.2,    // the full drawing, in seconds — brisk is confident
  complete: 0.4,    // the last strokes land
  settle: 0.3,      // stage 1 — measurement guides withdraw
  clear: 0.32,      // stage 2 — grid, dotted paths, axes withdraw
  hold: 0.18,       // the finished drawing, alone
  exit: 0.6,        // into the first scene
};

/* the drawing in progress-space: construction, then outline, then detail */
const OUTLINE = [27, 60];    // the main architectural outline, start to finish
const FORMS   = [60, 84];    // the interior forms it encloses — only after it
const FINE    = [84, 100];   // the carved detail, last

const wait = (s) => new Promise(r => setTimeout(r, s * 1000));
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
/* a drawn stroke sets out briskly and decelerates into its end point */
const draw = t => 1 - Math.pow(1 - t, 2.4);

/* A path holding several disconnected pieces cannot be dash-drawn as one line:
   the sweep lights its pieces one after another, scattered across the sheet,
   which reads as debris rather than draughtsmanship. Each piece is given its
   own path so the set can be drawn together — genuinely drawn, never faded. */
let setId = 0;
function splitCompounds(svg) {
  for (const p of [...svg.querySelectorAll('path')]) {
    /* the ruled grid and the dotted proportion lines carry a dash pattern of
       their own — they are the paper, not the drawing */
    if (p.classList.contains('bx-grid') || p.classList.contains('bx-dot')) continue;
    const d = p.getAttribute('d') || '';
    if (d.includes('m')) continue;                    // relative moveto: leave alone
    const pieces = d.split(/(?=M)/).map(s => s.trim()).filter(Boolean);
    if (pieces.length < 2) continue;
    p.dataset.set = `s${++setId}`;
    p.setAttribute('d', pieces[0]);
    let after = p;
    for (let i = 1; i < pieces.length; i++) {
      const clone = p.cloneNode(false);
      clone.setAttribute('d', pieces[i]);
      after.after(clone);
      after = clone;
    }
  }
}

/* consecutive paths cut from one original are one unit and travel together */
function toUnits(paths) {
  const units = [];
  let cur = null;
  for (const p of paths) {
    const key = p.dataset.set;
    if (cur && key && cur.key === key) cur.els.push(p);
    else units.push(cur = { key, els: [p] });
  }
  for (const u of units) u.len = Math.max(...u.els.map(e => (e.__len = e.getTotalLength())));
  return units;
}

/* Lay a run of units across a window of progress. A long cornice visibly
   travels while a short tick lands quickly, and consecutive strokes overlap,
   so the hand is always moving and the phase finishes exactly on `to`. */
function allocate(units, from, to) {
  const span = to - from;
  const lead = span * 0.74;                        // where the last stroke starts
  const w = units.map(u => Math.pow(Math.max(u.len, 1), 0.55));
  const total = w.reduce((a, b) => a + b, 0) || 1;
  let cum = 0;
  units.forEach((u, i) => {
    u.start = from + (cum / total) * lead;
    const share = (w[i] / total) * lead;
    u.span = Math.max(share * 2.1, span * 0.1);
    cum += w[i];
  });
  /* stretch the run so the phase closes exactly on `to`: the last stroke of the
     outline lands the instant the outline is finished, and the detail does not
     begin before then */
  const end = Math.max(...units.map(u => u.start + u.span), from + 1);
  const k = span / (end - from);
  for (const u of units) {
    u.start = from + (u.start - from) * k;
    u.span *= k;
  }
  return units;
}

export class BrindavanaPreloader {
  constructor(root = document.getElementById('preloader')) {
    this.root = root;
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.svg = root.querySelector('svg');

    this.shown = 0;    // displayed progress, smoothed
    this.target = 0;   // real asset-loading progress
    this.done = false;
    this.started = false;
    this._resolve = null;
    this.finished = new Promise(res => { this._resolve = res; });
    /* resolves when the hand has essentially finished — the cue for the heavy
       world-building to begin on a still image, where its blocks cost nothing */
    this._drawnRes = null;
    this.drawn = new Promise(res => { this._drawnRes = res; });
    /* resolves when the world reports built — only the exit waits on it */
    this._readyRes = null;
    this.ready = new Promise(res => { this._readyRes = res; });

    this.v = 0;            // the hand's current speed, in progress units/s
    this.pauseUntil = 0;   // a breath in progress

    /* the full ceremony belongs to the first visit of a session; a visitor
       reloading the page is shown a brief pass, not made to sit through it */
    let seen = false;
    try { seen = sessionStorage.getItem('antaranga-drawn') === '1'; } catch (e) {}
    this.swift = seen;
    this.tempo = seen ? 2.4 : 1;

    /* a beat of stillness at each boundary — the draughtsman pauses to assess */
    this.breaths = seen ? [] : [
      { at: 26, hold: .18, done: false },   // the construction frame is ruled
      { at: 60, hold: .22, done: false },   // the outline closes
      { at: 84, hold: .16, done: false },   // the forms sit; the fine detail
    ];

    /* never trap the visitor: if the world fails to report, the drawing
       completes on its own and the site is revealed as it stands */
    this.watchdog = setTimeout(() => {
      if (this.target < 100) this.setTarget(1);
    }, 18000);

    if (this.reduced) this.root.classList.add('reduced');


    splitCompounds(this.svg);
    this.strokes = [];

    /* --- the construction frame, over its authored windows --------------- */
    for (const grp of this.svg.querySelectorAll('#pre-guides g[data-a]')) {
      const a = parseFloat(grp.dataset.a);
      const b = parseFloat(grp.dataset.b);
      const ps = [...grp.querySelectorAll('path')];
      const sheet = ps.filter(p => p.classList.contains('bx-grid') || p.classList.contains('bx-dot'));
      const drawn = ps.filter(p => !sheet.includes(p));
      for (const p of sheet) {
        /* The ruled grid IS the paper: it is simply there on the first visible
           frame, at full strength, before anything is drawn on it. Only the
           dotted proportion diagonals arrive later, on the drawing's own
           clock (their transition is cleared so paint() is the authority). */
        const grid = p.classList.contains('bx-grid');
        p.style.transition = 'none';
        p.style.opacity = grid ? '1' : '0';
        this.strokes.push({ p, start: a, span: Math.max(b - a, 1), len: 0,
          isGuide: true, sheet: true, instant: grid, inked: true, over: grid });
      }
      for (const u of allocate(toUnits(drawn), a, b)) this.arm(u, true);
    }

    /* --- the structure: outline to completion, then what it encloses ----- */
    const build = [...this.svg.querySelectorAll('#pre-build path')];
    const outline = build.filter(p => p.classList.contains('s'));
    const fine    = build.filter(p => p.classList.contains('d'));
    const forms   = build.filter(p => !p.classList.contains('s') && !p.classList.contains('d'));
    for (const u of allocate(toUnits(outline), ...OUTLINE)) this.arm(u, false);
    for (const u of allocate(toUnits(forms),   ...FORMS))   this.arm(u, false);
    for (const u of allocate(toUnits(fine),    ...FINE))    this.arm(u, false);

    /* every line is now closed behind its own dash — safe to reveal the layer */
    this.root.classList.add('armed');

    this.t0 = performance.now();
    this.last = this.t0;
    this.lastStep = this.t0;
    requestAnimationFrame(() => root.classList.add('plotted'));
    setTimeout(() => root.classList.add('plotted'), 60); // rAF-suspended fallback

    /* the blank sheet is painted first; the hand starts on the NEXT frame */
    const begin = () => {
      if (this.started || this.done) return;
      this.started = true;
      this.t0 = this.last = this.lastStep = performance.now();
      const loop = () => {
        if (this.done) return;
        this.step();
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
      /* rAF where it runs, a timer where it does not — the drawing must advance
         either way, so it is never left half-built on a throttled tab */
      this.timer = setInterval(() => {
        if (this.done) return;
        if (performance.now() - this.lastStep > 90) this.step();
      }, 60);
    };
    this.raf = 0;
    requestAnimationFrame(() => requestAnimationFrame(begin));
    setTimeout(begin, 80);
  }

  /* Close one unit behind its dash — or finish it outright for reduced motion.
     A unit split out of a compound path holds several disconnected pieces.
     They take the unit's window SEQUENTIALLY, each piece's share proportional
     to its own length: one pen per unit. A line extends from its start point,
     completes, and only then does the next piece begin — pieces of one unit
     never grow in different corners of the sheet at the same time, which is
     what made the whole structure look half-drawn. */
  arm(u, isGuide) {
    const total = u.els.reduce((a, e) => a + (e.__len != null ? e.__len : (e.__len = e.getTotalLength())), 0) || 1;
    let cum = 0;
    for (const p of u.els) {
      const userLen = p.__len;
      const start = u.start + u.span * (cum / total);
      const span = Math.max(u.span * (userLen / total), 1e-4);
      cum += userLen;
      /* User units, straight from getTotalLength(): exact by spec at every
         scale, zoom and pixel density. (vector-effect: non-scaling-stroke was
         removed from these paths — it made the dash resolve in rendered
         pixels, which no CSS-pixel measurement can match on a scaled display,
         and every stroke leaked its tail.) A whisker of pad keeps the hidden
         state clear of the path's end against renderer rounding. */
      const len = userLen + .75;
      if (this.reduced) {
        p.style.strokeDasharray = 'none';
        p.style.strokeDashoffset = '0';
        p.style.opacity = '1';
        if (!isGuide) p.classList.add('ink');
      } else {
        p.style.strokeDasharray = `${len}`;
        p.style.strokeDashoffset = `${len}`;
        /* colour and weight still ease; only the dash is driven by hand */
        p.style.transition = 'stroke .7s ease, stroke-width .7s ease';
      }
      this.strokes.push({ p, start, span, len, userLen, isGuide,
        sheet: false, instant: false, inked: !!this.reduced, over: !!this.reduced });
    }
  }


  /* real progress 0..1 — monotonic, never faked past the truth */
  setTarget(p) {
    this.target = Math.max(this.target, Math.min(1, p) * 100);
    if (this.target >= 100 && this._readyRes) { this._readyRes(); this._readyRes = null; }
  }

  step() {
    if (this.done || !this.started) return;
    const now = performance.now();
    this.lastStep = now;

    const dt = Math.min(.25, (now - this.last) / 1000);
    this.last = now;

    if (now < this.pauseUntil) { this.paint(); return; }

    /* The hand is never gated on the load. The world is fetched while the
       drawing is made and built on the finished image afterwards, so the
       drawing simply completes — and the construction geometry withdraws the
       moment it is done, not after the world is ready. The hand carries
       MOMENTUM: speed eases toward what the remaining distance calls for,
       so it glides into the finish instead of stopping dead. */
    const gap = 100 - this.shown;
    const cap = (100 / PRELOADER_TIMING.drafting) * this.tempo;
    const floor = Math.max(1.4, 2.5 * clamp01(gap / 6));
    const want = gap > 0 ? Math.min(Math.max(gap * 2.6, floor) * this.tempo, cap) : 0;
    this.v += (want - this.v) * (1 - Math.exp(-6 * dt));
    this.shown = Math.min(100, this.shown + this.v * dt);

    /* a breath at each phase boundary */
    for (const b of this.breaths) {
      if (!b.done && this.shown >= b.at) {
        b.done = true;
        this.v = 0;
        this.pauseUntil = now + b.hold * 1000;
        break;
      }
    }

    this.paint();

    if (this.shown >= 99.95) {
      this.done = true;
      cancelAnimationFrame(this.raf);
      clearInterval(this.timer);
      this.finish();
    }
  }

  /* the dash of every line, straight from progress */
  paint(force = null) {
    const at = force == null ? this.shown : force;
    for (const s of this.strokes) {
      if (s.instant || s.over) continue;
      const local = clamp01((at - s.start) / s.span);
      if (local <= 0) continue;
      if (s.sheet) {                              // grid and dotted proportions
        s.p.style.opacity = `${local}`;
        if (local >= 1) s.over = true;
        continue;
      }
      /* Never paint a sub-2-unit sliver: with round caps the first instants
         of a stroke render as a bare dot at its start point. The line only
         appears once it is long enough to read as a line. */
      const drawn = s.len * draw(local);
      if (local < 1 && drawn < Math.min(2, s.len * .5)) continue;
      s.p.style.strokeDashoffset = (s.len - drawn).toFixed(2);
      if (local >= 1) {
        s.p.style.strokeDasharray = 'none';
        s.over = true;
        if (!s.inked && !s.isGuide) { s.inked = true; s.p.classList.add('ink'); }
      }
    }
  }

  async finish() {
    try { sessionStorage.setItem('antaranga-drawn', '1'); } catch (e) {}
    if (this.reduced) {
      if (this._drawnRes) { this._drawnRes(); this._drawnRes = null; }
      await this.ready;
      clearTimeout(this.watchdog);
      this.root.classList.add('done');
      await wait(.4);
      this.root.remove();
      this._resolve();
      return;
    }
    /* run the drawing past its end so every last stroke lands */
    const t0 = performance.now();
    await new Promise(res => {
      const settleLoop = () => {
        const k = clamp01((performance.now() - t0) / (PRELOADER_TIMING.complete * 1000));
        this.paint(100 + k * 12);
        if (k >= 1) return res();
        requestAnimationFrame(settleLoop);
      };
      requestAnimationFrame(settleLoop);
      setTimeout(res, PRELOADER_TIMING.complete * 1000 + 260); // if rAF is asleep
    });
    this.paint(140);   // absolute guarantee: every line complete and inked
    for (const s of this.strokes) {
      if (s.sheet || s.instant) {
        /* hand the sheet back to the stylesheet: inline opacity was pinning
           the grid on screen through the very fades meant to remove it */
        s.p.style.transition = '';
        s.p.style.opacity = '';
      } else {
        s.p.style.strokeDasharray = 'none';
        s.p.style.strokeDashoffset = '0';
      }
      if (!s.inked && !s.isGuide) { s.inked = true; s.p.classList.add('ink'); }
    }

    /* the completion choreography, briefer still on a swift pass */
    const k = this.swift ? .55 : 1;
    await wait(.12 * k);
    /* 1 · the measurement guides withdraw */
    this.root.classList.add('settled');
    await wait(PRELOADER_TIMING.settle * k);
    /* 2 · the grid, the dotted paths and the axes withdraw — and the world
       may build now: the drawing is done, only the sheet is fading */
    this.root.classList.add('cleared');
    if (this._drawnRes) { this._drawnRes(); this._drawnRes = null; }
    await wait(PRELOADER_TIMING.clear * k);
    /* 3 · only the completed Brindavana, one step forward */
    this.root.classList.add('grown');
    /* 4 · hold */
    await wait(PRELOADER_TIMING.hold * k);
    await this.ready;
    clearTimeout(this.watchdog);
    /* 5 · into the first scene */
    this.root.classList.add('done');
    await wait(PRELOADER_TIMING.exit + .1);
    this.root.remove();
    this._resolve();
  }
}
