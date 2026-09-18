// RAYARA ANTARANGA · Pūrvāśrama editorial layer (scenes 01–03)
//
// One HTML/CSS layer over the house world, driven by global t: the chapter
// cover, then one passage at a time in the site's narrative column: the
// Akṣarābhyāsa told in four beats (the setting, the syllable itself, the
// question, and what it meant), then the years of study, the household,
// Kumbakonam and the Matha. The copy is REAL TEXT, same as every caption on
// the site, so it can be selected and copied. `#purva` itself is inert
// (pointer-events: none, so the layer never eats a scroll); each block that
// is actually on screen takes the cursor back, exactly the way `.cap` does.
//
// Everything here is a function of t, so scrolling back replays in reverse.
// Copy lives in index.html and is its only source; this file has no words.
import { remap, smooth, win } from './util.js';

/* the narrative beats: [a, b] in global t, one at a time, one column.
   Each is long enough to be read on a phone before it leaves: nothing
   here lives for less than about a viewport of scroll. The Akṣarābhyāsa
   gets the most room of all, and the camera holds on the written sand
   for the whole of it (purvashrama.js camIn). */
export const BEATS = [
  { a: .1265, b: .1420, id: 'aksara' },       // the setting: father, earth, the syllable written
  { a: .1435, b: .1560, id: 'om' },           // the syllable itself, noticed
  { a: .1575, b: .1740, id: 'question' },     // the child's question
  { a: .1755, b: .1880, id: 'astonished' },   // what it meant
  { a: .1915, b: .2085, id: 'education' },
  { a: .2105, b: .2300, id: 'household' },    // marriage, the son, the years of almost nothing: one beat
  { a: .2330, b: .2560, id: 'kumbhakonam' },
  { a: .2580, b: .2705, id: 'matha' },        // leaves before the seam: the hall is the next thing seen
];
export const COVER = { a: .0800, b: .1180 };   // the cover arrives once the yard has resolved out of the light
export const ZONE = { a: .0625, b: .282 };     // the window the chapter's copy owns
export const QUIET = { a: .108, b: .275 };     // …and where the global header steps back

export function createPurva({ reduced = false } = {}) {
  const root = document.getElementById('purva');
  const cover = root.querySelector('.pv-cover');
  const beats = BEATS.map(b => ({ ...b, el: root.querySelector(`[data-beat="${b.id}"]`), o: -1 })).filter(b => b.el);
  const body = document.body;
  let covState = '', quiet = null;

  /* a block is only selectable while it is legible: `visibility: hidden`
     releases the cursor on the way out, so a faded passage can never be
     dragged over or copied out of an empty screen */
  const live = (el, o) => {
    el.style.visibility = o <= 0 ? 'hidden' : 'visible';
    el.style.pointerEvents = o > .5 ? 'auto' : 'none';
  };

  return {
    update(t) {
      const zone = t > ZONE.a && t < ZONE.b;
      if (root.hidden === zone) root.hidden = !zone;
      if (!zone) {
        if (quiet !== false) { body.classList.remove('purva-quiet'); quiet = false; }
        return;
      }

      /* the global header steps back once the viewer is inside the house */
      const wantQuiet = t > QUIET.a && t < QUIET.b;
      if (wantQuiet !== quiet) { body.classList.toggle('purva-quiet', wantQuiet); quiet = wantQuiet; }

      /* ---- the cover: staged entrance, then a staged leave ---- */
      const state = t < COVER.a ? '' : t < .1015 ? 'pv-on' : t < COVER.b ? 'pv-on pv-leave' : '';
      if (state !== covState) {
        covState = state;
        cover.classList.toggle('pv-on', state.includes('pv-on'));
        cover.classList.toggle('pv-leave', state.includes('pv-leave'));
      }
      const covOp = win(t, COVER.a, COVER.a + .004, .108, COVER.b);
      cover.style.opacity = covOp.toFixed(3);
      live(cover, covOp);

      /* ---- the beats: one stable column, one passage at a time ---- */
      for (const b of beats) {
        const span = b.b - b.a;
        const fade = Math.min(span * .3, .006);
        const oIn = smooth(remap(t, b.a, b.a + fade));
        const o = oIn * (1 - smooth(remap(t, b.b - fade, b.b)));
        if (Math.abs(o - b.o) > .004 || (o === 0 && b.o !== 0)) {
          b.o = o;
          b.el.style.opacity = o.toFixed(3);
          live(b.el, o);
          if (!reduced) {
            const p = (t - b.a) / span;
            b.el.style.transform = `translateY(${((.5 - p) * 26 + (1 - oIn) * 16).toFixed(1)}px)`;
          }
          b.el.classList.toggle('pv-bon', o > .1);
        }
      }
    },
  };
}
