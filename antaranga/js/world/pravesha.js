// ANTARANGA · Brindavana Pravesha, IN THE ONE WORLD.
//
// Nothing here is a stage of its own. The chamber is dug into the bank
// under the Brindavana's own pad (river.js BRND_POS), the Brindavana that
// is built is the one the visitor saw at the opening, and the camera never
// leaves the river. The day breaks over Manchale; the stone that stands
// there today lifts away (it is not yet built); the bank is cut open before
// the pad (a clipping plane on the world's materials, the section face
// panelled in earth) and the camera goes down to the chamber, where Rayaru
// sits in dhyāna by two deepas with the Vyāsa Pīṭha and the granthas before
// him. Then the layers come down into their places as the copy tells it
// (the kūrmāsana, the rajata phalaka, the copper vessel and the śāligrāmas,
// the courses of the black stone, the earth, the tene, the images), the
// bank closes, the garland comes, and the camera draws back out of it all
// to the opening's own hold. Everything is authored in the Brindavana's
// model space (brindavana.js: the plinth's foot at y 0, +z out the front)
// and rides inside brnd.group, so it turns and scales with the stone.
import * as THREE from 'three';
import { stoneCanvas, palmLeafCanvas, canvas, tex, deepaLamp, glowSprite, mulberry, lerp, remap, smooth } from '../util.js';
import { loadRayaru, stoneMaterial, boxUV } from './opening.js';

/* ears of grain lying one way: the tene */
function grainCanvas(size = 512) {
  const [c, g] = canvas(size, size);
  const rnd = mulberry(4100);
  g.fillStyle = '#8a6a2c'; g.fillRect(0, 0, size, size);
  g.lineCap = 'round';
  for (let i = 0; i < 900; i++) {
    const x = rnd() * size, y = rnd() * size, L = 26 + rnd() * 40, a = -.35 + (rnd() - .5) * .5;
    const tone = 150 + rnd() * 70;
    g.strokeStyle = `rgba(${tone | 0},${(tone * .78) | 0},${(tone * .34) | 0},${.55 + rnd() * .4})`;
    g.lineWidth = 2 + rnd() * 2.5;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke();
    for (let k = 0; k < 6; k++) {
      const u = .55 + k * .075;
      g.fillStyle = `rgba(${(tone + 30) | 0},${(tone * .82) | 0},${(tone * .36) | 0},.9)`;
      g.beginPath(); g.ellipse(x + Math.cos(a) * L * u + (k % 2 ? 2 : -2), y + Math.sin(a) * L * u, 2.2, 3.4, a, 0, 7); g.fill();
    }
  }
  return c;
}
/* the cut's earth: packed river sand, brown, a few pale grains catching the light */
function sandCanvas(size = 512) {
  const [c, g] = canvas(size, size);
  const rnd = mulberry(5150);
  g.fillStyle = '#6a4a2e'; g.fillRect(0, 0, size, size);
  for (let i = 0; i < 9000; i++) {
    const v = rnd();
    g.fillStyle = `rgba(${(90 + v * 60) | 0},${(64 + v * 44) | 0},${(38 + v * 28) | 0},${.25 + rnd() * .35})`;
    const r = .6 + rnd() * 1.6;
    g.beginPath(); g.arc(rnd() * size, rnd() * size, r, 0, 7); g.fill();
  }
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(${(200 + rnd() * 40) | 0},${(150 + rnd() * 60) | 0},${(90 + rnd() * 50) | 0},.5)`;
    g.beginPath(); g.ellipse(rnd() * size, rnd() * size, 2 + rnd() * 4, 1.2 + rnd() * 2, rnd() * 3, 0, 7); g.fill();
  }
  return c;
}
/* shaligrama: near-black stone with faint chakra rings */
export function shaligramaCanvas(size = 512) {   // also drawn by the review aid's still of the objects (objects.js)
  const [c, g] = canvas(size, size);
  g.fillStyle = '#151312'; g.fillRect(0, 0, size, size);
  const rnd = mulberry(1200);
  g.globalAlpha = .16;
  for (let i = 0; i < 900; i++) { g.fillStyle = rnd() > .5 ? '#221e1c' : '#0c0a09'; const r = rnd() * 3; g.beginPath(); g.arc(rnd() * size, rnd() * size, r, 0, 7); g.fill(); }
  g.globalAlpha = .28; g.strokeStyle = '#060505'; g.lineWidth = 3;
  for (let k = 0; k < 3; k++) { const cx = size * (.25 + rnd() * .5), cy = size * (.3 + rnd() * .4); for (let r = 8; r < 46; r += 9) { g.beginPath(); g.arc(cx, cy, r, rnd() * 2, rnd() * 2 + 4.5); g.stroke(); } }
  g.globalAlpha = 1;
  return c;
}

export function createPravesha(ctx, { brnd, brndPos, sl, approachToWorld, world = null }) {
  const P = brnd.parts;
  const home = {}; for (const k in P) home[k] = P[k].position.clone();
  const root = new THREE.Group();
  brnd.group.add(root);
  const rnd = mulberry(707);
  const sh = (m) => { m.castShadow = !ctx.isMobile; m.receiveShadow = !ctx.isMobile; return m; };
  const box = (w, h, d, mat, x, y, z, parent = root) => { const m = sh(new THREE.Mesh(boxUV(new THREE.BoxGeometry(w, h, d), w, h, d), mat)); m.position.set(x, y, z); parent.add(m); return m; };

  /* ---- the courses of the stone: lifted into the air while it is not yet
     built (the day of Pravesha), each coming down in its window of p ---- */
  const LIFT = { plinth: 4.6, lotus: 5.3, lower: 6.0, body: 6.7, band: 7.8, attic: 8.5, cornice: 9.3, crown: 10.1, shikhara: 10.9 };
  /* the order the courses go up (the top first) and come down (the foot
     first): each course takes a window inside the cue's [a, b], staggered
     (main.js praveshaCues, from the score) */
  const UP_ORDER = ['shikhara', 'crown', 'cornice', 'attic', 'band', 'body', 'lower', 'lotus', 'plinth'];
  const LOWER = ['plinth', 'lotus', 'lower', 'body'];
  const UPPER = ['band', 'attic', 'cornice', 'crown', 'shikhara'];
  const stagger = (list, k, a, b, gap, len) => { const j = list.indexOf(k); if (j < 0) return null; const s0 = a + j * gap * (b - a); return [s0, s0 + len * (b - a)]; };
  const malaMats = P.mala ? (P.mala.userData.mats || []) : [];
  for (const m of malaMats) m.transparent = true;

  /* ---- the section face: the bank cut open before the pad. Earth panels
     round the chamber's opening, deep enough that nothing shows through
     beside it; the pad's own stone course above ---- */
  const earthMat = new THREE.MeshStandardMaterial({ map: tex(sandCanvas(), { repeat: [5, 5] }), roughness: 1 });
  const CH_W = 3.4, CH_H = 1.9, WALL = .22, CH_Y0 = -2.05, ZF = 1.70;   // the chamber: its floor level, its front (the cut) at z 1.70
  /* the cut face runs deep and wide (to −9, ±10), so the frame below and
     beside the chamber is earth, never the sky dome under the horizon */
  const section = new THREE.Group(); root.add(section);
  box(8.3, 8.93, 6.4, earthMat, -5.85, -4.535, ZF - 3.2, section);     // left of the chamber
  box(8.3, 8.93, 6.4, earthMat, 5.85, -4.535, ZF - 3.2, section);      // right
  box(3.4, 6.95, 3.4, earthMat, 0, -5.525, ZF - 1.7, section);         // under its floor
  box(3.4, .10, 3.4, earthMat, 0, -.12, ZF - 1.7, section);            // over its top, up to the pad's course

  /* ---- the chamber: the slab stone of the sanctum, open to the cut ---- */
  const wallMat = stoneMaterial(49, { base: [46, 48, 46], courses: 2, cols: 1, vary: .14, cool: .06, warm: .01, chisel: .3 }, { normal: .8, ao: .7 });
  const floorMat = stoneMaterial(41, { base: [78, 74, 68], courses: 1, cols: 2, vary: .16, cool: .04, warm: .04, chisel: .16 }, { normal: .55, ao: .7 });
  const chamber = new THREE.Group(); root.add(chamber);
  box(CH_W, .10, CH_W, floorMat, 0, CH_Y0 + .05, 0, chamber);                          // the floor
  box(CH_W, CH_H, WALL, wallMat, 0, CH_Y0 + CH_H / 2, -ZF + WALL / 2, chamber);         // the back wall; the sides are the cut earth itself
  const plasterDark = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(256, [60, 52, 42], 9, 27), { repeat: [2, 1] }), roughness: 1 });
  box(1.5, 1.4, .08, plasterDark, 0, CH_Y0 + .95, -ZF + WALL + .02, chamber);          // the niche's darker plaster behind the seat
  /* the Vyāsa Pīṭha and Rayaru seated on it, facing the cut */
  const peethaMat = stoneMaterial(47, { base: [58, 56, 52], courses: 1, cols: 1, vary: .12, cool: .05, warm: .02, chisel: .3 }, { normal: .7, ao: .7 });
  box(1.5, .22, 1.2, peethaMat, 0, CH_Y0 + .21, -.35, chamber);
  box(1.3, .08, 1.0, new THREE.MeshStandardMaterial({ color: 0x38201a, roughness: .96 }), 0, CH_Y0 + .36, -.35, chamber);
  const seated = new THREE.Group(); seated.position.set(0, CH_Y0 + .40, -.35); chamber.add(seated);
  loadRayaru(seated, { height: 1.36 });
  /* the mūla-granthas, a folded cloth, the kalasha, incense, jasmine */
  const msMat = new THREE.MeshStandardMaterial({ map: tex(palmLeafCanvas(19)), color: 0x9a8a70, roughness: .85 });
  for (let i = 0; i < 5; i++) { const ms = box(.5, .06, .12, msMat, -1.05 + (i % 2) * .08, CH_Y0 + .13 + Math.floor(i / 2) * .07, .05 - (i % 2) * .05, chamber); ms.rotation.y = rnd() * .4; }
  const cloth = new THREE.MeshStandardMaterial({ color: 0x6b3a14, roughness: 1 });
  box(.6, .12, .42, cloth, 1.0, CH_Y0 + .16, .1, chamber).rotation.y = -.3;
  const copperOld = new THREE.MeshStandardMaterial({ color: 0x7a4a24, metalness: .7, roughness: .48 });
  const cup = sh(new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [.05, 0], [.062, .025], [.05, .05], [.025, .05]].map(([r, y]) => new THREE.Vector2(r, y)), 12), copperOld)); cup.position.set(-.7, CH_Y0 + .10, .6); chamber.add(cup);
  {
    const petal = new THREE.InstancedMesh(new THREE.CircleGeometry(.024, 7), new THREE.MeshStandardMaterial({ color: 0xf3ead6, roughness: .9, side: THREE.DoubleSide }), 90);
    const m = new THREE.Matrix4(), e = new THREE.Euler(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < 90; i++) {
      const a = rnd() * Math.PI * 2, r = .3 + Math.pow(rnd(), .7) * 1.1;
      e.set(-Math.PI / 2 + (rnd() - .5) * .5, rnd() * 3, 0); q.setFromEuler(e);
      m.compose(new THREE.Vector3(Math.cos(a) * r, CH_Y0 + .105, .2 + Math.sin(a) * r * .5), q, s);
      petal.setMatrixAt(i, m);
    }
    chamber.add(petal);
  }
  /* the two deepas, and what they touch */
  const lampL = deepaLamp({ scale: 1.05, light: false, flameScale: .6 }); lampL.position.set(-1.05, CH_Y0 + .10, .8); chamber.add(lampL);
  const lampR = deepaLamp({ scale: .95, light: false, flameScale: .55 }); lampR.position.set(1.1, CH_Y0 + .10, .85); chamber.add(lampR);
  const lightL = new THREE.PointLight(0xe8a860, 0, 9, 2); lightL.position.set(-1.05, CH_Y0 + .95, .8); lightL.castShadow = !ctx.isMobile; chamber.add(lightL);
  const lightR = new THREE.PointLight(0xe09a50, 0, 8, 2); lightR.position.set(1.1, CH_Y0 + .9, .85); chamber.add(lightR);
  const haloL = glowSprite(0xd9853c, 2.0, 0); haloL.position.set(-1.05, CH_Y0 + 1.15, .8); chamber.add(haloL);
  const haloR = glowSprite(0xd9853c, 1.8, 0); haloR.position.set(1.1, CH_Y0 + 1.1, .85); chamber.add(haloR);
  const rim = new THREE.PointLight(0xdd9448, 0, 6, 2); rim.position.set(0, CH_Y0 + 1.7, -1.2); chamber.add(rim);
  const bounce = new THREE.PointLight(0x9a6a3a, 0, 5, 2); bounce.position.set(0, CH_Y0 + .3, .9); chamber.add(bounce);

  /* ---- the sacred layers, each coming down into its place ---- */
  const layers = [];
  const layer = (obj, y, lift, cue) => { obj.userData.y = y; obj.userData.lift = lift; obj.userData.cue = cue; obj.position.y = y + lift; obj.visible = false; root.add(obj); layers.push(obj); return obj; };
  const M = brnd.materials;
  /* the kūrmāsana: the slab over the chamber, the tortoise form on it */
  {
    const k = new THREE.Group();
    box(3.8, .22, 3.8, wallMat, 0, .11, 0, k);
    const tort = new THREE.Group(); tort.position.set(0, .22, .7); k.add(tort);
    const shell = sh(new THREE.Mesh(new THREE.SphereGeometry(.34, 24, 16), M.stoneDark)); shell.scale.set(1, .42, 1.25); shell.position.y = .05; tort.add(shell);
    const head = sh(new THREE.Mesh(new THREE.SphereGeometry(.095, 12, 10), M.stoneDark)); head.position.set(0, .08, .5); tort.add(head);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const f = new THREE.Mesh(new THREE.SphereGeometry(.065, 8, 6), M.stoneDark); f.position.set(sx * .3, .02, sz * .26); tort.add(f); }
    layer(k, -.214, 3.2, 'kurma');   // its top 6 mm proud of the pad, never on the pad's own plane (z-fighting, 19 Sept 2026)
  }
  /* the rajata phalaka */
  /* the column of layers is 2.0 wide: inside the body course's solid core (2.36) and clear of its face
     panels at ±1.2, which a wider column sat in and fought through */
  { const s = new THREE.Group(); box(2.0, .06, 2.0, new THREE.MeshStandardMaterial({ color: 0xd7d9dc, metalness: .92, roughness: .28 }), 0, .03, 0, s); layer(s, .008, 3.2, 'plate'); }
  /* the copper box: square, open until the śāligrāmas are in, then its lid */
  const copper = new THREE.MeshStandardMaterial({ color: 0x9c5a2c, metalness: .8, roughness: .32, emissive: 0x2a1206, emissiveIntensity: .55 });
  const BW = 1.6, BH = .55, BT = .08;
  {
    const v = new THREE.Group();
    box(BW, BT, BW, copper, 0, BT / 2, 0, v);                                  // the bottom
    box(BW, BH, BT, copper, 0, BH / 2, -(BW - BT) / 2, v);                    // the walls
    box(BW, BH, BT, copper, 0, BH / 2, (BW - BT) / 2, v);
    box(BT, BH, BW, copper, -(BW - BT) / 2, BH / 2, 0, v);
    box(BT, BH, BW, copper, (BW - BT) / 2, BH / 2, 0, v);
    box(BW + .08, .05, BW + .08, copper, 0, BH - .025, 0, v).userData.rim = true;   // the rolled rim
    layer(v, .07, 3.4, 'vessel');
  }
  const lid = new THREE.Group();
  box(BW + .06, .06, BW + .06, copper, 0, .03, 0, lid);
  box(BW * .5, .05, BW * .5, copper, 0, .085, 0, lid);
  box(.14, .08, .14, copper, 0, .15, 0, lid);                                 // its knop
  layer(lid, .07 + BH + .004, 2.6, 'lid');
  const shalTex = tex(shaligramaCanvas());
  const shalMat = new THREE.MeshStandardMaterial({ map: shalTex, roughness: .62, metalness: .08 });
  const baseGeo = new THREE.IcosahedronGeometry(.075, 2);
  { const p = baseGeo.attributes.position; for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)); v.multiplyScalar(1 + (Math.sin(v.x * 31) + Math.sin(v.y * 27) + Math.sin(v.z * 23)) * .035); p.setXYZ(i, v.x, v.y, v.z); } baseGeo.computeVertexNormals(); }
  const SH_N = ctx.isMobile ? 120 : 220;
  const shals = new THREE.InstancedMesh(baseGeo, shalMat, SH_N);
  shals.frustumCulled = false; shals.castShadow = !ctx.isMobile; shals.visible = false; shals.position.y = .06;
  root.add(shals);
  /* their places inside the box, in layers; each falls in from above in its turn */
  const shalData = [];
  for (let i = 0; i < SH_N; i++) {
    const lay = Math.floor(i / (SH_N / 4));
    shalData.push({ x: (rnd() - .5) * 1.3, z: (rnd() - .5) * 1.3, y: BT + .07 + lay * .095 + rnd() * .03, s: .7 + rnd() * .5, rx: rnd() * 3, ry: rnd() * 3, d: (lay + rnd()) / 4 });
  }
  /* the sacred earth, the tene */
  { const e = new THREE.Group(); box(2.0, .5, 2.0, new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(256, [74, 46, 31], 16, 93)), roughness: 1 }), 0, .25, 0, e); layer(e, .686, 3.2, 'earth'); }
  { const t = new THREE.Group(); box(2.0, .4, 2.0, new THREE.MeshStandardMaterial({ map: tex(grainCanvas()), roughness: .9 }), 0, .2, 0, t); layer(t, 1.192, 3.2, 'tene'); }
  /* the images above, in brass after the reference: each on a tiered
     lotus peetha under its prabhāvalī with the sun at its crown; Narasimha
     seated, Srinivasa standing, the discus and the conch in the upper hands */
  const deities = new THREE.Group();
  {
    const gold = new THREE.MeshStandardMaterial({ color: 0xd2a24a, metalness: .55, roughness: .38, emissive: 0x241505, emissiveIntensity: .7 });
    const goldDeep = new THREE.MeshStandardMaterial({ color: 0x9a7430, metalness: .55, roughness: .48, emissive: 0x1a0e03, emissiveIntensity: .6 });
    const mk = (geo, mat, x, y, z, parent) => { const m = sh(new THREE.Mesh(geo, mat)); m.position.set(x, y, z); parent.add(m); return m; };
    const cyl = (r0, r1, h, seg = 12) => new THREE.CylinderGeometry(r0, r1, h, seg);
    const sph = (r, a = 14, b = 10) => new THREE.SphereGeometry(r, a, b);
    const brassImage = ({ seated }) => {
      const im = new THREE.Group();
      mk(new THREE.BoxGeometry(.66, .06, .42), goldDeep, 0, .03, 0, im);                 // the tiered peetha
      mk(new THREE.BoxGeometry(.54, .05, .34), gold, 0, .085, 0, im);
      mk(new THREE.TorusGeometry(.19, .04, 8, 22), gold, 0, .13, 0, im).rotation.x = Math.PI / 2;   // the lotus
      for (const sx of [-1, 1]) mk(cyl(.026, .03, .46), gold, sx * .27, .34, -.13, im);  // the prabhāvalī
      mk(new THREE.TorusGeometry(.27, .03, 10, 40, Math.PI), gold, 0, .57, -.13, im);
      const flames = new THREE.InstancedMesh(new THREE.ConeGeometry(.02, .06, 6), gold, 9);
      { const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(1, 1, 1);
        for (let i = 0; i < 9; i++) { const an = Math.PI * (i + .5) / 9; e.set(0, 0, an - Math.PI / 2); q.setFromEuler(e); m.compose(new THREE.Vector3(Math.cos(an) * .31, .57 + Math.sin(an) * .31, -.13), q, sc); flames.setMatrixAt(i, m); } }
      im.add(flames);
      mk(cyl(.06, .06, .02, 18), gold, 0, .90, -.13, im).rotation.x = Math.PI / 2;      // the sun
      mk(new THREE.TorusGeometry(.078, .01, 8, 24), goldDeep, 0, .90, -.13, im);
      const f = new THREE.Group(); f.position.y = .03; im.add(f);
      if (seated) {
        mk(new THREE.BoxGeometry(.34, .09, .22), gold, 0, .175, .02, f);
        mk(cyl(.085, .12, .24), gold, 0, .34, 0, f);
        for (const sx of [-1, 1]) { const arm = mk(cyl(.022, .026, .2), gold, sx * .12, .34, .04, f); arm.rotation.z = sx * .35; }
        for (const sx of [-1, 1]) { const arm = mk(cyl(.018, .022, .17), gold, sx * .15, .44, -.02, f); arm.rotation.z = sx * 1.25; }
        mk(new THREE.TorusGeometry(.085, .028, 8, 18), goldDeep, 0, .52, .0, f);
        mk(sph(.068), gold, 0, .52, .02, f);
        mk(new THREE.ConeGeometry(.05, .13, 12), gold, 0, .63, .0, f);
        mk(new THREE.TorusGeometry(.11, .01, 8, 24), gold, 0, .54, -.05, f);
        mk(sph(.05, 10, 8), gold, -.16, .30, .06, f).scale.set(1, 1.3, .7);
      } else {
        for (const sx of [-1, 1]) mk(cyl(.03, .036, .24), gold, sx * .05, .24, 0, f);
        mk(cyl(.10, .08, .12), goldDeep, 0, .33, 0, f);
        mk(cyl(.075, .10, .24), gold, 0, .50, 0, f);
        for (const sx of [-1, 1]) { const arm = mk(cyl(.02, .024, .22), gold, sx * .115, .50, .03, f); arm.rotation.z = sx * .22; }
        for (const sx of [-1, 1]) { const arm = mk(cyl(.017, .021, .19), gold, sx * .16, .60, -.02, f); arm.rotation.z = sx * 1.15; }
        mk(new THREE.TorusGeometry(.03, .008, 8, 16), gold, -.245, .66, -.02, f);
        mk(new THREE.ConeGeometry(.024, .06, 8), gold, .245, .66, -.02, f);
        mk(sph(.064), gold, 0, .70, .0, f);
        mk(cyl(.055, .04, .17), gold, 0, .82, 0, f);
        mk(sph(.02), gold, 0, .915, 0, f);
        mk(new THREE.TorusGeometry(.10, .01, 8, 24), gold, 0, .72, -.05, f);
      }
      return im;
    };
    box(2.0, .1, 1.1, wallMat, 0, .05, 0, deities);
    const n = brassImage({ seated: true }); n.position.set(-.46, .1, 0); n.scale.setScalar(.74); deities.add(n);
    const s = brassImage({ seated: false }); s.position.set(.46, .1, 0); s.scale.setScalar(.74); deities.add(s);
    const dLight = new THREE.PointLight(0xe8b060, 0, 4, 2); dLight.position.set(0, .8, 1.0); deities.add(dLight);
    deities.userData.light = dLight;
    layer(deities, 1.598, 3.4, 'deities');   // on the tene's top (1.192 + .4), a hair above it; inside the lower mouldings and the body's core, to 2.35
  }

  /* ---- the section: a clipping plane on the world's materials, its
     constant carried from far beyond the camera (nothing cut) to the
     chamber's front. Only meshes with the renderer's own materials take it;
     the water's shader carries the chunks (river.js) ---- */
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 1e6);
  /* the water and the bank terrain are one sheet each, and pass under the
     pad: the section plane keeps them there (they are on its kept side) and
     the water crossed the chamber at chest height. They take a BOX instead
     (four planes, clipIntersection): the platform's footprint, extended out
     toward the camera while the cut is open. */
  const boxPlanes = [0, 1, 2, 3].map(() => new THREE.Plane(new THREE.Vector3(0, 0, -1), 1e6));
  const clipMats = new Set();
  const cards = [], instCards = [];   // painted plants the plane cannot cut; the instanced ones (reeds along the shore, some rooted under the pad) go out with the cut as a whole
  const _w = new THREE.Vector3();
  /* the layers' own materials (19 Sept 2026): each mesh takes a clone, drawn
     a hair in front of whatever plane it rests on (polygon offset: the slab
     on the pad, the plate on the slab, the box on the plate flickered where
     two faces shared a plane), and with a faint self-light so a layer's
     underside, seen from below as it comes down, reads as dim stone or
     metal and not as a black cut-out crossing the frame */
  for (const L of layers) L.traverse(o => {
    if (!o.isMesh || !o.material || o.material.isSpriteMaterial || o.userData.ownMat) return;
    const m = o.material.clone(); o.userData.ownMat = true;
    m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -2;
    if (m.emissive && m.emissiveIntensity !== undefined && (m.emissive.r + m.emissive.g + m.emissive.b) < .01) {
      m.emissive.copy(m.color); if (m.map && !m.emissiveMap) m.emissiveMap = m.map; m.emissiveIntensity = .09;
    }
    o.material = m;
  });

  const addClip = (obj, skip = []) => {
    obj.traverse(o => {
      if (skip.some(s => s === o)) return;
      for (const s of skip) { let a = o.parent; while (a) { if (a === s) return; a = a.parent; } }
      if (!(o.isMesh || o.isInstancedMesh)) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (!m || m.isSpriteMaterial || clipMats.has(m)) continue;
        if (m.isShaderMaterial) {
          if (m.uniforms && m.uniforms.uFade) { if (o.isInstancedMesh) { if (!instCards.includes(o)) instCards.push(o); } else if (!cards.includes(o)) cards.push(o); }
          continue;
        }
        if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
        if (o.geometry.boundingSphere && o.geometry.boundingSphere.radius > 80) { m.clippingPlanes = boxPlanes; m.clipIntersection = true; }
        else { m.clippingPlanes = [plane]; m.clipShadows = true; }
        clipMats.add(m);
      }
    });
  };
  const boxFor = (m) => { m.clippingPlanes = boxPlanes; m.clipIntersection = true; m.clipping = true; clipMats.add(m); };
  const _n = new THREE.Vector3(), _p = new THREE.Vector3(), _o = new THREE.Vector3(), _x = new THREE.Vector3(), _z = new THREE.Vector3(), _t = new THREE.Vector3(), _v4 = new THREE.Vector3();
  function setClip(k) {
    /* the cut stands at the chamber's front (S z 2.0, just before the earth
       panels) when k = 1; at 400 it is beyond everything */
    /* the cut stands just BEHIND the earth face (S 1.90 < 1.955), so no sliver of the
       platform's slabs is left across the opening; from k 0 it closes quickly */
    const zc = k <= 0 ? 400 : 1.90 + 60 * (1 - k) * (1 - k);
    const a = sl(0, 0, zc), o = sl(0, 0, 0), b = sl(0, 0, -1);
    _p.copy(approachToWorld(brndPos, a[0], 0, a[2]));
    _o.copy(approachToWorld(brndPos, o[0], 0, o[2]));
    _n.copy(approachToWorld(brndPos, b[0], 0, b[2])).sub(_o).normalize();
    plane.setFromNormalAndCoplanarPoint(_n, _p);
    /* the box: x within ±8, z from −3 to the cut's reach (only under the pad when closed) */
    const ax = sl(1, 0, 0), az = sl(0, 0, 1);
    _x.copy(approachToWorld(brndPos, ax[0], 0, ax[2])).sub(_o).normalize();
    _z.copy(approachToWorld(brndPos, az[0], 0, az[2])).sub(_o).normalize();
    const at = (x, z) => { const q = sl(x, 0, z); return _v4.copy(approachToWorld(brndPos, q[0], 0, q[2])); };
    boxPlanes[0].setFromNormalAndCoplanarPoint(_t.copy(_x).negate(), at(-8, 0));
    boxPlanes[1].setFromNormalAndCoplanarPoint(_x, at(8, 0));
    boxPlanes[2].setFromNormalAndCoplanarPoint(_t.copy(_z).negate(), at(0, -3));
    boxPlanes[3].setFromNormalAndCoplanarPoint(_z, at(0, k <= 0 ? 2.0 : 2.0 + 34 * k));
  }
  setClip(0);

  /* ---- the camera: the sacred group's own frame (sl), placed in the
     score's beats (main.js builds the site's one camera track from these,
     score.js). One path from Manchale on the day, down into the chamber,
     up with the layers, back out to the hold (frame00, passed in). Each
     key: [beat, u in the beat, P, L, fov, side]; `side` keys stand the
     subject right of the copy on a wide frame. Two keys in one reading
     beat (arrive, settle) are a slow drift while its words are read. ---- */
  const KEYS = [
    ['b-day',     0.00, [3.5, 2.8, 22.0], [0, 2.8, 1.0], 36, 0],   // Manchale through the gateway, the day breaking (where the walk left the camera: the tail's end)
    ['b-day',     0.95, [2.2, 2.5, 17.2], [0, 2.6, 1.0], 36, 0],   // settling forward and a little left while the day is read; the stone lifts away
    ['b-down',    0.50, [2.0, 1.45, 12.2], [0, .7, 0], 39, 1],     // in through the gateway's opening, descending
    ['b-down',    1.00, [.7, .15, 7.6], [0, -.05, 0], 40, 1],      // down before the cut: the chamber
    ['b-chamber', 0.92, [-.2, .02, 5.9], [0, -.1, -.2], 38, 1],    // Rayaru: a slow push in and a little round to the left while the chamber is read
    ['b-kurma',   0.28, [.8, 1.6, 7.6], [0, 1.0, 0], 38, 1],       // rising: the kūrmāsana over the chamber
    ['b-kurma',   0.95, [1.5, 1.9, 7.7], [0, 1.05, 0], 38, 1],     // read moving to the right and up: the slab seen across its face
    ['b-plate',   0.35, [1.2, 2.4, 8.6], [0, 1.6, 0], 38, 1],      // the plate
    ['b-plate',   0.94, [.5, 2.55, 8.9], [0, 1.65, 0], 38, 1],     // read drifting left and up
    ['b-shals',   0.30, [.9, 2.5, 8.8], [0, 1.7, 0], 38, 1],       // the vessel
    ['b-shals',   0.92, [1.7, 2.62, 9.3], [0, 1.75, 0], 38, 1],    // a small arc to the right while the stones go in
    ['b-stone',   0.30, [2.2, 2.6, 12.0], [0, 2.2, 0], 38, 1],     // back: the black stone
    ['b-stone',   0.94, [1.4, 2.95, 12.9], [0, 2.3, 0], 38, 1],    // read drawing back, left and up: its scale, the gateway's pillar at the frame's edge
    ['b-grain',   0.35, [1.6, 3.6, 10.5], [0, 3.4, 0], 38, 1],     // the earth, the tene
    ['b-grain',   0.94, [.7, 3.75, 10.2], [0, 3.45, 0], 38, 1],    // read drifting left along the course
    ['b-deities', 0.55, [1.2, 3.0, 13.0], [0, 2.9, 0], 36, 1],     // the whole of it, from the gateway's line
    ['b-deities', 0.98, [1.9, 3.3, 14.2], [0, 2.95, 0], 36, 1],    // read drawing back through the opening, rising
  ];
  /* the keys resolved for this frame's aspect: [{ beat, u, P, L, fov }] in approach coordinates */
  const keyShots = (phone) => KEYS.map(([beat, u, P0, L0, f, side]) => {
    let Pp = P0, Lp = L0;
    if (phone) Pp = [P0[0] * 1.1, P0[1] + .3, L0[2] + (P0[2] - L0[2]) * 1.45];   // a portrait frame stands further back
    else if (side) Lp = [L0[0] - .9, L0[1], L0[2]];                                // the copy has the left of a wide frame: the subject stands right of it
    return { beat, u, P: sl(...Pp), L: sl(...Lp), fov: f };
  });

  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _pv = new THREE.Vector3();
  let sweep = 0;
  const buried = [], _c = new THREE.Vector3();
  return {
    group: root,
    keyShots, addClip, setClip, plane, boxFor,
    /* t: global t; cues: every window in t (main.js praveshaCues, from the
       score); on: the Pravesha is in view (from the chapter's own start) */
    update(time, t, night = 0, cues = null, on = false) {
      section.visible = on; chamber.visible = on;
      const C = cues;
      if (!C) { for (const L of layers) L.visible = false; shals.visible = false; return; }
      const W = (w) => smooth(remap(t, w[0], w[1]));
      /* the courses: up out of their places as the day breaks (the top
         first), down again in order (the foot first, then the crown) */
      for (const k of UP_ORDER) {
        if (!P[k]) continue;
        const wu = stagger(UP_ORDER, k, C.lift[0], C.lift[1], 1 / 12, 4 / 12);
        const wd = stagger(LOWER, k, C.lower[0], C.lower[1], 1 / 5.5, .45) || stagger(UPPER, k, C.upper[0], C.upper[1], 1 / 7, .43);
        const up = W(wu), down = wd ? W(wd) : 0;
        P[k].position.y = home[k].y + LIFT[k] * up * (1 - down);
      }
      /* the garland: gone while the stone is unbuilt, back with the complete form */
      const mo = 1 - W([C.mala[0], C.mala[1]]) * (1 - W([C.mala[2], C.mala[3]]));
      if (P.mala) { P.mala.visible = mo > .01; for (const m of malaMats) m.opacity = mo; }
      /* the cut opens before the descent and closes as the stone stands:
         the bank closes again while the kūrmāsana is read, the platform's
         slabs coming back below the frame, never across an open chamber */
      const cut = W([C.cut[0], C.cut[1]]) * (1 - W([C.cut[2], C.cut[3]]));
      setClip(cut);
      /* things the world adds after it is built (tufts, loaded models) take the plane too: a sweep every second while the cut is open */
      if (cut > 0 && world && (++sweep % 60) === 1) {
        addClip(world, [brnd.group]);
        /* what the world planted on the terrain under the pad (tufts, grass) is buried in solid stone
           until the cut opens it: hidden while the chamber is seen, back when the bank closes */
        chamber.getWorldPosition(_c);
        world.traverse(o => {
          if (!(o.isMesh || o.isInstancedMesh) || !o.visible) return;
          let a = o.parent; while (a) { if (a === brnd.group) return; a = a.parent; }
          o.getWorldPosition(_w);
          if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
          const rad = o.geometry.boundingSphere ? o.geometry.boundingSphere.radius * Math.max(o.scale.x, o.scale.y, o.scale.z) : 0;
          const small = rad < 3;   // plants, not the platform's own blocks
          /* the platform's own courses (the bank's two stone blocks under the
             pad, hero.js) are solid through the chamber: the section plane
             cuts their front away, but their top faces cross the room at the
             height of the seated figure and showed as a line through him.
             While the room is open they are buried with the tufts. */
          const course = o.geometry.type === 'BoxGeometry' && rad > 5 && rad < 12;
          if ((small && _w.distanceTo(_c) < 4.2) || (course && _w.distanceTo(_c) < 9)) { o.visible = false; buried.push(o); }
        });
      }
      if (cut < .02 && buried.length) { for (const o of buried) o.visible = true; buried.length = 0; }
      /* the painted plants (shader cards, which the plane cannot cut) fade where they stand in the cut half */
      for (const c of cards) { const u = c.material.uniforms.uFade; if (!u) continue; c.getWorldPosition(_w); const d = plane.distanceToPoint(_w); if (cut > 0 && d < 0) u.value *= Math.max(0, 1 + d / 1.5); }
      if (cut > 0) for (const c of instCards) { const u = c.material.uniforms.uFade; if (u) u.value *= 1 - cut; }
      /* the chamber's lamps: lit as the eyes find him, until the stone closes over */
      const lit = W([C.lit[0], C.lit[1]]) * (1 - W([C.lit[2], C.lit[3]]));
      const fl = lampL.userData.flicker(time); lampR.userData.flicker(time + 5);
      lampL.userData.setOn(lit); lampR.userData.setOn(lit);
      lightL.intensity = 7 * (.88 + fl * .16) * lit; lightR.intensity = 5.5 * (.9 + Math.sin(time * 7) * .06) * lit;
      haloL.material.opacity = .16 * lit * (.9 + fl * .1); haloR.material.opacity = .14 * lit;
      rim.intensity = 3.2 * lit; bounce.intensity = 1.2 * lit;
      /* the layers, each in its cue's window */
      for (const L of layers) {
        const w = C[L.userData.cue];
        if (!w) { L.visible = false; continue; }
        const k = W(w);
        L.visible = on && t > w[0] - .002;
        L.position.y = L.userData.y + L.userData.lift * (1 - k);
      }
      /* the śāligrāmas go into the box one after another, from above, then the lid comes down over them */
      const sw = C.shals;
      shals.visible = on && t > sw[0] - .002 && t < C.mala[3];
      if (shals.visible) {
        const L = sw[1] - sw[0];
        for (let i = 0; i < SH_N; i++) {
          const d = shalData[i];
          const k = smooth(remap(t, sw[0] + d.d * .55 * L, sw[0] + (.45 + d.d * .55) * L));
          _e.set(d.rx + (1 - k) * 2.2, d.ry + (1 - k) * 1.4, 0); _q.setFromEuler(_e);
          _s.setScalar(k > 0 ? d.s : .001);
          _m.compose(_pv.set(d.x, d.y + 2.4 * (1 - k), d.z), _q, _s);
          shals.setMatrixAt(i, _m);
        }
        shals.instanceMatrix.needsUpdate = true;
      }
      deities.userData.light.intensity = 2.4 * W([C.deityLight[0], C.deityLight[1]]) * (1 - W([C.deityLight[2], C.deityLight[3]]));
    },
  };
}
