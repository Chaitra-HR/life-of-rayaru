// RAYARA ANTARANGA · main — one continuous world, one authored camera, one scroll.
// scroll position → section progress → global t → target camera → damped camera → render
import * as THREE from 'three';
import { clamp, clamp01, lerp, remap, smooth, damp, V3 } from './util.js';
import { ScrollTimeline, Captions, CHAPTERS, veilOpacity } from './scroll.js';
import { BrindavanaPreloader } from './preloader.js';
import { Soundscape } from './audio.js';
import { Grade } from './post.js';
import { createRiverStage, BRND_POS } from './world/river.js';
import { approachToWorld, GATE_Z, STYLED } from './world/hero.js';
import { createInteriorStage, INTERIOR_Y } from './world/interior.js';
import { createParimalaStage, PARIMALA_Y } from './world/parimala.js';
import { createBhedaStage, BHEDA_Y } from './world/bheda.js';
import { createJourneyStage, JOURNEY_Y } from './world/journey.js';
import { createManchaleStage, MANCHALE_Y } from './world/manchale.js';
import { createPraveshaStage, PRAVESHA_Y } from './world/pravesha.js';
import { createAntarangaStage, ANTARANGA_Y } from './world/antaranga.js';
import { createPresenceStage } from './world/presence.js';
import { createWorks } from './works.js';

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
      ['river', createRiverStage], ['interior', createInteriorStage],
    ];
    const rest = [
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

    /* behind the live site: the rest of the world, in scroll order. It waits
       out the dawn-rise — a stage build (and its shader compile) is a
       main-thread stall, and a stall during the light transition or the
       visitor's first scroll reads as lag. */
    preloader.finished.then(async () => {
      await new Promise(r => setTimeout(r, reduced ? 300 : 9500));
      for (const [key, make] of rest) {
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
    if (u < .3) {
      // hold: low on the water, the landing and gateway right of centre,
      // the left open for the copy. Three compositions: desktop/tablet/phone.
      const v = smooth(remap(u, 0, .3));
      const ar = window.innerWidth / Math.max(1, window.innerHeight);
      let P, L, fov;
      if (ar < .8)       { P = [2.5, 1.9, 58]; L = [7.5, 5.2, 6]; fov = 46; }   // phone
      else if (ar < 1.3) { P = [1.0, 1.7, 52]; L = [7.2, 4.8, 6]; fov = 40; }   // tablet
      else               { P = [-1.5, 1.5, 46]; L = [6.5, 4.3, 6]; fov = 36; }  // desktop
      const tIdle = performance.now() / 1000;
      const dx = reduced ? 0 : Math.sin(tIdle * .11) * .22 + Math.sin(tIdle * .047) * .14;
      const dy = reduced ? 0 : Math.sin(tIdle * .16 + 1.3) * .05;
      return {
        pos: A2W(P[0] + dx, lerp(P[1] + .05, P[1], v) + dy, lerp(P[2] + .6, P[2], v)),
        look: A2W(L[0] + dx * .6, L[1], L[2]),
        fov,
      };
    }
    if (u < .72) {
      const v = smooth(remap(u, .3, .72));
      return {
        pos: A2W(lerp(-1.5, 7.7, Math.min(1, v * 1.3)), lerp(1.5, 2.9, v), lerp(46, GATE_Z - 4, v)),
        look: A2W(lerp(6.5, 11.6, v), lerp(4.3, 3.5, v), lerp(6, 2, v)),
        fov: lerp(36, 43, v),
      };
    }
    const v = smooth(remap(u, .72, 1));
    // dip toward the reflection and pass through the surface
    return {
      pos: A2W(lerp(7.7, 13, v), lerp(2.9, .18, v), lerp(GATE_Z - 4, 4, v)),
      look: A2W(lerp(11.6, 13, v), lerp(3.5, -2.8, v), lerp(2, 0, v)),
      fov: lerp(43, 47, v),
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
    { c: 0x93a3b4, d: .0058 }, // 00 mantralaya at first light
    { c: 0x74572f, d: .011 },  // 01 bhuvanagiri: warm open morning
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
      interior: t >= .062 && t < .378,
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
    const sound = new Soundscape();
    const veilEl = document.getElementById('veil');
    const body = document.body;
    const audioBtn = document.getElementById('audio-toggle');
    const aaradhaneLink = document.getElementById('aaradhane-link');

    /* a lost context must not strand the visitor on a frozen frame */
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      veilEl.style.opacity = 1;
    });
    canvas.addEventListener('webglcontextrestored', () => {
      veilEl.style.opacity = 0;
    });

    const setSound = (on) => {
      audioBtn.setAttribute('aria-pressed', String(on));
      audioBtn.setAttribute('aria-label', on ? 'Mute ambient sound' : 'Enable ambient sound');
      try { sessionStorage.setItem('antaranga-sound', on ? '1' : '0'); } catch (e) {}
    };
    audioBtn.addEventListener('click', () => setSound(sound.toggle()));
    try {
      if (sessionStorage.getItem('antaranga-sound') === '1') {
        const arm = () => { if (!sound.enabled) setSound(sound.toggle()); };
        window.addEventListener('pointerdown', arm, { once: true });
      }
    } catch (e) {}

    /* the waveform: still while silent; travels only while ambience plays */
    const wavePath = document.getElementById('wave-path');
    let wavePhase = 0, waveAmp = 0;
    const waveD = (amp, phase) => {
      const N = 28, W = 64, mid = 10;
      let d = '';
      for (let i = 0; i <= N; i++) {
        const x = i / N;
        const env = Math.sin(x * Math.PI);
        const y = mid - Math.sin(x * 8.2 - phase) * env * amp * 7 - Math.sin(x * 19 + phase * .7) * env * amp * 1.6;
        d += (i ? ' L' : 'M') + (x * W).toFixed(2) + ' ' + y.toFixed(2);
      }
      return d;
    };
    if (wavePath) wavePath.setAttribute('d', waveD(0, 0));
    const drawWave = (dt) => {
      if (!wavePath) return;
      const playing = sound.enabled;
      audioBtn.classList.toggle('playing', playing);
      const target = playing ? 1 : 0;
      const prev = waveAmp;
      waveAmp = damp(waveAmp, target, 3, dt);
      if (Math.abs(waveAmp - target) < .004) waveAmp = target;
      if (playing && !reduced) wavePhase += dt * 3.4;
      if (playing || waveAmp !== prev) wavePath.setAttribute('d', waveD(waveAmp, reduced ? 0 : wavePhase));
    };

    /* ---------------- navigation ---------------- */
    const hero = document.getElementById('hero');
    const wordEl = document.getElementById('word');
    document.querySelectorAll('[data-ch]').forEach(b =>
      b.addEventListener('click', () => {
        timeline.scrollToChapter(+b.dataset.ch);
        closeSheet();
      }));

    /* chapter control: a compact chip opening an accessible sheet */
    const chip = document.getElementById('chip');
    const chipNum = document.getElementById('chip-num');
    const chipName = document.getElementById('chip-name');
    const sheet = document.getElementById('sheet');
    const sheetClose = sheet ? sheet.querySelector('.sheet-close') : null;
    let sheetOpen = false, lastFocus = null;
    function openSheet() {
      if (!sheet || sheetOpen) return;
      sheetOpen = true;
      lastFocus = document.activeElement;
      sheet.hidden = false;
      requestAnimationFrame(() => sheet.classList.add('open'));
      const first = sheet.querySelector('button');
      if (first) first.focus();
      chip.setAttribute('aria-expanded', 'true');
    }
    function closeSheet() {
      if (!sheet || !sheetOpen) return;
      sheetOpen = false;
      sheet.classList.remove('open');
      chip.setAttribute('aria-expanded', 'false');
      setTimeout(() => { if (!sheetOpen) sheet.hidden = true; }, 320);
      // some browsers never focus a tapped button — fall back to the chip
      const back = (lastFocus && lastFocus !== document.body && lastFocus.focus) ? lastFocus : chip;
      back.focus();
    }
    if (chip && sheet) {
      // the sheet's chapter list
      const list = sheet.querySelector('.sheet-list');
      CHAPTERS.forEach((c, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.innerHTML = `<b>${c.num}</b><span>${c.name}</span>`;
        b.addEventListener('click', () => { timeline.scrollToChapter(i); closeSheet(); });
        list.appendChild(b);
      });
      chip.addEventListener('click', () => sheetOpen ? closeSheet() : openSheet());
      if (sheetClose) sheetClose.addEventListener('click', closeSheet);
      sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });
      // focus trap + escape
      sheet.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { closeSheet(); return; }
        if (e.key !== 'Tab') return;
        const focusables = sheet.querySelectorAll('button');
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
        else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
      });
    }

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

    /* the arrival: the hero opens in darkness and the first light is raised */
    let riseT0 = -1;
    const RISE_DUR = 7.5;
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
    let activeChapter = -1;
    let lastMalaTick = 0;

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
      if (rise > .02) body.classList.remove('predawn');
      setLinearMode(STYLED.linear && openNow > .35);
      if (plan.river) stages.river.update(now, t, camera, renderer, scene, linearMode, rise);
      if (plan.interior && stages.interior) {
        // one continuous travel: u01 spans scenes 01–02, u02 spans 03–04
        const u01 = clamp01((t - CHAPTERS[1].a) / (CHAPTERS[2].b - CHAPTERS[1].a));
        const u02 = clamp01((t - CHAPTERS[3].a) / (CHAPTERS[4].b - CHAPTERS[3].a));
        stages.interior.update(now, t, u01, u02);
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
      if (plan.pravesha && stages.pravesha) {
        stages.pravesha.update(now, t, uPrv);
        // japa ticks while the mala still moves
        if (sound.enabled && uPrv > .05 && uPrv < .28 && now - lastMalaTick > 1.6) {
          lastMalaTick = now; sound.tick();
        }
      }
      if (plan.antaranga && stages.antaranga) stages.antaranga.update(now, t, uAnt);
      if (plan.presence && stages.presence) stages.presence.update(now, t, uPre);

      /* camera routing */
      let shot, offsetY = 0;
      switch (ci) {
        case 0:
          shot = cam00(u);
          if (window.__camOverride) { const o = window.__camOverride; shot = { pos: A2W(...o.pos), look: A2W(...o.look), fov: o.fov || shot.fov }; }
          break;
        case 1: case 2: case 3: case 4:
          if (stages.interior) { shot = stages.interior.cam(ci, u); offsetY = INTERIOR_Y; }
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
      fogCol.lerp(fogTarget, 1 - Math.exp(-2.2 * dt));
      fogD = damp(fogD, fogDTarget, 2.2, dt);
      scene.fog.color.copy(fogCol);
      scene.fog.density = fogD;
      renderer.setClearColor(fogCol, 1);

      /* captions + veil + UI states */
      captions.update(t, reduced);
      veilEl.style.opacity = veilOpacity(t).toFixed(3);
      body.classList.toggle('ui-hidden', t > .012);
      body.classList.toggle('ui-quiet', t > .717 && t < .87);
      aaradhaneLink.classList.toggle('visible', t > .93);

      works.update(t);

      /* the Pañcabheda panel owns its own quiet window inside scene 06 */
      if (pb) {
        const pbW = smooth(remap(t, .506, .514)) * (1 - smooth(remap(t, .548, .558)));
        pb.style.opacity = pbW.toFixed(3);
        const live = pbW > .35;
        if (live && pb.hidden) pb.hidden = false;
        pb.classList.toggle('live', live);
      }

      if (ci !== activeChapter) {
        activeChapter = ci;
        if (chipNum) chipNum.textContent = `${ch.num} / 09`;
        if (chipName) chipName.textContent = ch.name.toUpperCase();
      }

      sound.update(t, now);
      drawWave(dt);

      /* the opening layers leave at different rates as the journey begins */
      const heroIn = reduced ? 1 : smooth(clamp01((rise - .18) / .5));
      const wordIn = reduced ? 1 : smooth(clamp01((rise - .34) / .5));
      if (hero) {
        const f = (1 - smooth(remap(t, .016, .048))) * heroIn;
        hero.style.opacity = f.toFixed(3);
        hero.style.transform = `translate(${(mouse.x * -13).toFixed(1)}px, ${((1 - heroIn) * 14 + (1 - (1 - smooth(remap(t, .016, .048)))) * -26 + mouse.y * -8).toFixed(1)}px)`;
        hero.style.pointerEvents = f > .5 ? '' : 'none';
      }
      if (wordEl) {
        wordEl.style.opacity = ((1 - smooth(remap(t, .012, .040))) * wordIn).toFixed(3);
        /* the word is planted in the near ground: under the cursor it shifts
           more than the copy and against the world — three depths of parallax */
        wordEl.style.transform =
          `translate(calc(-50% + ${(mouse.x * -24).toFixed(1)}px), ${(mouse.y * -9).toFixed(1)}px)`;
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
