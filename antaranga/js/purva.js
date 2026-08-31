// RAYARA ANTARANGA · Pūrvāśrama editorial layer (scenes 01–03)
// One HTML/CSS layer over the house world: the chapter cover (label,
// headline, introduction, biographical strip, scroll cue), then one stable
// copy column that carries the narrative a single beat at a time. Everything
// is a function of global t; the masked reveals ride CSS transitions
// triggered from the same windows, so scrolling back replays them in
// reverse. Copy is the approved Pūrvāśrama text, verbatim.
import { remap, smooth, win } from './util.js';

/* the narrative beats: [a, b] in global t, one at a time, one column */
const BEATS = [
  { a: .1235, b: .1360, id: 'aksara' },
  { a: .1540, b: .1780, id: 'pranava' },
  { a: .1800, b: .1920, id: 'astonished' },
  { a: .1950, b: .2100, id: 'education' },
  { a: .2100, b: .2220, id: 'marriage' },
  { a: .2240, b: .2380, id: 'poverty' },
  { a: .2440, b: .2680, id: 'kumbhakonam' },
];
const Q = { a: .1375, b: .1520 };          // the central question
const COVER = { a: .0800, b: .1180 };      // the cover arrives once the pull-back has established the courtyard

export function createPurva({ reduced = false } = {}) {
  const root = document.getElementById('purva');
  const cover = root.querySelector('.pv-cover');
  const q = root.querySelector('.pv-q');
  const beats = BEATS.map(b => ({ ...b, el: root.querySelector(`[data-beat="${b.id}"]`), o: -1 }));
  const body = document.body;
  let covState = '', qOn = null, quiet = null;

  return {
    update(t) {
      const zone = t > .0625 && t < .302;
      if (root.hidden === zone) root.hidden = !zone;
      if (!zone) {
        if (quiet !== false) { body.classList.remove('purva-quiet'); quiet = false; }
        return;
      }

      /* the global header steps back once the viewer is inside the house */
      const wantQuiet = t > .108 && t < .295;
      if (wantQuiet !== quiet) { body.classList.toggle('purva-quiet', wantQuiet); quiet = wantQuiet; }

      /* ---- the cover: staged entrance, then a staged leave ---- */
      const state = t < COVER.a ? '' : t < .1015 ? 'pv-on' : t < COVER.b ? 'pv-on pv-leave' : '';
      if (state !== covState) {
        covState = state;
        cover.classList.toggle('pv-on', state.includes('pv-on'));
        cover.classList.toggle('pv-leave', state.includes('pv-leave'));
      }
      const covOp = win(t, COVER.a, COVER.a + .002, .108, COVER.b);
      cover.style.opacity = covOp.toFixed(3);
      cover.style.pointerEvents = covOp > .5 ? '' : 'none';

      /* ---- the question: the chapter's primary moment ---- */
      const qOp = reduced
        ? win(t, Q.a, Q.a + .003, Q.b - .003, Q.b)
        : win(t, Q.a, Q.a + .004, Q.b - .003, Q.b);
      const qActive = t > Q.a && t < Q.b;
      if (qActive !== qOn) { q.classList.toggle('pv-qon', qActive); qOn = qActive; }
      q.style.opacity = qOp.toFixed(3);
      q.style.pointerEvents = qOp > .5 ? '' : 'none';

      /* ---- the beats: one stable column, one passage at a time ---- */
      for (const b of beats) {
        const span = b.b - b.a;
        const fade = Math.min(span * .3, .006);
        const oIn = smooth(remap(t, b.a, b.a + fade));
        const o = oIn * (1 - smooth(remap(t, b.b - fade, b.b)));
        if (Math.abs(o - b.o) > .004 || (o === 0 && b.o !== 0)) {
          b.o = o;
          b.el.style.opacity = o.toFixed(3);
          b.el.style.visibility = o <= 0 ? 'hidden' : 'visible';
          b.el.style.pointerEvents = o > .5 ? '' : 'none';
          if (!reduced) {
            const p = (t - b.a) / span;
            b.el.style.transform = `translateY(${((.5 - p) * 30 + (1 - oIn) * 16).toFixed(1)}px)`;
          }
          b.el.classList.toggle('pv-bon', o > .1);
        }
      }
    },
  };
}
