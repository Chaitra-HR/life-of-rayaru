// RAYARA ANTARANGA · 05 — THE WORKS
// One continuous horizontal editorial canvas: TEXT → BOOK → TAKEAWAY → NEXT.
// Vertical scroll (the site's one interaction) translates the canvas sideways
// while the chapter is pinned; on touch the same canvas is a native
// scroll-snap track. Content lives here as data; presentation is CSS.
import { clamp01, remap, smooth } from './util.js';

/* the chapter window in global t (chapter 05 spans .370–.480) */
export const WK0 = .374, WK1 = .4775;
/* the track's inner life: intro settles, then the horizontal travel */
const TA = .3785, TB = .4725;

/* ---------------- the five granthas ----------------
   Copy is the user's approved text; scope lines and Devanagari titles are the
   site's existing approved content. `rot` (deg), `ey` (entrance lift px) and
   `es` (entrance scale) give each arrival its own small variation; `behind`
   sends the book behind the typography instead of in front of it. */
export const WORKS = [
  {
    id: 'nyayasudha',
    title: 'Nyaya Sudha<br>Parimala',
    plain: 'Nyaya Sudha Parimala',
    original: 'न्यायसुधापरिमल',
    scope: 'on Sri Jayatirtha’s Nyāya Sudhā',
    image: 'assets/works/nyayasudha',
    w: 1054, h: 1492,
    alt: 'Nyaya Sudha Parimala — printed edition cover',
    desc: 'So closely associated with Rayaru that it earned him the name Parimalacharya. Through Jayatirtha’s <em>Nyaya Sudha</em>, he makes one idea unmistakably clear:',
    take: 'Hari is independent.<br>Everything else exists through Him.',
    ts: 1, rot: .8, ey: 46, es: 1,
  },
  {
    id: 'tantradeepika',
    title: 'Tantra<br>Deepika',
    plain: 'Tantra Deepika',
    original: 'तन्त्रदीपिका',
    scope: 'on the Brahma Sūtras',
    image: 'assets/works/tantradeepika',
    w: 1038, h: 1516,
    alt: 'Tantra Deepika — printed edition title page',
    desc: 'Rayaru turns to the <em>Brahma Sutras</em>, tracing their arguments through the lens of Tattvavada. At its heart is a simple conviction:',
    take: 'We are not one with the Divine.<br>We belong to Him.',
    ts: 1, rot: 0, ey: 10, es: 1,
  },
  {
    id: 'battasangraha',
    title: 'Bhatta<br>Sangraha',
    plain: 'Bhatta Sangraha',
    original: 'भाट्टसङ्ग्रह',
    scope: 'Pūrva Mīmāṃsā · the Bhāṭṭa school',
    image: 'assets/works/battasangraha',
    w: 1086, h: 1448,
    alt: 'Bhatta Sangraha — printed edition cover',
    desc: 'Here Rayaru steps beyond Vedanta into Mimamsa, the tradition concerned with how scripture is read and understood. Before interpreting Shastra, there is another question:',
    take: 'How do we know what<br>a text truly means?',
    ts: 1, rot: -1.2, ey: 24, es: 1,
  },
  {
    id: 'thatvamanjari',
    title: 'Mantrartha<br>Manjari',
    plain: 'Mantrartha Manjari',
    original: 'मन्त्रार्थमञ्जरी',
    scope: 'Ṛgveda · the first three adhyāyas',
    image: 'assets/works/thatvamanjari',
    w: 1024, h: 1535,
    alt: 'Mantrartha Manjari — printed edition cover',
    desc: 'The opening hymns of the <em>Rigveda</em> contain gods, rituals, images and layers of meaning. Rayaru looks through those layers toward what lies beneath them:',
    take: 'Many names. Many mantras.<br>Their highest meaning points to Vishnu.',
    ts: 1, rot: .5, ey: 18, es: 1,
  },
  {
    id: 'thatvaprakashika',
    title: 'Tattva Prakashika<br>Bhavadeepa',
    plain: 'Tattva Prakashika Bhavadeepa',
    original: 'तत्त्वप्रकाशिकाभावदीप',
    scope: 'on Jayatirtha’s Tattva Prakāśikā',
    image: 'assets/works/thatvaprakashika',
    w: 1024, h: 1536,
    alt: 'Tattva Prakashika Bhavadeepa — printed edition cover',
    desc: 'This is not simply explanation. Rayaru takes difficult arguments, weighs the objections against them, and answers them. Tradition was never an excuse to stop questioning.',
    take: 'What is true<br>should survive inquiry.',
    ts: .78, rot: -.6, ey: 8, es: 1.05,
  },
];

const INTRO = {
  marker: '05 — The Works',
  kn: 'ಪರಿಮಳಾಚಾರ್ಯ',
  lead: 'Sri Raghavendra Tirtha did not merely preserve the Madhwa tradition. He explained it.',
};
const CODA = {
  a: 'And these were only a few.',
  b: 'Around 45 works.',
  c: 'Across the Vedas, Vedanta, Nyaya, Mimamsa and devotional thought.',
};

const pad2 = n => String(n).padStart(2, '0');

function buildDOM(host) {
  const N = WORKS.length;
  const workHTML = (wk, i) => `
    <article class="wx-work${wk.behind ? ' wx-behind' : ''}" data-i="${i}" style="--r:${(wk.w / wk.h).toFixed(4)};--ts:${wk.ts}">
      <h3 class="wx-title">${wk.title}</h3>
      <div class="wx-book">
        <img src="${wk.image}-640.webp"
             srcset="${wk.image}-640.webp 640w, ${wk.image}-1080.webp 1080w"
             sizes="(max-width: 767px) 66vw, 30vw"
             width="${wk.w}" height="${wk.h}" alt="${wk.alt}"
             loading="lazy" decoding="async">
      </div>
      <div class="wx-side">
        <span class="wx-dn" lang="sa">${wk.original}</span>
        <span class="wx-scope">${wk.scope}</span>
        <p class="wx-desc">${wk.desc}</p>
        <div class="wx-take">
          <span class="wx-take-label">Takeaway</span>
          <p class="wx-take-line">${wk.take}</p>
        </div>
      </div>
      <span class="wx-num" aria-hidden="true">${pad2(i + 1)} / ${pad2(N)}</span>
    </article>`;

  host.innerHTML = `
    <div class="wx-scrim" aria-hidden="true"></div>
    <header class="wx-mhead">
      <span class="wx-marker">${INTRO.marker}</span>
      <div class="wx-kn" lang="kn">${INTRO.kn}</div>
      <p class="wx-lead">${INTRO.lead}</p>
    </header>
    <div class="wx-viewport" tabindex="0" role="group" aria-label="The works of Sri Raghavendra Tirtha — a horizontal reading sequence">
      <div class="wx-track">
        <header class="wx-intro">
          <span class="wx-marker">${INTRO.marker}</span>
          <div class="wx-kn" lang="kn">${INTRO.kn}</div>
          <p class="wx-lead">${INTRO.lead}</p>
        </header>
        ${WORKS.map(workHTML).join('')}
        <div class="wx-coda">
          <p class="wx-coda-a">${CODA.a}</p>
          <div class="wx-coda-b">${CODA.b}</div>
          <p class="wx-coda-c">${CODA.c}</p>
        </div>
      </div>
    </div>
    <div class="wx-progress" aria-hidden="true">
      <b class="wx-p-now">01</b><span class="wx-p-line"><i></i></span><b>${pad2(N)}</b>
    </div>
    <div class="wx-cue" aria-hidden="true"><b>01</b>&nbsp;/&nbsp;${pad2(N)}&nbsp;<i>→</i></div>`;
}

export function createWorks({ reduced = false } = {}) {
  const wk = document.getElementById('works');
  if (!wk) return { update() {}, refresh() {}, showStatic() {} };
  buildDOM(wk);

  const viewport = wk.querySelector('.wx-viewport');
  const track = wk.querySelector('.wx-track');
  const panels = [...track.children];               // intro, works…, coda
  const workEls = [...track.querySelectorAll('.wx-work')];
  const parts = workEls.map(el => ({
    el,
    title: el.querySelector('.wx-title'),
    book: el.querySelector('.wx-book'),
    side: el.querySelector('.wx-side'),
    num: el.querySelector('.wx-num'),
    data: WORKS[+el.dataset.i],
  }));
  const intro = track.querySelector('.wx-intro');
  const coda = track.querySelector('.wx-coda');
  const pNow = wk.querySelector('.wx-p-now');
  const pFill = wk.querySelector('.wx-p-line i');
  const cue = wk.querySelector('.wx-cue');
  const cueNum = cue.querySelector('b');

  /* geometry is measured, never hard-coded — `dirty` marks it stale */
  let dirty = true;

  /* interaction mode: native touch track vs scroll-driven canvas */
  const mq = window.matchMedia('(pointer: coarse), (max-width: 767px)');
  let touch = mq.matches;
  const applyMode = () => {
    wk.classList.toggle('wx-touch', touch);
    wk.classList.toggle('wx-desk', !touch);
    if (touch) {
      // hand the canvas to the finger: clear every scroll-driven transform
      track.style.transform = '';
      for (const p of parts) {
        p.title.style.cssText = ''; p.book.style.cssText = '';
        p.side.style.cssText = ''; p.num.style.cssText = '';
        p.el.style.opacity = '';
      }
      if (intro) intro.style.cssText = '';
      if (coda) coda.style.cssText = '';
    } else {
      viewport.scrollLeft = 0;
      dirty = true;
    }
  };
  const onMQ = () => { if (mq.matches !== touch) { touch = mq.matches; applyMode(); dirty = true; } };
  (mq.addEventListener || mq.addListener).call(mq, 'change', onMQ);
  applyMode();

  /* geometry — measured from the real track, refreshed when anything that
     can change it changes (resize, fonts, images) */
  let travel = 0, centers = [], vw = 1, beat = 1;
  function measure() {
    if (wk.hidden) return;
    vw = window.innerWidth || 1;
    travel = Math.max(0, track.scrollWidth - vw);
    /* desktop books carry translate(-50%,-50%), so offsetLeft IS the
       visual centre; in the touch flow it is the left edge */
    centers = parts.map(p =>
      p.el.offsetLeft + p.book.offsetLeft + (touch ? p.book.offsetWidth / 2 : 0));
    beat = centers.length > 1 ? Math.max(1, centers[1] - centers[0]) : vw;
    dirty = false;
  }
  const mark = () => { dirty = true; };
  /* some environments never fire MediaQueryList 'change' — re-check on resize */
  window.addEventListener('resize', () => { onMQ(); mark(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(mark);
  for (const img of track.querySelectorAll('img')) {
    if (!img.complete) img.addEventListener('load', mark, { once: true });
  }

  /* one-time warm-up: begin fetching the covers a chapter before they appear */
  let warmed = false;
  function warm() {
    if (warmed) return; warmed = true;
    const imgs = track.querySelectorAll('img');
    imgs.forEach((img, i) => { img.loading = 'eager'; if (i === 0) img.fetchPriority = 'high'; });
  }

  /* touch track: progress + the one-time directional cue. Driven from the
     site's own frame loop (update below) rather than scroll events — those
     are not delivered reliably in every embedded context. */
  let cueDone = false, lastIdx = -1, lastSL = -1;
  function syncCue() {
    const sl = viewport.scrollLeft;
    if (sl === lastSL) return;
    lastSL = sl;
    const x = sl + vw * .5;
    let idx = 0, best = 1e9;
    workEls.forEach((el, i) => {
      const c = el.offsetLeft + el.offsetWidth / 2;
      if (Math.abs(c - x) < best) { best = Math.abs(c - x); idx = i; }
    });
    if (idx !== lastIdx) { lastIdx = idx; cueNum.textContent = pad2(idx + 1); }
    if (!cueDone && sl > 40) { cueDone = true; wk.classList.add('wx-cue-off'); }
  }

  const px = v => `${v.toFixed(1)}px`;
  let lastNow = -1;

  /* One pose of the desktop canvas at travel offset X.
     Books make a single lateral move with a strong focal scale; each work's
     text is PINNED at the left gutter (the pin cancels the track's travel,
     so it is positioning, not motion — it applies under reduced motion too)
     and the works crossfade through that one fixed, readable text zone. */
  function layout(X) {
    const focusX = X + vw * .52;             // the compositional focal point
    let nearest = 0, nearestD = 1e9;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const dPx = centers[i] - focusX;       // px from focus (+ = still ahead)
      const d = dPx / beat;                  // in BEATS (one work spacing)
      const ad = Math.abs(d);
      if (ad < nearestD) { nearestD = ad; nearest = i; }
      if (ad > 2.2) { if (p.el.style.opacity !== '0') p.el.style.opacity = '0'; continue; }
      p.el.style.opacity = '1';

      const focus = clamp01(1 - ad);         // 1 at the focal position
      /* text crossfades through ONE fixed zone — the incoming work waits
         (3.2) longer than the outgoing one lingers (2.6), so two texts are
         never strong at the gutter at once */
      const txO = (d >= 0 ? clamp01(1 - d * 3.2) : clamp01(1 + d * 2.6)).toFixed(3);
      p.title.style.opacity = txO; p.side.style.opacity = txO; p.num.style.opacity = txO;
      const pin = px(-dPx);
      if (reduced) {
        p.title.style.transform = `translate3d(${pin},0,0)`;
        p.side.style.transform = `translate3d(${pin},0,0)`;
        p.num.style.transform = `translate3d(${pin},0,0)`;
        p.book.style.transform = '';
        p.book.style.opacity = clamp01(1.2 - ad).toFixed(3);
        continue;
      }
      p.title.style.transform = `translate3d(${pin},${px(d * 10)},0)`;
      p.side.style.transform = `translate3d(${pin},${px(d * 24)},0)`;
      p.num.style.transform = `translate3d(${pin},${px(d * 6)},0)`;

      /* the next work stands whole but small at the right; the previous one
         dissolves before it reaches the text zone */
      const inc = clamp01(d);
      const dd = p.data;
      const s = (0.55 + .45 * focus) * (1 + (dd.es - 1) * inc);
      const rot = dd.rot * (1 - .5 * focus);
      p.book.style.transform =
        `translate(-50%,-50%) translate3d(0,${px(dd.ey * smooth(inc))},0) rotate(${rot.toFixed(2)}deg) scale(${s.toFixed(3)})`;
      p.book.style.opacity = (d >= 0 ? clamp01(1.25 - d * .72) : clamp01(1 - ad * 1.5)).toFixed(3);
      p.book.style.zIndex = focus > .5 ? 3 : 2;
    }

    /* intro leaves quickly to the left; the coda arrives into stillness */
    if (!reduced) {
      const iEnd = intro.offsetLeft + intro.offsetWidth * .5;
      intro.style.transform = `translate3d(${px((iEnd - focusX) * -.15)},0,0)`;
      // gone before the first work's text settles into the same zone
      intro.style.opacity = clamp01(1.3 - Math.abs(iEnd - focusX) / vw * 2.8).toFixed(3);
      const cMid = coda.offsetLeft + coda.offsetWidth * .5 - vw * .04;
      const cd = Math.abs(cMid - X - vw * .5) / vw;
      coda.style.opacity = clamp01(1.25 - cd * 1.3).toFixed(3);
      coda.style.transform = `translate3d(${px((cMid - X - vw * .5) * -.1)},0,0)`;
    }
    return nearest;
  }

  function update(t) {
    // begin loading covers while the previous chapter is still on screen
    if (t > .33) warm();
    const inZone = t > .33 && t < .50;
    if (inZone && wk.hidden) { wk.hidden = false; dirty = true; }
    if (!inZone && !wk.hidden) { wk.hidden = true; return; }
    if (wk.hidden) return;

    const w = smooth(remap(t, WK0, WK0 + .008)) * (1 - smooth(remap(t, WK1 - .008, WK1)));
    wk.style.opacity = w.toFixed(3);
    wk.classList.toggle('live', w > .35);
    if (w <= .003) return;

    if (dirty) measure();
    const wu = clamp01(remap(t, TA, TB));

    if (touch) { syncCue(); return; }        // the finger owns the canvas

    /* the pinned canvas: vertical scroll becomes one lateral camera move */
    const X = wu * travel;
    track.style.transform = `translate3d(${(-X).toFixed(1)}px, 0, 0)`;

    /* progress — a thin line, not a carousel */
    if (pFill) pFill.style.transform = `scaleX(${wu.toFixed(4)})`;

    const nearest = layout(X);
    if (pNow && lastNow !== nearest) {
      lastNow = nearest;
      pNow.textContent = pad2(Math.min(nearest + 1, WORKS.length));
    }
  }

  /* review aid (?domonly&plate=N): hold the canvas still at work N
     (8 = the intro panel, 9 = the coda) */
  function showStatic(n) {
    wk.hidden = false; wk.style.opacity = 1; wk.classList.add('live');
    warm();                     // headless review: lazy images never intersect
    measure();
    if (n === 8 && !touch) {
      track.style.transform = 'translate3d(0,0,0)';
      layout(0);
      return;
    }
    if (n === 9 && !touch) {
      track.style.transform = `translate3d(${(-travel).toFixed(1)}px,0,0)`;
      layout(travel);
      if (pFill) pFill.style.transform = 'scaleX(1)';
      if (pNow) pNow.textContent = pad2(WORKS.length);
      return;
    }
    const i = Math.max(0, Math.min(WORKS.length - 1, n));
    if (!touch) {
      const X = Math.max(0, Math.min(travel, centers[i] - vw * .52));
      track.style.transform = `translate3d(${(-X).toFixed(1)}px,0,0)`;
      if (pFill && travel) pFill.style.transform = `scaleX(${(X / travel).toFixed(3)})`;
      layout(X);
    } else {
      viewport.scrollLeft = workEls[i].offsetLeft;
    }
    if (pNow) pNow.textContent = pad2(i + 1);
  }

  return { update, refresh: mark, showStatic };
}
