// ANTARANGA · the threshold — the Bhuvanagiri house's entrance, on the bank.
//
// Built from the owner's reference of a traditional gateway (18 Sept 2026):
// a lime-plastered compound wall on a plinth of dressed granite, a tiled
// coping on rafter ends, and a gatehouse of two granite pillars carrying a
// wooden beam and a pitched tile roof, with a two-leaf teak door standing a
// little open on a warm light from the yard. Two granite benches (the
// jagali) flank the door as every such house has them, and a walk of worn
// slabs leads from the step down the bank toward the river. Behind the
// wall the house's own hipped roof, a coconut palm and a plantain rise
// over the coping, so the entrance is the edge of a lived place, not a
// wall standing alone. The gate lamp is lit as the light goes.
//
// Local frame: the pad's surface is y = 0; +z is the front, toward the
// visitor; x runs along the wall. The group is set on the bank by hero.js.
import * as THREE from 'three';
import { canvas, tex, mulberry, clayLamp } from '../util.js';
import { tileCanvas, limeCanvas, hipRoofGeometry } from './bhuvanagiri.js';
import { makeTree, makePalm, makeShrub } from './trees.js';
import { buildVeena } from './veena.js';
import { buildSandTray } from './sand.js';

/* dressed granite in courses: staggered blocks with fine joints, a warm grey */
function blockCanvas(seed = 21, { tone = [150, 142, 128], rows = 4, cols = 6, w = 512, h = 256 } = {}) {
  const [c, g] = canvas(w, h);
  const rnd = mulberry(seed);
  g.fillStyle = `rgb(${tone[0] - 62},${tone[1] - 60},${tone[2] - 56})`; g.fillRect(0, 0, w, h);   // the joints, deep
  const rh = h / rows, cw = w / cols;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * cw * .5;
    for (let k = -1; k <= cols; k++) {
      const x = k * cw + off, y = r * rh, v = (rnd() - .5) * 26;
      g.fillStyle = `rgb(${tone[0] + v | 0},${tone[1] + v | 0},${tone[2] + v * .9 | 0})`;
      g.fillRect(x + 2, y + 2, cw - 4, rh - 4);
      // chisel marks and a lighter top arris
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x + 2, y + 2, cw - 4, 2);
      g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(x + 2, y + rh - 5, cw - 4, 3);
      for (let i = 0; i < 12; i++) { g.fillStyle = `rgba(0,0,0,${.05 + rnd() * .08})`; g.fillRect(x + 4 + rnd() * (cw - 10), y + 4 + rnd() * (rh - 10), 2 + rnd() * 6, 1); }
    }
  }
  const img = g.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const v = (rnd() - .5) * 14; d[i] += v; d[i + 1] += v; d[i + 2] += v; }
  g.putImageData(img, 0, 0);
  return c;
}
/* teak: a warm dark brown with a straight, close grain */
function plankCanvas(seed = 31, { tone = [96, 62, 36] } = {}) {
  const [c, g] = canvas(128, 512);
  const rnd = mulberry(seed);
  g.fillStyle = `rgb(${tone[0]},${tone[1]},${tone[2]})`; g.fillRect(0, 0, 128, 512);
  for (let i = 0; i < 60; i++) {
    const x = rnd() * 128, w = 1 + rnd() * 3, v = (rnd() - .5) * 30;
    g.fillStyle = `rgba(${tone[0] + v | 0},${tone[1] + v * .8 | 0},${tone[2] + v * .6 | 0},.7)`;
    g.fillRect(x, 0, w, 512);
  }
  for (let i = 0; i < 6; i++) {   // a few darker knots and stains
    const x = rnd() * 128, y = rnd() * 512, r = 6 + rnd() * 12;
    const grd = g.createRadialGradient(x, y, 1, x, y, r); grd.addColorStop(0, 'rgba(40,24,12,.5)'); grd.addColorStop(1, 'rgba(40,24,12,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  return c;
}

export function buildThreshold(ctx, { fogC, veena = true } = {}) {
  const G = new THREE.Group();
  const shadows = !ctx.isMobile;
  const sh = (m) => { m.castShadow = m.receiveShadow = shadows; return m; };
  const box = (w, h, d, mat, x, y, z, into = G) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)); m.position.set(x, y, z); into.add(m); return m; };

  /* ---- materials ---- */
  const granite = new THREE.MeshStandardMaterial({ map: tex(blockCanvas(21, { tone: [136, 128, 114], rows: 3, cols: 10, w: 1024 }), { repeat: [2.2, 1] }), roughness: .96 });
  const pillarM = new THREE.MeshStandardMaterial({ map: tex(blockCanvas(23, { tone: [156, 148, 134], rows: 6, cols: 2, w: 128, h: 512 })), roughness: .92 });
  const plaster = new THREE.MeshStandardMaterial({ map: tex(limeCanvas(13, { damp: .30, tone: [216, 204, 178] }), { repeat: [4, 1] }), roughness: 1 });
  const plasterEnd = new THREE.MeshStandardMaterial({ map: tex(limeCanvas(15, { damp: .30, tone: [212, 200, 174] })), roughness: 1 });
  const tile = new THREE.MeshStandardMaterial({ map: tex(tileCanvas(5), { repeat: [1, 1] }), color: 0xd2b8a0, roughness: 1, side: THREE.DoubleSide });
  const teak = new THREE.MeshStandardMaterial({ map: tex(plankCanvas(31)), roughness: .72 });
  const teakDark = new THREE.MeshStandardMaterial({ map: tex(plankCanvas(33, { tone: [70, 44, 26] })), roughness: .8 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: .55, metalness: .6 });
  const brass = new THREE.MeshStandardMaterial({ color: 0x8a6226, roughness: .5, metalness: .45 });
  const earth = new THREE.MeshStandardMaterial({ map: tex(blockCanvas(41, { tone: [118, 102, 78], rows: 1, cols: 1, w: 256, h: 256 }), { repeat: [6, 6] }), roughness: 1 });

  /* ---- the pad: a levelled yard the wall stands on, its skirt sloping into the bank ---- */
  const pad = sh(new THREE.Mesh(new THREE.CylinderGeometry(9.5, 12, 1.8, 40), earth));
  pad.position.set(-1, -.9, -1.5); pad.castShadow = false; G.add(pad);

  /* ---- the wall: plinth, plaster, string course, coping on rafter ends ---- */
  const WL = 22, PLH = .95, WH = 2.25, GX = -2.6, GW = 1.9;
  const TOP = PLH + WH;
  // the wall is in two runs either side of the gate
  const runs = [[-WL / 2, GX - GW / 2 - .55], [GX + GW / 2 + .55, WL / 2]];
  for (const [a, b] of runs) {
    const len = b - a, cx = (a + b) / 2;
    box(len, PLH, .78, granite, cx, PLH / 2, 0);
    box(len, WH, .62, plaster, cx, PLH + WH / 2, 0);
    box(len + .1, .10, .74, granite, cx, PLH + .05, 0);                  // the plinth's top course
    box(len, .12, .82, teakDark, cx, TOP + .06, 0);                        // the wall plate
    // rafter ends under the coping, every half metre
    for (let x = a + .3; x < b - .2; x += .55) { box(.09, .11, 1.0, teakDark, x, TOP + .16, 0); }
    const cope = sh(new THREE.Mesh(hipRoofGeometry(len, .9, .34, .18), tile));
    cope.position.set(cx, TOP + .2, 0); G.add(cope);
  }
  // end posts where the wall stops
  for (const x of [-WL / 2, WL / 2]) { box(.6, TOP + .5, .9, pillarM, x, (TOP + .5) / 2, 0); box(.8, .12, 1.1, granite, x, TOP + .56, 0); }

  /* ---- the gatehouse ---- */
  const PH = 3.85, PW = .52;
  for (const s of [-1, 1]) {
    const px = GX + s * (GW / 2 + .28);
    box(PW, PH, PW, pillarM, px, PH / 2, .05);
    box(PW + .22, .2, PW + .22, granite, px, PH + .1, .05);               // capital
    box(PW + .1, .1, PW + .1, granite, px, .05, .05);                      // base slab
  }
  box(GW + 2 * PW + .9, .34, .66, teak, GX, PH + .37, .05);                // the beam
  box(GW + 2 * PW + 1.3, .12, .8, teakDark, GX, PH + .60, .05);            // the wall plate over it
  // the pitched roof: two tile slopes, two plastered gable ends, rafters, a ridge
  {
    const RW = GW + 2 * PW + 2.0, RD = 3.1, RH = 1.2, EY = PH + .66;
    const slope = Math.hypot(RD / 2, RH);
    for (const s of [1, -1]) {
      const g = new THREE.PlaneGeometry(RW, slope, 1, 1);
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * RW / .48, uv.getY(i) * slope / .48);
      const m = sh(new THREE.Mesh(g, tile));
      m.rotation.x = -s * Math.atan2(RH, RD / 2);
      m.position.set(GX, EY + RH / 2, .05 + s * RD / 4);
      G.add(m);
      // rafters under the eave
      for (let x = -RW / 2 + .25; x < RW / 2; x += .5) { box(.09, .12, RD / 2 + .1, teakDark, GX + x, EY - .02, .05 + s * RD / 4); }
    }
    for (const s of [1, -1]) {   // the gable ends, plastered, under the ridge
      const shp = new THREE.Shape(); shp.moveTo(-RD / 2, 0); shp.lineTo(RD / 2, 0); shp.lineTo(0, RH); shp.closePath();
      const m = sh(new THREE.Mesh(new THREE.ShapeGeometry(shp), plasterEnd));
      m.rotation.y = s * Math.PI / 2; m.position.set(GX + s * (RW / 2 - .5), EY, .05); G.add(m);
    }
    const ridge = box(RW + .2, .16, .3, tile, GX, EY + RH + .02, .05);
    ridge.rotation.z = 0;
  }

  /* ---- the door: frame, two studded teak leaves, ring pulls, ajar on a light ---- */
  const DH = 2.55, DW = GW - .16;
  box(.14, DH + .12, .32, teakDark, GX - GW / 2 + .07, (DH + .12) / 2, .06);
  box(.14, DH + .12, .32, teakDark, GX + GW / 2 - .07, (DH + .12) / 2, .06);
  box(GW, .16, .34, teakDark, GX, DH + .12, .06);
  const leafW = DW / 2;
  const leaves = [];
  for (const s of [-1, 1]) {
    const hinge = new THREE.Group(); hinge.position.set(GX + s * DW / 2, 0, .0); G.add(hinge);
    const leaf = box(leafW, DH, .08, teak, -s * leafW / 2, DH / 2, 0, hinge);
    // rails and studs
    for (const y of [.35, DH / 2, DH - .35]) {
      box(leafW - .1, .07, .03, teakDark, -s * leafW / 2, y, .055, hinge);
      for (let k = 0; k < 4; k++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .03, 8), iron); st.rotation.x = Math.PI / 2; st.position.set(-s * (.12 + k * (leafW - .24) / 3), y, .08); hinge.add(st); }
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.065, .011, 8, 20), iron);
    ring.position.set(-s * (leafW - .16), DH / 2 - .10, .085); hinge.add(ring);
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .02, 12), iron);
    plate.rotation.x = Math.PI / 2; plate.position.set(-s * (leafW - .16), DH / 2, .075); hinge.add(plate);
    leaves.push(hinge);
  }
  /* the gate stands OPEN, both leaves swung back into the yard: the first
     lesson and the household are read from the threshold, looking in */
  leaves[0].rotation.y = 1.32;
  leaves[1].rotation.y = -1.32;
  /* the verandah's lamp, the warmth inside as the light goes */
  const yardLight = new THREE.PointLight(0xffb070, 0, 9, 2);
  yardLight.position.set(GX + .6, 2.2, -5.6); G.add(yardLight);

  /* ---- the step and the benches ---- */
  box(GW + 1.4, .22, .9, granite, GX, .11, .95);
  box(GW + .8, .2, .6, granite, GX, .32, .45);
  for (const s of [-1, 1]) {
    const bx = GX + s * (GW / 2 + PW + 1.95);
    box(2.6, .16, .82, granite, bx, .50, .58);                             // the seat slab
    box(2.4, .42, .7, pillarM, bx, .21, .55);                              // its base
  }

  /* ---- the walk: worn granite slabs from the step down the bank ---- */
  const rnd = mulberry(77);
  const slabM = new THREE.MeshStandardMaterial({ map: tex(blockCanvas(43, { tone: [112, 106, 96], rows: 1, cols: 1, w: 256, h: 256 })), roughness: .98 });
  const WALK = [[GX + .1, 1.75], [GX - .7, 2.75], [GX - 1.6, 3.65], [GX - 2.7, 4.4], [GX - 3.9, 5.0], [GX - 5.2, 5.45], [GX - 6.6, 5.8]];
  WALK.forEach(([x, z], i) => {
    /* a worn slab: an irregular seven-sided stone, its rim broken, sunk in the yard */
    const geo = new THREE.CylinderGeometry(.5, .54, .13, 7, 1);
    const pp = geo.attributes.position;
    for (let k = 0; k < pp.count; k++) { const px = pp.getX(k), pz = pp.getZ(k); const j = .82 + rnd() * .36; pp.setX(k, px * j * 1.18); pp.setZ(k, pz * j * .82); }
    geo.computeVertexNormals();
    const m = sh(new THREE.Mesh(geo, slabM)); m.position.set(x, .03 - i * .004, z); m.rotation.y = rnd() * 6.3; m.rotation.x = (rnd() - .5) * .04; G.add(m);
  });

  /* ---- the gate lamp: a clay lamp on a stone bracket by the right pillar ---- */
  box(.26, .08, .26, granite, GX + GW / 2 + .28, 1.62, .42);
  const gateLamp = clayLamp({ scale: 1.0, intensity: 2.6, distance: 6, flameScale: .34 });
  gateLamp.position.set(GX + GW / 2 + .28, 1.66, .42); gateLamp.rotation.y = -1.2; G.add(gateLamp);

  /* ---- the house behind the wall: its hipped roof over the coping, a
          palm and a plantain in the yard, a neem at the wall's end ---- */
  const roof = sh(new THREE.Mesh(hipRoofGeometry(10.6, 4.6, 2.2, .9), tile));
  roof.position.set(GX, .55 + 2.76, -5.6 - 1.9); G.add(roof);                // over the verandah and the house behind
  const palm = makePalm({ seed: 9, height: 9.5, lean: 1.6, fronds: 15, shadows });
  palm.position.set(GX + 5.2, -.1, -3.6); palm.rotation.y = -.6; G.add(palm);
  const neem = makeTree({ seed: 14, height: 9.5, spread: 6.2, kind: 'broad', cards: ctx.isMobile ? 170 : 300, shadows });
  neem.position.set(-WL / 2 - 1.6, -.15, -4.2); G.add(neem);
  const shrubA = makeShrub({ seed: 5, radius: 1.5, height: 1.2, cards: ctx.isMobile ? 60 : 90, shadows });
  shrubA.position.set(WL / 2 - 2.6, -.05, 1.1); G.add(shrubA);
  const shrubB = makeShrub({ seed: 6, radius: 1.2, height: 1.0, cards: ctx.isMobile ? 60 : 90, shadows });
  shrubB.position.set(GX + GW / 2 + PW + 3.9, -.05, 1.3); G.add(shrubB);

  /* ---- THE COURTYARD, seen through the open gate: the yard's swept earth
          (the pad), a tulasi kaṭṭe, and the house's front: a granite
          verandah on turned teak pillars under the eave of the hipped roof,
          the lime wall behind with its door and two barred windows. The
          first lesson happens here: the sand tray on a teak dais at the
          verandah's edge, the household's clay lamp beside it; the veena on
          its cloth on the verandah floor by the next pillar. ---- */
  const VZ = -5.6, VH = .55;                                                // the verandah's front edge and floor height
  box(10.4, VH, 3.2, granite, GX, VH / 2, VZ - 1.6);                       // the verandah plinth
  box(10.6, .08, 3.4, pillarM, GX, VH + .04, VZ - 1.6);                    // its worn top course
  box(3.2, .24, .6, granite, GX + .4, .12, VZ + .3);                        // the step up from the yard
  box(10.4, 4.0, .42, plaster, GX, 2.0, VZ - 3.2);                         // the house wall behind
  box(10.8, .14, .5, teakDark, GX, 4.05, VZ - 3.2);
  const dark = new THREE.MeshStandardMaterial({ color: 0x120e0a, roughness: 1 });
  box(1.0, 2.1, .12, dark, GX + .4, VH + 1.05, VZ - 2.98);                  // the house door, open on the dark inside
  box(1.3, .16, .22, teakDark, GX + .4, VH + 2.18, VZ - 2.96);
  for (const s of [-1, 1]) {                                               // two barred windows
    const wx = GX + .4 + s * 3.0;
    box(1.0, 1.0, .12, dark, wx, VH + 1.55, VZ - 2.98);
    box(1.2, .10, .2, teakDark, wx, VH + 2.1, VZ - 2.96); box(1.2, .10, .2, teakDark, wx, VH + 1.0, VZ - 2.96);
    for (let k = -1; k <= 1; k++) box(.05, 1.0, .05, teakDark, wx + k * .3, VH + 1.55, VZ - 2.92);
  }
  // four turned pillars carrying the eave beam
  const turned = (pts) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 14);
  for (const px of [-3.9, -1.3, 1.3, 3.9]) {
    const pil = sh(new THREE.Mesh(turned([[.14, 0], [.14, .3], [.10, .34], [.10, 1.0], [.12, 1.06], [.10, 1.12], [.10, 2.0], [.13, 2.08], [.11, 2.14], [.16, 2.36], [.16, 2.42]]), teak));
    pil.position.set(GX + .4 + px, VH, VZ + .1); G.add(pil);
    box(.3, .06, .3, granite, GX + .4 + px, VH + .03, VZ + .1);
  }
  box(10.6, .22, .26, teak, GX, VH + 2.5, VZ + .1);                        // the eave beam
  for (let x = -5.0; x <= 5.0; x += .5) box(.08, .1, 3.4, teakDark, GX + x, VH + 2.66, VZ - 1.5);   // rafters
  // the tulasi kaṭṭe in the yard
  box(.8, .95, .8, plasterEnd, GX + 1.9, .475, -2.4);
  box(.9, .12, .9, granite, GX + 1.9, .06, -2.4);
  box(.84, .10, .84, new THREE.MeshStandardMaterial({ color: 0x6b3a2a, roughness: 1 }), GX + 1.9, .72, -2.4);   // the ochre band
  const tulasi = makeShrub({ seed: 9, radius: .42, height: .55, cards: ctx.isMobile ? 30 : 46, shadows });
  tulasi.position.set(GX + 1.9, .95, -2.4); G.add(tulasi);

  /* the sand tray on its dais at the verandah's edge, the clay lamp beside */
  /* between the two middle pillars, on the gate's axis, so it is seen from the yard */
  const dais = box(1.5, .14, 1.05, teakDark, GX + .4, VH + .07, VZ - .75);
  const sand = buildSandTray({ shadows });
  sand.position.set(GX + .4, VH + .14, VZ - .75); sand.rotation.y = .18; G.add(sand);
  const sandLamp = clayLamp({ scale: .95, intensity: 1.6, distance: 4.2, flameScale: .34 });
  sandLamp.position.set(GX - .5, VH + .14, VZ - .95); sandLamp.rotation.y = 2.4; G.add(sandLamp);

  /* the veena on its cloth on the verandah floor, by the next pillar */
  let veenaG = null;
  if (veena) {
    veenaG = buildVeena({ shadows });
    veenaG.position.set(GX + 3.4, VH, VZ - .9);      // between the next two pillars
    veenaG.rotation.y = Math.PI - .3;
    G.add(veenaG);
  }

  /* the group's things that take the hour */
  const api = {
    group: G, veena: veenaG, lamp: gateLamp, sand,
    /* the places the walk is authored to, in the group's frame (main.js STATIONS) */
    points: {
      door: new THREE.Vector3(GX, 0, .3),
      sand: new THREE.Vector3(GX + .4, VH + .2, VZ - .75),
      veena: new THREE.Vector3(GX + 2.8, VH + .1, VZ - 1.0),
      benchL: new THREE.Vector3(GX - GW / 2 - PW - 1.95, .6, .58),
      benchR: new THREE.Vector3(GX + GW / 2 + PW + 1.95, .6, .6),
    },
    /* the front of the house, and its right, as directions in the parent's frame */
    front: new THREE.Vector3(0, 0, 1), right: new THREE.Vector3(1, 0, 0),
    /* night 0..1: the gate lamp and the yard's light come up as the light goes */
    update(time, { night = 0, day = 0, fogD = .006 } = {}) {
      const on = Math.max(.12, night);
      gateLamp.userData.setOn(on);
      gateLamp.userData.flicker(time + 2.2);
      sandLamp.userData.setOn(Math.max(.3, night));
      sandLamp.userData.flicker(time + 4.4);
      yardLight.intensity = .3 + 1.6 * night;
    },
  };
  return api;
}
