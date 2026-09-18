// RAYARA ANTARANGA · the movements (01–08)
//
// Between the opening on the Tungabhadra and the Brindavana at Manchale the
// life is read on the bank of the opening's own world, in one walk of the
// camera (main.js STATIONS). The chapters are sections in the page's flow
// (index.html #movements) and that flow is only the SCROLL LENGTH: each
// section is sized from THE SCORE (score.js), never the other way round,
// so the scrollbar and the keyboard's page agree with the score. The words
// themselves never scroll. Every beat's copy (.sec-in) is fixed in the
// frame, at the site's one reading position, and its life is the beat's
// copy window in the score: it rises into place and fades up as the window
// opens (the camera arriving), holds while the beat is read (the camera
// drifting), and dissolves as the window closes, the next arriving as the
// camera goes on moving (the Seijaku register).
//
// This module owns the chapters' behaviour and nothing else: the beats'
// lives, the headings arriving a word at a time, the pool of shade under
// the copy, the rail at the right edge and the nav's sense of where the
// visitor is, and the section links. main.js calls update() every frame
// with the story's t and the score's layout.
import { clamp01, remap, smooth, lerp } from './util.js';
import { COPY_IN, COPY_OUT } from './score.js';

export function createMovements({ reduced = false, standalone = false, scrollToBeat = null } = {}) {
  const el = document.getElementById('movements');
  const none = { el: null, size() {}, measure() {}, update() { return { i: 0, n: 8 }; }, setNav() {}, setLive() {} };
  if (!el) return none;
  const sections = [...el.querySelectorAll('.sec')];
  const spans = [...el.querySelectorAll('.sec, .mv-way, .mv-lead, .mv-tail')];   // everything in the flow that has a beat
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

  /* one record per beat: its copy block's place in the frame (rx: the
     union of the block's children, in viewport px; fixed, so measured once
     and again on resize) */
  const beats = sections.map(s => ({
    id: s.id,
    el: s, inner: s.querySelector('.sec-in') || s,
    pale: s.classList.contains('pale'),
    mid: s.classList.contains('mid'),      // one of the two centred beats (style.css .sec.mid)
    rx: { left: 0, top: 0, w: 0, h: 0 },
    o: -1, oS: '', tf: '', on: false, pe: '', p: 0,
  }));
  function measure() {
    for (const b of beats) {
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
  /* ---- the flow is the score's: every section, lead, way and tail is
     given its beat's own height, so the page is exactly as long as the
     score and nothing about the scroll is measured from the DOM ---- */
  let lay = null;
  function size(L) {
    lay = L;
    if (standalone) return;
    for (const s of spans) {
      const b = L.byId[s.id];
      s.style.height = b ? `${Math.round(b.span)}px` : '0px';
    }
  }

  /* ---- the beats' lives ----
     A beat's copy window [cA, cB] is in the score. The block rises and
     fades up over COPY_IN viewports from cA, holds, and dissolves over
     COPY_OUT viewports to cB. The fades are the same at every beat, so
     every passage arrives and leaves at one pace; the hold is the rest of
     the window, which the score sizes for its reading. */
  function lives(t) {
    const fi = COPY_IN * lay.h / lay.max, fo = COPY_OUT * lay.h / lay.max;
    for (const b of beats) {
      const B = lay.byId[b.id];
      if (!B || !B.copy) continue;
      const a0 = B.cA, a1 = B.cB;
      const oIn = smooth(remap(t, a0, a0 + fi));
      const oOut = 1 - smooth(remap(t, a1 - fo, a1));
      const o = oIn * oOut;
      const p = clamp01((t - a0) / Math.max(1e-9, a1 - a0));
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

  /* ---- the rail and the nav ---- */
  /* one mark per chapter: the sub-beats (a work, a difference) belong to theirs */
  const chapters = sections.filter(s => !s.classList.contains('sub'));
  if (rail) {
    rail.innerHTML = chapters.map((s, i) => `<button type="button" data-sec="${s.id}" aria-label="Chapter ${i + 1}"><i></i></button>`).join('');
  }
  /* a link lands the frame on the beat with its copy up, never on the
     beat's edge where it has not yet arrived */
  const go = (id) => {
    if (scrollToBeat) { scrollToBeat(id); return; }
    const s = document.getElementById(id); if (!s) return;
    window.scrollTo({ top: s.getBoundingClientRect().top + window.scrollY, behavior: reduced ? 'auto' : 'smooth' });
  };
  document.querySelectorAll('[data-sec]').forEach(b => b.addEventListener('click', () => go(b.dataset.sec)));
  const railBtns = rail ? [...rail.querySelectorAll('button')] : [];
  let cur = -2;
  function setNav(i) {
    /* i: the beat index among the sections (0–n), -1 before the chapters, n after them */
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
  /* which section's beat the story is in (or the last one passed) */
  function whereAmI(t) {
    if (!lay) return -1;
    let i = -1;
    for (let k = 0; k < sections.length; k++) { const B = lay.byId[sections[k].id]; if (B && t >= B.t0 - (B.t1 - B.t0) * .1) i = k; }
    return i;
  }

  /* ---- measure the blocks now, and again whenever the frame moves ---- */
  measure();
  window.addEventListener('resize', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  function update(t, h, after = false) {
    const i = after ? sections.length : whereAmI(t);
    setNav(i);
    if (!standalone && lay) { lives(t); carryPool(h); }
    return { i, n: sections.length };
  }

  return { el, size, measure, update, setNav, setLive() {}, beats };
}
