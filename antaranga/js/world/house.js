// RAYARA ANTARANGA · the house front, at night, on the bank
//
// The Bhuvanagiri house of the retired Pūrvāśrama chapter, BUILT the same
// way it was there (purvashrama.js): a laterite plinth, lime over mud brick
// with an oxide dado, the door, two barred windows, two niches with clay
// lamps, four turned teak pillars under an eave beam and rafters, a hipped
// tile roof. Here it stands at the left foreground of the river at night
// while the chapters are read, the way kage keeps a gate and a wall in the
// foreground of its scene: an entrance, lit from inside, and grass in
// front of it. Nothing photographed; the same drafted register as the rest.
import * as THREE from 'three';
import { stoneCanvas, tex, clayLamp, glowSprite } from '../util.js';
import { tileCanvas, limeCanvas, hipRoofGeometry } from './bhuvanagiri.js';
import { grassCutout, grassSheet } from './opening.js';

export function buildHouse(ctx, { fogC } = {}) {
  const H = new THREE.Group();
  const sh = (m) => { m.castShadow = !ctx.isMobile; m.receiveShadow = !ctx.isMobile; return m; };
  const box = (w, h, d, mat, x, y, z) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)); m.position.set(x, y, z); H.add(m); return m; };

  const lime     = new THREE.MeshStandardMaterial({ map: tex(limeCanvas(9, { damp: .35, tone: [192, 184, 166] }), { repeat: [3, 1] }), roughness: 1 });
  const limeSide = new THREE.MeshStandardMaterial({ map: tex(limeCanvas(11, { damp: .5, tone: [186, 178, 160] }), { repeat: [2, 1] }), roughness: 1 });
  const oxide    = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(256, [150, 76, 54], 9, 45), { repeat: [4, 1] }), roughness: .8 });
  const laterite = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(256, [112, 108, 100], 10, 47), { repeat: [4, 1] }), roughness: 1 });
  const teak     = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(128, [72, 48, 30], 14, 61), { repeat: [1, 3] }), roughness: .85 });
  const teakEnd  = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(128, [72, 48, 30], 14, 61), { repeat: [3, 1] }), roughness: .85 });
  const dark     = new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 1 });
  const tile     = new THREE.MeshStandardMaterial({ map: tex(tileCanvas(5), { repeat: [1, 1] }), color: 0xdcc0aa, roughness: 1, side: THREE.DoubleSide });
  const clay     = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(128, [168, 96, 62], 10, 53)), roughness: .9 });
  const earth    = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(256, [78, 66, 50], 12, 71), { repeat: [3, 3] }), roughness: 1 });

  /* the ground it stands on: a low earthen rise, so it never floats */
  const mound = sh(new THREE.Mesh(new THREE.CylinderGeometry(9.5, 11, .7, 28), earth));
  mound.position.set(0, -.35, -.6); H.add(mound);

  /* ---- plinth: two courses of laterite, the upper one the verandah floor ---- */
  const FLOOR = .485;
  box(8.4, .22, 6.1, laterite, 0, .11, -1.0);
  box(8.0, FLOOR - .22, 5.9, laterite, 0, .22 + (FLOOR - .22) / 2, -1.05);
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
  box(3.5 - DOOR_HW, WH, .30, lime, -(DOOR_HW + (3.5 - DOOR_HW) / 2), WY, WALL_Z - .15);
  box(3.5 - DOOR_HW, WH, .30, lime,  (DOOR_HW + (3.5 - DOOR_HW) / 2), WY, WALL_Z - .15);
  box(DOOR_HW * 2, WALL_TOP - DOOR_TOP, .30, lime, 0, DOOR_TOP + (WALL_TOP - DOOR_TOP) / 2, WALL_Z - .15);
  box(7.0, WH, 4.15, limeSide, 0, WY, WALL_Z - .30 - 2.075);
  for (const sx of [-1, 1]) box(3.5 - DOOR_HW, .36, .012, oxide, sx * (DOOR_HW + (3.5 - DOOR_HW) / 2), FLOOR + .18, WALL_Z + .006);
  box(.012, .36, 4.45, oxide, -3.5 - .006, FLOOR + .18, WALL_Z - 2.225);
  box(.012, .36, 4.45, oxide,  3.5 + .006, FLOOR + .18, WALL_Z - 2.225);
  /* the doorway: dark inside, and a lamp's warmth on the threshold */
  box(DOOR_HW * 2 - .04, DOOR_TOP - FLOOR, .06, dark, 0, FLOOR + (DOOR_TOP - FLOOR) / 2, WALL_Z - .34);
  const doorGlow = glowSprite(0xffb56a, 2.6, .0);
  doorGlow.position.set(0, FLOOR + .9, WALL_Z - .2); H.add(doorGlow);
  const doorLight = new THREE.PointLight(0xffa860, 0, 7, 2);
  doorLight.position.set(0, FLOOR + 1.1, WALL_Z + .3); H.add(doorLight);

  /* ---- windows: a dark recess, a teak frame, five bars ---- */
  for (const sx of [-1, 1]) {
    const wx = sx * 1.8, wy = 1.58, ww = .78, wh = .82;
    box(ww, wh, .10, dark, wx, wy, WALL_Z - .05);
    box(ww + .16, .07, .08, teakEnd, wx, wy + wh / 2 + .035, WALL_Z + .01);
    box(ww + .16, .07, .08, teakEnd, wx, wy - wh / 2 - .035, WALL_Z + .01);
    box(.07, wh + .14, .08, teak, wx - ww / 2 - .035, wy, WALL_Z + .01);
    box(.07, wh + .14, .08, teak, wx + ww / 2 + .035, wy, WALL_Z + .01);
    for (let b = -2; b <= 2; b++) box(.045, wh, .045, teak, wx + b * (ww / 5), wy, WALL_Z - .01);
    box(ww + .24, .05, .16, laterite, wx, wy - wh / 2 - .095, WALL_Z + .04);
  }

  /* ---- niches: a pointed arch in oxide, a lamp inside ---- */
  const lamps = [];
  for (const sx of [-1, 1]) {
    const nx = sx * .78, ny = 1.30;
    box(.34, .46, .12, dark, nx, ny, WALL_Z - .06);
    const arch = new THREE.Shape();
    arch.moveTo(-.22, -.27); arch.lineTo(.22, -.27); arch.lineTo(.22, .10); arch.lineTo(0, .34); arch.lineTo(-.22, .10); arch.closePath();
    const hole = new THREE.Path();
    hole.moveTo(-.16, -.22); hole.lineTo(.16, -.22); hole.lineTo(.16, .08); hole.lineTo(0, .26); hole.lineTo(-.16, .08); hole.closePath();
    arch.holes.push(hole);
    const frame = sh(new THREE.Mesh(new THREE.ExtrudeGeometry(arch, { depth: .05, bevelEnabled: false }), clay));
    frame.position.set(nx, ny, WALL_Z + .002); H.add(frame);
    const lamp = clayLamp({ scale: .55, light: true, intensity: 1.6, distance: 4, flameScale: .28 });
    lamp.position.set(nx, ny - .22, WALL_Z - .04); H.add(lamp);
    lamps.push(lamp);
  }

  /* ---- the verandah: four turned pillars on plinths, the beam, the rafters ---- */
  const PIL_Z = 1.5, BEAM_Y = 2.82;
  const profile = [];
  const P = (r, y) => profile.push(new THREE.Vector2(r, y));
  P(.16, 0); P(.17, .05); P(.14, .10); P(.175, .16); P(.165, .22); P(.10, .30); P(.115, .40);
  P(.115, 1.30); P(.10, 1.40); P(.165, 1.50); P(.14, 1.58); P(.185, 1.66); P(.19, 1.74);
  const pillarGeo = new THREE.LatheGeometry(profile, 18);
  for (const px of [-3.05, -1.15, 1.15, 3.05]) {
    box(.40, .24, .40, laterite, px, FLOOR + .12, PIL_Z);
    const pil = sh(new THREE.Mesh(pillarGeo, teak));
    pil.position.set(px, FLOOR + .24, PIL_Z); H.add(pil);
    box(.40, .12, .40, teak, px, FLOOR + .24 + 1.74 + .06, PIL_Z);
  }
  box(7.4, .20, .30, teakEnd, 0, BEAM_Y + .10, PIL_Z);
  const EAVE_Z = 2.48;
  box(8.2, .22, .06, teakEnd, 0, BEAM_Y + .30, EAVE_Z);
  for (let x = -4.0; x <= 4.0; x += .485) box(.09, .12, EAVE_Z - WALL_Z, teak, x, BEAM_Y + .26, (WALL_Z + EAVE_Z) / 2);
  box(8.2, .02, EAVE_Z - WALL_Z - .04, dark, 0, BEAM_Y + .34, (WALL_Z + EAVE_Z) / 2);

  /* ---- the roof: hipped, tiled in courses ---- */
  const ROOF_Y = BEAM_Y + .36, ROOF_W = 8.0, ROOF_D = 5.4, ROOF_H = 1.7, OVER = .7;
  const roof = sh(new THREE.Mesh(hipRoofGeometry(ROOF_W, ROOF_D, ROOF_H, OVER), tile));
  roof.position.set(0, ROOF_Y, EAVE_Z - ROOF_D / 2 - OVER);
  H.add(roof);
  const ridgeZ = roof.position.z;
  box(2.6, .16, .12, clay, 0, ROOF_Y + ROOF_H + .06, ridgeZ);
  for (const fx of [-1.2, -.4, .4, 1.2]) {
    const fin = new THREE.Group(); fin.position.set(fx, ROOF_Y + ROOF_H + .14, ridgeZ);
    const pot = sh(new THREE.Mesh(new THREE.SphereGeometry(.10, 10, 8), clay)); pot.position.y = .10;
    const spike = sh(new THREE.Mesh(new THREE.ConeGeometry(.05, .18, 8), clay)); spike.position.y = .27;
    fin.add(pot, spike); H.add(fin);
  }

  /* ---- grass in front, along the bottom of the frame ---- */
  const grass = [
    grassSheet(grassCutout(131, { crest: .5, peak: .40, wide: .6, blades: 6000, len: 26, warm: .1, day: false, rough: .7 }), 12, 2.4, fogC),
    grassSheet(grassCutout(137, { crest: .45, peak: .36, wide: .55, blades: 5000, len: 24, warm: .1, day: false, rough: .7 }), 10, 2.0, fogC),
  ];
  grass[0].position.set(3.5, .9, 5.2); grass[0].rotation.y = -.25;
  grass[1].position.set(-4.5, .8, 4.6); grass[1].rotation.y = .2;
  for (const gr of grass) { gr.material.uniforms.uTint.value = .3; gr.renderOrder = 4; H.add(gr); }

  /* the flames and the lights follow the night */
  const setNight = (n, time = 0, fogD = .006) => {
    for (const l of lamps) { l.userData.on = n; if (l.userData.flicker) l.userData.flicker(time); }
    doorGlow.material.opacity = .34 * n;
    doorLight.intensity = 2.2 * n;
    for (const gr of grass) { const u = gr.material.uniforms; u.uTime.value = time; u.uFogD.value = fogD; u.uFade.value = n; }
  };
  return { group: H, setNight, grass };
}
