// RAYARA ANTARANGA · global scroll timeline + editorial choreography
// One authoritative source of narrative progress: everything derives from t,
// and t derives from THE SCORE (score.js), the one authored timeline.
// Scroll is choreography, not navigation: copy travels with the scroll,
// beats overlap, and the movements are felt, never announced.
import { clamp01, remap, smooth } from './util.js';
import { SCORE, layout, COPY_IN, COPY_OUT } from './score.js';
import { gsap } from '../vendor/gsap/index.js';
import { ScrollTrigger } from '../vendor/gsap/ScrollTrigger.js';
import { makeReveal } from './text.js';

gsap.registerPlugin(ScrollTrigger);

/* the chapters, for routing: filled from the score's layout (a, b in t) */
export const CHAPTERS = SCORE.map(c => ({ id: c.id, num: c.num, name: c.name, a: 0, b: 1 }));

/* THE SCROLL IS THE MASTER TIMELINE (20 Sept 2026; on GSAP from the 21st).
   The page scrolls at its natural speed: wheel, trackpad, touch, keys and
   the browser's own momentum all land in window.scrollY. ONE ScrollTrigger
   over the whole page maps that to the story's t (0 at the top, 1 at the
   score's end), SCRUBBED: GSAP eases t toward the page over SCRUB seconds
   (an expo ease, so a notch of the wheel is answered at once and the
   mechanical step of raw scroll is gone, never a delay). Nothing else
   stands between the visitor's hand and the world: no pace cap, no leash,
   no gate, no second smoothing. t is linear in the scroll, so the score's
   viewports are the scroll's viewports and every window in the score is
   exactly where the score says. When the visitor stops, the story stops
   within a few frames; only the ambient motion goes on. */
export const SCRUB = .55;

export class ScrollTimeline {
  constructor({ reduced = false, phone = false, sp00 = null, sp09 = null, onLayout = null } = {}) {
    this.spacer = document.getElementById('scroll-space');
    this.sp00 = sp00; this.sp09 = sp09;
    this.reduced = reduced;
    this.phone = phone;
    this.onLayout = onLayout;
    this.t = 0;          // smoothed
    this.raw = 0;        // instantaneous
    this.vel = 0;
    this.jump = null;    // an in-flight scroll jump (see scrollToY)
    this.inited = false;
    this.y = 0;          // the story's own scroll position, px (damped once; everything visible is drawn from it)
    this.rawY = 0;       // the page's
    this.h = 0;
    this.lay = null;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    /* the one ScrollTrigger: the page's scroll → t, scrubbed */
    this.proxy = { t: 0 };
    this.tween = gsap.to(this.proxy, {
      t: 1, ease: 'none',
      scrollTrigger: { trigger: document.body, start: 0, end: () => `${Math.round(this.max)}px`, scrub: reduced ? true : SCRUB, invalidateOnRefresh: true },
    });
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
    const lay = this.lay = layout(h, this.phone);
    for (let i = 0; i < CHAPTERS.length; i++) { CHAPTERS[i].a = lay.chapters[i].t0; CHAPTERS[i].b = lay.chapters[i].t1; }
    this.max = lay.max;
    /* the page's own length is the score's: a spacer for the opening, the
       chapters' sections (sized by movements.js from the same layout), a
       spacer for the Brindavana and the return. Same px, so the scrollbar
       and the keyboard's page are the score's viewports. */
    const c = lay.chapters;
    const first = c[0], docA = c[1], docB = c[c.length - 2], last = c[c.length - 1];
    this.y0 = docA.y0; this.y1 = docB.y0;
    if (this.sp00) this.sp00.style.height = `${Math.round(first.y1 - first.y0)}px`;
    if (this.sp09) this.sp09.style.height = `${Math.round(last.y1 - docB.y0)}px`;
    /* marks every module reads its windows from (never a number of its own) */
    this.marks = {
      docA: docA.t0, docB: docB.t0,
      heroCopy: [lay.byId.hero.cA, lay.byId.hero.cB],
      leave: [lay.byId.leave.t0, lay.byId.leave.t1],
      dawn2: [lay.tAt('b-day', .12), lay.tAt('b-day', .95)],
      chamber: [lay.byId['b-down'].t0, lay.tAt('b-chamber', .1), lay.tAt('b-kurma', .5), lay.tAt('b-kurma', .95)],
      out: [lay.byId['b-out'].t0, lay.byId['b-out'].t1],
      returnA: lay.byId['r-year'].t0,
    };
    if (this.onLayout) this.onLayout(lay, this.marks);
    if (this.tween) ScrollTrigger.refresh();
  }
  /* scroll px → global t, and back: linear, the score's own viewports */
  tAt(y) { return clamp01(y / Math.max(1, this.max)); }
  yAt(t) { return clamp01(t) * this.max; }
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
    const rawY = this.rawY = window.scrollY;
    this.raw = this.tAt(rawY);
    const prev = this.t;
    /* the first frame stands where the page was opened (a reload mid-story), never a walk from the top */
    if (!this.inited) { this.inited = true; this.proxy.t = this.raw; if (this.tween) this.tween.progress(this.raw); }
    /* the story's position is the scrubbed t (GSAP), and nothing else */
    if (this._hold !== undefined) { this.t = this._hold; this._hold = undefined; }
    else this.t = clamp01(this.proxy.t);
    this.y = this.t * this.max;
    this.vel = (this.t - prev) / Math.max(dt, 1e-4);
    return this.t;
  }
  /* a review aid (ANTARANGA.step): the next update takes this t as read */
  hold(t) { this._hold = t; this.proxy.t = t; if (this.tween) this.tween.progress(t); }
  chapterAt(t = this.t) {
    for (let i = CHAPTERS.length - 1; i >= 0; i--) if (t >= CHAPTERS[i].a) return i;
    return 0;
  }
  /* a beat and its local progress */
  beatAt(t = this.t) { return this.lay.beatAt(t); }
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
    /* safety net: the render loop is paused whenever the document is hidden,
       and a queued jump would then sit still — the visitor would see a dead
       link. If nothing has advanced it shortly, just arrive. */
    setTimeout(() => {
      if (this.jump === j && j.el === 0) { this.jump = null; window.scrollTo(0, to); }
    }, 320);
  }
  /* a link lands on a beat with its words up (a third of the way into the copy window) */
  scrollToBeat(id) {
    const b = this.lay.byId[id]; if (!b) return;
    const t = b.copy ? b.cA + (b.cB - b.cA) * .30 : b.t0 + (b.t1 - b.t0) * .3;
    this.scrollToY(this.yAt(t));
  }
  scrollToChapter(i) {
    const c = this.lay.chapters[i]; if (!c) return;
    const b = c.beats.find(x => x.copy) || c.beats[0];
    this.scrollToBeat(b.id);
  }
}

/* ---------------- editorial choreography ----------------
   Each caption: { beat, pos, html, drift? }.
     beat   — the score's beat whose copy window it lives in: it rises and
              fades up as the window opens, holds while the beat is read
              (the layer it names coming down in the same window), and
              dissolves as the window closes; the fades are COPY_IN/OUT
              viewports, the same as every chapter beat's.
     pos    — ONE reading position for the whole story: the narrative column
              (left third on desktop, lower-middle on a phone). The only
              break is a name or a number held in the centre of the frame
              (`pos-center`): the great word, in the world.
     drift  — how far the block travels with the scroll during its life
              (1 = default glide; large slow words use less). Under reduced
              motion nothing drifts.
   The history is not altered — but it is TOLD, not cited: no line hands the
   reader a source in the middle of a scene. */
export const CAPTIONS = [

  /* ══ 01–08 · THE CHAPTERS ═════════════════════════════════════════
     Everything between the opening and the Brindavana is the page itself
     (index.html #movements, js/movements.js). Nothing from that span is
     authored here. */

  /* ══ 09 · BRINDAVANA PRAVESHA ═══════════════════════════════════════
     ONE story in ONE world (river.js → pravesha.js): the day breaks over
     Manchale, the bank is cut open and the camera goes down to the chamber,
     the layers come down into their places, the stone stands, the camera
     draws back out to the opening's own hold. Each block lives in its
     beat's copy window; its layer comes down inside that window (main.js
     praveshaCues), so what is read is what is seen. */
  { beat: 'b-day', drift: .8, html: `
    <div class="t-loc">Brindavana Pravesha</div>
    <div class="t-q">The day of Brindavana Pravesha</div>
    <div class="t-body">With Manchale chosen and the Brindavana prepared, Rayaru was ready to enter it.</div>` },

  { beat: 'b-chamber', html: `
    <div class="t-q">Rayaru within the chamber</div>
    <div class="t-body">On the day, Rayaru sat in dhyāna, reciting the Praṇava, with the Vyāsa Pīṭha and the mūla-granthas before him.</div>
    <div class="t-body">His disciples waited for the sign he had given them: when the japamālā in his hand became still, they were to begin placing the stone slabs.</div>` },

  { beat: 'b-kurma', html: `
    <div class="t-q">The kūrmāsana</div>
    <div class="t-body">Above the chamber was placed the kūrmāsana, the stone slab associated with the form of a tortoise.</div>
    <div class="t-body">It marked the layer above the inner chamber and became the base for the sacred installations that followed.</div>` },

  { beat: 'b-plate', html: `
    <div class="t-q">The silver plate</div>
    <div class="t-body">Above the kūrmāsana was placed a rajata phalaka, a silver plate.</div>
    <div class="t-body">It formed the next layer between the chamber below and the sacred objects placed above.</div>` },

  { beat: 'b-shals', html: `
    <div class="t-q">The śāligrāmas</div>
    <div class="t-body">As the stone slabs rose above Rayaru, a copper box was placed within. Inside were 1,200 Lakṣmī-Nārāyaṇa śāligrāmas, brought from the Gaṇḍakī river. Then the final slabs were laid.</div>` },

  { beat: 'b-stone', html: `
    <div class="t-q">The stone</div>
    <div class="t-body">The slabs were cut from a black rock Rayaru had chosen himself.</div>
    <div class="t-body">Venkanna had already prepared another Brindavana, but Rayaru asked that it be kept for a future yatī. He pointed instead to this rock, saying Sri Rama had rested upon it while searching for Sita.</div>
    <div class="t-body">That was the stone he wanted around him.</div>` },

  { beat: 'b-grain', html: `
    <div class="t-q">The grain</div>
    <div class="t-body">Above the sacred earth came tene, ears of grain.</div>
    <div class="t-body">Another layer was added before the upper portion of the Brindavana was completed.</div>` },

  { beat: 'b-deities', html: `
    <div class="t-q">The deities above</div>
    <div class="t-body">At the uppermost level were installed the images of Śrī Lakṣmī Narasimha and Śrī Srinivasa.</div>
    <div class="t-body">From Rayaru seated in the chamber below to the sacred installations above, the Brindavana had taken its complete form.</div>` },

  /* ══ 00 · THE RETURN ════════════════════════════════════════════════
     The camera has drawn back out of the stone to the opening's hold: the
     place was the wider world all along. The last words settle, and the
     footer follows in the same scroll. */
  { beat: 'r-year', drift: .7, html: `
    <div class="t-loc">Mantralaya · Every year</div>
    <div class="t-body">Each year, sacred mṛttikā is gathered from the Tulasi grove between the Matha and the Tungabhadra and brought to Rayaru’s Brindavana during Mṛttikā Saṅgrahaṇa.</div>
    <div class="t-body">From this mṛttikā, Brindavanas are established wherever Rayaru is worshipped.</div>
    <div class="t-body">The Moola Brindavana remains here, at Mantralaya.</div>` },

  { beat: 'r-today', drift: .7, html: `
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
      return { ...c, el, inner: el.firstElementChild, o: -1, p: -1, reveal: null };
    });
  }
  /* the words' own reveals (text.js): built lazily, one a frame, as each
     beat comes within reach (never all at once on the first frame) */
  build(reduced) { this.reduced = reduced; }
  /* lay: the score's layout (timeline.lay); the fades are viewports of t */
  update(t, reduced, lay) {
    if (!lay) return;
    const fi = COPY_IN * lay.h / lay.max, fo = COPY_OUT * lay.h / lay.max;
    let need = null, nd = Infinity;
    for (const c of this.items) {
      if (c.reveal) continue;
      const b = lay.byId[c.beat]; if (!b || !b.copy) continue;
      const span = b.t1 - b.t0;
      if (t < b.t0 - 1.6 * span || t > b.t1 + span) continue;
      const d = Math.abs(t - b.cC); if (d < nd) { nd = d; need = c; }
    }
    if (need) need.reveal = makeReveal(need.inner, { reduced: this.reduced });
    for (const c of this.items) {
      const b = lay.byId[c.beat];
      if (!b || !b.copy) continue;
      const a = b.cA, z = b.cB;
      const oIn = smooth(remap(t, a, a + fi));
      const oOut = 1 - smooth(remap(t, z - fo, z));
      const o = oIn * oOut;
      const p = clamp01((t - a) / Math.max(1e-9, z - a));
      if (c.reveal && (o > 0 || c.o > 0)) c.reveal.set(p);
      if (Math.abs(o - c.o) > .003 || (o === 0 && c.o !== 0) || (o > 0 && Math.abs(p - c.p) > .004)) {
        c.o = o; c.p = p;
        c.el.style.opacity = o.toFixed(3);
        if (!reduced) {
          /* scroll-linked travel: the block RISES INTO its place while it
             fades up, glides on through its whole life, and keeps rising as
             it dissolves — one continuous physical movement, never text
             switched on and off in place. Fully reversible with the scroll. */
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
   the site's six. (18 Sept 2026, night: none. Brindavana Pravesha is in
   the river world itself and the camera moves through it; nothing is cut
   to.) The machinery stays for the lost-context veil (main.js). */
const VEILS = [];

const hexRGB = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
for (const v of VEILS) v.rgb = hexRGB(v.col);
const _veil = { o: 0, col: '#060403', light: 0 };
export function veilAt(t) {
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
