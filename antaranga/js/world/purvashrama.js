// RAYARA ANTARANGA · scenes 01–03 — Pūrvāśrama. One house carries the whole
// chapter: the Bhuvanagiri home outside (the editorial cover), and within it
// the small rooms of a life — akṣarābhyāsa, study, the gṛhastha household,
// and finally the ordered manuscripts of Kumbhakonam, ending at the Matha's
// inner doorway. Sannyāsa is NOT shown here; it belongs to scene 04.
//
// The house is BUILT, in the same register as everything else on the site:
// laterite plinth, lime over mud brick with an oxide dado, four turned teak
// pillars under an eave beam and rafters, a hipped tile roof from the
// settlement's own geometry. (A scanned model stood here once; its torn
// floor and smeared atlas read as a different site beside the drafted stone
// of scene 00, and it went.) The exterior is a shell with no interior, so
// the small interior the camera path needs is built separately and entered
// through an occluded cut: the camera pushes into the dark open doorway,
// and resolves inside.
import * as THREE from 'three';
import { stoneCanvas, palmLeafCanvas, canvas, tex, flame, clayLamp, bracketLamp, glowSprite, glowTexture, mulberry, clamp01, remap, smooth, win, camTrack, V3, hoistLight } from '../util.js';
import { cardMaterial, bushTexture, card } from './vegetation.js';
import { grassCutout, grassSheet } from './opening.js';
import { buildSettlement, tankDip, ghatCut, TANK, GHAT, tileCanvas, limeCanvas, hipRoofGeometry } from './bhuvanagiri.js';

export const PURVA_Y = 3200;

/* chapter spans in global t, and the door-cut position in scene progress v */
const T0 = .070, T1 = .150, T2 = .225, T3 = .295;
const V_DOOR = .235;
/* a band opens past the chapter's own opening mist: the yard is clear from the first frame */
const V_BAND0 = .06;
const tToV = (t) => clamp01((t - T0) / (T3 - T0));

/* the sand tray: levelled river sand, and the akṣara drawn into it with a
   finger. It is a groove, not a printed glyph: the stroke is the sand's own
   tone a shade deeper, with a lit edge on the side toward the lamp and a
   shadow on the other, and a trace of the kumkum that was mixed into the
   sand for the rite. Still, and treated reverentially (it never animates). */
export function sandOmCanvas() {
  const [c, g] = canvas(512, 384);
  const rnd = mulberry(27);
  g.fillStyle = '#b39a6e'; g.fillRect(0, 0, 512, 384);
  const img = g.getImageData(0, 0, 512, 384), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = (rnd() - .5) * 34;
    d[i] += v; d[i + 1] += v * .92; d[i + 2] += v * .8;
  }
  g.putImageData(img, 0, 0);
  // combed edge where the sand was levelled
  g.globalAlpha = .1; g.strokeStyle = '#7a6444';
  for (let y = 14; y < 384; y += 9) { g.beginPath(); g.moveTo(8, y); g.lineTo(504, y + (rnd() - .5) * 4); g.stroke(); }
  g.globalAlpha = 1;
  g.font = '300 190px "Noto Serif Devanagari", serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  // the displaced sand: a soft ridge around the stroke, lighter where it caught the light
  g.shadowColor = 'rgba(224,206,166,.9)'; g.shadowBlur = 9; g.shadowOffsetX = -3; g.shadowOffsetY = -3;
  g.fillStyle = 'rgba(180,156,112,1)'; g.fillText('ॐ', 256, 200);
  // the groove's shadow side
  g.shadowColor = 'rgba(64,44,26,.85)'; g.shadowBlur = 5; g.shadowOffsetX = 3; g.shadowOffsetY = 4;
  g.fillStyle = '#8e7650'; g.fillText('ॐ', 256, 200);
  g.shadowColor = 'rgba(0,0,0,0)'; g.shadowBlur = 0; g.shadowOffsetX = 0; g.shadowOffsetY = 0;
  // the groove floor, and the kumkum in its bed
  g.fillStyle = '#7f6845'; g.fillText('ॐ', 256, 200);
  g.globalAlpha = .38; g.fillStyle = '#8a3a26'; g.fillText('ॐ', 256, 200);
  g.globalAlpha = 1;
  return c;
}

/* a woven seating mat */
function matCanvas(seed, warm) {
  const [c, g] = canvas(256, 256);
  const rnd = mulberry(seed);
  g.fillStyle = warm ? '#4e3a22' : '#443727'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 6) {
    g.fillStyle = rnd() > .5 ? 'rgba(30,20,10,.32)' : 'rgba(96,74,44,.25)';
    g.fillRect(0, y, 256, 3);
  }
  for (let x = 0; x < 256; x += 22) { g.fillStyle = 'rgba(26,17,8,.25)'; g.fillRect(x, 0, 2, 256); }
  g.strokeStyle = 'rgba(70,32,16,.35)'; g.lineWidth = 8; g.strokeRect(4, 4, 248, 248);
  return c;
}

/* deterministic 2-D value noise for the courtyard terrain */
const vHash = (ix, iz) => { const q = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453; return q - Math.floor(q); };
function vNoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  return vHash(ix, iz) * (1 - u) * (1 - v) + vHash(ix + 1, iz) * u * (1 - v)
       + vHash(ix, iz + 1) * (1 - u) * v + vHash(ix + 1, iz + 1) * u * v;
}

/* the packed-earth courtyard map: muted clay, ochre and umber mottling with
   a lighter compacted band where feet pass between the courtyard and steps */
function earthCanvas() {
  const [c, g] = canvas(1024, 768);
  const rnd = mulberry(83);
  /* damp packed earth after a night's dew: umber and olive, never ochre.
     The mottling carries faint moss-green where the yard is shaded, so the
     ground belongs to the same wet river country as the opening. */
  g.fillStyle = '#5f5546'; g.fillRect(0, 0, 1024, 768);
  for (let i = 0; i < 150; i++) {
    const x = rnd() * 1024, y = rnd() * 768, r = 40 + rnd() * 150;
    const tone = ['82,74,58', '104,94,72', '90,84,64', '70,66,52', '88,92,66', '76,80,58'][(rnd() * 6) | 0];
    const grd = g.createRadialGradient(x, y, 2, x, y, r);
    grd.addColorStop(0, `rgba(${tone},${.05 + rnd() * .08})`); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  // the worn approach: a soft compacted band down the middle toward the door
  const path = g.createRadialGradient(512, 240, 30, 512, 300, 330);
  path.addColorStop(0, 'rgba(132,120,96,.16)'); path.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = path; g.fillRect(0, 0, 1024, 768);
  const img = g.getImageData(0, 0, 1024, 768), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = (rnd() - .5) * 16;
    d[i] += v; d[i + 1] += v * .95; d[i + 2] += v * .85;
  }
  g.putImageData(img, 0, 0);
  return c;
}

/* fine soil grain for the near apron, tiling */
function grainCanvas() {
  const [c, g] = canvas(256, 256);
  const rnd = mulberry(97);
  g.fillStyle = '#635747'; g.fillRect(0, 0, 256, 256);
  const img = g.getImageData(0, 0, 256, 256), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = (rnd() - .5) * 15;
    d[i] += v; d[i + 1] += v * .94; d[i + 2] += v * .84;
  }
  g.putImageData(img, 0, 0);
  for (let i = 0; i < 90; i++) {                    // occasional grit
    g.fillStyle = rnd() > .5 ? 'rgba(52,44,32,.28)' : 'rgba(126,116,94,.25)';
    const r = .6 + rnd() * 1.6;
    g.beginPath(); g.arc(rnd() * 256, rnd() * 256, r, 0, 7); g.fill();
  }
  return c;
}

/* soft radial gradient for contact shadows and light spill */
function discCanvas(rgba0, rgba1) {
  const [c, g] = canvas(128, 128);
  const grd = g.createRadialGradient(64, 64, 6, 64, 64, 62);
  grd.addColorStop(0, rgba0); grd.addColorStop(1, rgba1);
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  return c;
}

/* the entrance door: vertical teak planks, aged and oiled */
function doorCanvas() {
  const [c, g] = canvas(128, 256);
  const rnd = mulberry(41);
  g.fillStyle = '#432f1d'; g.fillRect(0, 0, 128, 256);
  const img = g.getImageData(0, 0, 128, 256), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = (rnd() - .5) * 20;
    d[i] += v; d[i + 1] += v * .8; d[i + 2] += v * .6;
  }
  g.putImageData(img, 0, 0);
  g.strokeStyle = 'rgba(58,42,26,.7)'; g.lineWidth = 1;        // grain
  for (let x = 3; x < 128; x += 4 + (rnd() * 4 | 0)) {
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (rnd() - .5) * 6, 256); g.stroke();
  }
  g.strokeStyle = 'rgba(16,10,5,.8)'; g.lineWidth = 2;         // plank joints
  for (const x of [26, 52, 77, 102]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
  g.fillStyle = 'rgba(20,13,7,.9)';                            // nail heads at the batten lines
  for (const y of [58, 196]) for (const x of [13, 39, 64, 90, 115]) { g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); }
  return c;
}

/* a banana leaf: midrib, streaks, a few torn notches on the edge */
function bananaLeafCanvas() {
  const [c, g] = canvas(128, 256);
  const rnd = mulberry(59);
  g.fillStyle = '#5d7036';
  g.beginPath(); g.ellipse(64, 128, 56, 124, 0, 0, 7); g.fill();
  g.strokeStyle = 'rgba(116,132,72,.9)'; g.lineWidth = 5;
  g.beginPath(); g.moveTo(64, 6); g.lineTo(64, 250); g.stroke();
  g.lineWidth = 2;
  for (let y = 14; y < 250; y += 9) {
    g.strokeStyle = rnd() > .5 ? 'rgba(80,96,48,.5)' : 'rgba(104,120,62,.45)';
    g.beginPath(); g.moveTo(64, y); g.lineTo(64 + (rnd() > .5 ? 54 : -54), y + 7); g.stroke();
  }
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 7; i++) {                     // edge wear
    const sy = 30 + rnd() * 200, sx = 64 + (rnd() > .5 ? 1 : -1) * (46 + rnd() * 12);
    g.beginPath(); g.ellipse(sx, sy, 4 + rnd() * 7, 2 + rnd() * 3, rnd(), 0, 7); g.fill();
  }
  g.globalCompositeOperation = 'source-over';
  return c;
}

export function createPurvashramaStage(ctx) {
  const g = new THREE.Group();
  g.position.y = PURVA_Y;
  g.visible = false;
  const rnd = mulberry(311);

  /* ================= the exterior — Bhuvanagiri morning ================= */
  const outside = new THREE.Group();
  g.add(outside);

  /* ================= THE HOUSE — built, not scanned =================
     The photogrammetry model that stood here was the one thing in the
     world that was not authored: torn floor, holes to the earth beneath,
     a smeared atlas, props that had to be cut out triangle by triangle.
     Beside scene 00's drafted stone it read as a different site. So it is
     built now, in the register of everything else — the settlement's
     lime and tiles and the interior's wood and oxide — and every surface
     is a surface. Same footprint, same door, same threshold: the leaf,
     its flame, the entry passage and the torana are untouched.
     Authored in world axes: the front faces +z, toward the yard. */
  const SINK = -.06;                      // the house sits INTO the earth, not on it
  const nicheLamps = [];
  const houseHolder = new THREE.Group();
  houseHolder.position.y = SINK;
  outside.add(houseHolder);
  const ready = Promise.resolve(houseHolder);   // main.js warms it on the same promise as before
  {
    const H = houseHolder;
    const sh = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
    const box = (w, h, d, mat, x, y, z) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)); m.position.set(x, y, z); H.add(m); return m; };

    const lime     = new THREE.MeshStandardMaterial({ map: tex(limeCanvas(9, { damp: .35, tone: [192, 184, 166] }), { repeat: [3, 1] }), roughness: 1 });
    const limeSide = new THREE.MeshStandardMaterial({ map: tex(limeCanvas(11, { damp: .5, tone: [186, 178, 160] }), { repeat: [2, 1] }), roughness: 1 });
    const oxide    = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(256, [150, 76, 54], 9, 45), { repeat: [4, 1] }), roughness: .8 });
    const laterite = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(256, [112, 108, 100], 10, 47), { repeat: [4, 1] }), roughness: 1 });
    const teak     = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(128, [72, 48, 30], 14, 61), { repeat: [1, 3] }), roughness: .85 });
    const teakEnd  = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(128, [72, 48, 30], 14, 61), { repeat: [3, 1] }), roughness: .85 });
    const dark     = new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 1 });
    /* double-sided: the roof is a single sheet, and its underside shows from
       beneath the eaves at the sides and back */
    const tile     = new THREE.MeshStandardMaterial({ map: tex(tileCanvas(5), { repeat: [1, 1] }), color: 0xdcc0aa, roughness: 1, side: THREE.DoubleSide });
    const clay     = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(128, [168, 96, 62], 10, 53)), roughness: .9 });

    /* ---- plinth: two courses of laterite, the upper one the verandah floor ---- */
    const FLOOR = .485;
    box(8.4, .22, 6.1, laterite, 0, .11, -1.0);                 // lower course, z −4.05 .. 2.05
    box(8.0, FLOOR - .22, 5.9, laterite, 0, .22 + (FLOOR - .22) / 2, -1.05);   // upper: z −4.0 .. 1.9
    // the steps up the middle, and the two pedestals that flank them
    for (let i = 0; i < 3; i++) {
      const y = (i + 1) * (FLOOR / 3);
      box(1.7, FLOOR / 3, .26, laterite, 0, y - FLOOR / 6, 1.9 + .13 + (2 - i) * .26);
    }
    for (const sx of [-1, 1]) {
      box(.30, .55, .30, clay, sx * 1.05, .275, 2.38);
      const knob = sh(new THREE.Mesh(new THREE.SphereGeometry(.11, 12, 10), clay));
      knob.position.set(sx * 1.05, .62, 2.38); H.add(knob);
    }

    /* ---- walls: lime over mud brick, cut for the door; the oxide dado at the foot ---- */
    const WALL_Z = .55, WALL_TOP = 3.0, WH = WALL_TOP - FLOOR, WY = FLOOR + WH / 2;
    const DOOR_HW = .46, DOOR_TOP = 2.07;
    box(3.5 - DOOR_HW, WH, .30, lime, -(DOOR_HW + (3.5 - DOOR_HW) / 2), WY, WALL_Z - .15);   // left of the door
    box(3.5 - DOOR_HW, WH, .30, lime,  (DOOR_HW + (3.5 - DOOR_HW) / 2), WY, WALL_Z - .15);   // right of the door
    box(DOOR_HW * 2, WALL_TOP - DOOR_TOP, .30, lime, 0, DOOR_TOP + (WALL_TOP - DOOR_TOP) / 2, WALL_Z - .15);   // over it
    box(7.0, WH, 4.15, limeSide, 0, WY, WALL_Z - .30 - 2.075);  // the body of the house behind the facade
    for (const sx of [-1, 1]) box(3.5 - DOOR_HW, .36, .012, oxide, sx * (DOOR_HW + (3.5 - DOOR_HW) / 2), FLOOR + .18, WALL_Z + .006);
    box(.012, .36, 4.45, oxide, -3.5 - .006, FLOOR + .18, WALL_Z - 2.225);
    box(.012, .36, 4.45, oxide,  3.5 + .006, FLOOR + .18, WALL_Z - 2.225);

    /* ---- windows: a dark recess, a teak frame, five bars ---- */
    for (const sx of [-1, 1]) {
      const wx = sx * 1.8, wy = 1.58, ww = .78, wh = .82;
      box(ww, wh, .10, dark, wx, wy, WALL_Z - .05);
      box(ww + .16, .07, .08, teakEnd, wx, wy + wh / 2 + .035, WALL_Z + .01);
      box(ww + .16, .07, .08, teakEnd, wx, wy - wh / 2 - .035, WALL_Z + .01);
      box(.07, wh + .14, .08, teak, wx - ww / 2 - .035, wy, WALL_Z + .01);
      box(.07, wh + .14, .08, teak, wx + ww / 2 + .035, wy, WALL_Z + .01);
      for (let b = -2; b <= 2; b++) box(.045, wh, .045, teak, wx + b * (ww / 5), wy, WALL_Z - .01);
      box(ww + .24, .05, .16, laterite, wx, wy - wh / 2 - .095, WALL_Z + .04);   // the sill
    }

    /* ---- niches: a pointed arch in oxide, a lamp inside ---- */
    for (const sx of [-1, 1]) {
      const nx = sx * .78, ny = 1.30;
      box(.34, .46, .12, dark, nx, ny, WALL_Z - .06);
      const arch = new THREE.Shape();
      arch.moveTo(-.22, -.27); arch.lineTo(.22, -.27); arch.lineTo(.22, .10); arch.lineTo(0, .34); arch.lineTo(-.22, .10); arch.closePath();
      const hole = new THREE.Path();
      hole.moveTo(-.16, -.22); hole.lineTo(.16, -.22); hole.lineTo(.16, .08); hole.lineTo(0, .26); hole.lineTo(-.16, .08); hole.closePath();
      arch.holes.push(hole);
      const frame = sh(new THREE.Mesh(new THREE.ExtrudeGeometry(arch, { depth: .05, bevelEnabled: false }), clay));   // terracotta, like the step pedestals
      frame.position.set(nx, ny, WALL_Z + .002); H.add(frame);
      const lamp = clayLamp({ scale: .55, light: false, flameScale: .28 });
      lamp.position.set(nx, ny - .22, WALL_Z - .04); H.add(lamp);
      nicheLamps.push(lamp);
    }

    /* ---- the verandah: four turned pillars on plinths, the beam, the rafters ---- */
    const PIL_Z = 1.5, BEAM_Y = 2.82;
    const profile = [];
    const P = (r, y) => profile.push(new THREE.Vector2(r, y));
    P(.16, 0); P(.17, .05); P(.14, .10); P(.175, .16); P(.165, .22); P(.10, .30); P(.115, .40);
    P(.115, 1.30); P(.10, 1.40); P(.165, 1.50); P(.14, 1.58); P(.185, 1.66); P(.19, 1.74);
    const pillarGeo = new THREE.LatheGeometry(profile, 18);
    for (const px of [-3.05, -1.15, 1.15, 3.05]) {
      box(.40, .24, .40, laterite, px, FLOOR + .12, PIL_Z);                       // the plinth block
      const pil = sh(new THREE.Mesh(pillarGeo, teak));
      pil.position.set(px, FLOOR + .24, PIL_Z); H.add(pil);
      box(.40, .12, .40, teak, px, FLOOR + .24 + 1.74 + .06, PIL_Z);           // the abacus
    }
    box(7.4, .20, .30, teakEnd, 0, BEAM_Y + .10, PIL_Z);                         // the eave beam
    const EAVE_Z = 2.48;                                                          // where the roof's front edge falls (below)
    box(8.2, .22, .06, teakEnd, 0, BEAM_Y + .30, EAVE_Z);                        // the fascia board at the eave
    for (let x = -4.0; x <= 4.0; x += .485) box(.09, .12, EAVE_Z - WALL_Z, teak, x, BEAM_Y + .26, (WALL_Z + EAVE_Z) / 2);   // rafters
    box(8.2, .02, EAVE_Z - WALL_Z - .04, dark, 0, BEAM_Y + .34, (WALL_Z + EAVE_Z) / 2);            // the ceiling above them

    /* ---- the roof: hipped, tiled in courses, from the settlement's own geometry ---- */
    /* hipRoofGeometry's ridge is (w − d) long: a plan of 8.0 × 5.4 gives the
       2.6 the ridge board needs, and a .7 overhang carries the eave 1.2
       past the pillars — the deep shade a Tamil verandah lives under */
    const ROOF_Y = BEAM_Y + .36, ROOF_W = 8.0, ROOF_D = 5.4, ROOF_H = 1.7, OVER = .7;
    const roof = sh(new THREE.Mesh(hipRoofGeometry(ROOF_W, ROOF_D, ROOF_H, OVER), tile));
    roof.position.set(0, ROOF_Y, EAVE_Z - ROOF_D / 2 - OVER);                    // front eave lands on EAVE_Z
    H.add(roof);
    // the ridge board with its finials, and the eave's under-board all round
    const ridgeZ = roof.position.z;
    box(2.6, .16, .12, clay, 0, ROOF_Y + ROOF_H + .06, ridgeZ);
    for (const fx of [-1.2, -.4, .4, 1.2]) {
      const fin = new THREE.Group(); fin.position.set(fx, ROOF_Y + ROOF_H + .14, ridgeZ);
      const pot = sh(new THREE.Mesh(new THREE.SphereGeometry(.10, 10, 8), clay)); pot.position.y = .10;
      const spike = sh(new THREE.Mesh(new THREE.ConeGeometry(.05, .18, 8), clay)); spike.position.y = .27;
      fin.add(pot, spike); H.add(fin);
    }
  }

  /* ---- the earthen courtyard: a displaced, bounded ground, not a plane ----
     Flat and compacted where people walk, rolling gently beyond the yard,
     rising at the far edges so the land closes its own horizon. */
  const heightAt = (x, z) => {
    const yard = smooth(remap(Math.hypot(x * .9, (z - 6) * 1.1), 10, 30));
    const roll = ((vNoise(x * .09 + 3, z * .09) - .5) * .5 + (vNoise(x * .3, z * .3 + 9) - .5) * .14) * yard;
    const rim = smooth(remap(-z, 14, 34)) * (.55 + vNoise(x * .05, 7.3) * .5)
              + smooth(remap(Math.abs(x), 28, 46)) * (.4 + vNoise(z * .06, 2.1) * .4);
    const micro = (vNoise(x * .55, z * .55) - .5) * .05 * smooth(remap(Math.hypot(x, z - 4), 3, 9));
    /* the village tank is carved out of the same ground: a soft-shouldered
       basin west of the arrival's walk (bhuvanagiri.js TANK) */
    const dip = tankDip(x, z);
    const h0 = (roll + rim + micro) * (1 - dip) - dip * TANK.depth;
    const cut = ghatCut(x, z);
    return h0 * (1 - cut) + GHAT.floor * cut;
  };
  /* occlusion where the house and steps meet the ground — baked into the
     ground meshes' vertex colours, so there is no separate patch to see */
  const aoAt = (x, z) => {
    const dx = Math.max(Math.abs(x) - 4.9, 0);
    const dz = Math.max(z - 2.5, -4.2 - z, 0);
    let ao = .34 * (1 - smooth(remap(Math.hypot(dx, dz), 0, 2.4)));
    ao += .16 * (1 - smooth(remap(Math.hypot(x / 1.7, (z - 3.1) / 1.3), .5, 1.5)));
    return Math.min(ao, .42);
  };
  const displace = (geo, zOff, lift = 0) => {
    const pos = geo.attributes.position;
    const col = new Float32Array(pos.count * 4);
    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i), wz = zOff - pos.getY(i);
      pos.setZ(i, heightAt(wx, wz) + lift);
      const k = 1 - aoAt(wx, wz);
      col[i * 4] = col[i * 4 + 1] = col[i * 4 + 2] = k; col[i * 4 + 3] = 1;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
    geo.computeVertexNormals();
  };
  const earthGeo = new THREE.PlaneGeometry(90, 64, ctx.isMobile ? 90 : 120, ctx.isMobile ? 64 : 88);
  displace(earthGeo, 8);
  const earth = new THREE.Mesh(earthGeo,
    new THREE.MeshStandardMaterial({ map: tex(earthCanvas()), color: 0x9a9890, roughness: 1, vertexColors: true }));
  earth.rotation.x = -Math.PI / 2;
  earth.position.set(0, -.012, 8);
  earth.receiveShadow = true;
  outside.add(earth);

  /* the near apron: fine soil grain over the walking ground, fading into the
     large map so close framing never shows a stretched texel */
  const apronGeo = new THREE.PlaneGeometry(26, 20, 26, 20);
  displace(apronGeo, 5, .016);
  {
    const pos = apronGeo.attributes.position, col = apronGeo.attributes.color;
    for (let i = 0; i < pos.count; i++) {
      col.setW(i, 1 - smooth(remap(Math.hypot(pos.getX(i) / 13, (pos.getY(i)) / 10), .55, .98)));
    }
  }
  const apron = new THREE.Mesh(apronGeo,
    new THREE.MeshStandardMaterial({
      map: tex(grainCanvas(), { repeat: [4, 4] }), color: 0x8f8d84, roughness: 1,
      transparent: true, vertexColors: true, depthWrite: false,
    }));
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(0, 0, 5);
  apron.receiveShadow = true;
  /* the apron is transparent (its edge fades into the yard), so it sorts
     with the grass sheets: pinned to draw FIRST, or by distance it painted
     over every clump between it and the camera */
  apron.renderOrder = 1;
  outside.add(apron);

  /* lamp light past the steps — visible only while the door stands open */
  const spillTex = tex(discCanvas('rgba(255,172,84,.5)', 'rgba(255,140,60,0)'));
  const spillFar = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.9),
    new THREE.MeshBasicMaterial({ map: spillTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  spillFar.rotation.x = -Math.PI / 2;
  spillFar.position.set(0, .042, 3.3);
  outside.add(spillFar);

  /* morning sky — one gradient, a warm pocket at the low sun */
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.);} ',
    fragmentShader: `
      varying vec3 vP;
      void main(){
        float h = normalize(vP).y;
        vec3 zen = vec3(0.33,0.40,0.52);
        vec3 hor = vec3(0.64,0.60,0.52);
        vec3 col = mix(zen, hor, pow(clamp(1.0-h,0.,1.), 2.1));
        /* the low sun stands behind the visitor's left shoulder on the
           arrival walk (the light rakes the facade from the west-south) */
        float pocket = exp(-pow((atan(vP.x,vP.z)+0.578)*1.7,2.0)) * pow(clamp(1.0-h,0.,1.),2.4);
        col += vec3(0.26,0.18,0.09)*pocket;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(120, 24, 16), skyMat);
  outside.add(sky);
  const sunGlow = glowSprite(0xe8cfa6, 22, .30);
  sunGlow.position.set(-46, 13, 66);
  outside.add(sunGlow);

  /* a dusty band standing at the ground-sky meeting line, so the far edge of
     the land dissolves into the morning instead of drawing a rule across it */
  const horizonBand = new THREE.Mesh(
    new THREE.CylinderGeometry(106, 106, 18, 48, 1, true),
    new THREE.MeshBasicMaterial({
      map: tex((() => {
        const [c, x] = canvas(64, 128);
        const grd = x.createLinearGradient(0, 128, 0, 0);
        grd.addColorStop(0, 'rgba(146,142,122,.92)'); grd.addColorStop(.38, 'rgba(160,156,134,.5)'); grd.addColorStop(1, 'rgba(172,168,146,0)');
        x.fillStyle = grd; x.fillRect(0, 0, 64, 128);
        return c;
      })()), transparent: true, side: THREE.BackSide, depthWrite: false, fog: false,
    }));
  horizonBand.position.y = 7.5;
  outside.add(horizonBand);

  /* the morning sun. Its target must live INSIDE the stage — the default
     target is the world origin, 3200 units below, which aims the light
     straight down and flattens every wall. From here it rakes the facade
     from the east, hangs the eave's shade on the plaster, and lays the
     house's own shadow across the courtyard. */
  const sun = new THREE.DirectionalLight(0xf1d6ae, 2.0);
  sun.position.set(-30, 19, 46);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(ctx.isMobile ? 1024 : 2048);
  sun.shadow.camera.left = -22; sun.shadow.camera.right = 22;
  sun.shadow.camera.top = 22; sun.shadow.camera.bottom = -16;
  sun.shadow.camera.near = 4; sun.shadow.camera.far = 120;
  /* the house arrives quantised (KHR_mesh_quantization), and its steps and
     plinth are big flat faces at a grazing angle to this low sun: with a
     .04 normal bias they shadowed THEMSELVES in jagged black shards. A
     normal bias pushes the lookup along the surface normal, which is the
     one fix that does not also lift every real shadow off the ground. */
  sun.shadow.bias = -.0005;
  sun.shadow.normalBias = .22;
  outside.add(sun, sun.target);
  const hemiOut = new THREE.HemisphereLight(0xa9b4bc, 0x4a4a3a, 1.25);
  outside.add(hemiOut);

  /* ---- the doorway: the model's wall is genuinely open here (x ±.375,
     y .70–1.95, wall face z≈.59, hollow shell behind). Build a REAL
     threshold in that opening: jambs, lintel, raised sill, a short entry
     floor, plastered reveals and a dark end wall — true parallax depth, a
     dark interior with substance instead of a floating black plane. The
     group rides the house's sink so it stays seated in the model. */
  const doorway = new THREE.Group();
  doorway.position.y = SINK;
  outside.add(doorway);
  const shadowed = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
  const doorWood = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(128, [56, 40, 25], 12, 71), { repeat: [1, 2] }), roughness: .85 });
  const doorPlaster = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(256, [96, 80, 60], 11, 77)), roughness: 1 });
  for (const sx of [-1, 1]) {
    const jamb = shadowed(new THREE.Mesh(new THREE.BoxGeometry(.1, 1.34, .34), doorWood));
    jamb.position.set(sx * .41, 1.33, .5);
    doorway.add(jamb);
  }
  const doorLintel = new THREE.Mesh(new THREE.BoxGeometry(1.06, .13, .36), doorWood);
  doorLintel.position.set(0, 2.0, .5);
  doorway.add(doorLintel);
  const doorSill = new THREE.Mesh(new THREE.BoxGeometry(.9, .15, .32), doorWood);
  doorSill.position.set(0, .625, .52);
  doorway.add(doorSill);
  /* the door: one leaf of vertical planks with two battens, hinged on the
     left jamb, closed while the exterior stands — it swings inward as the
     visitor reaches the threshold */
  const doorPivot = new THREE.Group();
  doorPivot.position.set(-.355, .70, .55);
  doorway.add(doorPivot);
  const doorMat = new THREE.MeshStandardMaterial({ map: tex(doorCanvas()), roughness: .8 });
  const doorLeaf = shadowed(new THREE.Mesh(new THREE.BoxGeometry(.71, 1.23, .045), doorMat));
  doorLeaf.position.set(.355, .615, 0);
  doorPivot.add(doorLeaf);
  const battenGeo = new THREE.BoxGeometry(.64, .09, .03);
  for (const by of [.28, .95]) {
    const batten = new THREE.Mesh(battenGeo, doorWood);
    batten.position.set(.355, by, .038);
    doorPivot.add(batten);
  }
  const hingeMat = new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: .6, metalness: .3 });
  const hingeGeo = new THREE.BoxGeometry(.028, .11, .06);
  for (const hy of [.22, 1.0]) {
    const hinge = new THREE.Mesh(hingeGeo, hingeMat);
    hinge.position.set(.012, hy, .01);
    doorPivot.add(hinge);
  }
  // the entry passage behind the wall
  const entryFloor = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.9),
    new THREE.MeshStandardMaterial({ map: tex(grainCanvas()), color: 0x6b5a45, roughness: 1 }));
  entryFloor.rotation.x = -Math.PI / 2;
  entryFloor.position.set(0, .55, -.35);
  doorway.add(entryFloor);
  for (const sx of [-1, 1]) {
    const reveal = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.7), doorPlaster);
    reveal.position.set(sx * .72, 1.4, -.35);
    reveal.rotation.y = sx * -Math.PI / 2;
    doorway.add(reveal);
  }
  const entryCeil = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.9),
    new THREE.MeshStandardMaterial({ color: 0x221a10, roughness: 1 }));
  entryCeil.rotation.x = Math.PI / 2;
  entryCeil.position.set(0, 2.1, -.35);
  doorway.add(entryCeil);
  const entryEnd = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.8),
    new THREE.MeshBasicMaterial({
      map: tex((() => {
        const [c, x] = canvas(128, 160);
        x.fillStyle = '#080503'; x.fillRect(0, 0, 128, 160);
        const grd = x.createRadialGradient(94, 128, 4, 94, 128, 110);   // lamplight from the inner room
        grd.addColorStop(0, 'rgba(140,82,34,.5)'); grd.addColorStop(.5, 'rgba(70,40,16,.22)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = grd; x.fillRect(0, 0, 128, 160);
        return c;
      })()),
    }));
  entryEnd.position.set(0, 1.36, -1.16);
  doorway.add(entryEnd);
  /* a small deepa on the entry floor beside the inner wall */
  const doorFlame = clayLamp({ scale: 1.2, light: false, flameScale: .32 });
  doorFlame.position.set(.46, .55, -.5);
  doorway.add(doorFlame);
  const doorLight = new THREE.PointLight(0xff9a45, 2.3, 4.5, 2);
  doorLight.position.set(.3, 1.15, -.3);
  doorway.add(doorLight);
  // lamp light falling out of the door onto the veranda floor
  const spillNear = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.5),
    new THREE.MeshBasicMaterial({ map: spillTex, transparent: true, opacity: .3, depthWrite: false, blending: THREE.AdditiveBlending }));
  spillNear.rotation.x = -Math.PI / 2;
  spillNear.position.set(0, .585, 1.35);
  doorway.add(spillNear);

  /* mango-leaf torana over the real door */
  {
    const leafGeo = new THREE.ConeGeometry(.045, .15, 5);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x38511f, roughness: 1 });
    const torana = new THREE.InstancedMesh(leafGeo, leafMat, 11);
    const m = new THREE.Matrix4(), e = new THREE.Euler();
    for (let i = 0; i < 11; i++) {
      const u = i / 10;
      e.set(Math.PI + (rnd() - .5) * .5, 0, (rnd() - .5) * .4);
      m.makeRotationFromEuler(e);
      m.setPosition(-.5 + u * 1.0, 2.1 - Math.sin(u * Math.PI) * .07, .7);
      torana.setMatrixAt(i, m);
    }
    torana.position.y = SINK;
    outside.add(torana);
  }

  /* ---- vegetation and the settlement. The neighbours, the compound wall,
     the tank and its ghat, the palms, tamarinds, reeds, far tree line,
     smoke and birds are built by bhuvanagiri.js against this same ground
     and fog; here: the banana clumps inside the yard, the low bushes, the
     grass sheets along the bunds, and the wind that moves them. ---- */
  const wind = [];                                     // {m, r, p, sp, a, x}
  const leafMats = [0x53613a, 0x5c6a3c, 0x475433].map(cc =>
    new THREE.MeshStandardMaterial({ color: cc, roughness: 1 }));
  const clusterGeo = new THREE.IcosahedronGeometry(1, 2);
  /* the settlement's air — the fog colour every card and sheet is graded
     against; main.js keeps ATMOS[1] in the same family */
  const fogC = new THREE.Color(0x8a8878);
  const cards = [];
  const bushMat = cardMaterial(bushTexture(91), fogC, { tint: .55, sway: .3 });
  const bushDarkMat = cardMaterial(bushTexture(97, { dark: 1 }), fogC, { tint: .42, sway: .25 });
  const settlement = buildSettlement(outside, ctx, { heightAt, fogC, cards, shadowed, rnd });

  const bLeafGeo = new THREE.PlaneGeometry(.6, 1.8, 1, 7);
  {
    const posA = bLeafGeo.attributes.position;
    for (let i = 0; i < posA.count; i++) {
      const u = (posA.getY(i) + .9) / 1.8;
      posA.setY(i, u * 1.8);                       // pivot at the stem
      posA.setZ(i, -u * u * .8);                   // the blade bends over and down
      posA.setX(i, posA.getX(i) * (1 - u * .25));
    }
    bLeafGeo.computeVertexNormals();
  }
  const bLeafTex = tex(bananaLeafCanvas());
  const bLeafMats = [0x76864c, 0x687846].map(cc => new THREE.MeshStandardMaterial({
    map: bLeafTex, color: cc, roughness: 1, side: THREE.DoubleSide, alphaTest: .4,
  }));
  const bStemMat = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(128, [116, 118, 76], 10, 37), { repeat: [1, 3] }), roughness: 1 });
  const bStemGeo = new THREE.CylinderGeometry(.06, .12, 1.4, 8);
  bStemGeo.translate(0, .7, 0);
  const mkBanana = (seed, sc, x, z, ry) => {
    const t = mulberry(seed);
    const gr = new THREE.Group();
    gr.add(new THREE.Mesh(bStemGeo, bStemMat));
    for (let i = 0, n = 6; i < n; i++) {
      const leaf = new THREE.Mesh(bLeafGeo, bLeafMats[i % 2]);
      leaf.position.y = 1.15 + t() * .25;
      leaf.rotation.set(-(.35 + t() * .75), i * 2.35 + t() * .8, (t() - .5) * .3);
      leaf.scale.setScalar(.8 + t() * .4);
      gr.add(leaf);
      wind.push({ m: leaf, r: leaf.rotation.x, p: t() * 6.28, sp: .6 + t() * .6, a: .02 + t() * .015, x: true });
    }
    gr.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    gr.scale.setScalar(sc);
    gr.position.set(x, heightAt(x, z) - .03, z);
    gr.rotation.y = ry;
    outside.add(gr);
  };
  /* banana clumps where a household keeps them: in the yard's corners
     against the compound wall, and one stand down at the tank's west bank */
  mkBanana(61, 1.05, -7.4, 4.0, .8);
  mkBanana(77, .85, -8.2, 5.6, 2.9);
  mkBanana(101, 1.15, 7.6, 3.4, 1.7);
  mkBanana(103, .9, 8.3, 5.2, 4.1);
  mkBanana(105, 1.3, -24.8, 23.2, 1.2);
  mkBanana(107, 1.1, -24.2, 24.8, 3.6);

  const mkBush = (seed, sc, x, z) => {
    const t = mulberry(seed);
    const gr = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const cl = new THREE.Mesh(clusterGeo, leafMats[2]);
      cl.position.set((t() - .5) * .9, .14 + t() * .1, (t() - .5) * .7);
      cl.scale.set(.4 + t() * .3, .2 + t() * .14, .36 + t() * .3);
      cl.rotation.y = t() * 6.28;
      gr.add(cl);
    }
    gr.scale.setScalar(sc);
    gr.position.set(x, heightAt(x, z) - .04, z);
    outside.add(gr);
  };
  /* low shrubs: along the lane outside the wall, on the bunds, behind the
     houses. Painted sheets that sway in the same wind. */
  const mkShrub = (mat, w, h, x, z, ry = 0) => {
    const m = card(mat, w, h, x, heightAt(x, z) + h / 2 - .1, z, ry);
    cards.push(m); outside.add(m); return m;
  };
  mkShrub(bushMat, 3.4, 1.7, -12.4, 10.2, .2);
  mkShrub(bushDarkMat, 3.8, 1.9, 12.6, 10.6, -.2);
  mkShrub(bushMat, 3.0, 1.5, 5.0, 18.4, .1);
  mkShrub(bushDarkMat, 3.4, 1.7, 5.6, 25.5, .3);
  mkShrub(bushMat, 3.2, 1.6, -25.6, 14.2, -.1);
  mkShrub(bushDarkMat, 3.6, 1.8, -26.0, 31.2, .15);
  mkShrub(bushMat, 3.8, 1.9, -15.5, 38.4, 0);
  mkShrub(bushDarkMat, 3.4, 1.7, -7.2, 38.8, .25);
  mkShrub(bushMat, 4.2, 2.1, -9.5, -8.0, .2);
  mkShrub(bushDarkMat, 4.6, 2.3, 12.5, -7.5, -.2);
  mkShrub(bushDarkMat, 2.6, 1.3, 4.2, 9.9, -.15);
  mkShrub(bushMat, 2.4, 1.2, -4.6, 9.7, .1);
  const grass = [];
  const mkGrass = (seed, w, h, x, z, ry, tint) => {
    const gs = grassSheet(grassCutout(seed, { crest: .45 + (seed % 7) * .02, peak: .30, wide: .7, blades: ctx.isMobile ? 3000 : 5000, len: 22, warm: .1, day: true, rough: .7, crest2: .3 }), w, h, fogC);
    gs.position.set(x, heightAt(x, z) + h * .28, z); gs.rotation.y = ry;
    gs.material.uniforms.uTint.value = tint; gs.renderOrder = 4;
    outside.add(gs); grass.push(gs); return gs;
  };
  /* the east bund the arrival walks along: grass right up to the path */
  mkGrass(301, 5.0, 1.08, 4.6, 15.5, .15, 0.18);
  mkGrass(307, 5.5, 1.14, 5.4, 19.5, -.2, 0.17);
  mkGrass(311, 5.0, 1.08, 4.4, 23.5, .05, 0.17);
  mkGrass(313, 5.5, 1.14, 5.6, 27.5, .1, 0.16);
  mkGrass(317, 5.0, 1.08, 4.8, 31.5, .3, 0.18);
  /* the west bank and the far bank of the tank */
  mkGrass(319, 5.5, 1.14, -25.0, 15.0, -.3, 0.18);
  mkGrass(323, 6.0, 1.26, -25.6, 21.0, .1, 0.16);
  mkGrass(329, 5.5, 1.14, -25.2, 29.0, -.1, 0.17);
  mkGrass(331, 5.0, 1.08, -24.4, 34.0, .2, 0.18);
  mkGrass(337, 6.5, 1.32, -18.0, 37.0, -.15, 0.18);
  mkGrass(347, 6.0, 1.26, -9.0, 37.6, .15, 0.18);
  mkGrass(349, 5.5, 1.14, -2.5, 36.6, -.2, 0.18);
  /* the lane's edges and the foot of the compound wall, inside and out */
  mkGrass(353, 3.6, .90, -7.6, 9.6, .05, 0.19);
  mkGrass(359, 3.4, .86, 7.2, 9.8, .1, 0.19);
  mkGrass(361, 2.4, .74, -3.4, 10.3, .1, 0.19);
  mkGrass(367, 2.6, .79, 3.2, 10.5, -.1, 0.19);
  mkGrass(373, 3.0, .84, -6.4, 7.5, .2, 0.18);
  mkGrass(379, 2.8, .80, 6.2, 7.7, -.2, 0.18);
  mkGrass(383, 2.2, .70, -3.6, 6.9, .05, 0.19);
  mkGrass(389, 2.3, .72, 3.4, 7.1, -.05, 0.19);
  /* behind the houses, under the tamarinds */
  mkGrass(397, 10, 1.68, -8.0, -6.0, .05, 0.16);
  mkGrass(401, 9, 1.56, 9.5, -7.0, .1, 0.16);

  /* signs of a household: the tulasi kaṭṭe in the yard, stepping stones on
     the worn approach, a water pot by the steps, kolam dots at the door */
  {
    const plasterMat = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(128, [122, 108, 88], 10, 91)), roughness: 1 });
    const katte = new THREE.Group();
    const kb = new THREE.Mesh(new THREE.BoxGeometry(.62, .55, .62), plasterMat); kb.position.y = .275; katte.add(kb);
    const kt = new THREE.Mesh(new THREE.BoxGeometry(.72, .08, .72), plasterMat); kt.position.y = .57; katte.add(kt);
    const kc = new THREE.Mesh(new THREE.CylinderGeometry(.2, .22, .16, 10), plasterMat); kc.position.y = .65; katte.add(kc);
    for (let i = 0; i < 4; i++) {
      const cl = new THREE.Mesh(clusterGeo, leafMats[i % 3]);
      cl.position.set((rnd() - .5) * .22, .82 + rnd() * .12, (rnd() - .5) * .22);
      cl.scale.set(.16 + rnd() * .08, .13 + rnd() * .06, .16 + rnd() * .08);
      katte.add(cl);
    }
    katte.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    katte.position.set(-2.7, heightAt(-2.7, 5.6) - .02, 5.6);
    outside.add(katte);
    const stoneMat = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(128, [104, 100, 92], 12, 93)), roughness: 1 });
    const stepGeo = new THREE.CylinderGeometry(.24, .27, .06, 7);
    [[.15, 3.7], [-.2, 4.8], [.25, 5.9], [-.1, 7.0], [.2, 7.7]].forEach(([sx, sz], i) => {
      const st = new THREE.Mesh(stepGeo, stoneMat);
      st.position.set(sx, heightAt(sx, sz) + .02, sz);
      st.rotation.y = i * 1.3; st.scale.set(1 + (i % 2) * .2, 1, .85);
      st.receiveShadow = true;
      outside.add(st);
    });
    const potPts = [];
    for (let k = 0; k <= 8; k++) { const u = k / 8; potPts.push(new THREE.Vector2(.03 + Math.sin(u * 2.7) * .19 + (u > .82 ? (u - .82) * .3 : 0), u * .4)); }
    const pot = new THREE.Mesh(new THREE.LatheGeometry(potPts, 14), new THREE.MeshStandardMaterial({ color: 0x5c3a24, roughness: .85 }));
    pot.position.set(2.15, heightAt(2.15, 2.3), 2.3);
    pot.castShadow = true;
    outside.add(pot);
    const [kc2, kg] = canvas(128, 128);
    kg.fillStyle = 'rgba(232,222,200,.85)';
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) { kg.beginPath(); kg.arc(24 + i * 20, 24 + j * 20, 1.6, 0, 7); kg.fill(); }
    kg.strokeStyle = 'rgba(232,222,200,.55)'; kg.lineWidth = 1.2;
    kg.beginPath(); kg.moveTo(24, 64); kg.lineTo(64, 24); kg.lineTo(104, 64); kg.lineTo(64, 104); kg.closePath(); kg.stroke();
    kg.beginPath(); kg.moveTo(44, 64); kg.lineTo(64, 44); kg.lineTo(84, 64); kg.lineTo(64, 84); kg.closePath(); kg.stroke();
    const kolam = new THREE.Mesh(new THREE.PlaneGeometry(.9, .9),
      new THREE.MeshBasicMaterial({ map: tex(kc2), transparent: true, opacity: .7, depthWrite: false }));
    kolam.rotation.x = -Math.PI / 2; kolam.position.set(0, heightAt(0, 2.25) + .022, 2.25);
    outside.add(kolam);
  }

  /* early-morning haze lying across the courtyard */
  const haze = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 3),
    new THREE.MeshBasicMaterial({
      map: tex((() => {
        const [c, x] = canvas(256, 64);
        const grd = x.createLinearGradient(0, 0, 0, 64);
        grd.addColorStop(0, 'rgba(206,196,176,0)'); grd.addColorStop(.5, 'rgba(206,196,176,.85)'); grd.addColorStop(1, 'rgba(206,196,176,0)');
        x.fillStyle = grd; x.fillRect(0, 0, 256, 64);
        return c;
      })()), transparent: true, opacity: .30, depthWrite: false, fog: false,
    }));
  haze.position.set(-4, 1.1, -3);
  outside.add(haze);
  /* a nearer, lower veil of the same mist standing across the yard: the
     chapter opens INSIDE this — light and mist fill the frame, then the
     house resolves out of it (the transition is memory replacing the
     present, not a camera crossing geometry) */
  /* they lie on the tank: the chapter opens across water under mist, the
     same air the Tungabhadra closed on */
  const haze2 = new THREE.Mesh(new THREE.PlaneGeometry(40, 4.6), haze.material.clone());
  haze2.position.set(-10, .2, 17);
  haze2.renderOrder = 8;
  outside.add(haze2);
  const haze3 = new THREE.Mesh(new THREE.PlaneGeometry(34, 4.2), haze.material.clone());
  haze3.position.set(-8, .6, 25);
  haze3.renderOrder = 8;
  outside.add(haze3);

  /* ================= the interior — the front room of the house =========
     Entered through the doorway cut. Local block centred on z −30.5. A
     Madhwa agrahara front room: a polished red-oxide floor, lime-plastered
     walls over an oxide dado, dark timber pillars under a raftered ceiling,
     the morning coming in through the door behind the visitor and a barred
     window on the left. Daylight and lamplight share the room: the lamp is
     never the only light, so the room reads as a room and not as orange. */
  const inside = new THREE.Group();
  g.add(inside);

  const plaster = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(512, [128, 116, 96], 10, 43), { repeat: [3, 1] }), roughness: 1 });
  const oxide = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(256, [96, 56, 46], 9, 45), { repeat: [4, 1] }), roughness: .7 });
  const wood = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(256, [44, 30, 18], 14, 61), { repeat: [1, 3] }), roughness: .85 });
  const floorIn = new THREE.Mesh(new THREE.PlaneGeometry(9, 9.5),
    new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(512, [98, 62, 50], 8, 47), { repeat: [3, 3] }), color: 0xa8968c, roughness: .55 }));
  floorIn.rotation.x = -Math.PI / 2;
  floorIn.position.set(0, 0, -30.5);
  floorIn.receiveShadow = true;
  inside.add(floorIn);
  const ceilIn = new THREE.Mesh(new THREE.PlaneGeometry(9, 9.5), new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 1 }));
  ceilIn.rotation.x = Math.PI / 2;
  ceilIn.position.set(0, 3.1, -30.5);
  inside.add(ceilIn);
  // rafters across the room, the register the site's interiors share
  {
    const rafterGeo = new THREE.BoxGeometry(.11, .16, 9.5);
    for (let i = 0; i < 7; i++) {
      const r = new THREE.Mesh(rafterGeo, wood);
      r.position.set(-3.6 + i * 1.2, 3.02, -30.5);
      inside.add(r);
    }
  }
  // walls: back (the entrance, behind the arriving camera), left, right, far (the Matha wall)
  const mkWall = (w, x, z, ry) => {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(w, 3.1), plaster);
    wall.position.set(x, 1.55, z);
    wall.rotation.y = ry;
    wall.receiveShadow = true;
    inside.add(wall);
    // the oxide dado along its foot
    const dado = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.0), oxide);
    dado.position.set(x, .5, z);
    dado.rotation.y = ry;
    dado.translateZ(.006);
    inside.add(dado);
    return { wall, dado };
  };
  mkWall(9, 0, -25.75, Math.PI);
  mkWall(9.5, -4.5, -30.5, Math.PI / 2);
  mkWall(9.5, 4.5, -30.5, -Math.PI / 2);
  /* the far wall is not built here: it is the wall with the doorway cut
     through it, below, and it is there from the first frame — a house does
     not grow a door. What Kumbakonam changes is the light in the passage. */
  // timber pillars + beam, the register the site already speaks
  for (const px of [-2.2, 2.2]) {
    const p = shadowed(new THREE.Mesh(new THREE.BoxGeometry(.3, 3.1, .3), wood));
    p.position.set(px, 1.55, -30.4);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(.6, .14, .6), wood);
    cap.position.set(px, 3.02, -30.4);
    const base = new THREE.Mesh(new THREE.BoxGeometry(.44, .22, .44), oxide);
    base.position.set(px, .11, -30.4);
    inside.add(p, cap, base);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(5.2, .2, .28), wood);
  beam.position.set(0, 2.98, -30.4);
  inside.add(beam);

  /* ---- the morning behind the visitor: the entrance door stands open in
     the back wall and the yard's light comes in across the floor. It is the
     cool counterweight to the lamp, and it ties the room to the house we
     have just walked up to. ---- */
  const dayIn = new THREE.Group();
  inside.add(dayIn);
  for (const sx of [-1, 1]) {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(.12, 1.5, .2), wood);
    jamb.position.set(sx * .56, .75 + .55, -25.72);
    dayIn.add(jamb);
  }
  const lintelIn = new THREE.Mesh(new THREE.BoxGeometry(1.24, .14, .2), wood);
  lintelIn.position.set(0, 1.98 + .07, -25.72);
  dayIn.add(lintelIn);
  const doorDay = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.42),
    new THREE.MeshBasicMaterial({
      map: tex((() => {
        const [c, x] = canvas(64, 96);
        const grd = x.createLinearGradient(0, 0, 0, 96);
        grd.addColorStop(0, '#c9c4b6'); grd.addColorStop(.55, '#bab5a6'); grd.addColorStop(1, '#8e8a7c');
        x.fillStyle = grd; x.fillRect(0, 0, 64, 96);
        return c;
      })()), fog: false,
    }));
  doorDay.position.set(0, 1.26 + .05, -25.66);
  doorDay.rotation.y = Math.PI;
  dayIn.add(doorDay);
  // the light lying on the floor from the door toward the dais
  const floorShaft = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3.4),
    new THREE.MeshBasicMaterial({
      map: tex((() => {
        const [c, x] = canvas(64, 128);
        const grd = x.createLinearGradient(0, 0, 0, 128);
        grd.addColorStop(0, 'rgba(200,194,178,.55)'); grd.addColorStop(.6, 'rgba(200,194,178,.16)'); grd.addColorStop(1, 'rgba(200,194,178,0)');
        x.fillStyle = grd; x.fillRect(0, 0, 64, 128);
        const g2 = x.createLinearGradient(0, 0, 64, 0);
        g2.addColorStop(0, 'rgba(0,0,0,.9)'); g2.addColorStop(.2, 'rgba(0,0,0,0)'); g2.addColorStop(.8, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,.9)');
        x.globalCompositeOperation = 'destination-out'; x.fillStyle = g2; x.fillRect(0, 0, 64, 128);
        return c;
      })()), transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
  floorShaft.rotation.x = -Math.PI / 2; floorShaft.rotation.z = Math.PI;
  floorShaft.position.set(.1, .012, -27.5);
  dayIn.add(floorShaft);
  const dayLight = new THREE.DirectionalLight(0xd6d0c2, 1.15);
  dayLight.position.set(-1.2, 2.6, -24.0);
  dayLight.target.position.set(.2, .2, -30.6);
  dayLight.castShadow = !ctx.isMobile;
  dayLight.shadow.mapSize.setScalar(1024);
  dayLight.shadow.camera.left = -5; dayLight.shadow.camera.right = 5;
  dayLight.shadow.camera.top = 5; dayLight.shadow.camera.bottom = -5;
  dayLight.shadow.camera.near = 1; dayLight.shadow.camera.far = 20;
  dayLight.shadow.bias = -.0005;
  dayLight.shadow.normalBias = .18;
  dayIn.add(dayLight, dayLight.target);

  /* the barred window in the left wall: a lit opening and its bars; the
     day light through it is the study's light in the parts that follow */
  {
    const winGlow = new THREE.Mesh(new THREE.PlaneGeometry(.8, .9),
      new THREE.MeshBasicMaterial({ color: 0xb8b3a4, fog: false }));
    winGlow.position.set(-4.49, 1.75, -31.4);
    winGlow.rotation.y = Math.PI / 2;
    inside.add(winGlow);
    for (let b = -1; b <= 1; b++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(.05, .9, .05), wood);
      bar.position.set(-4.44, 1.75, -31.4 + b * .24);
      inside.add(bar);
    }
    const sill = new THREE.Mesh(new THREE.BoxGeometry(.18, .08, .96), wood);
    sill.position.set(-4.42, 1.28, -31.4);
    inside.add(sill);
  }

  /* ---- the akṣarābhyāsa arrangement ---- */
  const ceremony = new THREE.Group();
  inside.add(ceremony);
  const dais = shadowed(new THREE.Mesh(new THREE.BoxGeometry(1.5, .14, 1.05), wood));
  dais.position.set(0, .07, -30.5);
  ceremony.add(dais);
  const tray = shadowed(new THREE.Mesh(new THREE.BoxGeometry(1.06, .07, .78),
    new THREE.MeshStandardMaterial({ color: 0x513920, roughness: .9 })));
  tray.position.set(0, .175, -30.5);
  ceremony.add(tray);
  /* the sand, with the syllable written into it by a finger: a groove in
     relief under the lamp (bump map), a trace of kumkum in its bed */
  {
    const sc = sandOmCanvas();
    const [bc, bg] = canvas(512, 384);
    bg.fillStyle = '#808080'; bg.fillRect(0, 0, 512, 384);
    bg.font = '300 190px "Noto Serif Devanagari", serif';
    bg.textAlign = 'center'; bg.textBaseline = 'middle';
    bg.shadowColor = 'rgba(0,0,0,.6)'; bg.shadowBlur = 5;
    bg.fillStyle = '#2a2a2a'; bg.fillText('ॐ', 256, 200);
    const bump = tex(bc, { srgb: false });
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(.96, .68),
      new THREE.MeshStandardMaterial({ map: tex(sc), bumpMap: bump, bumpScale: .012, roughness: 1 }));
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(0, .215, -30.5);
    sand.receiveShadow = true;
    ceremony.add(sand);
  }
  // turmeric, kumkum, mantrākṣata, flowers — small and quiet. They live in
  // their own group: the education pass puts the decorations away while the
  // dais and the written sand remain part of the room.
  const decor = new THREE.Group();
  ceremony.add(decor);
  const bowl = (color, x, z, r = .07) => {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(r, r * .74, .06, 12),
      new THREE.MeshStandardMaterial({ color: 0x6a4a26, roughness: .8 }));
    cup.position.set(x, .175, z);
    const fill = new THREE.Mesh(new THREE.CylinderGeometry(r * .82, r * .82, .022, 12),
      new THREE.MeshStandardMaterial({ color, roughness: 1 }));
    fill.position.set(x, .208, z);
    decor.add(cup, fill);
  };
  bowl(0xb08a26, .60, -30.16);             // turmeric
  bowl(0x8a2a1a, .52, -30.02, .06);        // kumkum
  const akshata = new THREE.Mesh(new THREE.ConeGeometry(.09, .07, 10),
    new THREE.MeshStandardMaterial({ color: 0xd9c9a4, roughness: 1 }));
  akshata.position.set(.63, .245, -30.42);
  decor.add(akshata);
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xb06a24, roughness: .9 });
  const flowerMatW = new THREE.MeshStandardMaterial({ color: 0xcfc4ae, roughness: .9 });
  for (let i = 0; i < 10; i++) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(.018, 7, 5), i % 3 ? flowerMat : flowerMatW);
    f.scale.y = .7;
    f.position.set(.50 + rnd() * .2, .215, -30.98 + rnd() * .2);     // on the dais wood, at the lamp's foot
    decor.add(f);
  }
  // two woven mats: the father's and the child's seats
  const matGeo = new THREE.PlaneGeometry(.78, 1.05);
  const matFather = new THREE.Mesh(matGeo, new THREE.MeshStandardMaterial({ map: tex(matCanvas(5, true)), roughness: 1, transparent: true }));
  matFather.rotation.x = -Math.PI / 2;
  matFather.position.set(-.02, .012, -31.45);
  matFather.receiveShadow = true;
  inside.add(matFather);
  const matChild = new THREE.Mesh(matGeo, new THREE.MeshStandardMaterial({ map: tex(matCanvas(9, false)), roughness: 1, transparent: true }));
  matChild.rotation.x = -Math.PI / 2;
  matChild.scale.setScalar(.78);
  matChild.position.set(.04, .012, -29.45);
  matChild.receiveShadow = true;
  inside.add(matChild);
  /* the ceremony's lamp: a clay agal on the dais beside the written sand,
     the household's own lamp, not a showpiece */
  const omFlame = clayLamp({ scale: 1.6, light: false, flameScale: .34 });
  omFlame.position.set(.6, .14, -30.82); omFlame.rotation.y = -2.2;
  inside.add(omFlame);
  const omLight = new THREE.PointLight(0xffb27a, 4.2, 7, 2);
  omLight.position.set(.6, .7, -30.7);
  omLight.castShadow = false;
  inside.add(omLight);
  /* the room's wall lamp: a bracket in the left wall by the desk, lit
     from the first frame — the house keeps one lamp burning */
  const wallLamp = bracketLamp({ scale: 1, intensity: 2.2, distance: 6 });
  wallLamp.position.set(-4.46, 1.4, -32.6); wallLamp.rotation.y = Math.PI / 2;
  inside.add(wallLamp);

  /* ---- study: veena, desk, manuscripts (parts 3–5) ---- */
  const veena = new THREE.Group();
  const vwood = new THREE.MeshStandardMaterial({ color: 0x3a2413, roughness: .7 });
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.045, .055, 1.7, 8), vwood);
  neck.rotation.z = Math.PI / 2; veena.add(neck);
  const gourd = new THREE.Mesh(new THREE.SphereGeometry(.3, 14, 10), vwood);
  gourd.position.x = -.85; gourd.scale.y = .8; veena.add(gourd);
  const gourd2 = new THREE.Mesh(new THREE.SphereGeometry(.2, 12, 8), vwood);
  gourd2.position.x = .8; veena.add(gourd2);
  veena.position.set(-3.15, .6, -31.25);
  veena.rotation.set(0, .55, 1.1);
  inside.add(veena);

  const desk = new THREE.Group();
  const deskTop = shadowed(new THREE.Mesh(new THREE.BoxGeometry(1.3, .07, .7), wood));
  deskTop.position.y = .4; desk.add(deskTop);
  for (const [dx, dz] of [[-.52, -.26], [.52, -.26], [-.52, .26], [.52, .26]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(.08, .4, .08), wood);
    leg.position.set(dx, .2, dz); desk.add(leg);
  }
  desk.position.set(-2.5, 0, -31.9);
  desk.rotation.y = .5;
  inside.add(desk);

  /* palm-leaf bundles, one instanced set: a handful at first, stacks for
     study, rows for students, ordered shelves for Kumbakonam. Aged leaf:
     olive-brown, not yellow, with the dark edge of the stacked leaves and
     the cord that ties each bundle. */
  const leafMat = new THREE.MeshStandardMaterial({ map: tex(palmLeafCanvas(7)), color: 0x8a7a58, roughness: .92 });
  const bundleGeo = new THREE.BoxGeometry(.66, .08, .15);
  const MS_N = ctx.isMobile ? 56 : 84;
  const bundles = new THREE.InstancedMesh(bundleGeo, leafMat, MS_N);
  bundles.frustumCulled = false;
  bundles.castShadow = true; bundles.receiveShadow = true;
  inside.add(bundles);
  const placements = [];
  // 0-2: on and beside the desk (faint from the start)
  placements.push([-2.5, .47, -31.9, .5], [-2.36, .55, -31.98, .62], [-2.9, .05, -31.6, .3]);
  // 3-23: study stacks along the left wall
  for (let i = 3; i < 24; i++) {
    placements.push([-4.1 + rnd() * .5, .05 + (i % 5) * .095, -33.4 + rnd() * 3.4, (rnd() - .5) * .5 + Math.PI / 2]);
  }
  // 24-43: students' manuscripts — small tidy stacks beyond the dais
  for (let i = 24; i < 44; i++) {
    const k = i - 24;
    const col = k % 5, row = Math.floor(k / 5) % 2, lvl = Math.floor(k / 10);
    placements.push([-3.1 + col * .5 + (rnd() - .5) * .08, .045 + lvl * .105, -32.6 - row * .5, (rnd() - .5) * .5, .8]);
  }
  // 44+: the ordered collection along the right wall — Kumbakonam
  for (let i = 44; i < MS_N; i++) {
    const k = i - 44;
    placements.push([3.85, .40 + Math.floor(k / 10) * .5, -33.9 + (k % 10) * .43, (rnd() - .5) * .14, 1.15]);
  }
  const _m = new THREE.Matrix4(), _e = new THREE.Euler(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  let msCount = -1;
  function setBundles(n) {
    n = Math.min(n, MS_N);
    if (n === msCount) return;
    msCount = n;
    for (let i = 0; i < n; i++) {
      const p = placements[i];
      _e.set(0, p[3], 0);
      _q.setFromEuler(_e);
      const k = p[4] || 1;
      _m.compose(_p.set(p[0], p[1], p[2]), _q, _s.set(k, k * 1.4, k));
      bundles.setMatrixAt(i, _m);
    }
    bundles.count = n;
    bundles.instanceMatrix.needsUpdate = true;
  }
  setBundles(3);
  // shelf planks for the ordered wall
  const shelves = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const sh = shadowed(new THREE.Mesh(new THREE.BoxGeometry(.55, .06, 4.6), wood));
    sh.position.set(3.78, .3 + i * .5, -31.9);
    shelves.add(sh);
  }
  shelves.visible = false;
  inside.add(shelves);
  const shelfLight = new THREE.PointLight(0xe8c08a, 0, 7, 2);
  shelfLight.position.set(3.1, 1.5, -31.8);
  inside.add(shelfLight);

  /* ---- household (part 4) ---- */
  const household = new THREE.Group();
  household.visible = false;
  inside.add(household);
  /* the household's lamp: a bracket in the right wall */
  const lamp2 = bracketLamp({ scale: 1, intensity: 4.5, distance: 8 });
  lamp2.position.set(4.46, 1.4, -31.2); lamp2.rotation.y = -Math.PI / 2;
  household.add(lamp2);
  hoistLight(lamp2, inside);   // the light stays in the scene while the household is hidden
  // a single water vessel
  const potPts = [];
  for (let s = 0; s <= 8; s++) {
    const u = s / 8;
    potPts.push(new THREE.Vector2(.02 + Math.sin(u * 2.6) * .21 + (u > .8 ? (u - .8) * .22 : 0), u * .42));
  }
  const pot = shadowed(new THREE.Mesh(new THREE.LatheGeometry(potPts, 14),
    new THREE.MeshStandardMaterial({ color: 0x6b3a20, roughness: .85 })));
  pot.position.set(2.85, 0, -30.2);
  household.add(pot);
  // the child's sleeping place: a small mat and folded cloth, nothing more
  const sleepMat = new THREE.Mesh(new THREE.PlaneGeometry(.62, 1.15),
    new THREE.MeshStandardMaterial({ map: tex(matCanvas(13, false)), roughness: 1 }));
  sleepMat.rotation.x = -Math.PI / 2;
  sleepMat.rotation.z = .3;
  sleepMat.position.set(2.5, .012, -29.1);
  household.add(sleepMat);
  const foldCloth = new THREE.Mesh(new THREE.BoxGeometry(.4, .09, .26),
    new THREE.MeshStandardMaterial({ color: 0x8a7350, roughness: 1 }));
  foldCloth.position.set(2.6, .045, -29.7);
  foldCloth.rotation.y = .3;
  household.add(foldCloth);

  /* ---- Kumbakonam: the doorway in the far wall, and the PASSAGE behind it
     (part 5) ----

     This was a door frame standing against a solid wall with a lit panel
     inside it: the dado ran straight across the opening, which told the eye
     at once that there was nothing behind it. The chapter ends by walking
     THROUGH this door, so it is now a real hole in the wall with a corridor
     running back from it — floor, ceiling, two side walls, the dado carried
     round the corner — and the light lives at the far end, three metres
     away, so the camera walks toward it rather than into a glowing rectangle.

     The wall is rebuilt here in three pieces around the opening (left, right,
     header) and the original solid wall steps aside; both belong to `matha`,
     which is hidden until Kumbakonam, so the earlier parts of the house are
     untouched. ---- */
  const DOOR_HW = .90, DOOR_H = 2.47;          // the clear opening
  const PASS_HW = .95, PASS_LEN = 3.4;         // the corridor beyond it
  const PASS_Z = -35.25, PASS_END = PASS_Z - PASS_LEN;
  const PASS_MID = PASS_Z - PASS_LEN / 2;

  const matha = new THREE.Group();          // always present; only its light is staged
  inside.add(matha);

  /* the far wall, cut: two panels and a header over the opening */
  const panel = (w, h, x, y) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), plaster);
    m.position.set(x, y, PASS_Z);
    m.receiveShadow = true;
    matha.add(m);
    return m;
  };
  const sideW = 4.5 - DOOR_HW;
  panel(sideW, 3.1, -(DOOR_HW + sideW / 2), 1.55);
  panel(sideW, 3.1, (DOOR_HW + sideW / 2), 1.55);
  panel(DOOR_HW * 2, 3.1 - DOOR_H, 0, DOOR_H + (3.1 - DOOR_H) / 2);
  /* the oxide dado stops at the opening instead of running through it */
  for (const sx of [-1, 1]) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(sideW, 1.0), oxide);
    d.position.set(sx * (DOOR_HW + sideW / 2), .5, PASS_Z + .006);
    matha.add(d);
  }

  /* The passage itself — and it TURNS. A corridor that ends on a flat wall
     is a blocked corridor, however well it is lit: the eye needs somewhere
     for it to go. So the right-hand wall stops short of the end, the space
     continues around that corner, and the only lamp is round it — the wall
     the camera faces is lit by a light it cannot see, which is what tells
     you the house carries on past this frame. */
  const TURN = 1.25;                 // the width of the opening in the right wall
  const RET  = 1.55;                 // how far the return runs before its own wall
  const wallPiece = (w, h, x, y, z, ry, mat) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.receiveShadow = true;
    matha.add(m);
    return m;
  };
  /* a wall and the oxide dado that runs along its foot, as one call */
  const wallRun = (w, x, y, z, ry) => {
    wallPiece(w, DOOR_H, x, DOOR_H / 2, z, ry, plaster);
    const off = .006;
    wallPiece(w, 1.0, x + Math.sin(ry) * off, .5, z + Math.cos(ry) * off, ry, oxide);
  };

  const passFloor = new THREE.Mesh(new THREE.PlaneGeometry(PASS_HW * 2, PASS_LEN), floorIn.material);
  passFloor.rotation.x = -Math.PI / 2;
  passFloor.position.set(0, .002, PASS_MID);
  passFloor.receiveShadow = true;
  matha.add(passFloor);
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0x241b13, roughness: 1 });
  const passCeil = new THREE.Mesh(new THREE.PlaneGeometry(PASS_HW * 2, PASS_LEN), ceilMat);
  passCeil.rotation.x = Math.PI / 2;
  passCeil.position.set(0, DOOR_H, PASS_MID);
  matha.add(passCeil);

  // left wall: the full run. Right wall: stops TURN short, and that gap is the way on.
  wallRun(PASS_LEN, -PASS_HW, 0, PASS_MID, Math.PI / 2);
  wallRun(PASS_LEN - TURN, PASS_HW, 0, PASS_Z - (PASS_LEN - TURN) / 2, -Math.PI / 2);
  wallRun(PASS_HW * 2, 0, 0, PASS_END, 0);                       // the wall the camera faces

  /* the return, running right out of the corridor's end */
  const retMidX = PASS_HW + RET / 2, retMidZ = PASS_END + TURN / 2;
  const retFloor = new THREE.Mesh(new THREE.PlaneGeometry(RET, TURN), floorIn.material);
  retFloor.rotation.x = -Math.PI / 2;
  retFloor.position.set(retMidX, .002, retMidZ);
  retFloor.receiveShadow = true;
  matha.add(retFloor);
  const retCeil = new THREE.Mesh(new THREE.PlaneGeometry(RET, TURN), ceilMat);
  retCeil.rotation.x = Math.PI / 2;
  retCeil.position.set(retMidX, DOOR_H, retMidZ);
  matha.add(retCeil);
  wallRun(RET, retMidX, 0, PASS_END, 0);                          // its back wall, in line with the corridor's
  wallRun(RET, retMidX, 0, PASS_END + TURN, Math.PI);             // the right wall picked up again past the gap
  wallRun(TURN, PASS_HW + RET, 0, retMidZ, -Math.PI / 2);         // the wall the return ends on

  for (const sx of [-1, 1]) {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(.24, DOOR_H + .1, .3), wood);
    jamb.position.set(sx * (DOOR_HW + .12), (DOOR_H + .1) / 2, PASS_Z + .02);
    matha.add(jamb);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(DOOR_HW * 2 + .72, .26, .36), wood);
  lintel.position.set(0, DOOR_H + .13, PASS_Z + .02);
  matha.add(lintel);
  const threshold = new THREE.Mesh(new THREE.BoxGeometry(DOOR_HW * 2 + .48, .06, .34), wood);
  threshold.position.set(0, .03, PASS_Z + .02);
  matha.add(threshold);

  /* the lamplight around the corner, laid on the return's end wall — the
     camera never sees the source, only that there is one */
  const mathaGlowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(TURN, DOOR_H),
    new THREE.MeshBasicMaterial({
      map: glowTexture('rgba(232,196,140,.5)', 'rgba(60,36,14,0)'),
      transparent: true, opacity: 0, depthWrite: false,
    }));
  mathaGlowPlane.position.set(PASS_HW + RET - .02, 1.16, retMidZ);
  mathaGlowPlane.rotation.y = -Math.PI / 2;
  matha.add(mathaGlowPlane);

  /* the light lives in `inside`, not in the toggled group: a light that
     appears and disappears recompiles every material in view */
  const passLight = new THREE.PointLight(0xf0b878, 0, 5.5, 2);
  passLight.position.set(PASS_HW + .75, 1.55, PASS_END + TURN / 2);
  inside.add(passLight);
  /* two wall lamps flank the Matha's door, set into the far wall */
  const mathaLamps = [];
  for (const sx of [-2.5, 2.5]) {
    const dl = bracketLamp({ scale: 1.05, intensity: 1.7, distance: 4.5, light: !ctx.isMobile });   // on a phone the door's own light carries the Matha
    dl.position.set(sx, 1.55, -35.22);
    matha.add(dl);
    mathaLamps.push(dl);
    hoistLight(dl, inside);   // as above: the Matha group is shown late, its lights are always counted
  }
  const mathaLight = new THREE.PointLight(0xf0b878, 0, 7, 2);
  mathaLight.position.set(0, 1.7, -34.4);
  inside.add(mathaLight);

  /* interior base light: a cool sky term and a warm floor bounce, so the
     lamps colour the room without owning it */
  const hemiIn = new THREE.HemisphereLight(0x8c8a84, 0x2a1e14, .42);
  inside.add(hemiIn);
  // the study window: a soft daylight shaft over the desk (parts 3–5)
  const shaft = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 4.6),
    new THREE.MeshBasicMaterial({
      map: tex((() => {
        const [c, x] = canvas(128, 256);
        const grd = x.createLinearGradient(0, 0, 128, 0);
        grd.addColorStop(0, 'rgba(170,160,138,0)'); grd.addColorStop(.5, 'rgba(170,160,138,.5)'); grd.addColorStop(1, 'rgba(170,160,138,0)');
        x.fillStyle = grd; x.fillRect(0, 0, 128, 256);
        const g2 = x.createLinearGradient(0, 0, 0, 256);
        g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,.9)');
        x.globalCompositeOperation = 'destination-out';
        x.fillStyle = g2; x.fillRect(0, 0, 128, 256);
        return c;
      })()), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }));
  shaft.position.set(-2.8, 1.9, -31.4);
  shaft.rotation.set(0, .7, -.55);
  inside.add(shaft);
  const studyLight = new THREE.DirectionalLight(0xc4b394, 0);
  studyLight.position.set(-5, 6, -28);
  studyLight.target.position.set(-2.5, 0, -32);
  inside.add(studyLight, studyLight.target);
  // Kumbakonam's cooler structural counterweight
  const coolIn = new THREE.DirectionalLight(0x5a6a80, 0);
  coolIn.position.set(4, 7, -26);
  inside.add(coolIn);

  /* dust motes in the light */
  const dustN = ctx.isMobile ? 40 : 90;
  const dpos = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) {
    dpos[i * 3] = (rnd() - .5) * 7;
    dpos[i * 3 + 1] = .2 + rnd() * 2.4;
    dpos[i * 3 + 2] = -26.5 - rnd() * 8;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0xc0b090, size: .028, transparent: true, opacity: .3,
    map: glowTexture('rgba(220,200,160,1)', 'rgba(220,200,160,0)'),
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  inside.add(dust);

  /* ================= the camera =================
     Two authored tracks with one cut between them, hidden while the dark
     doorway fills the frame. The path only ever moves forward. */
  /* The chapter opens the way the previous one closed: facing its subject,
     with morning light and mist in the frame. The Brindavana view dissolved
     into light; this resolves out of the same light onto the house, from a
     matching three-quarter composition — the subject right of centre, the
     copy's column open on the left. Memory replacing the present. A phone
     stands further back so the whole facade holds inside a 9:16 frame. */
  const portrait = () => window.innerWidth < window.innerHeight * .8;
  /* The arrival is a walk, not a reveal: it opens across the village tank
     in mist (water low in the frame, the house a pale form beyond it,
     palms on the near bund), follows the east bund toward the lane, turns
     in at the gate, crosses the yard past the tulasi kaṭṭe, and reaches
     the threshold. The cover copy lives u .19–.9 (purva.js COVER), so the
     house is framed three-quarter, right of centre, for all of it. */
  const camOutWide = camTrack([
    { u: 0, pos: V3(2.3, 1.95, 31.0), look: V3(-.9, 2.6, 0), fov: 40 },      // across the water, in mist, the house ahead
    { u: .28, pos: V3(2.2, 1.9, 23.5), look: V3(-1.0, 2.2, 0), fov: 40 },    // the light clears: the steps to the water at the left
    { u: .45, pos: V3(2.1, 1.9, 18.5), look: V3(-1.1, 2.0, 0), fov: 40 },    // along the bund
    { u: .62, pos: V3(1.9, 1.95, 13.6), look: V3(-1.0, 2.0, .5), fov: 40 },  // the lane: wall, gate, the house beyond
    { u: .80, pos: V3(.6, 1.6, 10.2), look: V3(-.1, 1.7, .6), fov: 41 },     // in at the gate
    { u: .92, pos: V3(.3, 1.42, 4.6), look: V3(0, 1.35, .4), fov: 42 },      // the yard, the kolam
    { u: 1, pos: V3(0, 1.25, .96), look: V3(0, 1.22, .4), fov: 43 },         // the threshold: now we enter
  ]);
  /* a phone stands further back and looks a little higher: the house and
     its roofline hold the upper half of a 9:16 frame, the copy the lower */
  const camOutTall = camTrack([
    { u: 0, pos: V3(2.4, 2.3, 36.0), look: V3(-.4, 3.3, 0), fov: 41 },
    { u: .28, pos: V3(2.3, 2.2, 27.0), look: V3(-.5, 3.0, 0), fov: 40 },
    { u: .45, pos: V3(2.2, 2.2, 21.0), look: V3(-.4, 2.7, 0), fov: 40 },
    { u: .62, pos: V3(2.0, 2.4, 16.0), look: V3(-.3, 2.4, .5), fov: 40 },
    { u: .80, pos: V3(.5, 1.7, 10.8), look: V3(-.1, 2.0, .6), fov: 41 },
    { u: .92, pos: V3(.3, 1.45, 5.0), look: V3(0, 1.45, .4), fov: 42 },
    { u: 1, pos: V3(0, 1.25, 1.1), look: V3(0, 1.22, .4), fov: 43 },
  ]);
  const camOut = (u) => (portrait() ? camOutTall : camOutWide)(u);
  /* The Akṣarābhyāsa is held: the camera settles above the written sand
     and STAYS there through the whole telling (setup, the question, the
     astonishment — purva.js BEATS, t .128–.186) before it pulls back to
     the years of study. u here is (v − V_DOOR)/(1 − V_DOOR). */
  const camInWide = camTrack([
    { u: 0, pos: V3(0, 1.62, -26.0), look: V3(0, 1.0, -30.4), fov: 44 },     // the room: window light left, the dais ahead
    { u: .022, pos: V3(-.1, 1.5, -27.4), look: V3(-.3, .55, -30.3), fov: 42 }, // moving toward the written surface
    { u: .045, pos: V3(-.25, 1.34, -28.6), look: V3(-.56, .32, -30.45), fov: 40 }, // above the ॐ, the tray right of the column:
    { u: .37, pos: V3(-.2, 1.31, -28.7), look: V3(-.54, .3, -30.45), fov: 40 },    //   held through the whole telling, a drift of centimetres
    { u: .46, pos: V3(1.1, 1.5, -27.9), look: V3(-1.0, .8, -31.7), fov: 44 },  // the pull back reveals the study
    { u: .52, pos: V3(1.15, 1.5, -27.95), look: V3(-1.0, .8, -31.7), fov: 44 },
    { u: .64, pos: V3(-.95, 1.55, -27.6), look: V3(.5, .8, -31.6), fov: 44 },  // across to the household: a slow pan, the room stays in frame
    { u: .70, pos: V3(-1.05, 1.55, -27.7), look: V3(.6, .8, -31.6), fov: 44 },
    /* The chapter used to end square-on to the lit doorway, which emptied
       the frame of everything except a glowing rectangle for three
       viewports — a portal, and nothing to read. The study stays in shot
       instead: the manuscripts and the working room in the foreground, the
       Matha door standing open past them. It is a place, not a passage. */
    /* the chapter ends by WALKING to the Matha's door and through it: the
       next chapter opens just inside that doorway, still moving forward
       (interior.js cam04), behind a wash of the door's own light */
    { u: .82, pos: V3(.4, 1.5, -29.6), look: V3(-.9, 1.3, -34.6), fov: 46 },   // the door stands right of the column
    { u: .93, pos: V3(.15, 1.48, -32.4), look: V3(-.45, 1.38, -35.4), fov: 46 },
    { u: 1, pos: V3(0, 1.46, -34.9), look: V3(0, 1.42, -37), fov: 46 },        // at the threshold of the Matha
  ]);
  /* portrait: the copy owns the lower third of a phone's frame, so every
     subject here is held in the upper half — the camera stands lower and
     looks further down, and the sand sits above the frame's middle */
  const camInTall = camTrack([
    { u: 0, pos: V3(0, 1.55, -26.0), look: V3(0, .7, -30.4), fov: 44 },
    { u: .022, pos: V3(0, 1.42, -27.3), look: V3(0, .3, -30.4), fov: 42 },
    { u: .045, pos: V3(-.05, 1.3, -28.75), look: V3(.05, -.05, -30.65), fov: 40 },
    { u: .37, pos: V3(0, 1.28, -28.85), look: V3(.06, -.06, -30.65), fov: 40 },
    { u: .46, pos: V3(1.0, 1.9, -27.6), look: V3(-1.0, 1.85, -31.7), fov: 44 },
    { u: .52, pos: V3(1.05, 1.9, -27.65), look: V3(-1.0, 1.85, -31.7), fov: 44 },
    { u: .64, pos: V3(-.9, 1.9, -27.3), look: V3(.5, 1.85, -31.6), fov: 44 },
    { u: .70, pos: V3(-1.0, 1.9, -27.4), look: V3(.6, 1.85, -31.6), fov: 44 },
    { u: .82, pos: V3(.4, 1.55, -29.4), look: V3(-.25, .9, -34.4), fov: 46 },   // MEASURED: a phone's narrow frame lost the door when the gaze led it by a metre; it is held centred above the copy's band now
    { u: .93, pos: V3(.15, 1.5, -32.4), look: V3(-.4, .95, -35.4), fov: 46 },
    { u: 1, pos: V3(0, 1.46, -34.9), look: V3(0, 1.42, -37), fov: 46 },
  ]);
  const camIn = (u) => (portrait() ? camInTall : camInWide)(u);
  let worldMode = 'auto';
  const chSpan = [(T1 - T0), (T2 - T1), (T3 - T2)].map(s => s / (T3 - T0));

  return {
    group: g,
    ready,
    setVisible(v) { g.visible = v; },
    /* 'out' | 'in' | 'auto': the boot prewarm compiles the yard's and the
       house's light sets separately (and each with its neighbouring stage),
       because the two are never in the scene together */
    setWorld(mode) {
      worldMode = mode;
      if (mode === 'out') { outside.visible = true; inside.visible = false; }
      if (mode === 'in') { outside.visible = false; inside.visible = true; }
    },
    /* by band progress v (0 the yard, V_DOOR the threshold, 1 the last room):
       the chapters drive the house from their own scroll (movements.js) */
    camV(p) { const v = V_BAND0 + clamp01(p) * (1 - V_BAND0); return v < V_DOOR ? camOut(v / V_DOOR) : camIn((v - V_DOOR) / (1 - V_DOOR)); },
    updateV(time, p) { return this.update(time, T0 + (V_BAND0 + clamp01(p) * (1 - V_BAND0)) * (T3 - T0)); },
    cam(chapter, u) {
      const v = chapter === 1 ? u * chSpan[0]
        : chapter === 2 ? chSpan[0] + u * chSpan[1]
        : chSpan[0] + chSpan[1] + u * chSpan[2];
      return v < V_DOOR ? camOut(v / V_DOOR) : camIn((v - V_DOOR) / (1 - V_DOOR));
    },
    update(time, t) {
      const v = tToV(t);
      const out = v < V_DOOR + .02;
      const inn = v > V_DOOR - .05;
      if (worldMode === 'auto') { outside.visible = out; inside.visible = inn; }

      if (out) {
        /* the door stands closed while the exterior is read; it swings
           inward as the visitor reaches the threshold, and the lamp's glow
           follows the opening — nothing inside shows past a closed door */
        const doorOpen = smooth(remap(v, .186, .222));
        doorPivot.rotation.y = doorOpen * 1.92;
        doorFlame.userData.flicker(time);
        doorFlame.userData.setOn(doorOpen);
        for (let i = 0; i < nicheLamps.length; i++) { nicheLamps[i].userData.flicker(time + i * 3.1); nicheLamps[i].userData.setOn(1); }
        doorLight.intensity = 4.4 * doorOpen * (.9 + Math.sin(time * 8.2) * .1);   // the room reads as lit from the threshold
        spillNear.material.opacity = .5 * doorOpen;
        spillFar.material.opacity = .4 * doorOpen;
        /* the mist the chapter opens inside — dense while the previous
           chapter's light is still in the frame, thinning as the yard is
           read, gone before the threshold */
        const mist = 1 - smooth(remap(v, .02, .10));
        haze.material.opacity = .3 * (1 - smooth(remap(v, .14, .22))) + .4 * mist;
        haze2.material.opacity = .55 * mist + .10 * (1 - smooth(remap(v, .10, .20)));
        haze3.material.opacity = .6 * (1 - smooth(remap(v, .0, .07)));
        const fogD = .0085 * (1 + mist * 2.2);
        for (const c of cards) { const u = c.material.uniforms; u.uTime.value = time; u.uFogD.value = fogD; u.uSway.value = ctx.reduced ? .1 : 1; }
        for (const gs of grass) { const u = gs.material.uniforms; u.uTime.value = time; u.uSway.value = ctx.reduced ? .2 : 1; u.uFogD.value = fogD; }
        settlement.update(time, mist);
        if (!ctx.reduced) {
          for (let i = 0; i < wind.length; i++) {
            const w = wind[i];
            const k = Math.sin(time * w.sp + w.p) * w.a;
            if (w.x) w.m.rotation.x = w.r + k; else w.m.rotation.z = w.r + k;
          }
        }
      }

      if (inn) {
        /* the akṣarābhyāsa: light narrows onto the surface for the question,
           then breathes open again for the answer */
        const qDim = win(t, .155, .161, .174, .180);
        hemiIn.intensity = .42 * (1 - qDim * .5);
        dayLight.intensity = 1.15 * (1 - qDim * .55);
        floorShaft.material.opacity = .5 * (1 - qDim * .5);
        omFlame.userData.flicker(time);
        omLight.intensity = (4.2 + qDim * 2.4) * (.92 + Math.sin(time * 8.6) * .07);
        wallLamp.userData.flicker(time + 4.1);

        /* education: the ceremony is put away, the father's seat stays empty,
           the light becomes a study light */
        const study = smooth(remap(t, .186, .205));
        decor.visible = study < .4;                      // the decorations are put away
        matFather.material.opacity = 1 - study;          // the father's seat, left empty
        matFather.visible = study < .98;
        shaft.material.opacity = (.16 + .34 * study) * (1 - smooth(remap(t, .27, .29)) * .5);
        studyLight.intensity = .9 * study;

        /* manuscripts multiply through the parts */
        const nStudy = smooth(remap(t, .186, .21));
        const nStudents = smooth(remap(t, .214, .232));
        const nOrder = smooth(remap(t, .236, .262));
        setBundles(Math.floor(3 + nStudy * 21 + nStudents * 20 + nOrder * (MS_N - 44)));
        shelves.visible = nOrder > .02;

        /* household */
        const home = smooth(remap(t, .204, .218));
        household.visible = home > .02;
        lamp2.userData.flicker(time + 2.2);
        lamp2.userData.setOn(home);

        /* Kumbhakonam: ordered, brighter, and the Matha doorway opens */
        const kmb = smooth(remap(t, .232, .252));
        shelfLight.intensity = 3.5 * kmb;
        coolIn.intensity = .55 * kmb;
        hemiIn.intensity += .22 * kmb;
        for (let i = 0; i < mathaLamps.length; i++) {
          mathaLamps[i].userData.flicker(time + i * 2.7);
          mathaLamps[i].userData.setOn(.28 + .72 * kmb);   // a lit house; brighter for the Matha
        }
        const arrive = smooth(remap(t, .262, .292));
        mathaLight.intensity = 5 * kmb * (.9 + arrive * .6);
        /* the far end of the passage brightens as the camera walks into it */
        /* the passage is never black: a little light round its corner from
           the start, and Kumbakonam turns it up */
        passLight.intensity = .9 + 4.2 * kmb * (.55 + arrive * .9);
        mathaGlowPlane.material.opacity = .12 + .5 * kmb * (.5 + arrive * .5);

        if (!ctx.reduced) {
          const p = dust.geometry.attributes.position;
          for (let i = 0; i < dustN; i++) {
            p.setY(i, .2 + ((p.getY(i) - .2 + .0005) % 2.4));
          }
          p.needsUpdate = true;
        }
      }
    },
  };
}
