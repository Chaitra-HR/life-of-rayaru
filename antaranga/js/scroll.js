// RAYARA ANTARANGA · global scroll timeline + editorial choreography
// One authoritative source of narrative progress: everything derives from t.
// Scroll is choreography, not navigation: copy travels with the scroll,
// beats overlap, and the movements are felt, never announced.
import { clamp01, damp, remap, smooth } from './util.js';

/* The non-negotiable narrative order. The names are editorial: the visitor
   sees place and date, never a chapter number. Array index is the routing
   chapter. */
export const CHAPTERS = [
  { id: 'c00', num: '00', name: 'Mantralaya',   a: 0.000, b: 0.070 },
  { id: 'c01', num: '01', name: 'Venkatanatha', a: 0.070, b: 0.150 },
  { id: 'c02', num: '02', name: 'Gṛhastha',     a: 0.150, b: 0.225 },
  { id: 'c03', num: '03', name: 'Kumbakonam',   a: 0.225, b: 0.275 },
  { id: 'c04', num: '04', name: 'Raghavendra',  a: 0.275, b: 0.370 },
  { id: 'c05', num: '05', name: 'The Works',    a: 0.370, b: 0.480 },
  { id: 'c06', num: '06', name: 'Tattvavāda',   a: 0.480, b: 0.560 },
  { id: 'c07', num: '07', name: 'The Journey',  a: 0.560, b: 0.655 },
  { id: 'c08', num: '08', name: 'Manchale',     a: 0.655, b: 0.725 },
  { id: 'c09', num: '09', name: 'Brindavana',   a: 0.725, b: 0.934 },
  { id: 'c10', num: '00', name: 'Return',       a: 0.934, b: 1.000 },
];

/* the movements: the flowing document between the two 3D worlds (index.html
   #movements) owns global t from DOC_A to DOC_B. Before it the opening runs
   on a spacer; after it the Brindavana and the return run on another. The
   document scrolls at its natural 1:1 speed, and t inside it is simply its
   scrolled fraction, so every t-driven thing (the ground, the interface ink,
   the fog waiting behind the ground) stays a pure function of scroll. */
export const DOC_A = .070, DOC_B = .725;
/* the tail (Brindavana Pravesha and the return) scrolls slower than the
   rest: more page per beat, so the layers are placed and the place comes
   back at a walking pace, never a state per wheel-tick */
export const TAIL = 1.6;
/* the story's top speed, in viewports of scroll per second (ScrollTimeline.update) */
export const PACE = 1.6;

export class ScrollTimeline {
  constructor({ pages = 52, reduced = false, doc = null, sp00 = null, sp09 = null } = {}) {
    this.spacer = document.getElementById('scroll-space');
    this.doc = doc; this.sp00 = sp00; this.sp09 = sp09;
    this.pages = pages;
    this.reduced = reduced;
    this.t = 0;          // smoothed
    this.raw = 0;        // instantaneous
    this.vel = 0;
    this.jump = null;    // an in-flight scroll jump (see scrollToY)
    this.free = 0;       // seconds left in which a jump (a section link) may move t at any speed
    this.inited = false;
    this.h = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    /* the document's height moves as fonts and covers land: re-measure */
    if (doc && 'ResizeObserver' in window) new ResizeObserver(() => this.resize()).observe(doc);
    // any real input hands control straight back to the visitor
    const cancel = () => { this.jump = null; };
    window.addEventListener('wheel', cancel, { passive: true });
    window.addEventListener('touchstart', cancel, { passive: true });
    window.addEventListener('keydown', (e) => {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(e.key)) cancel();
    });
  }
  /* the LAYOUT viewport, which iOS keeps stable while the toolbar slides.
     innerHeight changes mid-scroll on phones — mapping t through it made the
     whole world lurch with every toolbar collapse. */
  vh() { return document.documentElement.clientHeight || window.innerHeight; }
  resize() {
    const h = this.h = this.vh();
    /* the 3D chapters keep their scroll density: `pages` viewports for the
       whole of t, of which the opening takes DOC_A and the Brindavana and
       the return take 1 - DOC_B. px, not vh units: the spacers and the
       mapping must agree on the same height */
    const base = Math.max(1, (this.pages - 1) * h);
    if (this.doc) {
      this.L00 = DOC_A * base;
      this.L09 = (1 - DOC_B) * base * TAIL;
      this.sp00.style.height = `${Math.round(this.L00)}px`;
      /* the spacer ends where the story ends (t = 1): the footer follows in
         the same flow, and its own height is the run the camera settles over
         (main.js footerP). No dead viewport between them. */
      this.sp09.style.height = `${Math.round(this.L09)}px`;
      this.docH = Math.max(1, this.doc.offsetHeight);
      this.y0 = this.L00;                 // the document's top edge, in scroll px
      this.y1 = this.y0 + this.docH;      // its bottom edge
      this.max = this.y1 + this.L09;
    } else {
      this.max = base;
      this.spacer.style.height = `${this.pages * h}px`;
    }
  }
  /* scroll px → global t, and back */
  tAt(y) {
    if (!this.doc) return clamp01(y / this.max);
    if (y < this.y0) return clamp01(y / this.y0) * DOC_A;
    if (y < this.y1) return DOC_A + (y - this.y0) / this.docH * (DOC_B - DOC_A);
    return DOC_B + clamp01((y - this.y1) / this.L09) * (1 - DOC_B);
  }
  yAt(t) {
    t = clamp01(t);
    if (!this.doc) return t * this.max;
    if (t < DOC_A) return t / DOC_A * this.y0;
    if (t < DOC_B) return this.y0 + (t - DOC_A) / (DOC_B - DOC_A) * this.docH;
    return this.y1 + (t - DOC_B) / (1 - DOC_B) * this.L09;
  }
  update(dt) {
    // self-heal: viewport may have had no size when the page loaded
    // (hidden tab, collapsed pane) — recompute the scroll length live.
    if (Math.abs(this.vh() - this.h) > 1) this.resize();
    /* advance an in-flight jump. This rides the render loop rather than the
       browser's own smooth scrolling: `behavior: 'smooth'` is silently
       ignored in several embedded and background contexts, which left every
       section link and the opening CTA doing nothing at all. */
    if (this.jump) {
      const j = this.jump;
      j.el = Math.min(j.dur, j.el + dt);
      const u = j.el / j.dur;
      const e = u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      window.scrollTo(0, Math.round(j.from + (j.to - j.from) * e));
      if (u >= 1) this.jump = null;
    }
    this.raw = this.tAt(window.scrollY);
    /* the first frame stands where the page was opened (a reload mid-story), never a walk from the top */
    if (!this.inited) { this.inited = true; this.t = this.raw; }
    const prev = this.t;
    /* a damped glide: a flick of the thumb is absorbed, never a jump-cut.
       Near-instant when reduced motion is preferred. */
    const lambda = this.reduced ? 30 : 4.6;
    let next = damp(this.t, this.raw, lambda, dt);
    /* THE PACE (19 Sept 2026): the raw scroll never drives the story
       directly. However hard the wheel is thrown or the thumb flicked, t
       advances at most PACE viewports of scroll a second, so every beat, every
       camera move and every transition plays out at a walking pace; the native
       scroll runs on ahead and the world follows it there. A section link is
       a cut and is exempt while it flies, and for a moment after. */
    if (!this.reduced && this.free <= 0) {
      const slope = Math.abs(this.tAt(this.yAt(this.t) + this.h) - this.t) || 1e-3;   // t per viewport, at this point of the story
      const vmax = PACE * slope * dt;
      next = Math.max(this.t - vmax, Math.min(this.t + vmax, next));
    }
    this.free = Math.max(0, this.free - dt);
    this.t = next;
    if (Math.abs(this.t - this.raw) < 0.00004) this.t = this.raw;
    this.vel = (this.t - prev) / Math.max(dt, 1e-4);
    return this.t;
  }
  chapterAt(t = this.t) {
    for (let i = CHAPTERS.length - 1; i >= 0; i--) if (t >= CHAPTERS[i].a) return i;
    return 0;
  }
  scrollToY(to) {
    to = Math.round(to);
    const from = window.scrollY;
    if (this.reduced || Math.abs(to - from) < 4) {
      this.jump = null;
      window.scrollTo(0, to);
      return;
    }
    // longer jumps take a little longer, but never crawl
    const dur = Math.min(1.5, .45 + Math.abs(to - from) / this.max * 2.2);
    const j = this.jump = { from, to, dur, el: 0 };
    this.free = dur + .9;   // a link is a cut: the pace cap stands aside while it flies, and while the damping lands
    /* safety net: the render loop is paused whenever the document is hidden,
       and a queued jump would then sit still — the visitor would see a dead
       link. If nothing has advanced it shortly, just arrive. */
    setTimeout(() => {
      if (this.jump === j && j.el === 0) { this.jump = null; window.scrollTo(0, to); }
    }, 320);
  }
  scrollToChapter(i) {
    this.scrollToY(this.yAt(CHAPTERS[i].a + 0.004));
  }
}

/* ---------------- editorial choreography ----------------
   Each caption: { a, b, pos, html, drift? }.
     a, b   — its life in global t. Every beat is given room: on the phone
              a passage has to be read before the next arrives, and a short
              swipe must never skip one, so nothing here lives for less than
              about one viewport of scroll (pages: 52 desktop / 48 phone,
              so one viewport is ~.02 t).
     pos    — ONE reading position for the whole story: the narrative column
              (left third on desktop, lower-middle on a phone). The only
              break is a name or a number held in the centre of the frame
              (`pos-center`): the great word, in the world.
     drift  — how far the block travels with the scroll during its life
              (1 = default glide; large slow words use less). Under reduced
              motion nothing drifts.
   Three registers, and nothing else: the great word (pos-center, display),
   the reading column (t-loc eyebrow + t-sub / t-body), and the annotation
   (t-anno). No chapter numbers, no counters, no edge markers: the visitor
   is given place and date, and the story.
   The history is not altered — but it is TOLD, not cited: no line hands the
   reader a source in the middle of a scene. Where something belongs to the
   tradition rather than the record, the telling carries it ("the answer
   came to him in a dream"). */
export const CAPTIONS = [

  /* ══ 01–08 · THE CHAPTERS ═════════════════════════════════════════
     Everything between the opening and the Brindavana is the page itself
     (index.html #movements, js/movements.js): eight chapters over the
     river at night. Nothing from that span is authored here. */

  /* ══ 09 · BRINDAVANA PRAVESHA ═══════════════════════════════════════
     ONE story in ONE world (river.js → pravesha.js): the day breaks over
     Manchale, the bank is cut open and the camera goes down to the chamber,
     the layers come down into their places, the stone stands, the camera
     draws back out to the opening's own hold. Each block appears only while
     its layer is placed. The copy is the owner's, verbatim; the setting is
     the site's own (t-loc, t-q as the scene display, t-body). */
  { a: .7305, b: .7550, drift: .8, html: `
    <div class="t-loc">Brindavana Pravesha</div>
    <div class="t-q">The day of Brindavana Pravesha</div>
    <div class="t-body">With Manchale chosen and the Brindavana prepared, Rayaru was ready to enter it.</div>` },

  { a: .7855, b: .8100, html: `
    <div class="t-q">Rayaru within the chamber</div>
    <div class="t-body">On the day, Rayaru sat in dhyāna, reciting the Praṇava, with the Vyāsa Pīṭha and the mūla-granthas before him.</div>
    <div class="t-body">His disciples waited for the sign he had given them: when the japamālā in his hand became still, they were to begin placing the stone slabs.</div>` },

  { a: .8130, b: .8295, html: `
    <div class="t-q">The kūrmāsana</div>
    <div class="t-body">Above the chamber was placed the kūrmāsana, the stone slab associated with the form of a tortoise.</div>
    <div class="t-body">It marked the layer above the inner chamber and became the base for the sacred installations that followed.</div>` },

  { a: .8320, b: .8460, html: `
    <div class="t-q">The silver plate</div>
    <div class="t-body">Above the kūrmāsana was placed a rajata phalaka, a silver plate.</div>
    <div class="t-body">It formed the next layer between the chamber below and the sacred objects placed above.</div>` },

  { a: .8490, b: .8680, html: `
    <div class="t-q">The śāligrāmas</div>
    <div class="t-body">As the stone slabs rose above Rayaru, a copper box was placed within. Inside were 1,200 Lakṣmī-Nārāyaṇa śāligrāmas, brought from the Gaṇḍakī river. Then the final slabs were laid.</div>` },

  { a: .8710, b: .8900, html: `
    <div class="t-q">The stone</div>
    <div class="t-body">The slabs were cut from a black rock Rayaru had chosen himself.</div>
    <div class="t-body">Venkanna had already prepared another Brindavana, but Rayaru asked that it be kept for a future yatī. He pointed instead to this rock, saying Sri Rama had rested upon it while searching for Sita.</div>
    <div class="t-body">That was the stone he wanted around him.</div>` },

  { a: .8930, b: .9065, html: `
    <div class="t-q">The grain</div>
    <div class="t-body">Above the sacred earth came tene, ears of grain.</div>
    <div class="t-body">Another layer was added before the upper portion of the Brindavana was completed.</div>` },

  { a: .9090, b: .9260, html: `
    <div class="t-q">The deities above</div>
    <div class="t-body">At the uppermost level were installed the images of Śrī Lakṣmī Narasimha and Śrī Srinivasa.</div>
    <div class="t-body">From Rayaru seated in the chamber below to the sacred installations above, the Brindavana had taken its complete form.</div>` },

  /* ══ 00 · THE RETURN ════════════════════════════════════════════════
     The camera draws back out of the stone to the opening's hold: the
     place was the wider world all along. The last words settle, and the
     footer follows in the same scroll. */
  { a: .9450, b: .9670, drift: .7, html: `
    <div class="t-loc">Mantralaya · Every year</div>
    <div class="t-body">Each year, sacred mṛttikā is gathered from the Tulasi grove between the Matha and the Tungabhadra and brought to Rayaru’s Brindavana during Mṛttikā Saṅgrahaṇa.</div>
    <div class="t-body">From this mṛttikā, Brindavanas are established wherever Rayaru is worshipped.</div>
    <div class="t-body">The Moola Brindavana remains here, at Mantralaya.</div>` },

  { a: .9700, b: .9860, drift: .7, html: `
    <div class="t-loc">Mantralaya · Today</div>
    <div class="t-q">Every Śrāvaṇa, Ārādhana marks the day of Rayaru’s Brindavana Praveśa.</div>
    <div class="t-body">People still come to the Brindavana where he remains in dhyāna.<br>His granthas are still studied.<br>The place remains. The teaching remains.</div>` },
];

export class Captions {
  constructor() {
    const host = document.getElementById('captions');
    this.items = CAPTIONS.map(c => {
      const el = document.createElement('section');
      el.className = `cap ${c.pos || 'pos-column'}`;
      el.innerHTML = `<div class="cap-in">${c.html}</div>`;
      host.appendChild(el);
      return { ...c, el, inner: el.firstElementChild, o: -1, p: -1 };
    });
  }
  update(t, reduced) {
    for (const c of this.items) {
      const span = c.b - c.a;
      // longer, softer envelopes: a beat is leaving while the next arrives
      const fade = Math.min(span * .40, .012);   // a short fade at each end: the block is whole for most of its life, read against the layer it names
      const oIn = smooth(remap(t, c.a, c.a + fade));
      const oOut = 1 - smooth(remap(t, c.b - fade, c.b));
      const o = oIn * oOut;
      const p = clamp01((t - c.a) / span);
      if (Math.abs(o - c.o) > .003 || (o === 0 && c.o !== 0) || (o > 0 && Math.abs(p - c.p) > .004)) {
        c.o = o; c.p = p;
        c.el.style.opacity = o.toFixed(3);
        if (!reduced) {
          /* scroll-linked travel: the block RISES INTO its place while it
             fades up, glides on through its whole life, and keeps rising as
             it dissolves — one continuous physical movement, never text
             switched on and off in place. Fully reversible with the scroll.
             The travel is short enough that a sentence is still where it
             was when the reader reaches its end. */
          const k = c.drift === undefined ? 1 : c.drift;
          const dy = k * ((0.5 - p) * 28 + (1 - oIn) * 18 - (1 - oOut) * 12);
          c.inner.style.transform = `translateY(${dy.toFixed(1)}px)`;
        }
        c.el.style.visibility = o <= 0 ? 'hidden' : 'visible';
        c.el.style.pointerEvents = o > .5 ? 'auto' : 'none';
      }
    }
  }
}

/* ---------------- transitions: colour states, not cuts ----------------
   A seam between worlds is a change of colour, and the colour is one of
   the site's six. Only the Brindavana's own seams remain as veils: two stay
   truly dark, because darkness is the story there: the closed stone before
   its layers open, and the interior dark before the Brindavana stands on
   its bank at night. The seams either side of the movements are not veils
   at all: the document's ground (#ground, main.js) dissolves in over the
   opening's morning light and out onto the sanctum's first frame.
     { c, w, k, col, light, wIn? }
     c      centre in global t
     w      half-width of the fade after the centre
     wIn    half-width of the fade before it (a world may dissolve slowly
            and the next resolve at once)
     k      strength (1 = fully opaque)
     light  1 marks a pale veil, so the interface takes dark ink */
const VEILS = [
  /* (18 Sept 2026, night: none. Brindavana Pravesha is in the river world
     itself and the camera moves through it; nothing is cut to.) */
]

const hexRGB = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
for (const v of VEILS) v.rgb = hexRGB(v.col);
const _veil = { o: 0, col: '#060403', light: 0 };
export function veilAt(t) {
  /* strongest veil sets the opacity; colour and lightness are blended by
     weight, so two held grounds meeting (the page into the five words)
     cross-fade instead of switching */
  let o = 0, sw = 0, r = 0, g = 0, b = 0, light = 0;
  for (const v of VEILS) {
    const d = Math.max(0, Math.abs(t - v.c) - (v.hold || 0));
    const half = t < v.c && v.wIn ? v.wIn : v.w;
    if (d >= half) continue;
    const a = smooth(1 - d / half) * (v.k ?? 1);
    if (a > o) o = a;
    sw += a; r += v.rgb[0] * a; g += v.rgb[1] * a; b += v.rgb[2] * a; light += (v.light || 0) * a;
  }
  _veil.o = o;
  if (sw > 0) {
    _veil.col = `rgb(${(r / sw) | 0}, ${(g / sw) | 0}, ${(b / sw) | 0})`;
    _veil.light = light / sw * o;
  } else { _veil.col = '#060403'; _veil.light = 0; }
  return _veil;
}
