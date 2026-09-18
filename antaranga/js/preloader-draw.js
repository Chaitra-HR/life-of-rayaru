// ANTARANGA · the drafting engine behind BrindavanaPreloader.
// Pure canvas-2D: it knows nothing of the DOM, so the same code runs inside a
// worker on an OffscreenCanvas (the normal case: the drawing keeps its frames
// while the main thread parses three.js and builds the world) and, where
// workers cannot draw, on the page itself.
//
// Input is the preloader SVG already measured and laid out by preloader.js:
// one record per stroke with its path data, transform, class, length and its
// window in progress space. Lines are DRAWN (a dash advanced along the path),
// never faded; only the ruled paper and the proportion diagonals fade.

/* the palette of the sheet: rust ink on warm paper */
export const INK = [201, 164, 104];   // the drawing hue (css --gopi): the deepas' gold on the night's charcoal

/* [alpha, width] per class; build strokes have a working and an inked state */
const GUIDE = {
  'bx-grid':  [.13, .6,  [3, 6]],
  'bx-dot':   [.16, .6,  [2, 7]],
  'bx-frame': [.42, .7],
  'bx-guide': [.30, .6],
  'bx-axis':  [.44, .7],
  'bx-arc':   [.30, .6],
  'bx-tick':  [.40, .7],
  'bx-node':  [.44, .7],
};
const BUILD = {            // working → inked
  s: [[.46, 1.3], [.92, 1.35]],
  f: [[.40, 1.15], [.80, 1.25]],
  d: [[.30, 1.1], [.62, 1.15]],
};
const SETTLE = new Set(['bx-tick', 'bx-node', 'bx-guide']);
const CLEAR = new Set(['bx-grid', 'bx-dot', 'bx-axis', 'bx-arc', 'bx-frame']);

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const ease = t => 1 - Math.pow(1 - t, 2.4);            // a stroke sets out briskly, lands softly
const smooth = t => t * t * (3 - 2 * t);

export function createDrafting(ctx, data, opts = {}) {
  const { reduced = false, swift = false, now = () => performance.now(), post = () => {} } = opts;
  const strokes = data.strokes.map(s => ({ ...s, path: new Path2D(s.d), doneAt: -1 }));
  let W = 0, H = 0, dpr = 1;

  /* the pace (19 Sept 2026): the hand follows the REAL load. Its cap is the
     progress the page reports (modules, fonts, the world built, the stone
     maps, the first render); a slow floor clock keeps it moving through the
     stretches where the main thread is blocked building and can report
     nothing, up to HOLD, where the carved detail waits for the world. The
     moment the world is ready the remaining strokes land at speed, the
     working marks withdraw, and the sheet lifts: no pose, no dead time. */
  const DRAFT_S = swift ? 1.1 : 5.0;
  const HOLD = 90;
  let target = 0, shown = 0, v = 0, t0 = -1, last = -1, pauseUntil = 0;
  const breaths = swift ? [] : [{ at: 26, hold: 140 }, { at: 60, hold: 170 }, { at: 84, hold: 120 }];
  let lastGrow = 0, waiting = false, finishing = -1, settledAt = -1, clearedAt = -1, heldAt = -1;
  /* a beat, not a pose: the finished Brindavana is seen for a moment before the sheet lifts */
  const HOLD_MS = swift ? 120 : 200;
  let state = 'draw';
  /* frame pacing while the hand moves, for ?hud and review */
  const stats = { frames: 0, slow: 0, maxGap: 0 };

  function resize(cssW, cssH, ratio) {
    W = cssW; H = cssH; dpr = ratio;
    ctx.canvas.width = Math.max(1, Math.round(W * dpr));
    ctx.canvas.height = Math.max(1, Math.round(H * dpr));
  }

  function setTarget(p) {
    const n = Math.max(target, Math.min(1, p) * 100);
    if (n > target) lastGrow = now();
    target = n;
  }

  function step() {
    const tNow = now();
    if (t0 < 0) { t0 = last = lastGrow = tNow; }
    if (state === 'draw' && last > 0) {
      const gap = tNow - last;
      stats.frames++; if (gap > 34) stats.slow++; if (gap > stats.maxGap) stats.maxGap = Math.round(gap);
    }
    const dt = Math.min(.1, (tNow - last) / 1000);
    last = tNow;

    if (state === 'draw') {
      if (reduced) shown = target >= 100 ? 100 : 0;
      else if (tNow >= pauseUntil) {
        const elapsed = (tNow - t0) / 1000;
        const clock = Math.min(HOLD, (elapsed / DRAFT_S) * HOLD);
        const cap = target >= 100 ? 100 : Math.max(Math.min(target, 100), clock);
        const gap = Math.max(0, cap - shown);
        /* once the world is ready the hand no longer dawdles: the rest of the drawing lands in well under a second */
        const ready = target >= 100;
        const want = gap > 0 ? Math.min(Math.max(gap * (ready ? 4 : 2.4), 6), ready ? 160 : swift ? 90 : 42) : 0;
        v += (want - v) * (1 - Math.exp(-(ready ? 12 : 7) * dt));
        shown = Math.min(cap, shown + v * dt);
        if (!ready) for (const b of breaths) {
          if (!b.done && shown >= b.at) { b.done = true; v *= .15; pauseUntil = tNow + b.hold; break; }
        }
      }
      const stalled = shown >= HOLD - .5 && target < 100 && tNow - lastGrow > 1600;
      if (stalled !== waiting) { waiting = stalled; post({ type: 'waiting', on: waiting }); }
      if (shown >= 99.95) { state = 'finish'; finishing = tNow; waiting = false; post({ type: 'waiting', on: false }); }
    } else if (state === 'finish') {
      /* the last strokes land, then the working marks withdraw in two beats */
      const k = (tNow - finishing) / 1000;
      shown = 100 + clamp01(k / .3) * 14;
      if (k > .34 && settledAt < 0) { settledAt = tNow; post({ type: 'drawn' }); }
      if (settledAt > 0 && tNow - settledAt > (swift ? 100 : 160) && clearedAt < 0) clearedAt = tNow;
      /* the construction has gone: only the Brindavana stands on the sheet, for a beat */
      if (clearedAt > 0 && tNow - clearedAt > 320 && heldAt < 0) { heldAt = tNow; post({ type: 'held', ms: HOLD_MS }); }
      if (heldAt > 0 && tNow - heldAt > HOLD_MS) { state = 'done'; post({ type: 'cleared', stats, ms: Math.round(tNow - t0) }); }
    }
    paint(tNow);
    return state !== 'done';
  }

  function paint(tNow) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const k = Math.min(W / data.w, H / data.h) * dpr;
    const ox = (W * dpr - data.w * k) / 2, oy = (H * dpr - data.h * k) / 2;
    const fadeSettle = settledAt > 0 ? 1 - smooth(clamp01((tNow - settledAt) / 650)) : 1;
    const fadeClear = clearedAt > 0 ? 1 - smooth(clamp01((tNow - clearedAt) / 700)) : 1;
    const breathe = waiting ? .82 + .18 * Math.cos((tNow / 1000) * Math.PI * 2 / 2.8) : 1;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    for (const s of strokes) {
      const local = s.instant ? 1 : clamp01((shown - s.start) / s.span);
      if (local <= 0) continue;
      let alpha, width, dash = null, drawn = -1;
      if (s.guide) {
        const g = GUIDE[s.cls] || GUIDE['bx-guide'];
        alpha = g[0]; width = g[1];
        if (s.sheet) { dash = g[2] || null; if (!s.instant) alpha *= local; }
        alpha *= SETTLE.has(s.cls) ? fadeSettle : CLEAR.has(s.cls) ? fadeClear : 1;
        if (alpha <= .002) continue;
      } else {
        const [work, ink] = BUILD[s.cls] || BUILD.f;
        if (local >= 1 && s.doneAt < 0) s.doneAt = tNow;
        const m = s.doneAt < 0 ? 0 : reduced || heldAt > 0 ? 1 : smooth(clamp01((tNow - s.doneAt) / 800));
        alpha = (work[0] + (ink[0] - work[0]) * m) * breathe;
        width = work[1] + (ink[1] - work[1]) * m;
      }
      if (!s.sheet && local < 1) {
        drawn = s.len * ease(local);
        /* never a bare dot: a line appears once it is long enough to read */
        if (drawn < Math.min(2, s.len * .5)) continue;
      }
      ctx.setTransform(k, 0, 0, k, ox, oy);
      if (s.m) ctx.transform(s.m[0], s.m[1], s.m[2], s.m[3], s.m[4], s.m[5]);
      if (drawn >= 0) { ctx.setLineDash([drawn, s.len + 4]); ctx.lineDashOffset = 0; }
      else ctx.setLineDash(dash || []);
      ctx.strokeStyle = `rgba(${INK[0]},${INK[1]},${INK[2]},${alpha.toFixed(3)})`;
      ctx.lineWidth = width;
      ctx.stroke(s.path);
    }
  }

  return { resize, setTarget, step, get done() { return state === 'done'; } };
}
