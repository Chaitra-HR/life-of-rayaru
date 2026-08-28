// RAYARA ANTARANGA · global scroll timeline + editorial choreography
// One authoritative source of narrative progress: everything derives from t.
// Scroll is choreography, not navigation: copy travels with the scroll,
// beats overlap, and chapter boundaries are felt, never announced.
import { clamp01, damp, remap, smooth } from './util.js';

/* The non-negotiable narrative order. Scene numbers are editorial ("00" opens
   and returns); array index is the routing chapter. */
export const CHAPTERS = [
  { id: 'c00', num: '00', name: 'Mantralaya',   a: 0.000, b: 0.070 },
  { id: 'c01', num: '01', name: 'Venkatanatha', a: 0.070, b: 0.150 },
  { id: 'c02', num: '02', name: 'Gṛhastha',     a: 0.150, b: 0.225 },
  { id: 'c03', num: '03', name: 'Kumbhakonam',  a: 0.225, b: 0.295 },
  { id: 'c04', num: '04', name: 'Raghavendra',  a: 0.295, b: 0.370 },
  { id: 'c05', num: '05', name: 'The Works',    a: 0.370, b: 0.480 },
  { id: 'c06', num: '06', name: 'Tattvavāda',   a: 0.480, b: 0.570 },
  { id: 'c07', num: '07', name: 'The Journey',  a: 0.570, b: 0.655 },
  { id: 'c08', num: '08', name: 'Manchale',     a: 0.655, b: 0.725 },
  { id: 'c09', num: '09', name: 'Brindavana',   a: 0.725, b: 0.910 },
  { id: 'c10', num: '00', name: 'Return',       a: 0.910, b: 1.000 },
];

export class ScrollTimeline {
  constructor({ pages = 52, reduced = false } = {}) {
    this.spacer = document.getElementById('scroll-space');
    this.pages = pages;
    this.reduced = reduced;
    this.t = 0;          // smoothed
    this.raw = 0;        // instantaneous
    this.vel = 0;
    this.jump = null;    // an in-flight chapter jump (see scrollToChapter)
    this.resize();
    window.addEventListener('resize', () => this.resize());
    // any real input hands control straight back to the visitor
    const cancel = () => { this.jump = null; };
    window.addEventListener('wheel', cancel, { passive: true });
    window.addEventListener('touchstart', cancel, { passive: true });
    window.addEventListener('keydown', (e) => {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(e.key)) cancel();
    });
  }
  resize() {
    this.max = Math.max(1, this.pages * window.innerHeight - window.innerHeight);
    this.spacer.style.height = `${this.pages * 100}vh`;
  }
  update(dt) {
    // self-heal: viewport may have had no size when the page loaded
    // (hidden tab, collapsed pane) — recompute the scroll length live.
    const liveMax = Math.max(1, this.pages * window.innerHeight - window.innerHeight);
    if (Math.abs(liveMax - this.max) > 1) this.max = liveMax;
    /* advance an in-flight chapter jump. This rides the render loop rather
       than the browser's own smooth scrolling: `behavior: 'smooth'` is
       silently ignored in several embedded and background contexts, which
       left every chapter link and the opening CTA doing nothing at all. */
    if (this.jump) {
      const j = this.jump;
      j.el = Math.min(j.dur, j.el + dt);
      const u = j.el / j.dur;
      const e = u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      window.scrollTo(0, Math.round(j.from + (j.to - j.from) * e));
      if (u >= 1) this.jump = null;
    }
    this.raw = clamp01(window.scrollY / this.max);
    const prev = this.t;
    // slightly slower glide for cinematic feel; near-instant when reduced motion
    const lambda = this.reduced ? 30 : 3.2;
    this.t = damp(this.t, this.raw, lambda, dt);
    if (Math.abs(this.t - this.raw) < 0.00004) this.t = this.raw;
    this.vel = (this.t - prev) / Math.max(dt, 1e-4);
    return this.t;
  }
  chapterAt(t = this.t) {
    for (let i = CHAPTERS.length - 1; i >= 0; i--) if (t >= CHAPTERS[i].a) return i;
    return 0;
  }
  scrollToChapter(i) {
    const c = CHAPTERS[i];
    const to = Math.round((c.a + 0.004) * this.max);
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
}

/* ---------------- editorial choreography ----------------
   Each caption: { a, b, pos, html, drift?, dim? }.
     a, b   — its life in global t. Windows overlap deliberately: a beat
              often arrives while the previous one is still leaving, so the
              page reads as one continuous movement, not slides.
     drift  — how far the block travels with the scroll during its life
              (1 = default glide; 0 = pinned, e.g. edge markers; large slow
              words use less). Under reduced motion nothing drifts.
   Three information levels: primary lines (short, always read), annotations
   (small, contextual), and the deep layers that live in the scene itself.
   Historical copy is preserved; where an account belongs to Sri Matha
   tradition it is described as such. */
export const CAPTIONS = [

  /* ══ 01 · VENKATANATHA / BHUVANAGIRI ═══════════════════════════════
     The chapter opens as a place, not a slide: one enormous word bleeds
     past the frame while the settlement approaches, and the facts arrive
     as small dated notations beside what the camera is looking at. */
  { a: .0705, b: .118, pos: 'pos-bleedL', drift: .4, html: `
    <div class="t-giant">Bhuvanagiri</div>` },

  { a: .076, b: .098, pos: 'pos-left', html: `
    <div class="t-anno">A small settlement in the Tamil country.</div>` },

  { a: .086, b: .106, pos: 'pos-left', drift: .8, html: `
    <div class="t-loc">c. 1595</div>
    <div class="t-sub">Venkatanatha is born.</div>` },

  { a: .104, b: .118, pos: 'pos-low', html: `
    <div class="t-sub">Music came early. So did study.</div>` },

  { a: .108, b: .124, pos: 'pos-right', html: `
    <div class="t-anno">Born to <strong>Thimmanna Bhatta</strong> and <strong>Gopikamba</strong> — a family of śāstra and saṅgīta, associated with the Vijayanagara court.</div>` },

  /* the akṣarābhyāsa moment — the ॐ stands in the scene; the copy answers it */
  { a: .120, b: .1345, pos: 'pos-right', html: `
    <div class="t-body">When his father explained that <span class="t-om">ॐ</span> represented the Lord, the young Venkatanatha asked how so small a symbol could contain the greatness of the Infinite.</div>` },

  /* silence is left around this line — nothing else shares its window */
  { a: .139, b: .1485, pos: 'pos-center', drift: .6, html: `
    <div class="t-sub">His father would not live to see where that learning would lead.</div>` },

  /* ══ 02 · GṚHASTHA ══════════════════════════════════════════════════
     An interior chapter: the two statements stand apart in the room, and
     the facts of scarcity surface one at a time, like things noticed. */
  { a: .156, b: .172, pos: 'pos-left', html: `
    <div class="t-sub">He returns from Madurai,<br>and marries Saraswati Bai.</div>
    <div class="t-anno" style="margin-top:1.1em">They later have a son, Lakshminarayana.</div>` },

  { a: .176, b: .193, pos: 'pos-left', drift: .7, html: `
    <div class="t-display">A scholar of rare learning.</div>` },

  { a: .188, b: .204, pos: 'pos-right', drift: .7, html: `
    <div class="t-display">A household with almost nothing.</div>` },

  { a: .2035, b: .210, pos: 'pos-low', html: `
    <div class="t-sub">He would not demand payment for teaching.</div>` },
  { a: .212, b: .218, pos: 'pos-low', html: `
    <div class="t-sub">There were days when even oil for a festival bath was beyond the family’s means.</div>` },
  { a: .220, b: .2265, pos: 'pos-low', html: `
    <div class="t-sub">Yet his study, teaching and devotion continued.</div>` },

  /* ══ 03 · KUMBHAKONAM ═══════════════════════════════════════════════
     The hall of learning: a dated marker, one primary line, and the
     disciplines listed like a manuscript's own margin note. */
  { a: .231, b: .254, pos: 'pos-left', html: `
    <div class="t-loc">KUMBHAKONAM · UNDER SRI SUDHEENDRA TIRTHA</div>
    <div class="t-sub">Venkatanatha enters the world<br>that would define his life.</div>` },

  { a: .256, b: .272, pos: 'pos-right', html: `
    <div class="t-anno">Vedānta. Vyākaraṇa. Mīmāṃsā.<br>The works of Madhvacharya and Jayatirtha.</div>` },

  { a: .275, b: .290, pos: 'pos-left', html: `
    <div class="t-body">His learning was not limited to memorising texts. He became known for explaining difficult points of Tattvavāda with unusual clarity.</div>` },

  /* ══ 04 · RAGHAVENDRA TIRTHA ════════════════════════════════════════
     The account arrives in quiet fragments; then a long-held pause; then
     the name — the one place the chapter itself becomes typography. */
  { a: .300, b: .314, pos: 'pos-left', html: `
    <div class="t-body">Sri Sudheendra Tirtha had already recognised Venkatanatha’s learning and suitability to continue the Matha’s paramparā.</div>` },

  { a: .310, b: .322, pos: 'pos-right', html: `
    <div class="t-anno">In the Matha’s traditional account, Moola Rama appeared to Sudheendra Tirtha in a dream, indicating Venkatanatha as the successor.</div>` },

  { a: .317, b: .327, pos: 'pos-low', html: `
    <div class="t-sub">Venkatanatha hesitated — his wife Saraswati, his young son.</div>` },

  { a: .324, b: .334, pos: 'pos-low', html: `
    <div class="t-anno">After his son’s upanayana, at Tanjore in 1621, Sri Sudheendra Tirtha initiated him and gave him the āśrama nāma:</div>` },

  { a: .338, b: .346, pos: 'pos-center', drift: .6, html: `
    <div class="t-sub">Venkatanatha was no more.</div>` },

  { a: .351, b: .3665, pos: 'pos-center', drift: .5, html: `
    <div class="t-display t-xl">SRI RAGHAVENDRA<br>TIRTHA</div>
    <div class="t-loc" style="margin-top:1.4em">1621 · TANJORE</div>
    <div class="t-anno" style="margin-top:1.2em; max-width:none">A new name. A new āśrama. A responsibility to carry forward the Madhwa siddhānta and the Moola Rama pūjā paramparā.</div>` },

  /* ══ 05 · THE WORKS ═════════════════════════════════════════════════
     The whole chapter is the horizontal canvas (#works, t .374–.4775,
     js/works.js): chapter marker, ಪರಿಮಳಾಚಾರ್ಯ introduction, the five
     granthas and the "around 45 works" coda all live on that one track. */







  { a: .4775, b: .487, pos: 'pos-low', html: `
    <div class="t-sub">His writing was known not only for depth, but for making difficult siddhānta clear.</div>` },

  /* ══ 06 · TATTVAVĀDA ════════════════════════════════════════════════
     The philosophy emerges from the writing — the statement holds while
     the page becomes space behind it. */
  { a: .488, b: .5045, pos: 'pos-left', drift: .7, html: `
    <div class="t-display">Difference is not an illusion.<br>It is the structure of reality.</div>
    <div class="t-body" style="margin-top:1.2em">For Madhva, and for Rayaru after him, Vishnu is independent. Everything else exists in dependence upon Him.</div>` },

  /* the Pañcabheda interaction owns t .508–.556 (see #panchabheda) */

  { a: .558, b: .568, pos: 'pos-low', html: `
    <div class="t-sub">Five distinctions. Not ignorance to be dissolved — the structure of existence itself.</div>` },

  /* ══ 07 · THE JOURNEY ═══════════════════════════════════════════════
     Movement itself carries the chapter; the beats pass like milestones. */
  { a: .575, b: .592, pos: 'pos-left', drift: .7, html: `
    <div class="t-display">The siddhānta was not meant<br>to remain inside manuscripts.</div>` },

  { a: .598, b: .607, pos: 'pos-low', html: `<div class="t-sub">He taught.</div>` },
  { a: .610, b: .619, pos: 'pos-low', html: `<div class="t-sub">He debated.</div>` },
  { a: .622, b: .631, pos: 'pos-low', html: `<div class="t-sub">He worshipped Moola Rama.</div>` },
  { a: .633, b: .642, pos: 'pos-low', html: `
    <div class="t-sub">He strengthened the Madhwa tradition across the places he visited.</div>` },

  /* the movement slows; one name remains */
  { a: .6445, b: .658, pos: 'pos-center', drift: .45, html: `
    <div class="t-display t-xl">MANCHALE</div>` },

  /* ══ 08 · MANCHALE ══════════════════════════════════════════════════
     The tempo drops. Short lines, long silences between them. */
  { a: .663, b: .678, pos: 'pos-left', html: `
    <div class="t-body">Rayaru comes to Manchale, the place that would later become Mantralaya.</div>
    <div class="t-anno" style="margin-top:1em">The land was granted by the Adoni ruler. Tradition associates the site with Prahlada’s worship in an earlier age.</div>` },

  { a: .683, b: .694, pos: 'pos-center', drift: .6, html: `
    <div class="t-display">He chose Manchale.</div>` },

  { a: .698, b: .707, pos: 'pos-low', html: `
    <div class="t-sub">A place on the Tungabhadra, remembered in tradition as sacred long before his arrival.</div>` },

  /* held stillness before the last line of the chapter */
  { a: .713, b: .7225, pos: 'pos-low', html: `
    <div class="t-sub">Here, Sri Raghavendra Tirtha would enter Brindavana.</div>` },

  /* ══ 09 · THE BRINDAVANA ════════════════════════════════════════════
     An architectural study: every reveal answers a question. */
  { a: .727, b: .7395, pos: 'pos-left', drift: .8, html: `
    <div class="t-q">What are we actually looking at when we stand before Rayara Brindavana?</div>` },

  { a: .742, b: .7555, pos: 'pos-right', html: `
    <div class="t-q">Why these stones?</div>
    <div class="t-body">Rayaru did not simply accept the Brindavana Venkanna had first prepared. Sri Matha’s account says he specifically chose the black stone associated in the tradition with Sri Rama having rested upon it while searching for Sita.</div>` },

  { a: .758, b: .7645, pos: 'pos-low', html: `
    <div class="t-sub">Chosen before the Brindavana was built.</div>` },
  { a: .766, b: .7725, pos: 'pos-low', html: `
    <div class="t-sub">A stone sanctified, according to the Matha tradition, by the touch of Sri Rama.</div>` },

  { a: .7745, b: .7855, pos: 'pos-left', html: `
    <div class="t-body">The official Matha account says Rayaru began reciting the Pranava, entered deep meditation, and instructed his disciples to begin placing the slabs when his japamālā became still.</div>` },

  { a: .7875, b: .7965, pos: 'pos-center', drift: .6, html: `
    <div class="t-sub">Rayaru did not leave his body before entering it.</div>` },

  { a: .800, b: .8125, pos: 'pos-left', drift: .8, html: `
    <div class="t-q">Why are there 1,200 Śāligrāmas here?</div>` },

  { a: .8165, b: .830, pos: 'pos-right', html: `
    <div class="t-body">Sri Matha’s own biography specifically records that after the slabs reached Rayaru’s head, a copper box containing 1,200 Lakṣmī-Nārāyaṇa śāligrāmas brought from the Gandaki was placed according to his instructions.</div>` },

  { a: .8355, b: .8455, pos: 'pos-center', drift: .5, html: `<div class="t-num">1,200</div>` },

  { a: .846, b: .856, pos: 'pos-center', html: `
    <div class="t-anno" style="max-width:none; text-align:center">Lakṣmī-Nārāyaṇa Śāligrāmas · brought from the Gaṇḍakī</div>` },

  /* Mruttike */
  { a: .859, b: .8725, pos: 'pos-left', html: `
    <div class="t-body">Today, Sri Matha has a formal Mruttika Sangrahana tradition. Sacred earth is ceremonially collected from the Tulasi-vana between the Matha and Tungabhadra, taken in procession, and placed on top of Rayara Brindavana.</div>` },

  { a: .8745, b: .884, pos: 'pos-center', drift: .7, html: `
    <div class="t-q">Why is earth from Mantralaya carried to Rayara Mathas across the world?</div>` },

  { a: .886, b: .8945, pos: 'pos-low', html: `
    <div class="t-sub">Because these are Mruttika Brindavanas.</div>` },

  { a: .8965, b: .906, pos: 'pos-low', html: `
    <div class="t-sub">Many Mruttika Brindavanas, wherever Rayaru is remembered.<br>One Moola Brindavana — here, at Mantralaya.</div>` },

  /* ══ 00 · RETURN ════════════════════════════════════════════════════
     The same river. The composition of the opening, seen differently. */
  { a: .917, b: .934, pos: 'pos-left', drift: .7, html: `
    <div class="t-sub">We began at the Tungabhadra.<br>We return here for Aradhane.</div>` },

  { a: .938, b: .952, pos: 'pos-low', html: `
    <div class="t-sub">To the Brindavana where Rayaru remains in dhyāna.<br>To his words. To his siddhānta. To his sannidhāna.</div>` },

  { a: .956, b: .972, pos: 'pos-center', html: `
    <div class="t-sub">355th Sri Raghavendra Tirtha Aradhana</div>
    <div class="t-loc" style="margin-top:.9em">MANTRALAYA · 2026</div>` },

  { a: .978, b: 1.01, pos: 'pos-center', drift: .5, html: `
    <div class="t-display">Śrī Rāghavendrāya Namaḥ</div>` },
];

/* quiet orientation: a small vertical marker rides the right edge through
   each chapter — the narrative announces chapters, this only confirms them */
const EDGE = [
  ['01 · Bhuvanagiri', .074, .146],
  ['02 · The Household', .154, .221],
  ['03 · Kumbhakonam', .229, .291],
  ['04 · Tanjore · 1621', .299, .366],
  /* 05 ends early: the canvas carries its own chapter marker once the books arrive */
  ['05 · The Works', .374, .396],
  ['06 · Tattvavāda', .484, .566],
  ['07 · The Journey', .574, .651],
  ['08 · Manchale', .659, .721],
  ['09 · The Brindavana', .729, .906],
];
for (const [label, a, b] of EDGE) {
  CAPTIONS.push({ a, b, pos: 'pos-edgeR', drift: 0, html: `<div class="t-edge">${label}</div>` });
}

export class Captions {
  constructor() {
    const host = document.getElementById('captions');
    this.items = CAPTIONS.map(c => {
      const el = document.createElement('section');
      el.className = `cap ${c.pos || 'pos-center'}`;
      el.innerHTML = `<div class="cap-in">${c.html}</div>`;
      host.appendChild(el);
      return { ...c, el, inner: el.firstElementChild, o: -1, p: -1 };
    });
  }
  update(t, reduced) {
    for (const c of this.items) {
      const span = c.b - c.a;
      // longer, softer envelopes: a beat is leaving while the next arrives
      const fade = Math.min(span * .38, .02);
      const o = smooth(remap(t, c.a, c.a + fade)) * (1 - smooth(remap(t, c.b - fade, c.b)));
      const p = clamp01((t - c.a) / span);
      if (Math.abs(o - c.o) > .003 || (o === 0 && c.o !== 0) || (o > 0 && Math.abs(p - c.p) > .004)) {
        c.o = o; c.p = p;
        c.el.style.opacity = o.toFixed(3);
        if (!reduced) {
          /* scroll-linked travel: the block glides through its whole life
             instead of fading up in place — the copy belongs to the world's
             movement, not to a slide. drift 0 pins it (edge markers). */
          const k = c.drift === undefined ? 1 : c.drift;
          const dy = (0.5 - p) * 44 * k;
          c.inner.style.transform = `translateY(${dy.toFixed(1)}px)`;
        }
        c.el.style.visibility = o <= 0 ? 'hidden' : 'visible';
      }
    }
  }
}

/* transition veil: covers zone seams that are not handled in-world.
   [center, halfWidth, strength] in global t — strength stays below 1 almost
   everywhere so a seam reads as passing shadow, never a slide change.
   Scenes 01–04 share one continuous interior travel — no veils between them. */
const VEILS = [
  [.070, .0075, .9],   // through the reflection → Bhuvanagiri (underwater)
  [.370, .007, .6],    // the quiet mandapa → into the manuscript
  [.480, .008, .5],    // the line leaves the page → conceptual space
  [.570, .008, .5],    // the cosmos contracts → the map of South India
  [.655, .008, .6],    // the map resolves → Manchale terrain
  [.725, .009, .75],   // the ground before the Brindavana → the sanctum
  [.795, .010, .9],    // the closed stone → the sectional view (darkness is the story)
  [.858, .008, .65],   // interior darkness → presence
];
export function veilOpacity(t) {
  let o = 0;
  for (const [c, w, k] of VEILS) {
    const d = Math.abs(t - c);
    if (d < w) o = Math.max(o, smooth(1 - d / w) * (k ?? 1));
  }
  return o;
}
