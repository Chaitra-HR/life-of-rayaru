// RAYARA ANTARANGA · main — one continuous world, one authored camera, one scroll.
// scroll position → section progress → global t → target camera → damped camera → render
import * as THREE from 'three';
import { clamp, clamp01, lerp, remap, smooth, damp, V3 } from './util.js';
import { ScrollTimeline, Captions, CHAPTERS, veilAt, DOC_A, DOC_B } from './scroll.js';
import { createMovements } from './movements.js';
import { createAmbience } from './audio.js';
import { BrindavanaPreloader } from './preloader.js';
import { Grade } from './post.js';
import { createRiverStage, BRND_POS } from './world/river.js';
import { sl } from './world/stations.js';
import { approachToWorld, STYLED } from './world/hero.js';
import { stoneMapsReady, rayaruReady } from './world/opening.js';

/* the later chapters are not imported here: their modules are fetched and
   built behind the live site, in scroll order, once the opening is up
   (see boot). Each entry names the module, its factory and its Y offset.
   THREE stages carry the whole site: the river and the two Brindavana
   interiors. Between the opening and the Brindavana the site is THE
   CHAPTERS (index.html #movements, js/movements.js): the page itself, in
   kage's anatomy, read over the river at night, whose camera moves from
   chapter to chapter under the copy (camNight). */
/* (18 Sept 2026, night: there are no later stages. Brindavana Pravesha is
   built INTO the river world, river.js → pravesha.js, so the camera never
   leaves the place.) */
const LATER = [];
const OFF = {};
let movements = null;                    // the chapters (movements.js), set in start()

const isMobile = window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window && window.innerWidth < 900;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const ctx = { isMobile, reduced };

/* scene 09 sub-sequence boundaries in global t: the sanctum (pravesha),
   the layers (antaranga), then the Brindavana on its bank at night (the
   river stage) until the return's dawn at T9END */
const T9A = .725;   // Brindavana Pravesha begins: from here to t = 1 the river world carries one camera path (river.js pravesha.cam)

/* ---------------- no-WebGL fallback ----------------
   The reading experience must survive: the biography flows as a document. */
function noWebGL() {
  document.body.classList.add('nowebgl');
  const pre = document.getElementById('preloader');
  if (pre) pre.remove();
  new Captions();                       // the Brindavana and the return, now in flow
  const host = document.getElementById('captions');
  host.classList.add('static');
  /* the chapters already ARE a document: lift them out of the scroll
     driver and let them flow between the hero and the Brindavana's captions */
  const mv = document.getElementById('movements');
  const hero = document.getElementById('hero');
  if (mv && hero) { hero.after(mv); mv.after(host); }
  createMovements({ reduced: true, standalone: true });
  /* ?only=<id>&dy=<px> — review aid for headless renders: one block alone */
  const q = new URLSearchParams(location.search);
  const only = q.get('only');
  if (only && mv) {
    [...mv.children].forEach(c => { if (c.id !== only) c.remove(); });
    [hero, host, document.getElementById('footer'), document.getElementById('ui')].forEach(e => e && e.remove());
    mv.style.marginTop = `${-(+q.get('dy') || 0)}px`;
  }
  // section headings for the document outline
  const heads = document.createElement('div');
  heads.className = 'static-note';
  heads.innerHTML = '<p>This journey is usually experienced as a scrolling cinematic world. Your browser could not start WebGL, so the full narrative is presented here as text.</p>';
  host.prepend(heads);
}

/* ---------------- Pañcabheda: five words, tap two ----------------
   The caption carries the five as buttons; the distinction between any two
   is said in one sentence. No score, no reset: a third tap starts over. */
const PB_TEXT = {
  'isvara+jiva': ['Sri Hari and the jīva', 'The soul depends on Sri Hari at every moment, and is never Him.'],
  'isvara+jada': ['Sri Hari and jaḍa', 'Matter has no life of its own. It is moved, and He moves it.'],
  'jiva+jiva':   ['Jīva and jīva', 'No two souls are alike, in nature or in what they can become.'],
  'jada+jiva':   ['Jīva and jaḍa', 'The self that knows is other than the body it knows through.'],
  'jada+jada':   ['Jaḍa and jaḍa', 'One thing is never another thing. Even matter keeps its differences.'],
};
function wireTap() {
  const tap = document.querySelector('#captions .t-tap');
  if (!tap) return;
  const buttons = [...tap.querySelectorAll('.tp')];
  const result = tap.parentElement.querySelector('.t-tap-result');
  let picked = [];
  const render = () => {
    buttons.forEach(b => b.classList.toggle('sel', picked.includes(b)));
    if (picked.length === 2) {
      const r = PB_TEXT[picked.map(b => b.dataset.kind).sort().join('+')];
      if (r) result.innerHTML = `<b>${r[0]}</b><span>${r[1]}</span>`;
    } else result.innerHTML = '';
  };
  buttons.forEach(b => b.addEventListener('click', () => {
    const i = picked.indexOf(b);
    if (i >= 0) picked.splice(i, 1);           // tap again to unpick
    else if (picked.length === 2) picked = [b]; // a third tap starts over
    else picked.push(b);
    render();
  }));
}

/* ?t=<0..1> — review aid: open at a point of the story (the owner's phone,
   headless renders) */
function reviewAt(scrollToT) {
  const q = new URLSearchParams(location.search);
  const tq = parseFloat(q.get('t'));
  if (!(tq >= 0 && tq <= 1)) return;
  setTimeout(() => scrollToT(tq), 400);
}

/* ---------------- renderer (guarded) ---------------- */
const canvas = document.getElementById('gl');
let renderer = null;
try {
  // ?nowebgl — QA aid: exercise the document fallback on capable machines
  if (!location.search.includes('nowebgl')) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    // MSAA stays ON for phones: tile-based mobile GPUs resolve it almost for
    // free, and it is what keeps capped-DPR edges from shimmering
    if (!renderer.getContext()) renderer = null;
  }
} catch (err) {
  renderer = null;
}

if (!renderer) {
  noWebGL();
} else {
  runApp(renderer);
}

function runApp(renderer) {
  /* ---- resolution policy (after kage) ----
     One DPR cap per tier, times a live PERF.scale: the governor below trades
     pixels for frame rate on unknown hardware, because pixels are the only
     knob that works everywhere. Every size goes through the LAYOUT viewport
     (documentElement.client*), which iOS holds stable while the toolbar
     slides — innerWidth/innerHeight breathe mid-scroll and caused both
     resize churn and a stretched, soft canvas on phones. */
  const vpW = () => document.documentElement.clientWidth || window.innerWidth;
  const vpH = () => document.documentElement.clientHeight || window.innerHeight;
  /* phones were capped at 2, desktops at 1.5: the weaker GPU was drawing
     the most pixels on the site. 1.5 with MSAA on is visually the same on
     a phone; the reading copy is DOM and stays crisp regardless. */
  const DPR_CAP = isMobile ? 1.25 : 1.5;
  const PERF = { scale: 1, acc: 0, n: 0, slowRun: 0 };
  /* the stylesheet owns the canvas box (100lvh — see #gl): the buffer just
     follows it, so the toolbar-collapsed strip is always painted and no
     inline style fights the CSS */
  function applyViewport() {
    const el = renderer.domElement;
    const w = el.clientWidth || vpW(), h = el.clientHeight || vpH();
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP) * PERF.scale);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const BUILD = 'm4';
  /* ?hud — live diagnostics for remote debugging: build tag, device DPR,
     effective DPR, governor scale, buffer size, rolling frame time. */
  let hud = null, hudAcc = 0, hudN = 0, hudLast = 0;
  if (location.search.includes('hud')) {
    hud = document.createElement('div');
    hud.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99;background:rgba(0,0,0,.72);color:#8f8;font:11px/1.5 monospace;padding:6px 9px;pointer-events:none;white-space:pre';
    document.body.appendChild(hud);
  }
  function hudTick(raw) {
    if (!hud) return;
    hudAcc += raw; hudN++;
    const now = performance.now();
    if (now - hudLast < 500) return;
    hudLast = now;
    const ms = hudN ? (hudAcc / hudN * 1000) : 0;
    hudAcc = 0; hudN = 0;
    const c = renderer.domElement;
    const gl2 = renderer.getContext();
    hud.textContent = 'build ' + BUILD
      + '\ndevDPR ' + (window.devicePixelRatio || 1).toFixed(2)
      + '  cap ' + DPR_CAP
      + '\neffDPR ' + renderer.getPixelRatio().toFixed(2)
      + '  scale ' + PERF.scale.toFixed(2)
      + '\nbuf ' + c.width + 'x' + c.height
      + '  msaa ' + gl2.getParameter(gl2.SAMPLES)
      + '\nframe ' + ms.toFixed(1) + 'ms  mobile:' + isMobile;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP));
  /* the CSS sizes the canvas (#gl fills its fixed block); never pin it inline,
     or it stops at the small viewport and the page ground shows below it */
  renderer.setSize(vpW(), vpH(), false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  /* shadow mapping is a whole extra scene pass — on phones the baked AO
     already grounds everything, so the pass is desktop-only (as kage) */
  renderer.localClippingEnabled = true;   // the cut into the bank (pravesha.js) is a clipping plane on the world's materials
    renderer.shadowMap.enabled = !isMobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  /* the grade (post.js) is NOT in use: the site renders straight through
     the renderer's own ACESFilmic tone mapping (STYLED.linear is false). A
     Seijaku-style finish ran through it for one evening (19 Sept 2026) and
     was undone by the owner as grainy; the module stays for review
     (ANTARANGA.grade builds it on demand) and allocates nothing until then. */
  let gradeInst = null;
  const getGrade = () => gradeInst || (gradeInst = new Grade(renderer, { ao: !isMobile }));
  let linearMode = false;
  function setLinearMode(on) {
    if (on === linearMode) return;
    linearMode = on;
    renderer.toneMapping = on ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = on ? THREE.LinearSRGBColorSpace : THREE.SRGBColorSpace;
  }

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x030607, .028);
  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, .05, 500);
  camera.position.set(0, 2.1, 21);

  window.addEventListener('resize', applyViewport);

  /* ---------------- boot ---------------- */
  /* already running: index.html starts it as soon as preloader.js arrives */
  const preloader = window.__preloader || (window.__preloader = new BrindavanaPreloader());
  const setProgress = p => preloader.setTarget(p);

  async function boot() {
    /* the drawing is a function of THIS progress: modules landed (index.html,
       0 → .55), fonts, then the two opening stages, then the first render.
       It completes only when the first scene is renderable. */
    setProgress(.58);
    // fonts must be live before any canvas-drawn typography
    try {
      await Promise.race([
        Promise.all([
          document.fonts.load('400 100px "Marcellus"'),
          document.fonts.load('300 100px "Karla"'),
          document.fonts.load('400 100px "Karla"'),
          document.fonts.load('300 100px "Noto Sans Kannada"'),
          document.fonts.load('400 100px "Noto Serif Devanagari"'),
        ]),
        new Promise(r => setTimeout(r, 900)),   // they began fetching at page load
      ]);
    } catch (e) { /* fall back to system fonts */ }
    setProgress(.62);

    /* Build and prewarm one stage at a time, handing the thread back between
       each — a blocked thread cannot paint, and a frozen preloader reads as
       broken. The loader is released the moment the OPENING SCENE is
       renderable; everything else is raised behind the live site in scroll
       order, with every consumer guarded until its stage exists. */
    const yieldToPaint = () => new Promise(res => {
      let settled = false;
      const finish = () => { if (!settled) { settled = true; res(); } };
      requestAnimationFrame(() => setTimeout(finish, 0));
      setTimeout(finish, 55);            // never stall where rAF is asleep
    });

    const first = [
      ['river', createRiverStage],
    ];
    const stages = {};
    /* Compile a stage's programs ALONE and then TOGETHER WITH the stage it
       hands over to. Three.js keys every lit program on the number of
       lights in the scene, and at a seam two stages' lights are present at
       once, so a stage warmed on its own still recompiled every material
       in view the first time the visitor scrolled into the seam: a one
       second stall on a desktop, several on a phone, exactly where the
       transition was meant to be invisible. */
    const ORDER = ['river', 'pravesha', 'antaranga'];
    const world = (st, mode) => { if (st && st.setWorld) st.setWorld(mode); };
    /* the river's light rig (sun, sky, fill, the deepas' lights) lives in
       the opening sub-group, which its own update hides until it is due.
       A compile with that sub-group hidden keys every program on the wrong
       light count, and the first scroll into each seam the river shares
       (t .065, .875) recompiled the world in view: show it while warming. */
    const show = (st, v) => { st.group.visible = v; if (st.opening) st.opening.group.visible = v; };
    const warm = (key) => {
      const i = ORDER.indexOf(key);
      const prev = i > 0 ? stages[ORDER[i - 1]] : null;
      const me = stages[key];
      show(me, true);
      /* the house has two light sets (yard, interior) that never share a
         frame; compile each, the yard beside the river, the interior beside
         the Matha hall */
      if (me.setWorld) {
        world(me, 'out'); renderer.compile(scene, camera);
        if (prev) { show(prev, true); renderer.compile(scene, camera); show(prev, false); }
        world(me, 'in'); renderer.compile(scene, camera);
        world(me, 'auto');
      } else {
        renderer.compile(scene, camera);
        if (prev) {
          show(prev, true);
          world(prev, 'in');
          renderer.compile(scene, camera);
          world(prev, 'auto');
          show(prev, false);
        }
      }
      /* the river takes over from the layers (the night): compile beside it */
      if (key === 'antaranga' && stages.river) { show(stages.river, true); renderer.compile(scene, camera); show(stages.river, false); }
      show(me, false);
    };
    for (let i = 0; i < first.length; i++) {
      const [key, make] = first[i];
      stages[key] = make(ctx);
      scene.add(stages[key].group);
      setProgress(.62 + (i + .5) / first.length * .32);       // .62 → .94
      await yieldToPaint();
      warm(key);
      setProgress(.62 + (i + 1) / first.length * .32);
      await yieldToPaint();
    }
    /* the stone maps are drawn on their own threads while the Brindavana is
       drafted; nothing may be revealed before they land. Waiting here costs
       no main-thread time — which is the whole point: the drawing keeps its
       frames instead of freezing through six seconds of texture arithmetic. */
    await stoneMapsReady();
    setProgress(.96);
    await yieldToPaint();

    renderer.render(scene, camera);
    setProgress(.97);

    start(stages);
    setProgress(1);

    /* behind the live site: the rest of the world, in scroll order. It waits
       out the dawn-rise — a stage build (and its shader compile) is a
       main-thread stall, and a stall during the light transition or the
       visitor's first scroll reads as lag. */
    /* never begin a stage build while the visitor is actively scrolling —
       a build is a main-thread stall, and a stall mid-gesture reads as jank.
       Waiting is capped so every stage still exists well before it is due. */
    let lastInput = 0;
    window.addEventListener('scroll', () => { lastInput = performance.now(); }, { passive: true });
    const untilStill = async () => {
      const t0 = performance.now();
      /* phones wait much longer for a real pause: a stage build + shader
         compile is a 100–200ms main-thread hitch, and landing one inside a
         touch-scroll gesture is precisely the reported jank. The cap only
         exists so a stage still arrives before its chapter is due. */
      const cap = isMobile ? 45000 : 12000;
      const still = isMobile ? 1600 : 700;
      while (performance.now() - lastInput < still && performance.now() - t0 < cap) {
        await new Promise(r => setTimeout(r, 200));
      }
    };
    preloader.finished.then(async () => {
      await new Promise(r => setTimeout(r, reduced ? 300 : 5500));
      for (const [key, path, factory, yName] of LATER) {
        let mod;
        try { mod = await import(path); } catch (e) { console.warn('chapter module failed', key, e); continue; }
        OFF[key] = yName ? mod[yName] : 0;
        await untilStill();
        stages[key] = mod[factory](ctx);
        scene.add(stages[key].group);
        await stoneMapsReady();          // its stone is drawn on the pool, not here
        await rayaruReady();             // and its Rayaru is in the group before it compiles
        if (stages[key].ready) await stages[key].ready;   // the house's async parts
        await yieldToPaint();
        warm(key);
        await yieldToPaint();
        if (movements) movements.setLive(key);   // a world band may now open its curtain
      }
    });
  }

  /* ---------------- exterior cameras (world space) ---------------- */
  const A2W = (x, y, z) => approachToWorld(BRND_POS, x, y, z);
  /* THE composition: low on the water, the landing and gateway right of
     centre, the left open for the copy. Three framings by aspect
     (desktop / tablet / phone). The opening, Manchale and the return all
     stand here: one place, seen three times. */
  function frame00() {
    const ar = window.innerWidth / Math.max(1, window.innerHeight);
    /* phone: an architectural portrait. The camera stands on the axis of
       the gateway and the shrine, low and a little back, so both pillars
       frame the Brindavana dead centre, the whole architecture sits below
       the copy, and the water under the word is its footing */
    if (ar < .8)  return { P: [1, 1.2, 42], L: [8.7, 10.8, 6], fov0: 45 };      // phone
    if (ar < 1.3) return { P: [1.6, 2.0, 49], L: [7.2, 6.4, 6], fov0: 40 };     // tablet: less open foreground, more sky
    return { P: [-1.5, 1.5, 46], L: [6.5, 4.3, 6], fov0: 36 };                  // desktop
  }
  function cam00(u) {
    const { P, L, fov0 } = frame00();
    const tIdle = performance.now() / 1000;
    const sway = 1;                                 // the drift never dissolves: the walk (camStations) carries the same one on
    const dx = reduced ? 0 : (Math.sin(tIdle * .11) * .22 + Math.sin(tIdle * .047) * .14) * sway;
    const dy = reduced ? 0 : Math.sin(tIdle * .16 + 1.3) * .05 * sway;
    if (u < .3) {
      const v = smooth(remap(u, 0, .3));
      return {
        pos: A2W(P[0] + dx, lerp(P[1] + .05, P[1], v) + dy, lerp(P[2] + .6, P[2], v)),
        look: A2W(L[0] + dx * .6, L[1], L[2]),
        fov: fov0,
      };
    }
    /* The leave-taking — the camera never leaves the Brindavana, and never
       enters it (the Praveśa belongs to chapter 09). It holds the
       composition, easing forward by a step or two while the morning light
       fills the frame and the river mist stands up in front of the lens
       (hero.js, `glow`); behind that light the world becomes Bhuvanagiri,
       which opens from the same light onto a matching composition
       (purvashrama.js camOut). Memory replacing the present: no sideways
       travel, no foliage, no scene swap the eye can catch. */
    const w = smooth(remap(u, .30, 1));
    const f = [L[0] - P[0], L[1] - P[1], L[2] - P[2]];
    const fl = Math.hypot(f[0], f[2]) || 1;
    /* a short step only (was 2.2, into the grove's foliage, when the seam
       was hidden by a card): the walk along the bank continues from here */
    const step = (reduced ? .4 : 1.1) * w;
    return {
      pos: A2W(P[0] + f[0] / fl * step + dx, P[1] + .16 * w + dy, P[2] + f[2] / fl * step),
      look: A2W(L[0] + dx * .6, L[1] + .5 * w, L[2]),
      fov: fov0 - 1.2 * w,
    };
  }
  /* ---- the chapters (01–08): ONE WALK along the bank, station to station.
     Every beat of the page has a place in the opening's world (stations.js),
     and the camera is authored per beat as a stand (P), a subject (S) and
     where the subject sits in the frame (nx, ny in -1..1), so the same
     stand frames the thing right of the copy on a wide frame and above it on
     a phone. Between beats the camera eases (smoothstep: it settles into
     each station and gathers out of it), with the opening's idle drift all
     the way through. Coordinates are the approach frame (hero.js); `sl` is
     the flight's own frame (stations.js). The stations' progress p is the
     chapters' docP at which each beat is centred, measured from the page
     (movements.centerP), so the walk lands on the words. ---- */
  let riverRef = null;   // the river stage, once built (start): the moon's place comes from it
  const MOON_A = () => riverRef && riverRef.moonApproach ? riverRef.moonApproach() : [-24.6, 16, -84];
  const STATIONS = [
    { id: 'mv-lead', comp: 1.1 },
    /* BHUVANAGIRI IS THE HOUSE (threshold.js, 18 Sept 2026): the walk leaves
       the composition along the near strip and comes up to the house's gate
       on the right bank (01, the approach: the whole gatehouse, its door
       ajar on the yard's light), stands at the left bench where the ॐ is
       written in the sand (02, the first lesson), then at the right bench
       where the veena lies on its cloth (02m, the household). Anchors are
       the threshold's own points, stepped out along its front (f) and its
       right (r): ['door', f, r, y] (hero.js thresholdPoint). */
    { id: 'mv-01',  d: { P: ['door', 13.5, -1.4, 1.9], S: ['door', 0, .2, 2.2], nx: .42, ny: .02, fov: 36 }, m: { P: ['door', 11, -.6, 1.8], S: ['door', 0, 0, 2.5], nx: .06, ny: .28, fov: 45 } },
    /* both read from the threshold, looking in through the open gate at the verandah */
    /* in through the open gate: the first lesson at the verandah's dais, the household at the veena beside it */
    { id: 'mv-02',  g: 0, d: { P: ['door', -4.0, .5, 1.5], S: ['sand', 0, 0, .8], nx: .30, ny: -.10, fov: 32 }, m: { P: ['door', -3.9, .4, 1.65], S: ['sand', 0, 0, .8], nx: 0, ny: .30, fov: 44 } },
    { id: 'mv-02m', g: 0, d: { P: ['door', -4.3, 2.7, 1.45], S: ['veena', 0, 0, .68], nx: .30, ny: -.08, fov: 32 }, m: { P: ['door', -4.2, 2.9, 1.7], S: ['veena', 0, 0, .68], nx: 0, ny: .30, fov: 44 } },
    /* out of the yard by the gate (via: a waypoint the walk passes through), then down the bank to the Matha */
    { id: 'mv-02b', via: ['door', 2.2, .2, 1.6], d: { P: sl(-4.2, 1.5, 24.5), S: sl(2.8, 6.4, 13), nx: .22, ny: .06, fov: 36 }, m: { P: sl(-1.2, 1.4, 25), S: sl(2.8, 6.8, 13), nx: 0, ny: .3, fov: 48 } },
    { id: 'mv-02d', d: { P: [-5, 1.7, 31], S: [8, 4.2, 6], nx: .2, ny: .02, fov: 36 }, m: { P: [-1, 1.5, 34], S: [8.7, 6, 6], nx: 0, ny: .28, fov: 45 } },
    { id: 'mv-03',  g: 0, d: { P: sl(0, 2.3, 15.6), S: sl(0, 3.3, 1.9), nx: 0, ny: .04, fov: 36 }, m: { P: sl(0, 2.2, 16.4), S: sl(0, 3.8, 1.9), nx: 0, ny: .16, fov: 46 } },
    { id: 'mv-04',  g: 0, d: { P: sl(5.4, 2.4, 13.6), S: sl(0, .82, 9.5), nx: .24, ny: -.06, fov: 36 }, m: { P: sl(1.9, 2.6, 13.9), S: sl(0, .82, 9.5), nx: 0, ny: .3, fov: 46 } },
    { id: 'mv-04a', g: 0, book: 0 }, { id: 'mv-04b', g: 0, book: 1 }, { id: 'mv-04c', g: 0, book: 2 }, { id: 'mv-04d', g: 0, book: 3 }, { id: 'mv-04e', g: 0, book: 4 },
    /* TATTVAVĀDA · ONE SLOW PULL-BACK (19 Sept 2026, the owner's eleventh
       brief). The five differences used to hop the camera across the bay
       (the moon from the left bank, the stone from beside the gateway, the
       moon again, the steps from the inlet, the bank again): every beat a
       new place, the look swinging half a circle. Now the walk leaves the
       landing through the gateway's opening and comes to stand on the
       water of the bay, and from there it only steps BACK, a metre or two
       a beat, along the sacred axis to the near bank, until Manchale's
       composition (mv-07, the opening's own frame) is reached by arriving
       at it. The stand never crosses the water again; what moves between
       the beats is the gaze, turning from the moon to its path, to the
       stone in the gateway, back to the water, to the flight's foot, and
       out to the whole of it. Two of these beats are read centred (mv-05 and
       mv-05f, style.css .sec.mid): their subjects stand above the words;
       the rest keep the column, the subject right of it (or left, for the
       two .right differences). */
    { id: 'mv-05',  d: { P: [-6.0, 1.55, 30.5], S: 'moon', nx: 0, ny: .48, fov: 36 }, m: { P: [-5.4, 1.6, 32.5], S: 'moon', nx: 0, ny: .40, fov: 46 } },
    { id: 'mv-05a', d: { P: [-6.4, 1.3, 32.0], S: 'moonpath', nx: .24, ny: .04, fov: 36 }, m: { P: [-5.8, 1.35, 34.0], S: 'moonpath', nx: 0, ny: .22, fov: 46 } },
    /* the moon and the stone: the black stone in its gateway, across the bay, lit by the same moon */
    { id: 'mv-05b', d: { P: [-6.7, 1.5, 33.5], S: sl(0, 3.2, .5), nx: -.30, ny: .08, fov: 38 }, m: { P: [-6.1, 1.6, 35.5], S: sl(0, 3.6, .5), nx: 0, ny: .32, fov: 46 } },
    { id: 'mv-05c', d: { P: [-7.0, 1.2, 35.0], S: 'moonpath', nx: .20, ny: .02, fov: 34 }, m: { P: [-6.4, 1.3, 37.0], S: 'moonpath', nx: 0, ny: .22, fov: 46 } },
    /* the flight's foot, where the stone goes into the water */
    { id: 'mv-05d', d: { P: [-7.0, 1.3, 36.4], S: sl(-4.5, .3, 19.0), nx: -.24, ny: .0, fov: 36 }, m: { P: [-6.4, 1.4, 38.4], S: sl(-5.0, .2, 20.8), nx: 0, ny: .26, fov: 46 } },
    { id: 'mv-05e', d: { P: [-6.6, 1.2, 37.8], S: sl(-3.5, .4, 16.5), nx: .30, ny: .0, fov: 36 }, m: { P: [-6.0, 1.3, 39.8], S: sl(-4.2, .4, 18.0), nx: 0, ny: .28, fov: 46 } },
    /* the whole of it: the gateway, the stone, the lamps, seen from the water's edge */
    { id: 'mv-05f', d: { P: [-6.0, 1.6, 39.4], S: [7, 4.6, 6], nx: .10, ny: .24, fov: 38 }, m: { P: [-5.4, 1.6, 41.4], S: [8.7, 6.4, 6], nx: 0, ny: .30, fov: 46 } },
    /* the road: the far bank, from the near bank's edge, a step short of the composition */
    { id: 'mv-06',  d: { P: [-4.6, 2.0, 41.4], S: [-13, 4.6, -44], nx: .08, ny: .06, fov: 42 }, m: { P: [-4.0, 2.0, 43.0], S: [-10, 4.4, -46], nx: 0, ny: .30, fov: 48 } },
    { id: 'mv-07',  comp: 1.4 },
    /* the walk into the stone: through the gateway's opening (via), across
       the terrace, until the black face fills the frame; the lamps' warmth
       grows and the air closes on the way (river.js tailP) */
    /* the tail: through the gateway to Manchale's composition at night, the stone in view: where Brindavana Pravesha's own path begins (pravesha.js KEYS[0]) */
    { id: 'mv-tail', g: 0, d: { P: sl(3.5, 2.8, 22.0), S: sl(0, 2.8, 1.0), nx: 0, ny: 0, fov: 36 }, m: { P: sl(3.5, 3.0, 27.0), S: sl(0, 2.8, 1.0), nx: 0, ny: 0, fov: 36 } },
  ];
  const BOOK_S = [[-2.55, 9.15], [-1.30, 9.95], [-.05, 9.05], [1.25, 9.9], [2.55, 9.2]];
  const _q = new THREE.Quaternion(), _f2 = new THREE.Vector3(), _r2 = new THREE.Vector3(), _u2 = new THREE.Vector3(0, 1, 0);
  /* an anchor on the threshold: ['door' | 'sand' | 'veena' | …, f, r, y] → the approach frame (hero.js thresholdPoint) */
  const anchored = (v) => {
    const TH = riverRef && riverRef.opening && riverRef.opening.thresholdPoint ? riverRef.opening : null;
    return (Array.isArray(v) && typeof v[0] === 'string' && TH) ? TH.thresholdPoint(v[0], v[1], v[2], v[3]) : v;
  };
  /* a station's shot for this aspect: the subject S placed at (nx, ny) of the frame */
  function stationShot(st) {
    const ar = window.innerWidth / Math.max(1, window.innerHeight);
    const phone = ar < .8;
    if (st.comp !== undefined) {
      const { P, L, fov0 } = frame00();
      const f = [L[0] - P[0], L[1] - P[1], L[2] - P[2]];
      const fl = Math.hypot(f[0], f[2]) || 1;
      return { P: [P[0] + f[0] / fl * st.comp, P[1] + .16, P[2] + f[2] / fl * st.comp], L: [L[0], L[1] + .5, L[2]], fov: fov0 - 1.2 };
    }
    let k = phone ? st.m : st.d;
    if (st.book !== undefined) {
      const [bx, bz] = BOOK_S[st.book];
      const S = sl(bx, .84, bz);
      k = phone ? { P: sl(bx + 1.7, 2.1, bz + 2.0), S: sl(bx - .1, .86, bz), nx: 0, ny: .30, fov: 44 } : { P: sl(bx + 1.75, 1.95, bz + 2.05), S, nx: .3, ny: -.04, fov: 32 };
    }
    k = { ...k, P: anchored(k.P), S: anchored(k.S) };
    let S = k.S;
    if (S === 'moon') S = MOON_A();
    else if (S === 'moonpath') {
      /* the moon's reflection on the bay: from the stand, down the moon's azimuth, at the water */
      const m = MOON_A(), P = k.P;
      const dx = m[0] - P[0], dz = m[2] - P[2], dl = Math.hypot(dx, dz) || 1;
      const el = Math.atan2(m[1] - P[1], dl), h = P[1] + .9;
      const dist = Math.min(40, h / Math.tan(Math.max(.03, el)));
      S = [P[0] + dx / dl * dist, -.9, P[2] + dz / dl * dist];
    }
    const fov = phone ? Math.min(k.fov, 46) : (ar < 1.3 ? k.fov + 3 : k.fov);
    _f2.set(S[0] - k.P[0], S[1] - k.P[1], S[2] - k.P[2]);
    const dist = _f2.length() || 1; _f2.normalize();
    const vHalf = fov / 2 * Math.PI / 180, hHalf = Math.atan(Math.tan(vHalf) * ar);
    _r2.crossVectors(_f2, _u2).normalize();
    _q.setFromAxisAngle(_r2, -k.ny * vHalf); _f2.applyQuaternion(_q);
    _q.setFromAxisAngle(_u2, k.nx * hHalf); _f2.applyQuaternion(_q);
    return { P: k.P, L: [k.P[0] + _f2.x * dist, k.P[1] + _f2.y * dist, k.P[2] + _f2.z * dist], fov };
  }
  /* the walk: p is the chapters' progress; the stations' own p come from the page */
  function camStations(p) {
    const ps = STATIONS.map(st => st.p ?? 0);
    let i = 0;
    while (i < STATIONS.length - 2 && p > ps[i + 1]) i++;
    const a = STATIONS[i], b = STATIONS[i + 1];
    /* the walk never quite stops: it settles into each station (smoothstep)
       but keeps a slow creep through it (a little of the linear), so the
       chapters read as one movement, not a stop at every screen */
    const uu = clamp01((p - ps[i]) / Math.max(1e-4, ps[i + 1] - ps[i]));
    const w = reduced ? (p >= ps[i + 1] ? 1 : 0) : lerp(smooth(uu), uu, .16);
    const A = stationShot(a), B = stationShot(b);
    const tIdle = performance.now() / 1000;
    const ix = reduced ? 0 : Math.sin(tIdle * .11) * .22 + Math.sin(tIdle * .047) * .14;   // the opening's own drift (cam00), unchanged across the seam
    const iy = reduced ? 0 : Math.sin(tIdle * .16 + 1.3) * .05;
    const L3 = (u, v, k) => lerp(u, v, k);
    /* g: how much of the edge grass belongs at this station (none on the stone) */
    if (riverRef) riverRef.stations.edgeAmt = L3(a.g ?? 1, b.g ?? 1, w);
    /* a waypoint (via): the walk goes through it on its way, so a wall or a
       gate is never crossed; the look still turns steadily from A to B */
    let P0 = A.P, P1 = B.P, wp = w;
    const V = b.via ? anchored(b.via) : null;
    if (V) { if (w < .5) { P1 = V; wp = w * 2; } else { P0 = V; wp = (w - .5) * 2; } }
    return {
      pos: A2W(L3(P0[0], P1[0], wp) + ix, L3(P0[1], P1[1], wp) + iy, L3(P0[2], P1[2], wp)),
      look: A2W(L3(A.L[0], B.L[0], w) + ix * .6, L3(A.L[1], B.L[1], w), L3(A.L[2], B.L[2], w)),
      fov: L3(A.fov, B.fov, w),
    };
  }
  /* Brindavana Pravesha and the return: ONE camera path in the river world
     (pravesha.js cam), from where the walk left it at Manchale, down into
     the chamber, up with the layers, and back out to the opening's hold,
     which is frame00 itself: the same composition, reached by moving, never
     by a cut. The opening's idle drift comes in as the hold is reached; the
     footer's progress (tilt) settles the camera lower, gently. */
  function camPravesha(t, tilt = 0) {
    const p = clamp01((t - T9A) / (1 - T9A));
    const hold = frame00();
    const phone = (window.innerWidth / Math.max(1, window.innerHeight)) < .8;
    const s = riverRef && riverRef.pravesha ? riverRef.pravesha.cam(p, hold, phone) : { P: hold.P, L: hold.L, fov: hold.fov0, hold: 1 };
    const tIdle = performance.now() / 1000;
    const sway = reduced ? 0 : s.hold;
    const dx = (Math.sin(tIdle * .11) * .22 + Math.sin(tIdle * .047) * .14) * sway;
    const dy = Math.sin(tIdle * .16 + 1.3) * .05 * sway;
    const k = smooth(tilt) * .45;
    const ph = phone ? 1.7 : 1;
    return {
      pos: A2W(s.P[0] + dx + 1.2 * k, s.P[1] + dy - .45 * k, s.P[2] - 3.5 * k * ph),
      look: A2W(s.L[0] + dx * .6 - 2.5 * k, s.L[1] - 5.2 * k * ph, s.L[2] + 12 * k),
      fov: s.fov + 3 * k,
    };
  }

  /* ---------------- fog / atmosphere per chapter ---------------- */
  /* the air of each 3D movement, graded to the six. Chapters 01–08 are the
     document: nothing renders under its ground, so their entries simply
     hold the sanctum's air, which is what the ground dissolves onto. */
  const SANCTUM = { c: 0x1e1f16, d: .055 };   // Earth Green dark (sub-ranges override)
  const NIGHT_HEX = 0x0d0d09;                  // THE ONE DARK (css --night): the vigil's air, the night ground, the curtains, the veil into the sanctum
  const NIGHT = { c: 0x10141d, d: .0056 };     // the bank at night under the chapters: the return's own night air, the far bank still there
  const AFTERNOON = { c: 0xcfc3a4, d: .0060 };  // the same air in the afternoon, Bone in the haze
  const ATMOS = [
    { c: 0x9c93b8, d: .0058 }, // 00 mantralaya at first light — dusty dawn lavender (settled; not graded)
    NIGHT, NIGHT, NIGHT, NIGHT, NIGHT, NIGHT, NIGHT, NIGHT,     // 01–08 the chapters: overridden per frame by the hour (river.js hour), see frame()
    SANCTUM,                   // 09 the sanctum
    { c: 0x161225, d: .0058 }, // 00 return: pre-dawn, then the dawn's own colour (see frame)
  ];

  /* stage visibility windows in global t (with pads for transitions). The
     river stays under the chapters (01–08, at night); the sanctum is up
     before the dark ground at the chapters' tail dissolves onto it. */
  /* the chapters' worlds: the air of each, by band progress v */
  const BAND_ATMOS = {
    /* the lamp world: the dark itself; the flames are the only light. The
       clear colour and the fogged floor must meet with no horizon between
       them, and both are the night the curtains and the ground are painted
       in, so a chapter's edge never shows against its own air. */
    lamps(p, beat) { return { c: NIGHT_HEX, d: beat === '06' ? .02 : .075 }; },   // the road sees far
    purva(v) {
      /* the yard's warm open morning, then the lamp-dark of the rooms past the threshold */
      const inn = smooth(remap(v, .20, .27));
      return { c: new THREE.Color(0x74572f).lerp(new THREE.Color(0x0a0703), inn), d: lerp(.0085, .042, inn) };
    },
  };
  function visibilityPlan(t, band = null) {
    /* every band world is named, so the one that has passed is hidden */
    const worlds = {};
    for (const k in BAND_ATMOS) worlds[k] = !!band && band.key === k;
    if (band) return { ...worlds, river: false, pravesha: false, antaranga: false };
    return {
      ...worlds,
      river: true,
    };
  }

  function start(stages) {
    riverRef = stages.river;
    /* more scroll per beat than before: every passage has to be read on a
       phone before it moves, and a short swipe must never skip a beat */
    /* every beat still lives a viewport or more (scroll.js); the site is
       simply shorter than it was, because there is less of it */
    /* 01–08 · the chapters: the page and its behaviour (js/movements.js).
       Built before the timeline, which measures it. */
    movements = createMovements({ reduced, scrollToY: (y) => timeline.scrollToY(y) });
    const timeline = new ScrollTimeline({
      pages: isMobile ? 48 : 52, reduced,
      doc: movements.el, sp00: document.getElementById('sp00'), sp09: document.getElementById('sp09'),
    });
    const captions = new Captions();
    /* the river's dusk ends (in t) where the night ground begins to rise at
       the first chapter, so the last light is always gone before the frame
       goes dark, at every viewport (river.js setDusk) */
    /* the page is measured: every station takes the docP at which its beat
       is centred, the stations' things take their windows, and the day's
       arc its hours, all from where the words actually are */
    function syncSeams() {
      movements.measure();
      for (const st of STATIONS) st.p = st.id === 'mv-lead' ? 0 : st.id === 'mv-tail' ? 1 : movements.centerP(st.id);
      const r = (id) => movements.rangeP(id);
      const c = (id) => movements.centerP(id);
      if (stages.river) {
        stages.river.winds = {
          works: [r('mv-04')[0] + .006, r('mv-05')[0]],
          books: ['mv-04a', 'mv-04b', 'mv-04c', 'mv-04d', 'mv-04e'].map(id => [...r(id), c(id)]),   // [enters, leaves, centred]: the cover opens from the centre, once the walk has arrived and the cover has been seen
          ...Object.fromEntries(['a', 'b', 'c', 'd', 'e'].map(k => { const [a, b] = r('mv-05' + k), L = b - a; return ['pb' + k, [a + .30 * L, b - .30 * L]]; })),   // each name only while its own beat is centred
          dream: [r('mv-02d')[0] - .004, c('mv-02d') - .004, c('mv-02d') + .01, r('mv-02d')[1] + .012],
          edges: [c('mv-07'), 1],
        };
        /* the morning brightens through Bhuvanagiri (the house is seen looking away from the sunrise, whose sky is still the dawn's violet), full day by the household */
        stages.river.dayArc = { aft: [r('mv-01')[0], c('mv-01') + .006], duskA: r('mv-02d')[0], duskB: c('mv-03') + .01 };
      }
    }
    syncSeams();
    const veilEl = document.getElementById('veil');
    const groundEl = document.getElementById('ground');
    const body = document.body;
    const aaradhaneLink = document.getElementById('aaradhane-link');
    const footerEl = document.getElementById('footer');

    /* a lost context must not strand the visitor on a frozen frame */
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      veilEl.style.opacity = 1;
    });
    canvas.addEventListener('webglcontextrestored', () => {
      veilEl.style.opacity = 0;
    });

    /* ---------------- navigation ---------------- */
    const hero = document.getElementById('hero');
    const wordEl = document.getElementById('word');
    /* the phone menu: one button opening a small panel of the section links */
    const menuBtn = document.getElementById('menu-btn');
    const setNav = (open) => {
      body.classList.toggle('nav-open', open);
      if (menuBtn) {
        menuBtn.setAttribute('aria-expanded', String(open));
        menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      }
    };
    if (menuBtn) {
      menuBtn.addEventListener('click', () => setNav(!body.classList.contains('nav-open')));
      window.addEventListener('keydown', e => { if (e.key === 'Escape') setNav(false); });
    }
    document.querySelectorAll('[data-ch]').forEach(b =>
      b.addEventListener('click', () => { timeline.scrollToChapter(+b.dataset.ch); setNav(false); }));
    /* the chapters are addressed by element (movements.js); close the phone menu after any link */
    document.querySelectorAll('[data-sec]').forEach(b => b.addEventListener('click', () => setNav(false)));

    /* the soundscape: silent until asked for (js/audio.js) */
    const ambience = createAmbience({ button: [document.getElementById('sound-btn'), document.getElementById('sound-btn-m')] });

    /* mouse parallax — depth only, never control */
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    if (!isMobile && !reduced) {
      window.addEventListener('mousemove', e => {
        mouse.tx = (e.clientX / window.innerWidth - .5) * 2;
        mouse.ty = (e.clientY / window.innerHeight - .5) * 2;
      });
    }

    const fogCol = new THREE.Color(0x161225);      // opens at pre-dawn
    const fogTarget = new THREE.Color();
    const preDawnFog = new THREE.Color(0x161225);
    let fogD = ATMOS[0].d;

    /* the arrival: the hero opens in darkness and the sun is raised —
       a full sunrise arc (twilight, crest, climb), so it takes its time */
    /* the arrival: the land is already there at pre-dawn; the light comes
       up over a few seconds, and the first scroll finishes it — the visitor
       understands dawn-to-morning inside one comfortable gesture */
    let riseT0 = -1, riseOverride = -1;
    const RISE_DUR = 5.5;
    preloader.finished.then(() => { riseT0 = performance.now() / 1000 + .3; reviewAt((tt) => timeline.scrollToY(timeline.yAt(tt))); ambience.tryStart(); });
    document.body.classList.add('predawn');
    const riseNow = (now, t = 0) => {
      if (riseOverride >= 0) return riseOverride;
      if (reduced) return 1;
      if (riseT0 < 0) return 0;
      const u = clamp01((now - riseT0) / RISE_DUR);
      return Math.max(u * u * (3 - 2 * u), smooth(remap(t, .003, .026)));
    };

    const _right = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _fwd = new THREE.Vector3();
    const camS = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 42, init: false, force: false };
    let lastTime = performance.now() / 1000;
    const dom = { veilO: '', veilB: '', heroO: '', heroT: '', heroP: null, wordO: '', wordT: '', groundO: '', gDark: null, inDoc: null, bandKey: null };

    /* the governor reads true frame times and trades resolution for frame
       rate (after kage): a slow average steps PERF.scale down (floor .6), a
       fast one climbs back toward full. Warmup skips boot; stalls over 250ms
       are loads/builds, not steady state, and are not evidence. */
    const perfWarmUntil = performance.now() / 1000 + 4;
    let perfSkipUntil = 0;
    function govern(raw, manual) {
      const now = performance.now() / 1000;
      if (manual || document.hidden || now < perfWarmUntil) return;
      /* a spike is a shader compile, a stage build or a GC — an EVENT, not
         the steady state. It and its recovery tail are not evidence; only
         sustained mid-range slowness may pull the resolution down. */
      if (raw > .09) {
        perfSkipUntil = now + 1.2; PERF.acc = 0; PERF.n = 0;
        /* one long frame is an event; ten in a row is the steady state on a
           device that is simply overloaded — step down without waiting for
           an average that can never accumulate */
        if (++PERF.slowRun >= 10 && PERF.scale > .6) {
          PERF.scale = Math.max(.6, PERF.scale * .75);
          PERF.slowRun = 0;
          applyViewport();
        }
        return;
      }
      PERF.slowRun = 0;
      if (now < perfSkipUntil) return;
      PERF.acc += raw; PERF.n++;
      if (PERF.n >= 40 || PERF.acc > .9) {
        const avg = PERF.acc / PERF.n;
        PERF.acc = 0; PERF.n = 0;
        if (avg > .023 && PERF.scale > .6) {
          PERF.scale = Math.max(.6, PERF.scale * .85);
          applyViewport();
        } else if (avg < .0138 && PERF.scale < 1) {
          PERF.scale = Math.min(1, PERF.scale + .1);
          applyViewport();
        }
      }
    }

    function frame(manual = false) {
      const now = performance.now() / 1000;
      const raw = now - lastTime;
      const dt = clamp(raw, .001, .05);
      lastTime = now;
      govern(raw, manual);
      hudTick(raw);

      // self-heal renderer size (page may have loaded in a hidden viewport)
      const el = renderer.domElement;
      const w = el.clientWidth, h = el.clientHeight;
      const size = renderer.getSize(new THREE.Vector2());
      if (w > 0 && h > 0 && (size.x !== w || size.y !== h)) {
        applyViewport();
        timeline.resize();
        syncSeams();
      }

      const t = timeline.update(dt);
      const ci = timeline.chapterAt(t);
      const ch = CHAPTERS[ci];
      const u = clamp01((t - ch.a) / (ch.b - ch.a));

      /* the chapters' world band under the frame, if one is open (movements.js) */
      /* the beats read the DAMPED scroll (the same t the camera follows), so
         the words and the walk arrive together; a flick of the wheel never
         lands a passage a second before its place */
      const mv = movements.update(timeline.yAt(t), timeline.h || 1, t >= T9A - .01);
      const band = mv.band && stages[mv.band.key] ? mv.band : null;

      /* visibility */
      const plan = visibilityPlan(t, band);
      for (const k in plan) if (stages[k]) stages[k].setVisible(plan[k]);

      /* per-stage updates (only when visible) */
      /* aligned with river.js's openRaw: the opening (and its linear grade)
         holds through the whole leave-taking, releasing only in the covered
         final hair of the chapter */
      const openNow = t < .5 ? 1 - smooth(remap(t, .06995, .0703)) : 0;
      const rise = riseNow(now, t);
      if (rise > .02) { body.classList.remove('predawn'); body.classList.add('hero-in'); }
      body.classList.toggle('past-hero', t > .008);
      setLinearMode(STYLED.linear && openNow > .35);
      /* the night ground (#ground, --night) at the two seams of the
         chapters. At the head: dusk has fallen in view (river.js, its end
         synced to this seam), then the ground rises over the bank, the
         last light going, and holds while the first band's curtain, the
         same colour, takes over under it; so the curtain's edge never
         shows against the sky. At the tail it rises over the last lamp and
         dissolves onto the sanctum's first frame. Driven by the raw scroll,
         because the chapters scroll raw. */
      const sy = window.scrollY, vh = timeline.h || 1;
      /* no ground at the head: the dusk falls in view (river.js, its end
         synced to the first chapter by syncSeams) and the chapters are
         read on the night bank itself */
      /* no ground at the tail either: the camera walks through the gateway
         to the Brindavana's stone until it fills the frame, and the veil into
         the sanctum (scroll.js) takes over from the black stone itself */
      const gTop = 0, gTail = 0;
      const groundO = 0;
      const go = groundO.toFixed(3);
      if (go !== dom.groundO) { dom.groundO = go; groundEl.style.opacity = go; }
      const gDark = gTail > gTop;
      if (gDark !== dom.gDark) { dom.gDark = gDark; groundEl.classList.toggle('dark', gDark); }
      /* nothing is drawn under the dark ground, under an opaque read band,
         or under a world band's closed curtain */
      const covered = groundO >= .999 || mv.covered;
      /* the rail and the nav follow the chapters */
      const inDoc = sy > timeline.y0 - .3 * vh && sy < timeline.y1 - .6 * vh;
      if (inDoc !== dom.inDoc) { dom.inDoc = inDoc; body.classList.toggle('in-doc', inDoc); }
      if (band && !covered) stages[band.key].updateV(now, band.p, band.beat);

      /* the chapters' progress, for the river's night events (river.js docP) */
      stages.river.docP = clamp01((t - DOC_A) / (DOC_B - DOC_A));
      /* the walk into the stone: 0 at Manchale's composition, 1 at the face */
      { const tailSt = STATIONS[STATIONS.length - 2]; const p0 = tailSt.p ?? .97; stages.river.tailP = clamp01((stages.river.docP - p0) / Math.max(1e-3, 1 - p0)); }
      if (plan.river && !covered) stages.river.update(now, t, camera, renderer, scene, linearMode, rise);
      /* Brindavana Pravesha and the return: one path in the river world (pravesha.js), p 0..1 over T9A..1 */
      const pP = clamp01((t - T9A) / (1 - T9A));
      if (stages.river && stages.river.pravesha) stages.river.pravesha.update(now, t < T9A - .02 ? 0 : pP, stages.river.hour.night);

      /* camera routing. The page (05) and the five words (06) are held
         grounds with no world behind them: the camera simply stays where
         the hall left it, and takes the road's first shot as the Bone
         ground clears. */
      let shot, offsetY = 0;
      switch (ci) {
        case 0:
          shot = cam00(u);
          if (window.__camOverride) { const o = window.__camOverride; shot = { pos: A2W(...o.pos), look: A2W(...o.look), fov: o.fov || shot.fov }; }
          break;
        case 1: case 2: case 3: case 4: case 5: case 6: case 7: case 8:
          /* the chapters: the bank at night under the copy, the camera
             moving chapter to chapter; then the sanctum's first frame (a
             cut, under the dark ground). */
          if (band) { shot = stages[band.key].camV(band.p, band.beat); offsetY = OFF[band.key] || 0; }
          else shot = camStations(clamp01((t - DOC_A) / (DOC_B - DOC_A)));
          break;
        case 9:
          shot = camPravesha(t);
          break;
        default: {
          /* past the end of t the footer scrolls in over the last frame: its progress tilts the camera to the lotus */
          const fh = footerEl ? Math.max(1, footerEl.offsetHeight) : 1;
          const fp = clamp01((window.scrollY - timeline.max) / Math.max(1, fh - (timeline.h || 1)));
          if (stages.river) stages.river.footerP = fp;
          /* the footer is one viewport: its lines are in the frame once the
             last half-viewport of the story is scrolled (fp itself stays 0) */
          body.classList.toggle('in-footer', window.scrollY > timeline.max - (timeline.h || 1) * .5);
          shot = camPravesha(t, fp);
          break;
        }
      }

      // expose stage-local camera position (used by look-at typography)
      camera.userData.localPos = shot.pos.clone();
      camera.userData.localZ = shot.pos.z;

      const pos = shot.pos.clone(); pos.y += offsetY;
      const look = shot.look.clone(); look.y += offsetY;

      /* parallax: shift the camera slightly in its own plane */
      mouse.x = damp(mouse.x, mouse.tx, 1.6, dt);
      mouse.y = damp(mouse.y, mouse.ty, 1.6, dt);
      camera.userData.mouse = mouse;
      if (!reduced) {
        _fwd.subVectors(look, pos).normalize();
        _right.crossVectors(_fwd, _up).normalize();
        const amp = lerp(.2, .12, smooth(remap(t, .04, .10)));   // the hero answers the cursor most; the walk a little less, eased, never stepped
        pos.addScaledVector(_right, mouse.x * amp);
        pos.y += -mouse.y * amp * .6;
      }

      /* the shot is a TARGET. Every chapter authors its own keys, and until
         now the camera copied them raw, so every keyframe stop, every C0
         kink and every pop between segments was on screen. One critically
         damped follow gives the whole site a single temporal character:
         moves gather and settle the same way in the yard, the hall and the
         sanctum. A jump larger than a room (a stage switch under a veil, a
         chapter link) is a cut and is taken at once, never flown through. */
      const fovT = isMobile ? Math.min(shot.fov + 6, 50) : shot.fov;
      const lam = reduced ? 40 : 7.5;
      const jump = camS.init ? camS.pos.distanceTo(pos) : 1e9;
      if (!camS.init || camS.force || jump > 12) {
        camS.pos.copy(pos); camS.look.copy(look); camS.fov = fovT; camS.init = true; camS.force = false;
      } else {
        const k = 1 - Math.exp(-lam * dt);
        camS.pos.lerp(pos, k); camS.look.lerp(look, k); camS.fov += (fovT - camS.fov) * k;
      }
      camera.position.copy(camS.pos);
      camera.lookAt(camS.look);
      camera.fov = camS.fov;
      camera.updateProjectionMatrix();

      /* atmosphere — scene 09 blends through its movements: the sanctum,
         the layers, then the bank at night; the return is the dawn again */
      let atm = ATMOS[ci];
      if (band && BAND_ATMOS[band.key]) atm = BAND_ATMOS[band.key](band.p, band.beat);
      /* a band opening or closing is a cut under its curtain: the air changes
         at once, never blends across the switch of worlds */
      const bandKey = band ? band.key : null;
      const bandCut = bandKey !== dom.bandKey; dom.bandKey = bandKey;
      if (atm.c && atm.c.isColor) fogTarget.copy(atm.c); else fogTarget.setHex(atm.c);
      let fogDTarget = atm.d;
      /* the chapters: the air follows the hour on the bank (river.js): the
         dawn's own, warming to the afternoon's Bone haze, then the night's */
      if (ci >= 1 && !band && stages.river) {   // the chapters, the Pravesha and the return: one bank, its hours
        const h = stages.river.hour;
        fogTarget.setHex(ATMOS[0].c).lerp(new THREE.Color(AFTERNOON.c), h.day * .85).lerp(new THREE.Color(NIGHT.c), h.night);
        fogDTarget = lerp(lerp(ATMOS[0].d, AFTERNOON.d, h.day), NIGHT.d, h.night) + .004 * smooth(stages.river.tailP || 0);   // the air closes a little at Manchale
      }
      if (ci === 0) fogTarget.lerp(preDawnFog, 1 - rise);
      if (ci === 0 && !STYLED.fog) fogDTarget = .0008;
      /* (the pale fog flood at the end of the opening was removed: the day
         goes to night in view instead, river.js `dusk`) */
      /* Bhuvanagiri resolves out of the same light: the mist is thick for
         the first moments of the chapter and clears as the yard is read */
      /* (the old stone-approach haze ramp lived here — removed with the
         dive itself: the leave-taking needs the grove crisp, not fogged) */
      if (bandCut) { fogCol.copy(fogTarget); fogD = fogDTarget; }
      fogCol.lerp(fogTarget, 1 - Math.exp(-2.2 * dt));
      fogD = damp(fogD, fogDTarget, 2.2, dt);
      scene.fog.color.copy(fogCol);
      scene.fog.density = fogD;
      renderer.setClearColor(fogCol, 1);

      /* captions + veil + UI states */
      captions.update(t, reduced);
      /* the veil is a colour state (scroll.js VEILS) */
      const vl = veilAt(t);
      /* style writes are forced recalcs; on a phone they compete with the
         touch scroll itself, so nothing is written unless it changed */
      const vo = vl.o.toFixed(3);
      if (vo !== dom.veilO) { dom.veilO = vo; veilEl.style.opacity = vo; }
      const vb = vl.col;
      if (vb !== dom.veilB) { dom.veilB = vb; veilEl.style.background = vb; }
      /* the interface steps back in the dark of the Brindavana, and takes
         dark ink on the light grounds */
      body.classList.toggle('ui-quiet', t > .717 && t < .80);
      /* dark ink for the moment the morning light fills the frame */
      body.classList.toggle('ui-light', vl.light > .5);
      aaradhaneLink.classList.toggle('visible', t > .94);

      ambience.update(t, dt, rise);

      /* the opening layers leave as the journey begins; their arrival is the
         CSS hero entrance, released by body.hero-in (see style.css) */
      /* written while the layers are leaving, and once more after: a jump
         straight past the window (a chapter link, a review step) must still
         land them at zero */
      if (hero && (t < .06 || dom.heroO !== '0.000')) {
        const leave = smooth(remap(t, .020, .058));
        const ho = (1 - leave).toFixed(3);
        if (ho !== dom.heroO) { dom.heroO = ho; hero.style.opacity = ho; }
        const ht = `translate(${(mouse.x * -13).toFixed(1)}px, ${(leave * -26 + mouse.y * -8).toFixed(1)}px)`;
        if (ht !== dom.heroT) { dom.heroT = ht; hero.style.transform = ht; }
        // selectable while readable; inert once it has faded from the scene
        const hp = leave < .65 ? '' : 'none';
        if (hp !== dom.heroP) { dom.heroP = hp; hero.style.pointerEvents = hp; }
      }
      if (wordEl && (t < .06 || dom.wordO !== '0.000')) {
        const wordO = 1 - smooth(remap(t, .014, .046));
        const wo = wordO.toFixed(3);
        if (wo !== dom.wordO) { dom.wordO = wo; wordEl.style.opacity = wo; wordEl.style.pointerEvents = wordO > .35 ? '' : 'none'; }
        /* the word is planted in the near ground: under the cursor it shifts
           more than the copy and against the world — three depths of parallax.
           Amplitude rides the viewport (±.6vw) so the fitted word's margins
           always absorb the shift and the M and final A never clip. */
        const wt = `translate(calc(-50% + ${(mouse.x * -.6).toFixed(2)}vw), ${(mouse.y * -9).toFixed(1)}px)`;
        if (wt !== dom.wordT) { dom.wordT = wt; wordEl.style.transform = wt; }
      }

      /* under the chapters' ground the frame is not drawn at all */
      if (!covered) {
        /* the river's planar reflection needs this frame's camera */
        if (plan.river) stages.river.reflect(renderer, scene, camera);
        /* the opening's grade */
        if (linearMode) {
          const hr = stages.river ? stages.river.hour : null, nt = hr ? hr.night : 0, dy = hr ? hr.day : 0;
          getGrade().render(scene, camera, { time: now, fade: 1, bloom: .11 + .10 * nt, threshold: 1.6 - .6 * nt, knee: .3, day: dy, night: nt, fog: fogCol });
        }
        else { renderer.setRenderTarget(null); renderer.render(scene, camera); }
      }

      if (!manual) { rafAlive = performance.now(); requestAnimationFrame(frame); }
    }
    let rafAlive = performance.now();
    requestAnimationFrame(frame);
    // watchdog: some embedded webviews suspend rAF even while visible
    setInterval(() => {
      if (document.hidden) return;
      if (performance.now() - rafAlive > 250) frame(true);
    }, 33);

    /* debug/authoring hook: jump to a scroll position, settle, return a frame */
    window.ANTARANGA = {
      renderer, scene, camera, timeline, stages, ambience, get grade() { return getGrade(); },
      /* review aid: pin the sunrise dial (0 pre-dawn … 1 morning), -1 to release */
      setRise(v) { riseOverride = v; },
      step(t) {
        timeline.raw = t; timeline.t = t;
        window.scrollTo(0, timeline.yAt(t));
        camS.force = true;
        frame(true);
      },
      tick() { frame(true); },
      /* ---- stills: the retired worlds (the house and yard, the written
         sand, the Matha hall, the road) rendered once, to be placed in the
         page as pictures the way kage places stills of its own scenes.
         loadStills() builds them; still() frames one from its own camera. */
      async loadStills() {
        const mods = [
          ['purva', './world/purvashrama.js', 'createPurvashramaStage', 'PURVA_Y'],
          ['interior', './world/interior.js', 'createInteriorStage', 'INTERIOR_Y'],
          ['journey', './world/journey.js', 'createJourneyStage', 'JOURNEY_Y'],
          ['objects', './world/objects.js', 'createObjectsStage', 'OBJECTS_Y'],
        ];
        for (const [key, path, factory, yName] of mods) {
          if (stages[key]) continue;
          const m = await import(path);
          OFF[key] = m[yName];
          stages[key] = m[factory](ctx);
          scene.add(stages[key].group);
          if (stages[key].ready) await stages[key].ready;
        }
        await stoneMapsReady(); await rayaruReady();
        return Object.keys(stages);
      },
      still({ key, ci = 1, u = .5, t = .1, w = 1600, h = 1000, fog = [0x8e8566, .0085], world = null, steps = 6, quality = .9 } = {}) {
        const st = stages[key];
        if (!st) throw new Error('no stage ' + key);
        renderer.setPixelRatio(1); renderer.setSize(w, h, false);
        camera.aspect = w / h; camera.updateProjectionMatrix();
        for (const k in stages) { const v = k === key; stages[k].setVisible(v); if (stages[k].opening) stages[k].opening.group.visible = v; }
        if (world && st.setWorld) st.setWorld(world);
        scene.fog.color.setHex(fog[0]); scene.fog.density = fog[1]; renderer.setClearColor(scene.fog.color, 1);
        setLinearMode(false);
        const now = performance.now() / 1000;
        for (let i = 0; i < steps; i++) {
          const tm = now + i * .05;
          if (key === 'purva') st.update(tm, t);
          else if (key === 'interior') st.update(tm, t, u);
          else if (key === 'journey') st.update(tm, t, u, camera);
          else if (key === 'river') st.update(tm, t, camera, renderer, scene, false, 1);
          else st.update(tm, t, u);
        }
        const shot = key === 'purva' ? st.cam(ci, u) : st.cam(u);
        const off = OFF[key] || 0;
        camera.position.copy(shot.pos); camera.position.y += off;
        const look = shot.look.clone(); look.y += off;
        camera.lookAt(look); camera.fov = shot.fov; camera.updateProjectionMatrix();
        if (key === 'river') st.reflect(renderer, scene, camera);
        renderer.setRenderTarget(null); renderer.render(scene, camera);
        const url = renderer.domElement.toDataURL('image/jpeg', quality);
        return url;
      },
      snap(t, settle = true, steps = 8) {
        window.scrollTo(0, timeline.yAt(t));
        timeline.raw = t;
        if (settle) { timeline.t = t; camS.force = true; }
        /* each synthetic frame advances the clock by 50 ms, so the damped
           atmosphere and lights actually settle instead of freezing at
           whatever the live page last showed */
        for (let i = 0; i < steps; i++) { lastTime = performance.now() / 1000 - .05; frame(true); }
        return renderer.domElement.toDataURL('image/jpeg', .82);
      },
    };
  }

  boot().catch(err => {
    /* a failed stage must never trap the visitor behind the loader */
    console.error('boot failed:', err);
    setProgress(1);
  });
}
