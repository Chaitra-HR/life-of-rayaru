// RAYARA ANTARANGA · the night's foreground, on the bank
//
// What kage keeps at the front of its scene: a low wall with a gateway,
// one lantern lit inside it, grass and a tree, all of it nearly black
// against the night. Here it is a compound wall of dark stone with a tiled
// coping, a gateway with its own small roof, one deepa burning in the
// opening, reeds and grass along the foot, and a river tree at the end of
// the wall. A silhouette with one light in it, not a lit building. Shown
// only while the chapters are read (river.js docNight).
import * as THREE from 'three';
import { stoneCanvas, tex, deepaLamp, glowSprite } from '../util.js';
import { tileCanvas, hipRoofGeometry } from './bhuvanagiri.js';
import { grassCutout, grassSheet } from './opening.js';
import { cardMaterial, riverTreeTexture, reedTexture, card } from './vegetation.js';

export function buildForeground(ctx, { fogC } = {}) {
  const G = new THREE.Group();
  const sh = (m) => { m.castShadow = !ctx.isMobile; m.receiveShadow = !ctx.isMobile; return m; };
  const box = (w, h, d, mat, x, y, z) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)); m.position.set(x, y, z); G.add(m); return m; };

  /* dark stone: laterite gone black in the night, the tile a shade warmer */
  const stone = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(256, [46, 42, 38], 9, 47), { repeat: [6, 1] }), roughness: 1 });
  const post  = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(128, [52, 47, 42], 10, 61), { repeat: [1, 2] }), roughness: 1 });
  const tile  = new THREE.MeshStandardMaterial({ map: tex(tileCanvas(5), { repeat: [4, 1] }), color: 0x5a4438, roughness: 1, side: THREE.DoubleSide });
  const earth = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(256, [40, 36, 30], 10, 71), { repeat: [3, 3] }), roughness: 1 });

  /* the ground it stands on */
  const mound = sh(new THREE.Mesh(new THREE.CylinderGeometry(11, 13, .6, 28), earth));
  mound.position.set(0, -.3, -1.2); G.add(mound);

  /* ---- the wall: fourteen units of it, receding, with a tiled coping ---- */
  const WALL_L = 14, WALL_H = 1.9;
  box(WALL_L, WALL_H, .6, stone, 0, WALL_H / 2, 0);
  box(WALL_L + .3, .12, .8, stone, 0, WALL_H + .06, 0);                        // the string course
  const coping = sh(new THREE.Mesh(hipRoofGeometry(WALL_L + .5, 1.1, .34, .15), tile));
  coping.position.set(0, WALL_H + .12, 0); G.add(coping);

  /* ---- the gateway: two posts, a lintel, a small roof, and the deepa ---- */
  const GX = 2.8, GW = 1.5, GH = 2.7;
  // the wall gives way to the gate
  const cut = sh(new THREE.Mesh(new THREE.BoxGeometry(GW + .9, WALL_H + .6, .9), new THREE.MeshStandardMaterial({ color: 0x07080a, roughness: 1 })));
  cut.position.set(GX, (WALL_H + .6) / 2 - .05, 0); G.add(cut);
  for (const sx of [-1, 1]) box(.42, GH, .7, post, GX + sx * (GW / 2 + .21), GH / 2, 0);
  box(GW + 1.1, .3, .8, post, GX, GH + .15, 0);                                  // the lintel
  const gateRoof = sh(new THREE.Mesh(hipRoofGeometry(3.2, 2.0, .75, .35), tile));
  gateRoof.position.set(GX, GH + .3, 0); G.add(gateRoof);
  box(2.4, .18, 1.4, stone, GX, .09, .5);                                        // the threshold
  const lamp = deepaLamp({ scale: .62, light: true, intensity: 3.2, distance: 9, wicks: 1, flameScale: .55 });
  lamp.position.set(GX, .18, .05); G.add(lamp);
  /* the lantern's warmth in the opening, readable from across the water */
  const gateGlow = glowSprite(0xffb46a, 2.2, 0);
  gateGlow.position.set(GX, 1.3, .1); gateGlow.renderOrder = 6; G.add(gateGlow);

  /* ---- reeds and grass along the foot of the wall, and a river tree at its end ---- */
  const reedM = cardMaterial(reedTexture(91), fogC, { tint: .22, sway: .8 });
  const reeds = [card(reedM, 2.4, 1.9, -4.2, .6, 1.3, .1), card(reedM, 2.0, 1.6, 5.4, .5, 1.5, -.15), card(reedM, 1.8, 1.5, -1.0, .5, 1.6, .05)];
  for (const r of reeds) G.add(r);
  const grass = [
    grassSheet(grassCutout(131, { crest: .5, peak: .40, wide: .6, blades: 6000, len: 26, warm: .0, day: false, rough: .7 }), 12, 2.2, fogC),
    grassSheet(grassCutout(137, { crest: .45, peak: .36, wide: .55, blades: 5000, len: 24, warm: .0, day: false, rough: .7 }), 10, 1.9, fogC),
  ];
  grass[0].position.set(2.0, .7, 2.4); grass[0].rotation.y = -.15;
  grass[1].position.set(-5.5, .6, 2.0); grass[1].rotation.y = .12;
  for (const gr of grass) { gr.material.uniforms.uTint.value = .2; gr.renderOrder = 4; G.add(gr); }
  const treeM = cardMaterial(riverTreeTexture(53), fogC, { tint: .18, sway: .5 });
  const tree = card(treeM, 7.5, 8.5, -8.6, 3.6, -.4, .08);
  G.add(tree);

  const setNight = (n, time = 0, fogD = .006) => {
    lamp.userData.on = n;
    const f = lamp.userData.flicker ? lamp.userData.flicker(time) : 1;
    gateGlow.material.opacity = (.42 + .08 * (f || 0)) * n;
    for (const gr of grass) { const u = gr.material.uniforms; u.uTime.value = time; u.uFogD.value = fogD; u.uFade.value = n; }
    for (const c of [...reeds, tree]) { const u = c.material.uniforms; if (u) { if (u.uTime) u.uTime.value = time; if (u.uFogD) u.uFogD.value = fogD; if (u.uFade) u.uFade.value = n; } }
  };
  return { group: G, setNight };
}
