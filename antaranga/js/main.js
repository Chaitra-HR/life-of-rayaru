// RAYARA ANTARANGA · main — one continuous world, one authored camera, one scroll.
// scroll position → section progress → global t → target camera → damped camera → render
import * as THREE from 'three';
import { clamp, clamp01, lerp, remap, smooth, damp, V3 } from './util.js';
import { ScrollTimeline, Captions, CHAPTERS, veilAt } from './scroll.js';
import { makeTrack } from './track.js';
import { COPY_OUT } from './score.js';
import { Surface } from './surface.js';
import { gsap } from '../vendor/gsap/index.js';
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

/* every seam in t (the chapters' head and foot, the Brindavana's start,
   the second dawn, the chamber, the return) is a mark of THE SCORE
   (score.js), read from timeline.marks; nothing here has a number of its own */

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

const DEBUG = location.search.includes('beats');

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
    const mark = (n) => { try { performance.mark('antaranga:' + n); } catch (e) {} };   // the load's own timeline (performance.getEntriesByType('mark'))
    mark('boot');
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
    mark('fonts');
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
      mark('built:' + key);
      setProgress(.62 + (i + .5) / first.length * .32);       // .62 → .94
      await yieldToPaint();
      warm(key);
      mark('warmed:' + key);
      setProgress(.62 + (i + 1) / first.length * .32);
      await yieldToPaint();
    }
    /* the stone maps are drawn on their own threads while the Brindavana is
       drafted; nothing may be revealed before they land. Waiting here costs
       no main-thread time — which is the whole point: the drawing keeps its
       frames instead of freezing through six seconds of texture arithmetic. */
    await stoneMapsReady();
    mark('stone-maps');
    setProgress(.96);
    await yieldToPaint();

    renderer.render(scene, camera);
    mark('first-render');
    setProgress(.97);

    start(stages);
    mark('start');
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

  /* ---------------- THE CAMERA: one track for the whole site ----------------
     Every shot on the site is a key at a point of THE SCORE (score.js), in
     the approach frame (hero.js), and the camera is ONE monotone cubic
     track through all of them (track.js): the opening's settle, the walk
     along the bank station to station, the descent into the stone, the
     climb with the layers, the draw-back to the hold. Keys close together
     with little between them are a drift while words are read; keys far
     apart are travel. The velocity never jumps, and the camera never
     stops dead unless two keys say so (a hold). Rebuilt on every layout. */
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
  /* the composition a step or two forward along its own axis (the
     leave-taking's step, Manchale's arrival): the camera never leaves the
     Brindavana and never enters it here */
  function compShot(step) {
    const { P, L, fov0 } = frame00();
    const f = [L[0] - P[0], L[1] - P[1], L[2] - P[2]];
    const fl = Math.hypot(f[0], f[2]) || 1;
    const w = Math.min(1, step / 1.1);
    return { P: [P[0] + f[0] / fl * step, P[1] + .16 * w, P[2] + f[2] / fl * step], L: [L[0], L[1] + .5 * w, L[2]], fov: fov0 - 1.2 * w };
  }
  /* ---- the chapters (01–08): ONE WALK along the bank, station to station.
     Every reading beat of the page has a place in the opening's world
     (stations.js), authored as a stand (P), a subject (S) and where the
     subject sits in the frame (nx, ny in -1..1), so the same stand frames
     the thing right of the copy on a wide frame and above it on a phone.
     Each station gives the track TWO keys: ARRIVE, as the beat's words
     enter, and SETTLE, as they leave: the same subject, the stand crept a
     little way on toward the next (drift), so the frame goes on moving,
     slowly, the whole time the words are read; then the track travels to
     the next station's arrival. Coordinates are the approach frame
     (hero.js); `sl` is the flight's own frame (stations.js). ---- */
  let riverRef = null;   // the river stage, once built (start): the moon's place comes from it
  const MOON_A = () => riverRef && riverRef.moonApproach ? riverRef.moonApproach() : [-24.6, 16, -84];
  /* ---- THE CAMERA'S VOCABULARY (20 Sept 2026, after Kage). Every station
     is an ARRIVE shot (P, S, nx, ny, fov: the layout's composition, which
     does not change) and a `mv`: how the stand moves while the beat is
     read, in the shot's own frame, with the SUBJECT KEPT where it is in
     the frame (the target holds, the stand moves: a lateral observation,
     an arc, a rise, a push, a pull-back, never only a zoom).
       lat  metres to the right (negative: left)
       up   metres up
       fwd  metres toward the subject (negative: a pull-back)
       nx, ny, fov  small changes of framing
     `via` is the travel before the station: waypoints the walk passes
     through, in order, spaced evenly over the travel (an S along the
     bank, out through a gate, down a flight, through an opening), each a
     point in the approach frame, an anchor ['door', f, r, y], or { P, L }
     to author the gaze at that point. ---- */
  const STATIONS = [
    /* BHUVANAGIRI IS THE HOUSE (threshold.js, 18 Sept 2026): the walk leaves
       the composition along the near strip and comes up to the house's gate
       on the right bank (01, the approach: the whole gatehouse, its door
       ajar on the yard's light), stands at the left bench where the ॐ is
       written in the sand (02, the first lesson), then at the right bench
       where the veena lies on its cloth (02m, the household). Anchors are
       the threshold's own points, stepped out along its front (f) and its
       right (r): ['door', f, r, y] (hero.js thresholdPoint). */
    /* the walk to the house: an S along the near strip, first toward the
       water's edge (the stone still the subject), then swinging in past
       the right corner's grass, which crosses the lens, the gaze coming
       round to the gate; the ground rises under it toward the pad */
    { id: 'mv-01', via: [{ P: [3.2, 1.75, 44.0], L: [8.0, 4.0, 8.0] }, { P: [10.8, 2.7, 40.4], L: [22, 3.6, 30] }],
      mv: { lat: -.7, up: .12, fwd: 1.0 },
      d: { P: ['door', 13.5, -1.4, 1.9], S: ['door', 0, .2, 2.2], nx: .42, ny: .02, fov: 36 }, m: { P: ['door', 11, -.6, 1.8], S: ['door', 0, 0, 2.5], nx: .06, ny: .28, fov: 45 } },
    /* in through the open gate (the posts cross the frame): the first lesson at the verandah's dais, read moving slowly along the bench */
    { id: 'mv-02',  g: 0, via: [['door', 3.2, -.4, 1.9], ['door', -.6, .2, 1.7]], mv: { lat: .5, up: -.08, fwd: .5 },
      d: { P: ['door', -4.0, .5, 1.5], S: ['sand', 0, 0, .8], nx: .30, ny: -.10, fov: 32 }, m: { P: ['door', -3.9, .4, 1.65], S: ['sand', 0, 0, .8], nx: 0, ny: .30, fov: 44 } },
    /* the household at the veena beside it: the stand crosses to the other side and rises a little, an arc round the bench */
    { id: 'mv-02m', g: 0, mv: { lat: -.55, up: .14, fwd: .35 },
      d: { P: ['door', -4.3, 2.7, 1.45], S: ['veena', 0, 0, .68], nx: .30, ny: -.08, fov: 32 }, m: { P: ['door', -4.2, 2.9, 1.7], S: ['veena', 0, 0, .68], nx: 0, ny: .30, fov: 44 } },
    /* out of the yard by the gate, down the bank's edge to the water and
       across the bay to the flight's foot, the steps passing on the right;
       the eye descends from the pad to the water's level */
    { id: 'mv-02b', via: [['door', 2.4, .2, 1.7], { P: [17.0, 2.3, 33.0], L: [8.5, 5.5, 15] }, { P: [8.0, 1.4, 30.0], L: [8.0, 6.2, 14.6] }], mv: { lat: .8, up: .15, fwd: 1.1 },
      d: { P: sl(-4.2, 1.5, 24.5), S: sl(2.8, 6.4, 13), nx: .22, ny: .06, fov: 36 }, m: { P: sl(-1.2, 1.4, 25), S: sl(2.8, 6.8, 13), nx: 0, ny: .3, fov: 48 } },
    /* the dream: a pull-back over the water, then a slow drift left and up while the light rises behind the stone */
    { id: 'mv-02d', mv: { lat: -.9, up: .26, fwd: -.4 },
      d: { P: [-5, 1.7, 31], S: [8, 4.2, 6], nx: .2, ny: .02, fov: 36 }, m: { P: [-1, 1.5, 34], S: [8.7, 6, 6], nx: 0, ny: .28, fov: 45 } },
    /* the name: to the flight's foot and up its steps on the sacred axis, rising; read still climbing, slowly */
    { id: 'mv-03',  g: 0, via: [{ P: sl(.6, 1.15, 24.2), L: sl(0, 3.6, 1.9) }], mv: { lat: .3, up: .22, fwd: .8 },
      d: { P: sl(0, 2.3, 15.6), S: sl(0, 3.3, 1.9), nx: 0, ny: .04, fov: 36 }, m: { P: sl(0, 2.2, 16.4), S: sl(0, 3.8, 1.9), nx: 0, ny: .16, fov: 46 } },
    /* the works: to the gateway's right pillar, the landing seen past it; read moving along the landing's edge */
    { id: 'mv-04',  g: 0, mv: { lat: -.8, up: 0, fwd: .4 },
      d: { P: sl(5.4, 2.4, 13.6), S: sl(0, .82, 9.5), nx: .24, ny: -.06, fov: 36 }, m: { P: sl(1.9, 2.6, 13.9), S: sl(0, .82, 9.5), nx: 0, ny: .3, fov: 46 } },
    /* the volumes: one each; read moving ALONGSIDE the open page toward the next volume, leaning in */
    { id: 'mv-04a', g: 0, book: 0, mv: { lat: .5, up: -.05, fwd: .25 } }, { id: 'mv-04b', g: 0, book: 1, mv: { lat: .5, up: -.05, fwd: .25 } }, { id: 'mv-04c', g: 0, book: 2, mv: { lat: .5, up: -.05, fwd: .25 } }, { id: 'mv-04d', g: 0, book: 3, mv: { lat: .5, up: -.05, fwd: .25 } }, { id: 'mv-04e', g: 0, book: 4, mv: { lat: .5, up: -.05, fwd: .25 } },
    /* TATTVAVĀDA · ONE SLOW PULL-BACK (19 Sept 2026): off the landing, out
       through the gateway's OPENING (its pillars crossing the frame, the
       moon found through it), down the flight onto the bay; from there the
       walk only steps BACK, a metre or two a beat, along the sacred axis to
       the near bank, until Manchale's composition is reached by arriving
       at it. What moves between the beats is the gaze, turning from the
       moon to its path, to the stone in the gateway, back to the water, to
       the flight's foot, and out to the whole of it; while each is read the
       stand slips a little sideways, one way then the other. */
    { id: 'mv-05', via: [{ P: sl(2.6, 2.3, 13.4), L: sl(-8, 9, -30) }, { P: sl(1.4, 1.5, 21.5), L: [-20, 14, -70] }], mv: { lat: .5, up: .1, fwd: .6 },
      d: { P: [-6.0, 1.55, 30.5], S: 'moon', nx: 0, ny: .48, fov: 36 }, m: { P: [-5.4, 1.6, 32.5], S: 'moon', nx: 0, ny: .40, fov: 46 } },
    { id: 'mv-05a', mv: { lat: -.7, up: 0, fwd: .3 }, d: { P: [-6.4, 1.3, 32.0], S: 'moonpath', nx: .24, ny: .04, fov: 36 }, m: { P: [-5.8, 1.35, 34.0], S: 'moonpath', nx: 0, ny: .22, fov: 46 } },
    /* the moon and the stone: the black stone in its gateway, across the bay, lit by the same moon */
    { id: 'mv-05b', mv: { lat: .6, up: .15, fwd: .2 }, d: { P: [-6.7, 1.5, 33.5], S: sl(0, 3.2, .5), nx: -.30, ny: .08, fov: 38 }, m: { P: [-6.1, 1.6, 35.5], S: sl(0, 3.6, .5), nx: 0, ny: .32, fov: 46 } },
    { id: 'mv-05c', mv: { lat: -.6, up: 0, fwd: .3 }, d: { P: [-7.0, 1.2, 35.0], S: 'moonpath', nx: .20, ny: .02, fov: 34 }, m: { P: [-6.4, 1.3, 37.0], S: 'moonpath', nx: 0, ny: .22, fov: 46 } },
    /* the flight's foot, where the stone goes into the water */
    { id: 'mv-05d', mv: { lat: .5, up: -.1, fwd: .3 }, d: { P: [-7.0, 1.3, 36.4], S: sl(-4.5, .3, 19.0), nx: -.24, ny: .0, fov: 36 }, m: { P: [-6.4, 1.4, 38.4], S: sl(-5.0, .2, 20.8), nx: 0, ny: .26, fov: 46 } },
    { id: 'mv-05e', mv: { lat: -.5, up: .05, fwd: .3 }, d: { P: [-6.6, 1.2, 37.8], S: sl(-3.5, .4, 16.5), nx: .30, ny: .0, fov: 36 }, m: { P: [-6.0, 1.3, 39.8], S: sl(-4.2, .4, 18.0), nx: 0, ny: .28, fov: 46 } },
    /* the whole of it: the gateway, the stone, the lamps, seen from the water's edge; read drawing back and rising: its scale */
    { id: 'mv-05f', mv: { lat: .2, up: .28, fwd: -.7 }, d: { P: [-6.0, 1.6, 39.4], S: [7, 4.6, 6], nx: .10, ny: .24, fov: 38 }, m: { P: [-5.4, 1.6, 41.4], S: [8.7, 6.4, 6], nx: 0, ny: .30, fov: 46 } },
    /* the road: the far bank, from the near bank's edge, a step short of the composition; read drifting along the edge, rising */
    { id: 'mv-06',  mv: { lat: .9, up: .3, fwd: .3 }, d: { P: [-4.6, 2.0, 41.4], S: [-13, 4.6, -44], nx: .08, ny: .06, fov: 42 }, m: { P: [-4.0, 2.0, 43.0], S: [-10, 4.4, -46], nx: 0, ny: .30, fov: 48 } },
    /* Manchale: the composition uncovered by arriving at it (the gaze turns
       from the far bank round to the stone as the stand steps back), then
       read drawing back another half-step: the place, whole */
    { id: 'mv-07',  comp: 1.9, comp2: 1.4 },
  ];
  const BOOK_S = [[-2.55, 9.15], [-1.30, 9.95], [-.05, 9.05], [1.25, 9.9], [2.55, 9.2]];
  const _q = new THREE.Quaternion(), _f2 = new THREE.Vector3(), _r2 = new THREE.Vector3(), _u2 = new THREE.Vector3(0, 1, 0);
  /* an anchor on the threshold: ['door' | 'sand' | 'veena' | …, f, r, y] → the approach frame (hero.js thresholdPoint) */
  const anchored = (v) => {
    const TH = riverRef && riverRef.opening && riverRef.opening.thresholdPoint ? riverRef.opening : null;
    return (Array.isArray(v) && typeof v[0] === 'string' && TH) ? TH.thresholdPoint(v[0], v[1], v[2], v[3]) : v;
  };
  const isPhone = () => (window.innerWidth / Math.max(1, window.innerHeight)) < .8;
  /* a station's framing for this aspect: { P, S, nx, ny, fov } resolved, S a point */
  function stationKey(st) {
    const phone = isPhone();
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
    return { ...k, S };
  }
  /* the shot from a stand: the subject S placed at (nx, ny) of the frame */
  function shotFrom(k) {
    const ar = window.innerWidth / Math.max(1, window.innerHeight);
    const phone = ar < .8;
    const fov = phone ? Math.min(k.fov, 46) : (ar < 1.3 ? k.fov + 3 : k.fov);
    const S = k.S;
    _f2.set(S[0] - k.P[0], S[1] - k.P[1], S[2] - k.P[2]);
    const dist = _f2.length() || 1; _f2.normalize();
    const vHalf = fov / 2 * Math.PI / 180, hHalf = Math.atan(Math.tan(vHalf) * ar);
    _r2.crossVectors(_f2, _u2).normalize();
    _q.setFromAxisAngle(_r2, -k.ny * vHalf); _f2.applyQuaternion(_q);
    _q.setFromAxisAngle(_u2, k.nx * hHalf); _f2.applyQuaternion(_q);
    return { P: k.P, L: [k.P[0] + _f2.x * dist, k.P[1] + _f2.y * dist, k.P[2] + _f2.z * dist], fov };
  }
  /* ---- the track ----
     keys: [{ t, v: [Px, Py, Pz, Lx, Ly, Lz, fov, g] }], g the edge grass
     (none on the stone). Built from the score's layout: the opening, the
     stations, the Pravesha's keys (pravesha.js keyShots), the hold. */
  let camTrack = null, camKeys = [];
  function buildCamera(lay) {
    const keys = [];
    const add = (t, P, L, fov, g = 1, label = '') => keys.push({ t, v: [P[0], P[1], P[2], L[0], L[1], L[2], fov, g], label });
    const F = frame00();
    const hero = lay.byId.hero, leave = lay.byId.leave;
    /* the opening: a step back and up at the first frame, settling forward
       while the heading is read; then the leave-taking's step into the
       morning light (compShot 1.1) at the end of the opening: the walk
       along the bank to the house begins from there (mv-lead) */
    /* the first frame stands a step back, a little left and higher, its
       gaze a touch above the stone; the first scroll settles it forward
       and to the right, the gaze coming down onto the stone: a spatial
       approach, not a zoom */
    add(hero.t0, [F.P[0] - .8, F.P[1] + .22, F.P[2] + 1.6], [F.L[0], F.L[1] + .6, F.L[2]], F.fov0 + 1.5, 1, 'hero · first frame');
    add(hero.cB, F.P, F.L, F.fov0, 1, 'hero · settled');
    { const c = compShot(1.1); add(leave.t1, [c.P[0] + .4, c.P[1], c.P[2]], [c.L[0] + 2.4, c.L[1] - .2, c.L[2] + 2.5], c.fov, 1, 'leave · the step into the light, the gaze beginning to turn toward the house'); }
    /* the stations: arrive and settle */
    const resolved = STATIONS.map(st => {
      const B = lay.byId[st.id]; if (!B || !B.copy) return null;
      if (st.comp !== undefined) { const c = compShot(st.comp), c2 = compShot(st.comp2 ?? st.comp); return { st, B, A: c, S: c2, kP: c.P }; }
      const k = stationKey(st);
      return { st, B, k, A: shotFrom(k), kP: k.P };
    }).filter(Boolean);
    const _vf = new THREE.Vector3(), _vr = new THREE.Vector3(), _vu = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < resolved.length; i++) {
      const r = resolved[i], { st, B } = r;
      const span = B.t1 - B.t0;
      const tA = B.cA + .05 * span, tS = B.cB - .05 * span;
      if (!r.S) {
        /* the settle: the SUBJECT KEPT where it is in the frame, the stand
           moved in the shot's own frame by the station's `mv` (a lateral
           observation, an arc, a rise, a push, a pull-back); without one, a
           slow push toward the subject, so no reading moment is still */
        const S = r.k.S, P = r.kP;
        _vf.set(S[0] - P[0], S[1] - P[1], S[2] - P[2]); const sd = _vf.length() || 1; _vf.normalize();
        _vr.crossVectors(_vf, _vu).normalize();
        const m = st.mv || { fwd: Math.min(1.0, sd * .18) };
        const lat = m.lat || 0, up = m.up || 0, fwd = m.fwd || 0;
        const P2 = [P[0] + _vr.x * lat + _vf.x * fwd, P[1] + up + _vf.y * fwd * .4, P[2] + _vr.z * lat + _vf.z * fwd];
        const k2 = { ...r.k, P: P2, nx: r.k.nx + (m.nx || 0), ny: r.k.ny + (m.ny ?? .02), fov: r.k.fov + (m.fov ?? -.5) };
        r.S = shotFrom(k2);
      }
      /* the travel before this station: its waypoints, spaced evenly over
         the travel from the last settle, the gaze authored where given and
         otherwise turning steadily from the last look to this one */
      if (st.via && i > 0) {
        const prev = resolved[i - 1];
        const tPrev = prev.B.cB - .05 * (prev.B.t1 - prev.B.t0);
        const vias = Array.isArray(st.via[0]) || (st.via[0] && st.via[0].P) ? st.via : [st.via];
        /* placed along the travel by PATH LENGTH, not evenly: the walk keeps
           one pace through the whole travel however unequal its legs */
        const pts = [prev.S.P, ...vias.map(v => anchored(v.P ? v.P : v)), r.A.P];
        const cum = [0]; for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1], pts[k][2] - pts[k - 1][2]));
        const total = cum[cum.length - 1] || 1;
        vias.forEach((v, j) => {
          const f = cum[j + 1] / total;
          const Pv = pts[j + 1];
          const Lv = v.L ? anchored(v.L) : [lerp(prev.S.L[0], r.A.L[0], f), lerp(prev.S.L[1], r.A.L[1], f), lerp(prev.S.L[2], r.A.L[2], f)];
          add(lerp(tPrev, tA, f), Pv, Lv, lerp(prev.S.fov, r.A.fov, f), st.g ?? 1, `${st.id} · via ${j + 1}`);
        });
      }
      add(tA, r.A.P, r.A.L, r.A.fov, st.g ?? 1, `${st.id} · arrive`);
      add(tS, r.S.P, r.S.L, r.S.fov, st.g ?? 1, `${st.id} · settle`);
    }
    /* Brindavana Pravesha: the keys are the module's own, placed in their beats */
    if (riverRef && riverRef.pravesha) {
      for (const k of riverRef.pravesha.keyShots(isPhone())) add(lay.tAt(k.beat, k.u), k.P, k.L, k.fov, 0, `${k.beat} · ${k.u}`);
    }
    /* the draw-back: out through the gateway's opening (its pillars
       crossing the frame), down the flight, low over the bay, and up onto
       the near bank a little left of and above the opening's frame; the
       return is read settling into that frame exactly, the way the hero
       settled into it: back somewhere familiar */
    { const o = lay.byId['b-out'], t0 = o.t0, t1 = o.t1;
      add(lerp(t0, t1, .30), sl(2.2, 2.5, 16.4), sl(0, 3.0, 1.0), 38, 0, 'b-out · through the gateway');
      add(lerp(t0, t1, .62), [1.0, 1.35, 31.0], [9.0, 4.2, 6.0], F.fov0 + 1, 1, 'b-out · over the bay');
      add(t1, [F.P[0] - 1.1, F.P[1] + .32, F.P[2] - 1.2], [F.L[0], F.L[1] + .25, F.L[2]], F.fov0 + .6, 1, 'b-out · the near bank');
    }
    add(lay.byId['r-today'].cC, [F.P[0] - .35, F.P[1] + .10, F.P[2] - .3], [F.L[0], F.L[1] + .08, F.L[2]], F.fov0 + .2, 1, 'return · nearly home');
    add(1, F.P, F.L, F.fov0, 1, 'end · the hold: the opening\'s own frame');
    keys.sort((a, b) => a.t - b.t);
    for (let i = 1; i < keys.length; i++) if (keys[i].t <= keys[i - 1].t) keys[i].t = keys[i - 1].t + 1e-6;
    camKeys = keys;
    camTrack = makeTrack(keys);
  }
  /* the opening's idle drift: on the composition, through the walk, gone
     in the stone, back as the camera draws out to the hold */
  function swayAt(t, M, lay) {
    if (t < M.docB) return 1;
    const d = lay.byId['b-day'], o = lay.byId['b-out'];
    return 1 - smooth(remap(t, d.t0, d.t1)) + smooth(remap(t, o.t0, o.t1));
  }
  const _cv = new Array(8).fill(0);
  /* the camera at t: the track, the idle drift, the footer's tilt */
  function camAt(t, tilt, M, lay) {
    const v = camTrack ? camTrack(t, _cv) : [0, 2, 40, 0, 2, 0, 40, 1];
    const tIdle = performance.now() / 1000;
    const sway = reduced ? 0 : swayAt(t, M, lay);
    const dx = (Math.sin(tIdle * .11) * .22 + Math.sin(tIdle * .047) * .14) * sway;
    const dy = Math.sin(tIdle * .16 + 1.3) * .05 * sway;
    const k = smooth(tilt) * .45;
    const ph = isPhone() ? 1.7 : 1;
    if (riverRef) riverRef.stations.edgeAmt = v[7];
    return {
      pos: A2W(v[0] + dx + 1.2 * k, v[1] + dy - .45 * k, v[2] - 3.5 * k * ph),
      look: A2W(v[3] + dx * .6 - 2.5 * k, v[4] - 5.2 * k * ph, v[5] + 12 * k),
      fov: v[6] + 3 * k,
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
    /* 01–08 · the chapters: the page and its behaviour (js/movements.js).
       Sized from the score by the timeline's layout (below). */
    movements = createMovements({ reduced, scrollToBeat: (id) => timeline.scrollToBeat(id) });
    /* THE SCORE laid out for this viewport: every window every module
       reads is derived here, from the same layout, in the same t; nothing
       is measured from the page */
    let praveshaCues = null;
    const cueLog = {};                 // beat id → [{ label, a, b }] in the beat's own u, for the ?beats overlay
    let curLay = null;
    const log = (id, label, a, b) => { if (!DEBUG || !curLay) return; const B = curLay.byId[id]; if (!B) return; (cueLog[id] = cueLog[id] || []).push({ label, a: (a - B.t0) / (B.t1 - B.t0), b: (b - B.t0) / (B.t1 - B.t0) }); };
    /* called by the timeline on every layout (its constructor included: the
       timeline itself is not yet assigned then, so everything here reads
       the layout and the marks it is handed) */
    function onLayout(lay, M) {
      if (!movements) return;
      curLay = lay;
      movements.size(lay);
      movements.measure();
      const dp = (t) => (t - M.docA) / (M.docB - M.docA);   // t → the chapters' own progress (river.js docP)
      const P = (id, u) => lay.tAt(id, u);
      const B = (id) => lay.byId[id];
      for (const k in cueLog) delete cueLog[k];
      if (stages.river) {
        stages.river.marks = M;
        /* the stations' things, in docP: each lives in its beat's copy window */
        const books = ['mv-04a', 'mv-04b', 'mv-04c', 'mv-04d', 'mv-04e'].map(id => {
          const b = B(id), L = b.cB - b.cA;
          /* [visible from, visible to, cover open a→b, cover closed c→d]: the
             cover lifts as the first sentence is read, stays up through the
             reading, and is down as the words go */
          return [b.t0, b.t1, b.cA + .10 * L, b.cA + .32 * L, b.cB - .10 * L, b.cB + .04 * L].map(dp);
        });
        stages.river.winds = {
          works: [dp(B('mv-04').t0 + (B('mv-04').t1 - B('mv-04').t0) * .05), dp(B('way-05').t1)],
          books,
          ...Object.fromEntries(['a', 'b', 'c', 'd', 'e'].map(k => { const b = B('mv-05' + k), L = b.cB - b.cA; return ['pb' + k, [dp(b.cA + .15 * L), dp(b.cB - .15 * L)]]; })),
          /* the dream: the light rises as the vision is read, full at the block's centre, gone as the words go */
          dream: [B('mv-02d').cA, B('mv-02d').cC, B('mv-02d').cB - .1 * (B('mv-02d').cB - B('mv-02d').cA), B('mv-02d').t1].map(dp),
        };
        /* the morning brightens through Bhuvanagiri, full day by the household; dusk falls across the dream into the name */
        stages.river.dayArc = { aft: [dp(B('mv-lead').t0), dp(B('mv-01').cC)], duskA: dp(B('mv-02d').cA), duskB: dp(B('mv-03').cC) };
        /* Brindavana Pravesha: every layer, the cut, the lamps, the garland in its beat's window (pravesha.js) */
        praveshaCues = {
          lift: [P('b-day', .26), P('b-day', .82)],
          cut: [P('b-down', .02), P('b-down', .62), P('b-kurma', .56), P('b-kurma', .90)],
          lit: [P('b-down', .72), P('b-chamber', .22), P('b-kurma', .42), P('b-kurma', .72)],
          mala: [P('b-day', .28), P('b-day', .52), P('b-deities', .84), P('b-deities', .97)],
          kurma: [P('b-kurma', .16), P('b-kurma', .46)],
          plate: [P('b-plate', .16), P('b-plate', .48)],
          vessel: [P('b-shals', .08), P('b-shals', .30)],
          shals: [P('b-shals', .30), P('b-shals', .64)],
          lid: [P('b-shals', .68), P('b-shals', .86)],
          lower: [P('b-stone', .14), P('b-stone', .60)],
          earth: [P('b-grain', .14), P('b-grain', .40)],
          tene: [P('b-grain', .44), P('b-grain', .72)],
          deities: [P('b-deities', .12), P('b-deities', .38)],
          deityLight: [P('b-deities', .10), P('b-deities', .34), P('b-deities', .50), P('b-deities', .64)],
          upper: [P('b-deities', .46), P('b-deities', .88)],
        };
      }
      buildCamera(lay);
      if (DEBUG) {
        for (const b of lay.beats) if (b.copy) log(b.id, 'copy', b.cA, b.cB);
        for (const k of camKeys) { const b = lay.beatAt(Math.min(k.t, 1 - 1e-9)); log(b.id, 'camera · ' + k.label, k.t, k.t); }
        const W = stages.river.winds, D = stages.river.dayArc, inv = (v) => M.docA + v * (M.docB - M.docA);
        log('mv-lead', 'light · morning brightens', inv(D.aft[0]), inv(D.aft[1]));
        log('mv-02d', 'light · dusk from', inv(D.duskA), inv(D.duskB)); log('mv-03', 'light · dusk to', inv(D.duskA), inv(D.duskB));
        log('mv-02d', 'dream · light rises', inv(W.dream[0]), inv(W.dream[1])); log('mv-02d', 'dream · light goes', inv(W.dream[2]), inv(W.dream[3]));
        ['a', 'b', 'c', 'd', 'e'].forEach((k, i) => { log('mv-04' + k, 'cover · opens', inv(W.books[i][2]), inv(W.books[i][3])); log('mv-04' + k, 'cover · closes', inv(W.books[i][4]), inv(W.books[i][5])); log('mv-05' + k, 'pair named', inv(W['pb' + k][0]), inv(W['pb' + k][1])); });
        log('mv-04', 'volumes on the landing from', inv(W.works[0]), inv(W.works[0])); log('way-05', 'volumes gone', inv(W.works[1]), inv(W.works[1]));
        log('mv-tail', 'lamps warm · air closes', B('mv-tail').t0, B('mv-tail').t1);
        log('b-day', 'dawn', M.dawn2[0], M.dawn2[1]);
        for (const k in praveshaCues) { const w = praveshaCues[k]; const b0 = lay.beatAt(w[0]), b1 = lay.beatAt(w[1]); log(b0.id, k + (w.length > 2 ? ' · in' : ''), w[0], w[1]); if (b1 !== b0) log(b1.id, k + (w.length > 2 ? ' · in' : ''), w[0], w[1]); if (w.length > 2) { const c0 = lay.beatAt(w[2]); log(c0.id, k + ' · out', w[2], w[3]); } }
        log('hero', 'hero copy', B('hero').cA, B('hero').cB);
      }
    }
    const timeline = new ScrollTimeline({
      reduced, phone: isMobile,
      sp00: document.getElementById('sp00'), sp09: document.getElementById('sp09'),
      onLayout,
    });
    const captions = new Captions();
    /* the words' reveals (text.js): every block split into lines and given
       its scrubbed timeline, now that the fonts are in */
    movements.build();
    captions.build(reduced);
    /* ?beats — the site-wide scroll overlay: the chapter, the beat and
       its progress, and every window authored in it (copy, camera keys,
       light, objects, layers), so a visual that runs ahead of its words
       is seen as a number. Development only. */
    let hudBeats = null, hudBeatsLast = 0;
    if (DEBUG) {
      hudBeats = document.createElement('div');
      hudBeats.id = 'beats-hud';
      hudBeats.style.cssText = 'position:fixed;left:8px;top:64px;z-index:99;max-width:min(44vw,420px);background:rgba(13,13,9,.86);color:#e3d8c1;font:11px/1.45 ui-monospace,Menlo,monospace;padding:8px 10px;pointer-events:none;white-space:pre;border-radius:3px;letter-spacing:0';
      document.body.appendChild(hudBeats);
    }
    function hudBeatsTick(t) {
      if (!hudBeats) return;
      const now = performance.now(); if (now - hudBeatsLast < 90) return; hudBeatsLast = now;
      const lay = timeline.lay, b = lay.beatAt(t), u = lay.uAt(b, t);
      const ch = b.ch;
      const rows = (cueLog[b.id] || []).slice().sort((x, y) => x.a - y.a);
      const bar = (a, z) => { const n = 24, s = []; for (let i = 0; i < n; i++) { const x = i / n; s.push(x >= a && x <= z + 1e-9 ? '█' : (Math.abs(x - u) < .5 / n ? '|' : '·')); } return s.join(''); };
      let txt = `SCENE ${ch.num} — ${ch.name.toUpperCase()}\n` +
        `t ${t.toFixed(4)}   y ${(timeline.y / (timeline.h || 1)).toFixed(2)} vh of ${(timeline.max / (timeline.h || 1)).toFixed(1)}\n\n` +
        `beat  ${b.id}   ${b.span / (timeline.h || 1) > 0 ? (b.span / (timeline.h || 1)).toFixed(2) : ''} vh\n` +
        `u     ${u.toFixed(3)}   ${b.copy ? (t >= b.cA && t <= b.cB ? 'reading' : t < b.cA ? 'before the words' : 'after the words') : 'travel'}\n\n`;
      for (const r of rows) txt += `${bar(r.a, r.b)} ${r.a.toFixed(2)}→${r.b.toFixed(2)}  ${r.label}\n`;
      hudBeats.textContent = txt;
    }
    const veilEl = document.getElementById('veil');
    const groundEl = document.getElementById('ground');
    const body = document.body;
    const aaradhaneLink = document.getElementById('aaradhane-link');
    const footerEl = document.getElementById('footer');
    /* THE SURFACE (surface.js): a transparent skin over the frame that the
       cursor or a finger disturbs, locally, and that settles again. Nothing
       else touches it (not the scroll, not a seam): the artwork under it
       is never touched and the frame's edges never move. */
    const surface = new Surface(renderer, { mobile: isMobile, reduced });
    surface.warm(scene, camera);
    /* the cursor's wake and a finger's: from where it was to where it is,
       with its speed (frame widths a second) */
    const pt = { x: -1, y: -1, t: 0 };
    const move = (x, y) => {
      const W = window.innerWidth || 1, H = window.innerHeight || 1, now = performance.now() / 1000;
      if (pt.x >= 0) {
        const dx = (x - pt.x) / W, dy = (y - pt.y) / H, dtE = Math.max(.006, now - pt.t);
        surface.wake(pt.x / W, 1 - pt.y / H, x / W, 1 - y / H, Math.hypot(dx, dy) / dtE);
      }
      pt.x = x; pt.y = y; pt.t = now;
    };
    if (!reduced) {
      if (!isMobile) window.addEventListener('mousemove', e => move(e.clientX, e.clientY), { passive: true });
      window.addEventListener('touchstart', e => { const c = e.touches[0]; if (c) { pt.x = c.clientX; pt.y = c.clientY; pt.t = performance.now() / 1000; } }, { passive: true });
      window.addEventListener('touchmove', e => { const c = e.touches[0]; if (c) move(c.clientX, c.clientY); }, { passive: true });
      window.addEventListener('touchend', () => { pt.x = -1; pt.y = -1; }, { passive: true });
      window.addEventListener('mouseleave', () => { pt.x = -1; pt.y = -1; });
    }

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
    /* the wordmark, top and bottom, is the way back to the opening */
    document.querySelectorAll('#wordmark, #footer .f-mark').forEach(w => w.addEventListener('click', () => { timeline.scrollToY(0); setNav(false); }));
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
      return Math.max(u * u * (3 - 2 * u), smooth(remap(t, timeline.lay.tAt('hero', .05), timeline.lay.tAt('hero', .55))));
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
      }

      const t = timeline.update(dt);
      const lay = timeline.lay, M = timeline.marks;
      const ci = timeline.chapterAt(t);
      const ch = CHAPTERS[ci];
      const u = clamp01((t - ch.a) / (ch.b - ch.a));
      const sy = timeline.y, vh = timeline.h || 1;   // the story's position, never the page's (scroll.js)

      /* the chapters' copy reads the same t the camera follows: the words
         and the walk arrive together, from one table (score.js) */
      const mv = movements.update(t, vh, t >= M.docB - .002);
      const band = null;

      /* visibility */
      const plan = visibilityPlan(t, band);
      for (const k in plan) if (stages[k]) stages[k].setVisible(plan[k]);

      /* per-stage updates (only when visible) */
      /* aligned with river.js's openRaw: the opening (and its linear grade)
         holds through the whole leave-taking, releasing only in the covered
         final hair of the chapter */
      const openNow = t < .5 ? 1 - smooth(remap(t, M.docA - .00035, M.docA)) : 0;
      const rise = riseNow(now, t);
      if (rise > .02) { body.classList.remove('predawn'); body.classList.add('hero-in'); }
      body.classList.toggle('past-hero', t > .004);
      setLinearMode(STYLED.linear && openNow > .35);
      /* no ground at either seam: the dusk falls in view at the chapters'
         head, and at the tail the camera walks to the stone and the day
         breaks over it (river.js) */
      const groundO = 0;
      const go = groundO.toFixed(3);
      if (go !== dom.groundO) { dom.groundO = go; groundEl.style.opacity = go; }
      const covered = false;
      /* the rail and the nav follow the chapters */
      const inDoc = t > M.docA - .004 && t < M.docB - .006;
      if (inDoc !== dom.inDoc) { dom.inDoc = inDoc; body.classList.toggle('in-doc', inDoc); }

      /* the chapters' progress, for the river's day and its events (river.js docP) */
      stages.river.docP = clamp01((t - M.docA) / (M.docB - M.docA));
      /* the walk into the stone: 0 at Manchale's composition, 1 at the face (the tail beat) */
      { const tb = lay.byId['mv-tail']; stages.river.tailP = clamp01((t - tb.t0) / Math.max(1e-9, tb.t1 - tb.t0)); }
      /* the walk over the water: the river's mist is carried ahead of the
         lens and the air thickens a little while the camera travels (the
         lead, the descent to the bay, the flight, the tail, the draw-back),
         none of it while words are read */
      { const b = lay.beatAt(t), u = lay.uAt(b, t);
        const over = { 'mv-lead': 1, 'way-02b': .7, 'way-05': .8, 'mv-tail': 1, 'b-out': .9 }[b.id] || 0;
        stages.river.travel = over * 4 * u * (1 - u); }
      if (plan.river && !covered) stages.river.update(now, t, camera, renderer, scene, linearMode, rise);
      /* Brindavana Pravesha and the return: one path in the river world (pravesha.js), its cues in t */
      if (stages.river && stages.river.pravesha) stages.river.pravesha.update(now, t, stages.river.hour.night, praveshaCues, t >= M.docB - .002);

      /* the camera: the one track, and past the end of the story the
         footer scrolls in over the last frame, its progress tilting the
         camera to the lotus */
      /* the footer is in the flow (css #footer): how far its top has risen
         into the frame is the camera's settle to the lotus and the ground
         coming up under the last lines */
      const fr = footerEl ? footerEl.getBoundingClientRect() : null;
      const fp = fr ? clamp01((vh - fr.top) / vh) : 0;
      if (stages.river) stages.river.footerP = fp;
      body.classList.toggle('in-footer', fp > .5);
      let shot = camAt(t, fp, M, lay), offsetY = 0;
      if (ci === 0 && window.__camOverride) { const o = window.__camOverride; shot = { pos: A2W(...o.pos), look: A2W(...o.look), fov: o.fov || shot.fov }; }
      hudBeatsTick(t);

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
        const amp = lerp(.2, .12, smooth(remap(t, M.docA, M.docA + .04)));   // the hero answers the cursor most; the walk a little less, eased, never stepped
        pos.addScaledVector(_right, mouse.x * amp);
        pos.y += -mouse.y * amp * .6;
        /* the target moves a little AGAINST the stand: the drift has depth
           (near things slide more than far), never a flat pan */
        look.addScaledVector(_right, -mouse.x * amp * .32);
        look.y += mouse.y * amp * .18;
      }

      /* the shot is a TARGET. Every chapter authors its own keys, and until
         now the camera copied them raw, so every keyframe stop, every C0
         kink and every pop between segments was on screen. One critically
         damped follow gives the whole site a single temporal character:
         moves gather and settle the same way in the yard, the hall and the
         sanctum. A jump larger than a room (a stage switch under a veil, a
         chapter link) is a cut and is taken at once, never flown through. */
      const fovT = isMobile ? Math.min(shot.fov + 6, 50) : shot.fov;
      const lam = reduced ? 40 : 16;   // a light follow: the story's y is damped once (scroll.js) and the track is C1; this only takes the step out of a resize
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
        fogDTarget = lerp(lerp(ATMOS[0].d, AFTERNOON.d, h.day), NIGHT.d, h.night) + .004 * smooth(stages.river.tailP || 0) + .0022 * (stages.river.travel || 0);   // the air closes a little at Manchale, and a breath while the camera travels
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
      captions.update(t, reduced, lay);
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
      body.classList.toggle('ui-quiet', t > M.chamber[0] && t < M.chamber[3]);
      /* dark ink for the moment the morning light fills the frame */
      body.classList.toggle('ui-light', vl.light > .5);
      aaradhaneLink.classList.toggle('visible', t > M.returnA);

      ambience.update(t, dt, rise, M);

      /* the opening layers leave as the journey begins; their arrival is the
         CSS hero entrance, released by body.hero-in (see style.css) */
      /* written while the layers are leaving, and once more after: a jump
         straight past the window (a chapter link, a review step) must still
         land them at zero */
      const foT = COPY_OUT * vh / timeline.max;   // the copy's fade-out, in t (score.js)
      if (hero && (t < M.docA || dom.heroO !== '0.000')) {
        /* the hero's copy leaves as its window closes (score.js hero.copy), the same way every beat's does */
        const leave = smooth(remap(t, M.heroCopy[1] - foT, M.heroCopy[1]));
        const ho = (1 - leave).toFixed(3);
        if (ho !== dom.heroO) { dom.heroO = ho; hero.style.opacity = ho; }
        const ht = `translate(${(mouse.x * -13).toFixed(1)}px, ${(leave * -26 + mouse.y * -8).toFixed(1)}px)`;
        if (ht !== dom.heroT) { dom.heroT = ht; hero.style.transform = ht; }
        // selectable while readable; inert once it has faded from the scene
        const hp = leave < .65 ? '' : 'none';
        if (hp !== dom.heroP) { dom.heroP = hp; hero.style.pointerEvents = hp; }
      }
      if (wordEl && (t < M.docA || dom.wordO !== '0.000')) {
        const wordO = 1 - smooth(remap(t, M.heroCopy[1] - 1.8 * foT, M.heroCopy[1] - .3 * foT));
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
        else {
          /* the scene, exactly as it is; the skin over it only where a hand has touched it */
          surface.render(scene, camera, now, dt);
        }
      }

      if (!manual) rafAlive = performance.now();
    }
    let rafAlive = performance.now();
    /* the loop rides GSAP's ticker, after the ScrollTrigger's own scrub has
       moved t for this frame (scroll.js) */
    gsap.ticker.add(() => frame(false));
    // watchdog: some embedded webviews suspend rAF even while visible
    setInterval(() => {
      if (document.hidden) return;
      if (performance.now() - rafAlive > 250) frame(true);
    }, 33);

    /* debug/authoring hook: jump to a scroll position, settle, return a frame */
    window.ANTARANGA = {
      renderer, scene, camera, timeline, stages, ambience, surface, get grade() { return getGrade(); },
      /* review aid: pin the sunrise dial (0 pre-dawn … 1 morning), -1 to release */
      setRise(v) { riseOverride = v; },
      step(t) {
        window.scrollTo(0, timeline.yAt(t));
        timeline.inited = true; timeline.hold(t);
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
        if (settle) { timeline.inited = true; timeline.hold(t); camS.force = true; }
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
