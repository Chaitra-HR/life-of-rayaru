// RAYARA ANTARANGA · main — one continuous world, one authored camera, one scroll.
// scroll position → section progress → global t → target camera → damped camera → render
import * as THREE from 'three';
import { clamp, clamp01, lerp, remap, smooth, damp, V3 } from './util.js';
import { ScrollTimeline, Captions, CHAPTERS, veilOpacity } from './scroll.js';
import { BrindavanaPreloader } from './preloader.js';
import { Grade } from './post.js';
import { createRiverStage, BRND_POS } from './world/river.js';
import { approachToWorld, STYLED } from './world/hero.js';
import { createPurvashramaStage, PURVA_Y } from './world/purvashrama.js';
import { createInteriorStage, INTERIOR_Y } from './world/interior.js';
import { createParimalaStage, PARIMALA_Y } from './world/parimala.js';
import { createBhedaStage, BHEDA_Y } from './world/bheda.js';
import { createJourneyStage, JOURNEY_Y } from './world/journey.js';
import { createManchaleStage, MANCHALE_Y } from './world/manchale.js';
import { createPraveshaStage, PRAVESHA_Y } from './world/pravesha.js';
import { createAntarangaStage, ANTARANGA_Y } from './world/antaranga.js';
import { createPresenceStage } from './world/presence.js';
import { createWorks } from './works.js';
import { createPurva } from './purva.js';

const isMobile = window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window && window.innerWidth < 900;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const ctx = { isMobile, reduced };

/* scene 09 sub-sequence boundaries in global t (pravesha → antaranga → presence) */
const T9A = .725, T9B = .795, T9C = .858, T9END = .910;

/* ---------------- no-WebGL fallback ----------------
   The reading experience must survive: the biography flows as a document. */
function noWebGL() {
  document.body.classList.add('nowebgl');
  const pre = document.getElementById('preloader');
  if (pre) pre.remove();
  const ss = document.getElementById('scroll-space');
  if (ss) ss.style.height = '0';
  new Captions();                       // the full narrative, now in flow
  const host = document.getElementById('captions');
  host.classList.add('static');
  // the Pūrvāśrama chapter reads as plain text, in narrative order
  const purva = document.getElementById('purva');
  host.before(purva);
  purva.hidden = false;
  // the five distinctions read as plain text where the interaction cannot run
  const pb = document.getElementById('panchabheda');
  if (pb) pb.hidden = false;
  // and the works of the horizontal canvas likewise
  createWorks({ reduced: true });
  const wk = document.getElementById('works');
  if (wk) wk.hidden = false;
  // section headings for the document outline
  const heads = document.createElement('div');
  heads.className = 'static-note';
  heads.innerHTML = '<p>This journey is usually experienced as a scrolling cinematic world. Your browser could not start WebGL, so the full narrative is presented here as text.</p>';
  host.prepend(heads);
}

/* ---------------- renderer (guarded) ---------------- */
const canvas = document.getElementById('gl');
let renderer = null;
try {
  // ?nowebgl — QA aid: exercise the document fallback on capable machines
  if (!location.search.includes('nowebgl')) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, powerPreference: 'high-performance' });
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.4 : 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const grade = new Grade(renderer);
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

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  /* ---------------- boot ---------------- */
  /* already running: index.html starts it as soon as preloader.js arrives */
  const preloader = window.__preloader || (window.__preloader = new BrindavanaPreloader());
  const setProgress = p => preloader.setTarget(p);

  async function boot() {
    setProgress(.06);
    // fonts must be live before any canvas-drawn typography
    try {
      await Promise.race([
        Promise.all([
          document.fonts.load('300 100px "Onest"'),
          document.fonts.load('500 100px "Onest"'),
          document.fonts.load('300 100px "Noto Sans Kannada"'),
          document.fonts.load('400 100px "Noto Serif Devanagari"'),
        ]),
        new Promise(r => setTimeout(r, 900)),   // they began fetching at page load
      ]);
    } catch (e) { /* fall back to system fonts */ }
    setProgress(.32);

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
      ['river', createRiverStage], ['purva', createPurvashramaStage],
    ];
    const rest = [
      ['interior', createInteriorStage],
      ['parimala', createParimalaStage], ['bheda', createBhedaStage],
      ['journey', createJourneyStage], ['manchale', createManchaleStage],
      ['pravesha', createPraveshaStage], ['antaranga', createAntarangaStage],
      ['presence', createPresenceStage],
    ];
    const stages = {};
    for (let i = 0; i < first.length; i++) {
      const [key, make] = first[i];
      stages[key] = make(ctx);
      scene.add(stages[key].group);
      setProgress(.32 + (i + 1) / first.length * .3);        // .32 → .62
      await yieldToPaint();
      stages[key].group.visible = true;
      renderer.compile(scene, camera);
      stages[key].group.visible = false;
      setProgress(.62 + (i + 1) / first.length * .3);        // .62 → .92
      await yieldToPaint();
    }
    renderer.render(scene, camera);
    setProgress(.96);

    start(stages);
    setProgress(1);

    /* the Pūrvāśrama house arrives asynchronously: the moment it lands,
       compile its program and upload its textures while nothing is moving —
       never on the visitor's first scroll into scene 01 */
    if (stages.purva && stages.purva.ready) {
      stages.purva.ready.then(root => {
        if (!root) return;
        root.traverse(o => { if (o.isMesh && o.material.map) renderer.initTexture(o.material.map); });
        stages.purva.group.visible = true;
        renderer.compile(scene, camera);
        stages.purva.group.visible = false;
      });
    }

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
      while (performance.now() - lastInput < 700 && performance.now() - t0 < 12000) {
        await new Promise(r => setTimeout(r, 200));
      }
    };
    preloader.finished.then(async () => {
      await new Promise(r => setTimeout(r, reduced ? 300 : 9500));
      for (const [key, make] of rest) {
        await untilStill();
        stages[key] = make(ctx);
        scene.add(stages[key].group);
        await yieldToPaint();
        stages[key].group.visible = true;
        renderer.compile(scene, camera);
        stages[key].group.visible = false;
        await yieldToPaint();
      }
    });
  }

  /* ---------------- exterior cameras (world space) ---------------- */
  const A2W = (x, y, z) => approachToWorld(BRND_POS, x, y, z);
  function cam00(u) {
    // hold: low on the water, the landing and gateway right of centre,
    // the left open for the copy. Three compositions: desktop/tablet/phone.
    const ar = window.innerWidth / Math.max(1, window.innerHeight);
    let P, L, fov0;
    /* phone: the copy owns the sky in the top half; the gateway fills the
       width below it and the near bank stays a short grassy strip */
    if (ar < .8)       { P = [3.0, 2.2, 50]; L = [7.5, 8.8, 6]; fov0 = 44; }   // phone
    else if (ar < 1.3) { P = [1.6, 2.0, 49]; L = [7.2, 6.4, 6]; fov0 = 40; }   // tablet: less open foreground, more sky
    else               { P = [-1.5, 1.5, 46]; L = [6.5, 4.3, 6]; fov0 = 36; }  // desktop
    const tIdle = performance.now() / 1000;
    const sway = 1 - smooth(remap(u, .3, .44));    // the idle drift dissolves as the dolly gathers
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
    /* the passage: ONE continuous dolly from this viewpoint, through the
       gateway, onto the Brindavana's krishna-shila — a quadratic curve so
       there is no keyframe seam, easing out of the hold and settling
       against the stone. The dark face fills the frame and becomes the
       match cut into Pūrvāśrama.
       F = a point on the shrine's front face, N = that face's normal,
       C = a control point over the gateway that keeps the curve on the
       proven line through the arch. */
    const FX = 10.33, FY = 3.85, FZ = 3.22, NX = -.479, NZ = .878;  // between the mala's two strands
    const CX = 8.6, CY = 3.2, CZ = 14;
    const w = smooth(remap(u, .3, .96));
    const push = smooth(remap(u, .96, 1));     // held covered, still breathing forward
    const d = .74 - .06 * push;
    const EX = FX + NX * d, EY = FY, EZ = FZ + NZ * d;
    const k = 1 - w;
    const lw = smooth(remap(u, .3, .8));       // the gaze settles on the stone before the body arrives
    return {
      pos: A2W(k * k * P[0] + 2 * k * w * CX + w * w * EX + dx,
               k * k * P[1] + 2 * k * w * CY + w * w * EY + dy,
               k * k * P[2] + 2 * k * w * CZ + w * w * EZ),
      look: A2W(lerp(L[0] + dx * .6, FX - NX, lw), lerp(L[1], FY - .05, lw), lerp(L[2], FZ - NZ, lw)),
      fov: lerp(fov0, 44, w),
    };
  }
  function cam10(u) {
    const v = smooth(remap(u, 0, .6));
    const hold = remap(u, .6, 1);
    return {
      pos: V3(0, lerp(2.05, 2.12, v), lerp(8, 20.5, v) + hold * .6),
      look: V3(0, lerp(3.1, 3.2, v), BRND_POS.z),
      fov: 40,
    };
  }

  /* ---------------- fog / atmosphere per chapter ---------------- */
  const ATMOS = [
    { c: 0x9c9fb4, d: .0058 }, // 00 mantralaya at first light — dusty dawn lavender
    { c: 0x74572f, d: .0085 }, // 01 bhuvanagiri: warm open morning
    { c: 0x0a0703, d: .042 },  // 02 gṛhastha: lamp-dark interior
    { c: 0x0a0704, d: .034 },  // 03 kumbhakonam hall
    { c: 0x080502, d: .05 },   // 04 sannyāsa: reduced, contrasted
    { c: 0x0a0704, d: .036 },  // 05 the works: manuscript dark
    { c: 0x030304, d: .03 },   // 06 tattvavāda
    { c: 0x857e6f, d: .0215 }, // 07 the journey: the haze of the land
    { c: 0x6a5138, d: .0085 }, // 08 manchale
    { c: 0x060403, d: .055 },  // 09 brindavana (pravesha; sub-ranges override)
    { c: 0x120e0a, d: .02 },   // 00 return
  ];

  /* stage visibility windows in global t (with pads for transitions) */
  function visibilityPlan(t) {
    return {
      river: t < .082 || t > .868,
      purva: t >= .062 && t < .301,
      interior: t >= .289 && t < .378,
      parimala: t >= .362 && t < .488,
      bheda: t >= .472 && t < .578,
      journey: t >= .562 && t < .663,
      manchale: t >= .647 && t < .733,
      pravesha: t >= .717 && t < .803,
      antaranga: t >= .787 && t < .866,
      presence: t >= .850 && t < .918,
    };
  }

  function start(stages) {
    const timeline = new ScrollTimeline({ pages: isMobile ? 46 : 52, reduced });
    const captions = new Captions();
    const veilEl = document.getElementById('veil');
    const body = document.body;
    const aaradhaneLink = document.getElementById('aaradhane-link');

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

    /* ---------------- Pañcabheda interaction ---------------- */
    const pb = document.getElementById('panchabheda');
    const PB_TEXT = {
      'isvara+jiva': ['Īśvara–Jīva', 'God and the individual soul are distinct.'],
      'isvara+jada': ['Īśvara–Jaḍa', 'God and matter are distinct.'],
      'jiva+jiva':   ['Jīva–Jīva', 'No two souls are identical.'],
      'jada+jiva':   ['Jīva–Jaḍa', 'The conscious self is distinct from matter.'],
      'jada+jada':   ['Jaḍa–Jaḍa', 'One material thing is distinct from another.'],
    };
    if (pb) {
      const buttons = [...pb.querySelectorAll('.pb-e')];
      const result = pb.querySelector('.pb-result');
      const resetBtn = pb.querySelector('.pb-reset');
      const found = new Set();
      const counter = pb.querySelector('.pb-count');
      let picked = [];
      const render = () => {
        buttons.forEach(b => b.classList.toggle('sel', picked.includes(b)));
        if (picked.length === 2) {
          const key = picked.map(b => b.dataset.kind).sort().join('+');
          const r = PB_TEXT[key];
          if (r) {
            found.add(key);
            result.innerHTML = `<b>${r[0]}</b><span>${r[1]}</span>`;
            pb.classList.add('answered');
          }
        } else {
          result.innerHTML = '';
          pb.classList.remove('answered');
        }
        if (counter) counter.textContent = `${found.size} of 5 distinctions found`;
      };
      buttons.forEach(b => b.addEventListener('click', () => {
        const i = picked.indexOf(b);
        if (i >= 0) picked.splice(i, 1);           // tap again to unpick
        else if (picked.length === 2) picked = [b]; // a third tap starts over
        else picked.push(b);
        render();
      }));
      resetBtn.addEventListener('click', () => { picked = []; render(); });
      render();
    }

    /* ---------------- 05 · The Works: the horizontal canvas ----------------
       One continuous editorial composition (js/works.js): the chapter pins
       and vertical scroll becomes a slow lateral camera move through the
       five granthas; on touch the same canvas is a native snap track. */
    const works = createWorks({ reduced });

    /* 01 · Pūrvāśrama: the chapter's own editorial layer (js/purva.js) */
    const purvaDom = createPurva({ reduced });

    /* mouse parallax — depth only, never control */
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    if (!isMobile && !reduced) {
      window.addEventListener('mousemove', e => {
        mouse.tx = (e.clientX / window.innerWidth - .5) * 2;
        mouse.ty = (e.clientY / window.innerHeight - .5) * 2;
      });
    }

    const fogCol = new THREE.Color(0x121722);      // opens at pre-dawn
    const fogTarget = new THREE.Color();
    const preDawnFog = new THREE.Color(0x121722);
    let fogD = ATMOS[0].d;

    /* the arrival: the hero opens in darkness and the sun is raised —
       a full sunrise arc (twilight, crest, climb), so it takes its time */
    let riseT0 = -1;
    const RISE_DUR = 9;
    preloader.finished.then(() => { riseT0 = performance.now() / 1000 + .35; });
    document.body.classList.add('predawn');
    const riseNow = (now) => {
      if (reduced) return 1;
      if (riseT0 < 0) return 0;
      const u = clamp01((now - riseT0) / RISE_DUR);
      return u * u * (3 - 2 * u);
    };

    const _right = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _fwd = new THREE.Vector3();
    let lastTime = performance.now() / 1000;

    function frame(manual = false) {
      const now = performance.now() / 1000;
      const dt = clamp(now - lastTime, .001, .05);
      lastTime = now;

      // self-heal renderer size (page may have loaded in a hidden viewport)
      const w = window.innerWidth, h = window.innerHeight;
      const size = renderer.getSize(new THREE.Vector2());
      if (w > 0 && h > 0 && (size.x !== w || size.y !== h)) {
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        timeline.resize();
      }

      const t = timeline.update(dt);
      const ci = timeline.chapterAt(t);
      const ch = CHAPTERS[ci];
      const u = clamp01((t - ch.a) / (ch.b - ch.a));

      /* visibility */
      const plan = visibilityPlan(t);
      for (const k in plan) if (stages[k]) stages[k].setVisible(plan[k]);

      /* per-stage updates (only when visible) */
      const openNow = t < .5 ? 1 - smooth(remap(t, .048, .070)) : 0;
      const rise = riseNow(now);
      if (rise > .02) { body.classList.remove('predawn'); body.classList.add('hero-in'); }
      setLinearMode(STYLED.linear && openNow > .35);
      if (plan.river) stages.river.update(now, t, camera, renderer, scene, linearMode, rise);
      if (plan.purva && stages.purva) stages.purva.update(now, t);
      if (plan.interior && stages.interior) {
        // u02 spans scenes 03–04: the corridor's original clock, kept so the
        // sannyāsa chamber's choreography is unchanged
        const u02 = clamp01((t - CHAPTERS[3].a) / (CHAPTERS[4].b - CHAPTERS[3].a));
        stages.interior.update(now, t, u02);
      }
      if (plan.parimala && stages.parimala) {
        const u05 = clamp01((t - CHAPTERS[5].a) / (CHAPTERS[5].b - CHAPTERS[5].a));
        stages.parimala.update(now, t, u05, camera);
      }
      if (plan.bheda && stages.bheda) stages.bheda.update(now, t, clamp01((t - CHAPTERS[6].a) / (CHAPTERS[6].b - CHAPTERS[6].a)));
      if (plan.journey && stages.journey) stages.journey.update(now, t, clamp01((t - CHAPTERS[7].a) / (CHAPTERS[7].b - CHAPTERS[7].a)), camera);
      if (plan.manchale && stages.manchale) {
        const u08 = clamp01((t - CHAPTERS[8].a) / (CHAPTERS[8].b - CHAPTERS[8].a));
        stages.manchale.update(now, t, 0, u08);
      }
      const uPrv = clamp01(remap(t, T9A, T9B));
      const uAnt = clamp01(remap(t, T9B, T9C));
      const uPre = clamp01(remap(t, T9C, T9END));
      if (plan.pravesha && stages.pravesha) stages.pravesha.update(now, t, uPrv);
      if (plan.antaranga && stages.antaranga) stages.antaranga.update(now, t, uAnt);
      if (plan.presence && stages.presence) stages.presence.update(now, t, uPre);

      /* camera routing */
      let shot, offsetY = 0;
      switch (ci) {
        case 0:
          shot = cam00(u);
          if (window.__camOverride) { const o = window.__camOverride; shot = { pos: A2W(...o.pos), look: A2W(...o.look), fov: o.fov || shot.fov }; }
          break;
        case 1: case 2: case 3:
          if (stages.purva) { shot = stages.purva.cam(ci, u); offsetY = PURVA_Y; }
          else shot = cam00(1);
          break;
        case 4:
          if (stages.interior) { shot = stages.interior.cam(u); offsetY = INTERIOR_Y; }
          else shot = cam00(1);
          break;
        case 5: if (stages.parimala) { shot = stages.parimala.cam(u); offsetY = PARIMALA_Y; } else shot = cam00(1); break;
        case 6: if (stages.bheda) { shot = stages.bheda.cam(u); offsetY = BHEDA_Y; } else shot = cam00(1); break;
        case 7: if (stages.journey) { shot = stages.journey.cam(u); offsetY = JOURNEY_Y; } else shot = cam00(1); break;
        case 8: if (stages.manchale) { shot = stages.manchale.cam06(u); offsetY = MANCHALE_Y; } else shot = cam00(1); break;
        case 9:
          if (t < T9B) { if (stages.pravesha) { shot = stages.pravesha.cam(uPrv); offsetY = PRAVESHA_Y; } else shot = cam00(1); }
          else if (t < T9C) { if (stages.antaranga) { shot = stages.antaranga.cam(uAnt); offsetY = ANTARANGA_Y; } else shot = cam00(1); }
          else { shot = stages.presence ? stages.presence.cam(uPre) : cam10(0); }
          break;
        default: shot = cam10(u); break;
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
        const amp = ci === 0 ? .2 : .12;   // the hero answers the cursor most
        pos.addScaledVector(_right, mouse.x * amp);
        pos.y += -mouse.y * amp * .6;
      }

      camera.position.copy(pos);
      camera.lookAt(look);
      camera.fov = shot.fov + (isMobile ? 8 : 0);
      camera.updateProjectionMatrix();

      /* atmosphere — scene 09 blends through its three interior movements */
      let atm = ATMOS[ci];
      if (ci === 9) {
        if (t >= T9C) atm = { c: 0x040406, d: .024 };
        else if (t >= T9B) atm = { c: 0x030304, d: .02 };
      }
      fogTarget.setHex(atm.c);
      if (ci === 0) fogTarget.lerp(preDawnFog, 1 - rise);
      let fogDTarget = atm.d;
      if (ci === 0 && !STYLED.fog) fogDTarget = .0008;
      // the approach to the stone: the landscape softens into haze while the
      // near krishna-shila stays defined — an atmospheric depth shift
      if (ci === 0) fogDTarget += smooth(remap(t, .048, .064)) * .007;
      fogCol.lerp(fogTarget, 1 - Math.exp(-2.2 * dt));
      fogD = damp(fogD, fogDTarget, 2.2, dt);
      scene.fog.color.copy(fogCol);
      scene.fog.density = fogD;
      renderer.setClearColor(fogCol, 1);

      /* captions + veil + UI states */
      captions.update(t, reduced);
      veilEl.style.opacity = veilOpacity(t).toFixed(3);
      body.classList.toggle('ui-quiet', t > .717 && t < .87);
      aaradhaneLink.classList.toggle('visible', t > .93);

      works.update(t);
      purvaDom.update(t);

      /* the Pañcabheda panel owns its own quiet window inside scene 06 */
      if (pb) {
        const pbW = smooth(remap(t, .506, .514)) * (1 - smooth(remap(t, .548, .558)));
        pb.style.opacity = pbW.toFixed(3);
        const live = pbW > .35;
        if (live && pb.hidden) pb.hidden = false;
        pb.classList.toggle('live', live);
      }

      /* the opening layers leave as the journey begins; their arrival is the
         CSS hero entrance, released by body.hero-in (see style.css) */
      if (hero) {
        const leave = smooth(remap(t, .016, .048));
        hero.style.opacity = (1 - leave).toFixed(3);
        hero.style.transform = `translate(${(mouse.x * -13).toFixed(1)}px, ${(leave * -26 + mouse.y * -8).toFixed(1)}px)`;
        // selectable while readable; inert once it has faded from the scene
        hero.style.pointerEvents = leave < .65 ? '' : 'none';
      }
      if (wordEl) {
        const wordO = 1 - smooth(remap(t, .012, .040));
        wordEl.style.opacity = wordO.toFixed(3);
        wordEl.style.pointerEvents = wordO > .35 ? '' : 'none';
        /* the word is planted in the near ground: under the cursor it shifts
           more than the copy and against the world — three depths of parallax.
           Amplitude rides the viewport (±.6vw) so the fitted word's margins
           always absorb the shift and the M and final A never clip. */
        wordEl.style.transform =
          `translate(calc(-50% + ${(mouse.x * -.6).toFixed(2)}vw), ${(mouse.y * -9).toFixed(1)}px)`;
      }

      /* the river's planar reflection needs this frame's camera */
      if (plan.river) stages.river.reflect(renderer, scene, camera);

      /* the opening's grade; the dive into the water carries the cut */
      if (linearMode) grade.render(scene, camera, { time: now, fade: 1, bloom: STYLED.bloom ? .14 : 0 });
      else { renderer.setRenderTarget(null); renderer.render(scene, camera); }

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
      renderer, scene, camera, timeline, stages,
      step(t) {
        timeline.raw = t; timeline.t = t;
        window.scrollTo(0, t * timeline.max);
        frame(true);
      },
      tick() { frame(true); },
      snap(t, settle = true, steps = 8) {
        window.scrollTo(0, t * timeline.max);
        timeline.raw = t;
        if (settle) timeline.t = t;
        for (let i = 0; i < steps; i++) frame(true);
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
