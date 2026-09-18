// RAYARA ANTARANGA · 05 — THE PAGE
//
// The works as ONE page in the ṭīkā form. A commentary keeps the root text
// (mūla) in the centre of the leaf and writes the explanation around it, in
// the margins; that arrangement is itself the answer to "what does a
// commentary contribute", so the chapter shows the form instead of
// describing it. Each beat turns the page: the root in the centre changes
// to the text that work explains, and the margin fills with that work.
//
// Real, selectable text, driven by global t like every caption; the leaf
// stands on the held Kobicha ground (VEILS in scroll.js). Without WebGL the
// five leaves read one after another as a document.
import { WORKS } from './works.js';
import { remap, smooth } from './util.js';

/* the beats in global t: the leaf opens with the root alone, then three
   works fill its margins one at a time, then the list. Each is a viewport
   of scroll or more. */
export const TIKA_BEATS = [
  { a: .3760, b: .3965, id: 'open' },
  { a: .3985, b: .4185, id: 'w0' },
  { a: .4205, b: .4400, id: 'w1' },
  { a: .4420, b: .4595, id: 'w2' },
  { a: .4615, b: .4790, id: 'list' },
];
export const TIKA_ZONE = { a: .370, b: .486 };

const leaf = (id, root, rootPlain, head, marginHTML, foot = '') => `
  <div class="tk-leaf" data-leaf="${id}">
    ${head}
    <div class="tk-root">
      <span class="tk-root-dn" lang="sa">${root}</span>
      <span class="tk-root-lab">${rootPlain}</span>
    </div>
    <div class="tk-margin">${marginHTML}</div>
    ${foot}
  </div>`;

export function createTika({ reduced = false } = {}) {
  const root = document.getElementById('tika');
  if (!root) return { update() {} };

  const w = WORKS;
  const head = `<div class="tk-head"><span class="tk-kn" lang="kn">ಪರಿಮಳಾಚಾರ್ಯ</span><span class="tk-eyebrow">Kumbakonam and after · the writing years</span></div>`;
  const note = (work) => `
      <div class="tk-title"><span class="tk-dn" lang="sa">${work.original}</span><span class="tk-latin">${work.title}</span></div>
      <p class="tk-note">${work.desc}</p>`;
  root.innerHTML = [
    leaf('open', w[0].root, w[0].rootPlain, head,
      `<p class="tk-note tk-intro">A ṭīkā keeps the root text at the centre of the leaf, and the explanation is written around it. Rayaru’s granthas are written this way: he spent these years explaining the tradition he had been handed.</p>`),
    leaf('w0', w[0].root, w[0].rootPlain, head, note(w[0])),
    leaf('w1', w[1].root, w[1].rootPlain, head, note(w[1])),
    leaf('w2', w[2].root, w[2].rootPlain, head, note(w[2])),
    leaf('list', 'ग्रन्थाः', 'the granthas', head,
      `<ol class="tk-list">${w.map(x => `<li><span class="tk-dn" lang="sa">${x.original}</span><span class="tk-latin">${x.title}</span><span class="tk-scope">${x.scope}</span></li>`).join('')}</ol>
       <p class="tk-note tk-close">Around 45 works, across the Vedas, Vedanta, Nyaya, Mimamsa and devotional writing. He wrote to be understood.</p>`),
  ].join('');

  const leaves = TIKA_BEATS.map(b => ({ ...b, el: root.querySelector(`[data-leaf="${b.id}"]`), o: -1 }));
  const live = (el, o) => {
    el.style.visibility = o <= 0 ? 'hidden' : 'visible';
    el.style.pointerEvents = o > .5 ? 'auto' : 'none';
  };

  return {
    update(t) {
      const zone = t > TIKA_ZONE.a && t < TIKA_ZONE.b;
      if (root.hidden === zone) root.hidden = !zone;
      if (!zone) return;
      for (const b of leaves) {
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
            b.el.style.transform = `translateY(${((.5 - p) * 18 + (1 - oIn) * 12).toFixed(1)}px)`;
          }
        }
      }
    },
  };
}
