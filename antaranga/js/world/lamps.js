// ANTARANGA · the lamp world: SEVEN LAMPS.
//
// The site is one night's vigil at Mantralaya. The day goes down over the
// river, and the life is remembered in the dark by lamplight, one lamp for
// each chapter, until the lamps become the sanctum's own. Nothing is seen
// but what a flame reaches: brass, sand, paper, a floor, the words.
//
// Seven beats stand far apart on one dark floor; the chapters (index.html
// .band-lamps, movements.js world bands) each open on one of them under a
// curtain of the dark itself. camV(p, beat) frames the beat by band progress
// p; updateV(time, p, beat) runs its flames.
import * as THREE from 'three';
import { deepaLamp, clayLamp, flame, glowSprite, clamp01, remap, smooth, lerp, noise2, mulberry } from '../util.js';
import { tallDeepa } from './deepa.js';
import { sandTray } from './props.js';
import { buildRehal } from './parimala.js';
import { WORKS } from '../works.js';

export const LAMPS_Y = 4000;

const FLAME_SCALE = 2.4;      // the tall deepa's flames are made for a wide scene; here they are the subject
const LIGHT = 9;              // candela at a tall deepa's wick
const V = (a) => new THREE.Vector3(...a);

/* a tall deepa lit to v (0 dark .. 1 burning) */
function setTall(d, v) {
  const s = Math.max(.001, smooth(clamp01(v)));
  for (const f of d.userData.fls) f.scale.set(s * FLAME_SCALE, s * FLAME_SCALE * 1.75, s * FLAME_SCALE);
  if (d.userData.pl) d.userData.pl.intensity = LIGHT * s;
}
function tall(g, x, z) {
  const d = tallDeepa(); d.position.set(x, 0, z); g.add(d);
  /* the flame's outermost halo is sized for a wide scene; close to the lens
     it would fill the sky with a grey veil */
  for (const f of d.userData.fls) f.children[0].scale.multiplyScalar(.45);
  d.userData.pl = d.children.find(c => c.isPointLight) || null;
  if (d.userData.pl) { d.userData.pl.distance = 9; d.userData.pl.decay = 2; }
  return d;
}
/* a clay lamp lit to v; its flame taller than the site's small interior ones */
function setClay(l, v) {
  const s = smooth(clamp01(v));
  l.userData.setOn(s);
  const k = Math.max(.001, s);
  for (const f of l.userData.flames) f.scale.set(k, k * 1.6, k);
}
function clay(g, x, z, scale = 5, light = true, intensity = 6) {
  /* the flame is in the lamp's own scale: a real clay lamp's flame is a
     third of the lamp, and its far halo must stay a halo, not a sky */
  const l = clayLamp({ scale, light, intensity, distance: 6, flameScale: .16 });
  for (const f of l.userData.flames) f.children[0].scale.multiplyScalar(.35);
  l.position.set(x, 0, z); g.add(l);
  return l;
}
/* keys → a camera by progress, eased between */
function track(keys) {
  return (p) => {
    p = clamp01(p);
    let i = 0;
    while (i < keys.length - 2 && keys[i + 1].p <= p) i++;
    const a = keys[i], b = keys[i + 1];
    const k = smooth(remap(p, a.p, b.p));
    return { pos: V(a.pos).lerp(V(b.pos), k), look: V(a.look).lerp(V(b.look), k), fov: lerp(a.fov, b.fov, k) };
  };
}
/* ONE floor under every beat: dark stone, seen only where a flame reaches.
   (Seven overlapping discs on the same plane fought for depth: spokes and
   blocks under the lamps.) */
function floor(g) {
  const f = new THREE.Mesh(new THREE.PlaneGeometry(760, 260, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x241f19, roughness: .82, metalness: .02, dithering: true }));
  f.rotation.x = -Math.PI / 2; f.position.set(240, 0, -30); g.add(f);
}

/* the five volumes on their rehals need a binding each (works.js carries
   only the editorial record) */
/* the cloths are the six: Kobicha, Earth Green, Coyote, the gold deepened, Kobicha again darker */
const BINDINGS = [
  { cloth: 0x66371b, spine: 0x3a2113 },
  { cloth: 0x3f3f2c, spine: 0x1d2419 },
  { cloth: 0x81754b, spine: 0x3f3826 },
  { cloth: 0x7a5a24, spine: 0x3f2e12 },
  { cloth: 0x3b2a22, spine: 0x1f1512 },
];

export function createLampsStage(ctx) {
  const g = new THREE.Group();
  g.position.y = LAMPS_Y;
  g.visible = false;
  /* a breath of the room: the brass keeps an edge in the dark */
  g.add(new THREE.HemisphereLight(0x2a2620, 0x000000, .1));
  const rnd = mulberry(1671);
  const beats = {};
  floor(g);

  /* ---- 01 · Venkatanatha: one small clay lamp lit in the dark ---- */
  {
    const x = 0; const l = clay(g, x, 0, 3, true, 4.5);
    beats['01'] = {
      truck: .20, lift: .12,
      cam: track([
        { p: 0, pos: [x - .9, .19, 1.1], look: [x, .17, 0], fov: 32 },     // at the flame's own height
        { p: .5, pos: [x - .7, .26, 1.8], look: [x, .16, 0], fov: 32 },
        { p: 1, pos: [x + .3, .34, 2.5], look: [x, .15, 0], fov: 32 },
      ]),
      update(time, p) { setClay(l, remap(p, .05, .16)); l.userData.flicker(time); },
    };
  }

  /* ---- 02 · the early life: the sand tray, the Om under the lamp ---- */
  {
    const x = 80; const tray = sandTray(); tray.position.x = x; g.add(tray);
    const l = clay(g, x + .58, -.34, 2.4, true, 4); l.position.y = .14;
    beats['02'] = {
      truck: .36, lift: .14,
      cam: track([
        { p: 0, pos: [x - .4, .95, 1.0], look: [x, .26, -.1], fov: 34 },
        { p: .35, pos: [x - 1.2, .75, 1.25], look: [x, .28, 0], fov: 33 },
        { p: .7, pos: [x + .9, .9, 1.45], look: [x, .3, 0], fov: 33 },
        { p: 1, pos: [x - .2, 1.1, 1.9], look: [x, .3, 0], fov: 32 },
      ]),
      update(time, p) { setClay(l, remap(p, .04, .14)); l.userData.flicker(time); },
    };
  }

  /* ---- 03 · the name: the light is passed from one lamp to the other ---- */
  {
    const x = 160; const A = tall(g, x - 1.5, 0), B = tall(g, x + 1.5, 0);
    setTall(A, 1); setTall(B, 0);
    const ember = new THREE.Group();
    ember.add(glowSprite(0xffe6b0, .22, .95), glowSprite(0xd97b2e, .7, .4), glowSprite(0x8a4515, 1.6, .14));
    const emberLight = new THREE.PointLight(0xffa850, 0, 3.5, 2);
    ember.add(emberLight); ember.visible = false; g.add(ember);
    const FLAME_H = 1.315;
    beats['03'] = {
      cam: track([
        { p: 0, pos: [x - 2.6, 1.3, 1.9], look: [x - 1.5, 1.34, 0], fov: 30 },
        { p: .24, pos: [x - .9, 1.5, 6.2], look: [x, 1.0, 0], fov: 32 },
        { p: .56, pos: [x, 1.6, 6.6], look: [x, .95, 0], fov: 32 },
        { p: .86, pos: [x, 1.5, 6.0], look: [x, 1.0, 0], fov: 31 },
        { p: 1, pos: [x, 1.4, 5.6], look: [x, 1.05, 0], fov: 31 },
      ]),
      update(time, p) {
        for (const f of A.userData.fls) f.userData.flicker(time);
        for (const f of B.userData.fls) f.userData.flicker(time + 3.7);
        const carry = remap(p, .40, .50);
        const catching = smooth(remap(p, .49, .545));
        ember.visible = carry > 0 && carry < 1;
        if (ember.visible) {
          const k = smooth(carry);
          ember.position.set(lerp(x - 1.25, x + 1.25, k), FLAME_H + Math.sin(k * Math.PI) * .32 + noise2(time * 3, 1) * .02, 0);
          ember.children[0].scale.setScalar(.22 * (.8 + noise2(time * 5, 2) * .3));
          emberLight.intensity = 5 * Math.sin(k * Math.PI);
        }
        setTall(B, catching);
        const both = smooth(remap(p, .56, .70));
        A.userData.pl.intensity = LIGHT * (1 + both * .25);
        if (catching >= 1) B.userData.pl.intensity = LIGHT * (1 + both * .25);
      },
    };
  }

  /* ---- 04 · the works: five volumes on their rehals in a row, each lit
     as the reader reaches it; one lamp light travels with the reading ---- */
  {
    const x = 240; const N = WORKS.length, STEP = 1.15;
    const rx = (i) => x + (i - (N - 1) / 2) * STEP;
    const rehals = WORKS.map((w, i) => {
      const vol = { ...w, ...BINDINGS[i % BINDINGS.length], plain: w.title, image: 'assets/works/' + w.id };
      const { R, leaf } = buildRehal(vol, i);
      R.position.set(rx(i), 0, 0); R.rotation.y = .32; g.add(R);
      return { R, leaf };
    });
    /* one small deepa per volume (its flame a sprite), one real light shared */
    const lamps = WORKS.map((w, i) => { const d = deepaLamp({ scale: .55, light: false, flameScale: .5 }); d.position.set(rx(i) + .42, 0, -.22); g.add(d); d.userData.setOn(0); return d; });
    const light = new THREE.PointLight(0xffa850, 0, 4.5, 2); g.add(light);
    const win = (i) => [.06 + i * .18, .06 + i * .18 + .16];       // the reading of volume i, in p
    const keys = [];
    WORKS.forEach((w, i) => {
      const [a, b] = win(i);
      keys.push({ p: a, pos: [rx(i) - .55, .5, .9], look: [rx(i), .2, 0], fov: 33 });
      keys.push({ p: b, pos: [rx(i) - .35, .46, .85], look: [rx(i), .2, 0], fov: 33 });
    });
    keys[0].p = 0; keys[keys.length - 1].p = 1;
    beats['04'] = {
      truck: .44, lift: .14,
      cam: track(keys),
      update(time, p) {
        let lx = rx(0), on = 0;
        WORKS.forEach((w, i) => {
          const [a, b] = win(i);
          const v = smooth(remap(p, a - .03, a + .04)) * (1 - smooth(remap(p, b + .02, b + .08)));
          lamps[i].userData.setOn(v); lamps[i].userData.flicker(time + i * 2.1);
          if (v > on) { on = v; lx = rx(i); }
          if (rehals[i].leaf) rehals[i].leaf.rotation.z = -.35 * smooth(remap(p, a + .02, b)) * v;
        });
        light.position.set(lx - .3, .78, .5);
        light.intensity = 5 * on;
      },
    };
  }

  /* ---- 05 · Tattvavāda: five flames in the dark, the five set apart ---- */
  {
    const x = 320; const P = [[0, -1.25], [-.95, -.15], [.95, -.15], [-1.4, .95], [1.4, .95]];   // Sri Hari; jīva, jīva; jaḍa, jaḍa
    const lamps = P.map(([dx, dz]) => clay(g, x + dx, dz, 3, false));
    const light = new THREE.PointLight(0xffa850, 0, 7, 2); light.position.set(x, 1.2, 0); g.add(light);
    beats['05'] = {
      truck: .22, lift: .10,
      cam: track([
        { p: 0, pos: [x, 2.9, 3.6], look: [x, .1, -.1], fov: 34 },
        { p: .45, pos: [x - .4, 2.5, 3.0], look: [x, .1, -.1], fov: 34 },
        { p: 1, pos: [x + .3, 2.3, 2.8], look: [x, .1, -.1], fov: 33 },
      ]),
      update(time, p) {
        let sum = 0;
        lamps.forEach((l, i) => { const v = remap(p, .05 + i * .06, .11 + i * .06); setClay(l, v); l.userData.flicker(time + i * 1.3); sum += smooth(clamp01(v)); });
        light.intensity = 1.1 * sum;
      },
    };
  }

  /* ---- 06 · the road: far lamps across the dark, and the camera moving
     between them for fifty years ---- */
  {
    const x = 400; // the land: paler, so the far lamps have pools
    const flames = [];
    /* four places along the way, each a cluster of lights; and a scatter of
       single lamps between, the villages passed */
    const PLACES = [[-6, -12], [7, -26], [-8, -40], [0, -56]];
    for (const [px, pz] of PLACES) {
      for (let i = 0; i < 12; i++) {
        const f = flame(2.2 + rnd() * 1.2); f.position.set(x + px + (rnd() - .5) * 7, .4 + rnd() * .6, pz + (rnd() - .5) * 6); g.add(f); flames.push(f);
      }
      const pool = new THREE.PointLight(0xffa850, 160, 30, 2); pool.position.set(x + px, 2.6, pz); g.add(pool);
    }
    for (let i = 0; i < 60; i++) {
      const f = flame(1.6 + rnd() * 1.0); f.position.set(x + (rnd() - .5) * 44, .3 + rnd() * .4, -2 - rnd() * 60); g.add(f); flames.push(f);
    }
    /* one lamp carried: the traveller's own light on the floor ahead */
    const carried = new THREE.PointLight(0xffa850, 3.5, 6, 2); g.add(carried);
    beats['06'] = {
      cam: track([
        { p: 0, pos: [x - 2, 5.5, 8], look: [x, 0, -18], fov: 44 },        // over the land at night: the lights spread across it
        { p: 1, pos: [x + 3, 6.5, -38], look: [x, 0, -66], fov: 44 },
      ]),
      update(time, p, cam) {
        for (let i = 0; i < flames.length; i += 2) flames[i].userData.flicker(time + i);
        if (cam) carried.position.set(cam.pos.x, 1.2, cam.pos.z - 8);
      },
    };
  }

  /* ---- 07 · Manchale: a row of lamps leading to two tall deepas, the
     sanctum's own ---- */
  {
    const x = 480; const A = tall(g, x - 1.9, 0), B = tall(g, x + 1.9, 0);
    setTall(A, 1); setTall(B, 1);
    const row = [];
    for (let i = 0; i < 7; i++) for (const s of [-1, 1]) { const l = clay(g, x + s * .85, 1.6 + i * 1.25, 3.2, false); setClay(l, 1); row.push(l); }
    beats['07'] = {
      cam: track([
        { p: 0, pos: [x, .95, 11.5], look: [x, 1.1, 0], fov: 34 },
        { p: 1, pos: [x, 1.15, 6.4], look: [x, 1.15, 0], fov: 33 },
      ]),
      update(time, p) {
        for (const f of A.userData.fls) f.userData.flicker(time);
        for (const f of B.userData.fls) f.userData.flicker(time + 2.2);
        for (let i = 0; i < row.length; i++) row[i].userData.flicker(time + i * .9);
      },
    };
  }

  return {
    group: g,
    setVisible(v) { g.visible = v; },
    /* a tall frame sees less to the sides: the camera steps back along its
       own line of sight so a phone holds the whole beat */
    camV(p, beat = '03') {
      const b = beats[beat] || beats['03'];
      const shot = b.cam(p);
      const ar = window.innerWidth / Math.max(1, window.innerHeight);
      if (ar < .9) {
        const k = ar < .7 ? 1.75 : 1.35;
        shot.pos = shot.look.clone().add(shot.pos.clone().sub(shot.look).multiplyScalar(k));
      }
      /* the subject keeps clear of the narrative column: on a wide frame
         the camera trucks so the beat's subject stands in the right two
         thirds (the copy reads in the left third, as everywhere on the
         site); on a tall frame it drops so the subject stands above the
         copy. A truck, not a pan: pos and look move together. */
      const dir = shot.look.clone().sub(shot.pos);
      const d = dir.length();
      const halfH = d * Math.tan(shot.fov * Math.PI / 360);
      const right = dir.clone().normalize().cross(new THREE.Vector3(0, 1, 0)).normalize();
      const off = new THREE.Vector3();
      if (ar >= .9 && b.truck) off.addScaledVector(right, -b.truck * 2 * halfH * ar);
      if (ar < .9 && b.lift) off.y -= b.lift * 2 * halfH;
      shot.pos.add(off); shot.look.add(off);
      return shot;
    },
    updateV(time, p, beat = '03') {
      const b = beats[beat] || beats['03'];
      b.update(time, clamp01(p), b.cam(p));
    },
  };
}
