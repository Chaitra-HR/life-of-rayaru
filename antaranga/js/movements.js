// RAYARA ANTARANGA · the movements (01–08)
//
// Between the opening on the Tungabhadra and the Brindavana at Manchale the
// life is read on the bank of the opening's own world, in one walk of the
// camera (main.js STATIONS). The chapters are sections in the page's flow
// (index.html #movements) and that flow is only the SCROLL LENGTH: it sets
// where each beat lives in the scroll, and main.js measures the walk and
// the stations' windows from it (centerP, rangeP). The words themselves
// never scroll. Every beat's copy (.sec-in) is fixed in the frame, at the
// site's one reading position, and this module gives it a life in scroll:
// it rises into place and fades up as its section reaches the frame,
// holds while the section is read, and dissolves as the section leaves,
// the next arriving as the camera goes on moving (the Seijaku register).
//
// This module owns the chapters' behaviour and nothing else: the beats'
// lives, the headings arriving a word at a time, the pool of shade under
// the copy, the rail at the right edge and the nav's sense of where the
// visitor is, and the section links. main.js calls update() every frame
// with the raw scroll position.
import { clamp01, remap, smooth, lerp } from './util.js';

export function createMovements({ reduced = false, standalone = false, scrollToY = null } = {}) {
  const el = document.getElementById('movements');
  const none = { el: null, measure() {}, topOf() { return 0; }, firstTop() { return 0; }, lastBottom() { return 0; }, update() { return { i: 0, n: 8, band: null, covered: false }; }, setNav() {}, setLive() {} };
  if (!el) return none;
  const sections = [...el.querySelectorAll('.sec')];
  const rail = document.getElementById('rail');
  const navBtns = [...document.querySelectorAll('#topnav button[data-sec]')];

  /* ---- headings arrive a word at a time: each word in its own mask ---- */
  for (const h of el.querySelectorAll('[data-rv="words"]')) {
    const words = h.textContent.trim().split(/\s+/);
    h.textContent = '';
    words.forEach((w, i) => {
      const m = document.createElement('span'); m.className = 'wm';
      const s = document.createElement('span'); s.className = 'word'; s.textContent = w; s.style.setProperty('--wd', `${i * 55}ms`);
      m.appendChild(s); h.appendChild(m);
      if (i < words.length - 1) h.appendChild(document.createTextNode(' '));
    });
  }

  /* without the world (no WebGL, the flowing document) every block is
     simply there */
  if (standalone) el.querySelectorAll('.sec').forEach(s => s.classList.add('on'));

  /* ---- geometry, cached ---- */
  const rect = (e) => { const r = e.getBoundingClientRect(); return { top: r.top + window.scrollY, h: r.height }; };
  /* one record per beat: its section's place in the scroll (top, h) and its
     copy block's place in the frame (rx: the union of the block's children,
     in viewport px; fixed, so measured once and again on resize) */
  const beats = sections.map(s => ({
    el: s, inner: s.querySelector('.sec-in') || s,
    pale: s.classList.contains('pale'),
    mid: s.classList.contains('mid'),      // one of the two centred beats (style.css .sec.mid)
    top: 0, h: 0, rx: { left: 0, top: 0, w: 0, h: 0 },
    o: -1, oS: '', tf: '', on: false, pe: '',
  }));
  let tops = [];
  function measure() {
    tops = sections.map(s => rect(s).top);
    for (const b of beats) {
      const r = rect(b.el); b.top = r.top; b.h = r.h;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const c of b.inner.children) {
        const g = c.getBoundingClientRect();
        if (!g.width && !g.height) continue;
        x0 = Math.min(x0, g.left); x1 = Math.max(x1, g.right);
        y0 = Math.min(y0, g.top); y1 = Math.max(y1, g.bottom);
      }
      if (x0 === Infinity) { const g = b.inner.getBoundingClientRect(); x0 = g.left; x1 = g.right; y0 = g.top; y1 = g.bottom; }
      b.rx = { left: x0, top: y0, w: x1 - x0, h: y1 - y0 };
    }
  }

  /* ---- the beats' lives ----
     s is the frame's centre in scroll px. A beat rises and fades up as the
     frame's centre comes down onto its section (a little before its top),
     holds while the centre crosses the section, and dissolves as the
     centre leaves its foot. The fades are a fraction of the viewport, the
     same at every beat, so every passage arrives and leaves at one pace;
     the hold is the rest of the section, which is sized for its reading
     (style.css: a chapter a viewport, a sub-beat and a quiet beat less). */
  /* in from the section's own top (nothing before the walk has begun to
     arrive), full by .30 vh, the camera landing at the centre; out over the
     last .30 vh, reaching .10 vh past the foot */
  const IN = .30, OUT = .30, PRE = .10;
  function lives(y, h) {
    const s = y + h * .5;
    for (const b of beats) {
      const a0 = b.top, a1 = b.top + b.h + PRE * h;
      const oIn = smooth(remap(s, a0, a0 + IN * h));
      const oOut = 1 - smooth(remap(s, a1 - OUT * h, a1));
      const o = oIn * oOut;
      const p = clamp01((s - a0) / Math.max(1, a1 - a0));
      b.p = p;
      const oS = o.toFixed(3);
      if (oS !== b.oS) {
        b.oS = oS; b.o = o;
        b.inner.style.opacity = oS;
        b.inner.style.visibility = o <= 0 ? 'hidden' : 'visible';
      }
      /* the copy is real, selectable text; the layer above stays inert while
         a beat is not the one being read */
      const pe = o > .5 ? 'auto' : 'none';
      if (pe !== b.pe) { b.pe = pe; b.inner.style.pointerEvents = pe; }
      /* scroll-linked travel: the block rises into its place as it fades up,
         glides on through its whole life, and keeps rising as it dissolves:
         one continuous movement, reversible with the scroll, short enough
         that a sentence is still where it was when the reader reaches its
         end. Under reduced motion the words only fade. */
      /* written as a custom property: the stylesheet composes it with the
         block's own placement (the name is centred by a translate of its
         own), so no inline transform ever overrides the layout */
      const dy = reduced ? 0 : (0.5 - p) * 22 + (1 - oIn) * 24 - (1 - oOut) * 12;
      const tf = `${dy.toFixed(1)}px`;
      if (tf !== b.tf) { b.tf = tf; b.inner.style.setProperty('--dy', tf); }
      /* the words of the title rise as the beat arrives (css .sec.on); they
         are put back once the beat has gone, so the arrival plays again on
         the way back, never a block switched on in place */
      const on = o > .03;
      if (on !== b.on) { b.on = on; b.el.classList.toggle('on', on); }
    }
  }

  /* ---- THE POOL (style.css "THE POOL"): one round shade of the night
     colour on a fixed layer, transparent at its own rim, carried onto
     whichever copy block is in the frame; its strength is the block's
     presence, denser under the house's pale plaster ---- */
  const pool = document.getElementById('pool');
  const poolIn = pool ? pool.querySelector('i') : null;
  const POOL_PX = 1024;                         // the square the gradient is drawn in (css #pool i)
  const poolS = { o: '', tf: '' };
  function carryPool(h) {
    if (!pool) return;
    const w = document.documentElement.clientWidth || window.innerWidth;
    const phone = w <= 768;
    let sw = 0, sx = 0, sy = 0, sbw = 0, sbh = 0, sd = 0, sm = 0;
    for (const b of beats) {
      const p = b.o;
      if (p <= 0) continue;
      const r = b.rx;
      sw += p; sx += p * (r.left + r.w / 2); sy += p * (r.top + r.h / 2); sbw += p * r.w; sbh += p * r.h;
      sd += p * (b.pale ? 1 : .84);
      sm += p * (b.mid ? 1 : 0);
    }
    let o = '0', tf = poolS.tf;
    if (sw > 0) {
      const cx = sx / sw, cy = sy / sw, bw = sbw / sw, bh = sbh / sw;
      /* the pool's reach: the column, then a third of the frame beyond it
         each way; under a centred beat a fifth (the subject stands above
         the words and must stay clear of the shade); on a phone it runs
         off both sides of the frame */
      const m = sm / sw;
      const rx = phone ? w * 1.15 : Math.max(w * lerp(.36, .28, m), bw * .5 + w * lerp(.30, .22, m));
      const ry = Math.max(h * lerp(.34, .32, m), bh * .5 + h * lerp(.34, .30, m));
      o = (Math.min(1, sw) * (sd / sw)).toFixed(3);
      tf = `translate3d(${(cx - w / 2).toFixed(1)}px, ${(cy - h / 2).toFixed(1)}px, 0) scale(${(2 * rx / POOL_PX).toFixed(4)}, ${(2 * ry / POOL_PX).toFixed(4)})`;
    }
    if (tf !== poolS.tf) { poolS.tf = tf; poolIn.style.transform = tf; }
    if (o !== poolS.o) { poolS.o = o; pool.style.opacity = o; }
  }

  const topOf = (id) => { const s = document.getElementById(id); return s ? rect(s).top : 0; };
  /* the page in the chapters' own progress (docP, 0..1 over the article):
     centerP is the progress at which a beat sits centred in the frame,
     rangeP the progress at which it enters the bottom of the frame and
     leaves the top. main.js authors the camera walk and the stations'
     windows against these, so they land wherever the words are. */
  const docP = (y) => { const h0 = rect(el).top, hh = Math.max(1, el.offsetHeight); return Math.max(0, Math.min(1, (y - h0) / hh)); };
  const centerP = (id, vh = document.documentElement.clientHeight || window.innerHeight) => {
    const s = document.getElementById(id); if (!s) return 0;
    const g = rect(s); return docP(g.top + g.h / 2 - vh / 2);
  };
  /* the stop of a beat, in scroll px: the frame's centre on the section's centre (the director, scroll.js) */
  const centerY = (id, vh = document.documentElement.clientHeight || window.innerHeight) => {
    const s = document.getElementById(id); if (!s) return 0;
    const g = rect(s); return g.top + g.h / 2 - vh / 2;
  };
  const rangeP = (id, vh = document.documentElement.clientHeight || window.innerHeight) => {
    const s = document.getElementById(id); if (!s) return [0, 0];
    const g = rect(s); return [docP(g.top - vh), docP(g.top + g.h)];
  };
  const firstTop = () => tops[0] || 0;
  const lastBottom = () => { const b = beats[beats.length - 1]; return b ? b.top + b.h : 0; };

  /* ---- the rail and the nav ---- */
  /* one mark per chapter: the sub-beats (a work, a difference) belong to theirs */
  const chapters = sections.filter(s => !s.classList.contains('sub'));
  if (rail) {
    rail.innerHTML = chapters.map((s, i) => `<button type="button" data-sec="${s.id}" aria-label="Chapter ${i + 1}"><i></i></button>`).join('');
  }
  /* a link lands the frame's centre on the beat (its copy full), never on
     the section's edge where it has not yet arrived */
  const go = (id) => {
    const s = document.getElementById(id); if (!s) return;
    const g = rect(s), vh = document.documentElement.clientHeight || window.innerHeight;
    const y = g.top + Math.min(g.h, vh) * .5 - vh * .5 + vh * .22;
    if (scrollToY) scrollToY(y); else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  };
  document.querySelectorAll('[data-sec]').forEach(b => b.addEventListener('click', () => go(b.dataset.sec)));
  const railBtns = rail ? [...rail.querySelectorAll('button')] : [];
  let cur = -2;
  function setNav(i) {
    /* i: the chapter index (0–7), -1 before the chapters, 8 after them */
    if (i === cur) return;
    cur = i;
    const secId = i >= 0 && i < sections.length ? sections[i].id : '';
    /* the rail lights the chapter this beat belongs to */
    let ch = -1; for (let k = 0; k <= i && k < sections.length; k++) if (!sections[k].classList.contains('sub')) ch++;
    railBtns.forEach((b, k) => b.classList.toggle('on', k === ch && i >= 0 && i < sections.length));
    const navId = secId.startsWith('mv-0') ? (secId < 'mv-04' ? 'mv-01' : secId < 'mv-05' ? 'mv-04' : 'mv-05') : null;
    navBtns.forEach(b => b.classList.toggle('on', b.dataset.sec === navId));
    document.querySelectorAll('#topnav button[data-ch]').forEach(b => b.classList.toggle('on', i >= sections.length && b.dataset.ch === '9'));
  }
  function whereAmI(y, h) {
    if (!tops.length) return -1;
    let i = -1;
    for (let k = 0; k < tops.length; k++) if (tops[k] - y < h * .45) i = k;
    return i;
  }

  /* ---- measure now, and again whenever the document or the frame moves ---- */
  measure();
  window.addEventListener('resize', measure);
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(el);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  function update(y = window.scrollY, h = document.documentElement.clientHeight || window.innerHeight, after = false) {
    const i = after ? sections.length : whereAmI(y, h);
    setNav(i);
    if (!standalone) { lives(y, h); carryPool(h); }
    return { i, n: sections.length, band: null, covered: false };
  }

  /* without the world (no WebGL) the chapters drive themselves */
  if (standalone) {
    const tick = () => update();
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick);
    tick();
  }

  return { el, measure, topOf, firstTop, lastBottom, centerP, centerY, rangeP, update, setNav, setLive() {} };
}
