// RAYARA ANTARANGA · the words: editorial reveals, scrubbed by the scroll.
//
// Every copy block on the site (a chapter's beat, a Brindavana caption) is
// given ONE GSAP timeline whose progress is the beat's own copy progress
// (score.js: 0 as the window opens, 1 as it closes), so the words arrive,
// stand and leave with the hand, forward and back, never on a trigger.
// Three registers, three behaviours, nothing more:
//   the statement (a title, a t-q): its lines rise one after another
//     through a mask, the whole thing present in the frame;
//   the reading (a lead, a body, the dates): each line comes up quietly, a
//     few pixels and a fade, a breath after the statement;
//   the label (an eyebrow, a place): a fade with a small slide, first.
// Leaving, the statement's lines lift back through their mask and the
// reading dissolves upward, gently, as the scene goes on. Lines, never
// characters. SplitText re-splits itself when the measure changes.
import { gsap } from '../vendor/gsap/index.js';
import { SplitText } from '../vendor/gsap/SplitText.js';

gsap.registerPlugin(SplitText);

const STATEMENT = '.title, .t-q, .hero-heading';
const READING = '.lead, .body, .body-lg, .t-body, .dates > div, .hero-body';
const LABEL = '.eyebrow, .t-loc, .was, .hero-eyebrow';

/* the window of the reveal inside the copy's progress: it is complete by
   IN, holds, and leaves from OUT */
const IN = .30, OUT = .84;

export function makeReveal(block, { reduced = false } = {}) {
  const stmts = [...block.querySelectorAll(STATEMENT)];
  const reads = [...block.querySelectorAll(READING)];
  const labels = [...block.querySelectorAll(LABEL)];
  let tl = null, last = -1, splits = [], ready = false;
  const build = () => {
    if (!ready) return;
    if (tl) tl.kill();
    /* a whole element that an earlier build tweened keeps nothing of it: the lines carry the motion now */
    gsap.set([...stmts, ...reads], { clearProps: 'opacity,transform,filter' });
    tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
    const E = 'power3.out', L = 'power2.out';
    /* the label, first and quietest */
    if (labels.length) {
      tl.fromTo(labels, { opacity: 0, x: reduced ? 0 : -10 }, { opacity: 1, x: 0, duration: IN * .55, ease: L }, .0);
      tl.to(labels, { opacity: 0, duration: 1 - OUT, ease: 'power1.in' }, OUT);
    }
    /* the statement: lines through a mask */
    for (const s of stmts) {
      const lines = s._split ? s._split.lines : [s];
      tl.fromTo(lines, { yPercent: reduced ? 0 : 108, opacity: reduced ? 0 : 1, filter: reduced ? 'blur(0px)' : 'blur(3px)' }, { yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: IN * .78, ease: E, stagger: IN * .22 / Math.max(1, lines.length) }, .02);
      tl.to(lines, { yPercent: reduced ? 0 : -46, opacity: 0, duration: (1 - OUT) * .9, ease: 'power2.in', stagger: (1 - OUT) * .25 / Math.max(1, lines.length) }, OUT);
    }
    /* the reading: line by line, a breath after */
    let k = 0;
    for (const r of reads) {
      const lines = r._split ? r._split.lines : [r];
      const at = .08 + Math.min(.10, k * .035);
      /* the reading comes into clarity: a soft blur clearing as each line rises */
      tl.fromTo(lines, { opacity: 0, y: reduced ? 0 : 12, filter: reduced ? 'blur(0px)' : 'blur(5px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: IN * .7, ease: L, stagger: IN * .3 / Math.max(1, lines.length) }, at);
      tl.to(lines, { opacity: 0, y: reduced ? 0 : -8, duration: 1 - OUT, ease: 'power1.in', stagger: (1 - OUT) * .2 / Math.max(1, lines.length) }, OUT + .01);
      k++;
    }
    tl.progress(last >= 0 ? last : 0);
  };
  /* split into lines, masked for the statements; SplitText re-splits when
     the width changes (autoSplit) and rebuilds the timeline */
  const split = (el, mask) => {
    try {
      el._split = SplitText.create(el, {
        type: 'lines', mask: mask ? 'lines' : false, linesClass: 'ln', autoSplit: true, aria: 'auto',
        onSplit(self) { el._split = self; build(); },
      });
    } catch (e) { el._split = null; }
  };
  /* only text-bearing elements are split (a dates cell, with its block
     children, reveals whole) */
  const plain = (el) => ![...el.children].some(c => !/^(BR|EM|STRONG|I|B|SPAN|SMALL)$/.test(c.tagName) || getComputedStyle(c).display === 'block');
  for (const s of stmts) if (plain(s)) split(s, true);
  for (const r of reads) if (plain(r)) split(r, false);
  /* one build, once every split is in place (each later re-split rebuilds) */
  ready = true; build();
  return {
    /* p: the copy's progress 0..1 */
    set(p) {
      if (!tl) return;
      const q = Math.max(0, Math.min(1, p));
      if (Math.abs(q - last) < .0015 && last >= 0) return;
      last = q; tl.progress(q);
    },
    revert() { if (tl) tl.kill(); for (const s of splits) s.revert(); },
  };
}
