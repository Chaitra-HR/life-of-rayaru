// ANTARANGA · the hero — Mantralaya on the Tungabhadra at first light.
// Three depth layers: the river in the foreground running on past the
// camera, the gateway and Brindavana on a stone landing that grows out of
// the right bank, and a broad low far bank under an immense dawn sky.
// Environment systems live in their own modules (clouds, birds, vegetation).
// THE BRINDAVANA IS A LOCKED ASSET — only its staging is touched here.
import * as THREE from 'three';
import { mulberry, fbm, flame, glowSprite, smooth, mergeStatic } from '../util.js';
import { stoneMaterial, boxUV, shadowed, loadArch, grassCutout, grassSheet } from './opening.js';
import { createClouds } from './clouds.js';
import { createBirds } from './birds.js';
import { cardMaterial, farBankTexture, card, reedTexture } from './vegetation.js';
import { loadRuins, placeRuins } from './ruins.js';
import { makeTree, makePalm, makeShrub, makeBanana, setTreeTime, billboard, faceCamera } from './trees.js';
import { buildThreshold } from './threshold.js';

export const APPROACH_ROT = 0;
export const BRND = { x: 11.4, z: 2, scale: 1.15 };
export const GATE = { x: 8.6, z: 15, rot: -.50, h: 11.5 };
// the whole sacred group faces ~17° left of the camera axis, toward the copy
export const SACRED_ROT = -.50;
export const STYLED = { fog: true, bloom: false, rays: false, linear: false };
export function approachToWorld(brndPos, x, y, z) {
  return new THREE.Vector3(brndPos.x + x - BRND.x, y, brndPos.z + z - BRND.z);
}

/* ----------------------------------------------------------------------
   Geography. The river fills the foreground and the left; the right bank
   carries the landing and curves away behind it; a low far bank closes the
   horizon; a small promontory sits far off to the left. Shorelines wander.
   ---------------------------------------------------------------------- */
const WATER = -.9;
export function rightShore(z) {                            // x of the right bank's waterline
  return 3.2 + 7.5 * THREE.MathUtils.clamp(-z / 70, 0, 1) + 3.2 * (fbm(z * .045 + 4.2, 0, 3) - .5) + 1.1 * (fbm(z * .16 + 9.1, 1, 2) - .5)
    + .8 * (fbm(z * .34 + 6.4, 2, 2) - .5)                 // small-scale nibbling at the waterline
    + 2.2 * Math.exp(-Math.pow((z - 30) / 14, 2));         // the bank eases back toward the camera
}
export function groundHeight(px, pz, seed = 7) {
  let h = WATER;
  const dR = px - rightShore(pz);                          // the right bank
  const riseR = THREE.MathUtils.smoothstep(dR, -.4, 3.6);
  h = Math.max(h, WATER + riseR * 1.85
    + riseR * 1.0 * (fbm(px * .1, pz * .09 + seed, 4) - .5)             // broad undulation
    + riseR * .45 * (fbm(px * .24 + 3.1, pz * .22 + seed * 2, 3) - .5)); // hummocks and hollows — never a flat plane
  const dF = -75 - pz + 6 * (fbm(px * .02 + seed, 0, 3) - .5);   // the far bank across the horizon
  const riseF = THREE.MathUtils.smoothstep(dF, -2, 9);
  h = Math.max(h, WATER + riseF * 1.6 + riseF * .5 * (fbm(px * .05, pz * .05, 3) - .5));
  const dL = (-26 - px) * .6 + (-22 - pz) * .8 + 5 * (fbm(pz * .05 + 2, px * .05, 3) - .5);   // a low promontory far left
  const riseL = THREE.MathUtils.smoothstep(dL, 0, 9);
  h = Math.max(h, WATER + riseL * 1.4);
  // the near bank: ONE irregular landform, not a strip. Its shoreline is a
  // real curve — the bank sweeps in from the lower right and joins the right
  // bank upstream, a grassy point pushes out left of centre, and a shallow
  // bay bites in mid-frame so the water between bank and platform reads as
  // a deliberate inlet, not an accidental dark band.
  const shoreZ = 36.2
    - THREE.MathUtils.smoothstep(px, 2, 16) * 5.5
    - 2.2 * Math.exp(-Math.pow((px + 5.5) / 3.2, 2))
    + 2.6 * Math.exp(-Math.pow((px - 3.5) / 3.0, 2))
    + 1.8 * (fbm(px * .13 + 8.1, 0, 3) - .5);
  const dN = pz - shoreZ;
  const riseN = THREE.MathUtils.smoothstep(dN, -1.6, 6.0);
  h = Math.max(h, WATER + riseN * (1.45 + .45 * (fbm(px * .12, pz * .12 + seed, 3) - .5))
    + riseN * .12 * Math.exp(-Math.pow((pz - 40.5) / 2.6, 2)));
  // erosion detail where land meets water: nibbled hollows and low humps
  const ez = Math.exp(-Math.pow((h - WATER - .32) / .42, 2));
  h += ez * .30 * (fbm(px * .5 + 7.7, pz * .5 + seed, 3) - .5);
  if (px > 3.4 && px < 12.5 && pz > 17 && pz < 30) h = Math.min(h, -.55);   // the inlet under the steps
  // two low mud hummocks breaking the surface — the reed beds grow out of
  // these, never out of open water. Their outline wanders; a smooth cone
  // reads as a prop
  const wob = 1 + .35 * (fbm(px * .9 + 2.2, pz * .9, 2) - .5);
  const dI = Math.hypot(px - 14.6, pz - 22.5) * wob;
  h = Math.max(h, WATER + 1.02 * (1 - THREE.MathUtils.smoothstep(dI, .5, 2.8)));
  const dJ = Math.hypot(px - 2.4, pz - 36.2) * wob;
  h = Math.max(h, WATER + 1.00 * (1 - THREE.MathUtils.smoothstep(dJ, .4, 2.5)));
  return h;
}
/* Land-proximity mask in world xz for the water shader: 1 where the bed is
   at or above the surface (banks, shallows, the platform footing), blurred
   so it reads as a few metres of shallowing, not a hard line. */
export function makeShoreMask(brndPos) {
  const X0 = -160, X1 = 120, Z0 = -140, Z1 = 70, N = 256;
  const cv = document.createElement('canvas'); cv.width = cv.height = N;
  const x = cv.getContext('2d');
  const img = x.createImageData(N, N), d = img.data;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const px = X0 + (i + .5) / N * (X1 - X0), pz = Z0 + (j + .5) / N * (Z1 - Z0);
    const v = THREE.MathUtils.smoothstep(groundHeight(px, pz, 7), -.5, .1);
    const k = (j * N + i) * 4;
    d[k] = d[k + 1] = d[k + 2] = v * 255; d[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  // the sacred platform's foundation is masonry standing in the river
  x.save();
  x.translate((BRND.x - X0) / (X1 - X0) * N, (BRND.z - Z0) / (Z1 - Z0) * N);
  x.rotate(-SACRED_ROT);
  x.scale(N / (X1 - X0), N / (Z1 - Z0));
  x.fillStyle = '#fff';
  x.fillRect(-7.0, -6.6, 17.4, 29.6);   // gate landing + the Brindavana's terrace
  x.restore();
  const cv2 = document.createElement('canvas'); cv2.width = cv2.height = N;
  const x2 = cv2.getContext('2d');
  x2.filter = 'blur(3px)'; x2.drawImage(cv, 0, 0);
  const t = new THREE.CanvasTexture(cv2);
  t.flipY = false;
  const offX = brndPos.x - BRND.x, offZ = brndPos.z - BRND.z;
  return { tex: t, rect: [X0 + offX, Z0 + offZ, 1 / (X1 - X0), 1 / (Z1 - Z0)] };
}

function terrain(seed) {
  const X0 = -160, X1 = 120, Z0 = -140, Z1 = 70, NX = 200, NZ = 180;
  const geo = new THREE.PlaneGeometry(X1 - X0, Z1 - Z0, NX, NZ);
  geo.rotateX(-Math.PI / 2);
  geo.translate((X0 + X1) / 2, 0, (Z0 + Z1) / 2);
  const pos = geo.attributes.position, col = [];
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i), pz = pos.getZ(i);
    const h = groundHeight(px, pz, seed);
    pos.setY(i, h);
    // the damp band wanders — no ruled line between water and land
    const wetEdge = .38 + .55 * (fbm(px * .19 + 5.3, pz * .19 + seed, 2) - .5);
    const wet = 1 - THREE.MathUtils.smoothstep(h - WATER, wetEdge, 1.05 + wetEdge);
    const g = .5 + (fbm(px * .25, pz * .25 + seed * 2, 3) - .5) * .6;
    const near = 1 - .18 * THREE.MathUtils.smoothstep(pz, 0, 44);
    // compacted soil and exposed earth, with broader grass cover — a bare
    // brown sheet reads as a render plane, not a bank. The near strip is
    // mostly grassed over; only a narrow trodden line stays bare.
    let patch = THREE.MathUtils.smoothstep(fbm(px * .16 + 9, pz * .16 + seed, 3), .01, .28);
    // on the near bank the grass gathers in CLUMPS with open soil between —
    // never one continuous carpet
    const nearStrip = THREE.MathUtils.smoothstep(pz, 31, 36) * THREE.MathUtils.smoothstep(h, .16, .36);
    const clumpN = THREE.MathUtils.smoothstep(fbm(px * .30 + 5.2, pz * .30 + seed * 1.7, 3), .42, .60);
    patch = Math.max(patch, nearStrip * clumpN * .95);
    // a bare mud rim at every waterline — grass never touches the water
    patch *= THREE.MathUtils.smoothstep(h - WATER, .96, 1.14);
    let r = .185 + g * .06, gg = .16 + g * .055, b = .115 + g * .045;                    // earth
    r = THREE.MathUtils.lerp(r, .112 + g * .05, patch);                                  // grassy patches — genuinely green,
    gg = THREE.MathUtils.lerp(gg, .262 + g * .12, patch);                                // not khaki, or the ground under the
    b = THREE.MathUtils.lerp(b, .088 + g * .04, patch);                                  // blades reads as bare brown
    // pale river sand in low pockets just above the waterline — never on the
    // grassed near strip, where isolated pale vertices read as white specks
    const sand = THREE.MathUtils.smoothstep(fbm(px * .085 + 2.5, pz * .085 + seed * 3, 3), .48, .70)
      * THREE.MathUtils.smoothstep(h - WATER, .10, .45) * (1 - THREE.MathUtils.smoothstep(h - WATER, .9, 1.6)) * (1 - patch) * (1 - nearStrip);
    r = THREE.MathUtils.lerp(r, .238, sand); gg = THREE.MathUtils.lerp(gg, .214, sand); b = THREE.MathUtils.lerp(b, .168, sand);
    // damp earth near the water — readable, never a black void
    r = THREE.MathUtils.lerp(r, .104, wet); gg = THREE.MathUtils.lerp(gg, .090, wet); b = THREE.MathUtils.lerp(b, .072, wet);
    // a dark wet-mud stain hugging the actual waterline (h−WATER = .9 is the
    // surface) — this line is what makes the shore read at first glance
    const stain = THREE.MathUtils.smoothstep(h - WATER, .68, .88) * (1 - THREE.MathUtils.smoothstep(h - WATER, .96, 1.22));
    r = THREE.MathUtils.lerp(r, .052, stain); gg = THREE.MathUtils.lerp(gg, .048, stain); b = THREE.MathUtils.lerp(b, .040, stain);
    // the near strip carries a faint trodden line along its crest — muted
    // compacted earth, narrow, never a broad bare band
    const path = THREE.MathUtils.smoothstep(pz, 38, 41) * THREE.MathUtils.smoothstep(h, .22, .48);
    r = THREE.MathUtils.lerp(r, .186, path * .35); gg = THREE.MathUtils.lerp(gg, .172, path * .35); b = THREE.MathUtils.lerp(b, .140, path * .35);
    // the reed hummocks are wet river mud, never dry sand
    const wob2 = 1 + .35 * (fbm(px * .9 + 2.2, pz * .9, 2) - .5);
    const hum = Math.max(
      1 - THREE.MathUtils.smoothstep(Math.hypot(px - 14.6, pz - 22.5) * wob2, .5, 3.0),
      1 - THREE.MathUtils.smoothstep(Math.hypot(px - 2.4, pz - 36.2) * wob2, .4, 2.7));
    r = THREE.MathUtils.lerp(r, .106, hum * .8); gg = THREE.MathUtils.lerp(gg, .095, hum * .8); b = THREE.MathUtils.lerp(b, .076, hum * .8);
    // the bank reads as a slope: higher ground catches the first light
    const slope = .82 + .34 * THREE.MathUtils.clamp((h - WATER) / 1.9, 0, 1);
    // tonal patchiness at two scales plus a fine grain — no two square metres alike
    const varm = .86 + .32 * (fbm(px * .07 + 11, pz * .07 + seed * 1.3, 3) - .5)
      + .14 * (fbm(px * .31 + 4.4, pz * .31 + seed, 2) - .5)
      + .10 * (fbm(px * .85 + 7.7, pz * .85 + seed * 2, 2) - .5);
    col.push(r * near * slope * varm, gg * near * slope * varm, b * near * slope * varm);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const m = shadowed(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 })));
  m.castShadow = false;
  return m;
}

/* a band of river mist lying on the water: dense low, torn along its top
   by the wind, fading to nothing at both ends, so it never reads as a
   strip laid across the frame (the straight gradient strips it replaces
   were the "horizontal bands" of 18 Sept 2026) */
function mistBandTexture(seed) {
  const W = 1024, H = 128, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d'), img = x.createImageData(W, H), d = img.data;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const u = i / W, v = j / H;
    const top = .22 + .34 * (fbm(u * 5.5 + seed * 3.1, seed, 3) + .5) + .10 * (fbm(u * 19 + seed, 2.5, 2) + .5);
    const body = THREE.MathUtils.smoothstep(v, top, top + .28) * (1 - THREE.MathUtils.smoothstep(v, .80, 1.0));
    const along = THREE.MathUtils.smoothstep(u, 0, .14) * (1 - THREE.MathUtils.smoothstep(u, .86, 1)) * (.55 + .45 * (fbm(u * 3.3 + seed * 7, 1, 2) + .5));
    const grain = .72 + .28 * (fbm(u * 26 + seed, v * 9, 3) + .5);
    const al = THREE.MathUtils.clamp(body * along * grain, 0, 1);
    const k = (j * W + i) * 4;
    d[k] = 255; d[k + 1] = 255; d[k + 2] = 255; d[k + 3] = al * 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
/* a torn, soft mist sheet for the foreground sprites */
function mistTexture(seed) {
  const W = 256, H = 128, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d'), img = x.createImageData(W, H), d = img.data;
  const rr = mulberry(400 + seed), ox = rr() * 50, oy = rr() * 50;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const u = i / W, v = j / H;
    const ell = 1 - Math.pow((u - .5) * 2.05, 2) - Math.pow((v - .5) * 2.2, 2);
    const n = fbm(u * 4 + ox, v * 5 + oy, 4) + .5;
    let al = THREE.MathUtils.clamp(ell * 1.1 + (n - .55) * 1.3, 0, 1);
    al = Math.pow(al, 1.7);
    const k = (j * W + i) * 4;
    d[k] = 224; d[k + 1] = 214; d[k + 2] = 198; d[k + 3] = al * 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createOpening(ctx, { brndPos, brnd, fogColor }) {
  const g = new THREE.Group();
  g.visible = false;
  const H = new THREE.Group();                       // the hero frame
  H.position.copy(approachToWorld(brndPos, 0, 0, 0));
  g.add(H);

  /* ---- light: first light. A pale sky dome over cool blue-grey ground
          shadow, a low warm sun from the rear right carrying the shadows, a
          soft cool fill from the front-left, and a warm grazing light that
          catches the gateway's right edges. ---- */
  const hemi = new THREE.HemisphereLight(0xbfd0e2, 0x4e4c46, 0);
  const sun = new THREE.DirectionalLight(0xffc890, 0);
  sun.position.set(-48, 12, -44);                            // low, from the left / rear-left
  sun.target.position.set(10, 1, 0);
  sun.castShadow = !ctx.isMobile;   // shadow maps are off on phones; the flag alone still cost a scene traversal
  sun.shadow.mapSize.set(ctx.isMobile ? 1024 : 2048, ctx.isMobile ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -36, right: 36, top: 30, bottom: -24, near: 10, far: 180 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = .03; sun.shadow.radius = 3;
  const fill = new THREE.DirectionalLight(0xa8bad4, 0);      // cool sky fill from the front-right
  fill.position.set(26, 22, 40);
  fill.target.position.set(10, 2, 2);
  const edge = new THREE.DirectionalLight(0xffcf9a, 0);      // grazing warmth on the sunward edges
  edge.position.set(-30, 5, 14);
  edge.target.position.set(GATE.x, 5, GATE.z);
  const amb = new THREE.AmbientLight(0x76839c, 0);
  H.add(hemi, sun, sun.target, fill, fill.target, edge, edge.target, amb);

  /* ---- materials: weathered stone, neutral roughness ---- */
  const slab = stoneMaterial(12, { base: [104, 102, 98], courses: 1, cols: 2, vary: .12, cool: .04, warm: .02, chisel: .14 }, { normal: .45, ao: .55 });
  const slabDark = stoneMaterial(63, { base: [88, 86, 83], courses: 1, cols: 2, vary: .12, cool: .04, warm: .02, chisel: .14 }, { normal: .45, ao: .55 });

  /* ---- the sacred group: gateway, Brindavana, platform and deepas share
          ONE axis, turned SACRED_ROT toward the copy. Local frame: the
          Brindavana's footprint is the origin; +z runs out the front. ---- */
  const S = new THREE.Group();
  S.position.set(BRND.x, 0, BRND.z);
  S.rotation.y = SACRED_ROT;
  H.add(S);
  const mkS = (w, h, d, mat, x, y, z) => { const m = shadowed(new THREE.Mesh(boxUV(new THREE.BoxGeometry(w, h, d), w, h, d), mat)); m.position.set(x, y, z); S.add(m); return m; };
  const GX = 2.8, GZ = 13;   // the gateway on the sacred axis, placed so the camera sees the Brindavana centred in its opening

  /* the platform's physical logic: a ring of darker submerged masonry whose
     top course just breaks the surface — the river visibly laps against
     built foundation stone, not against a floating box — then equal-width
     step courses rising cleanly to the landing */
  const slabWet = stoneMaterial(87, { base: [57, 55, 51], courses: 1, cols: 2, vary: .10, cool: .05, warm: .01, chisel: .10 }, { normal: .4, ao: .6 });
  mkS(13.6, 1.2, 5.6, slabWet, GX + .4, -.55, GZ + 7.5);         // foundation under the flight
  mkS(13.6, 1.2, 13.6, slabWet, GX + .4, -.55, GZ - 2.0);        // foundation under the landing
  mkS(12.6, 1.0, 3.4, slabDark, GX + .4, -.44, GZ + 7.4);        // level one, its foot on the foundation
  mkS(12.6, .30, .9, slab, GX + .4, .21, GZ + 6.55);             // tread against level two
  mkS(12.6, 1.2, 3.2, slab, GX + .4, -.10, GZ + 4.6);            // level two
  mkS(12.6, .30, .8, slabDark, GX + .4, .65, GZ + 3.4);          // tread against the landing
  mkS(12.6, 1.5, 12.5, slabDark, GX + .4, .03, GZ - 2.0);        // the landing the gateway stands on
  /* the Brindavana's own terrace: centred on the shrine so the floor reads
     even to its left and right on the walk through the gateway */
  mkS(13.8, 1.2, 13.8, slabWet, 0, -.55, .5);                    // its foundation in the river
  mkS(13.2, .73, 13.2, slabDark, 0, .405, .5);                   // the terrace floor
  mkS(9.4, 1.9, 9.4, slab, 0, .15, .5);                          // the Brindavana's plinth block
  mkS(10.0, .16, 10.0, slabDark, 0, 1.10, .5);                   // its worn top course

  /* ---- gateway: on the shared axis, slightly widened so the Brindavana
          keeps breathing room inside the opening ---- */
  const gate = new THREE.Group();
  gate.position.set(GX, .78, GZ);
  gate.scale.x = 1.14;
  S.add(gate);
  loadArch(gate, ctx, GATE.h).then(() => {
    const gm = new THREE.MeshStandardMaterial({ color: 0x6f6b64, roughness: .88, metalness: 0 });
    gate.traverse(o => { if (o.isMesh) o.material = gm; });
  }).catch(err => console.warn('temple arch failed to load', err));

  /* ---- Brindavana: LOCKED asset — staged upright on the shared axis ---- */
  brnd.group.rotation.y = SACRED_ROT;
  brnd.group.scale.setScalar(BRND.scale);
  brnd.group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const brndKey = new THREE.DirectionalLight(0xffd9a4, 0);
  brndKey.position.copy(approachToWorld(brndPos, BRND.x - 9, 13, BRND.z + 24));
  brndKey.target.position.copy(brndPos);
  g.add(brndKey, brndKey.target);
  /* the faint atmospheric lift behind the dark stone */
  {
    const SZ = 256, cv = document.createElement('canvas'); cv.width = cv.height = SZ;
    const cx = cv.getContext('2d');
    const grd = cx.createRadialGradient(SZ / 2, SZ / 2, 0, SZ / 2, SZ / 2, SZ / 2);
    grd.addColorStop(0, 'rgba(206,220,238,.5)'); grd.addColorStop(.55, 'rgba(196,212,232,.18)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = grd; cx.fillRect(0, 0, SZ, SZ);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(30, 18),
      new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    glow.position.set(BRND.x, 5.2, BRND.z - 7);
    glow.renderOrder = 2;
    H.add(glow);
    var brndGlow = glow;
  }

  /* the tulasi-mani garland is part of the Brindavana asset itself
     (buildBrindavana withMala) — nothing is draped over it here */

  /* ---- exactly two standing deepas, one either side of the Brindavana:
          traditional brass lamps — a tiered bell foot, a knopped baluster
          stem, a wide circular oil basin with four wick spouts, and a small
          finial. The body is built once and cloned, so both lamps share
          every geometry and material. Aged brass, never flat gold. ---- */
  const brass = new THREE.MeshStandardMaterial({ color: 0x8a6226, roughness: .5, metalness: .45 });
  const brassDeep = new THREE.MeshStandardMaterial({ color: 0x4a350f, roughness: .55, metalness: .5 });
  const mkLathe = (pts) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 26);
  const deepaBody = new THREE.Group();
  {
    const add = (geo, mat = brass) => deepaBody.add(shadowed(new THREE.Mesh(geo, mat)));
    // tiered bell base
    add(mkLathe([[0, 0], [.30, 0], [.305, .035], [.25, .062], [.262, .10], [.21, .132], [.222, .17], [.16, .21], [.12, .26], [.096, .30]]));
    // knopped baluster stem
    add(mkLathe([[.096, .30], [.052, .36], [.094, .42], [.05, .47], [.048, .58], [.098, .64], [.048, .70], [.045, .82], [.088, .88], [.048, .94], [.045, 1.06], [.078, 1.12], [.04, 1.18]]));
    // the wide circular oil basin — a broad shallow dish with a raised lip
    add(mkLathe([[0, 1.175], [.09, 1.18], [.22, 1.205], [.30, 1.24], [.315, 1.285], [.285, 1.30], [.255, 1.262], [.09, 1.25], [0, 1.25]]));
    const oil = new THREE.Mesh(new THREE.CircleGeometry(.235, 22), brassDeep);
    oil.rotation.x = -Math.PI / 2; oil.position.y = 1.262;
    deepaBody.add(oil);
    // central finial above the basin — a short kalasha bud
    add(mkLathe([[0, 1.25], [.03, 1.25], [.034, 1.36], [.065, 1.41], [.028, 1.47], [.036, 1.50], [0, 1.545]]));
    // four wick spouts on the rim
    const spoutGeo = new THREE.BoxGeometry(.11, .034, .055);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      const sp = shadowed(new THREE.Mesh(spoutGeo, brass));
      sp.position.set(Math.cos(a) * .32, 1.268, Math.sin(a) * .32);
      sp.rotation.y = -a;
      deepaBody.add(sp);
    }
  }
  const deepa = (x, y, z, s) => {
    const d = deepaBody.clone();          // geometries and materials shared
    const fls = [];
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      const fl = flame(.22);
      fl.position.set(Math.cos(a) * .375, 1.315, Math.sin(a) * .375);
      d.add(fl);
      fls.push(fl);
    }
    const pl = new THREE.PointLight(0xffa850, 0, 2.8, 2);
    pl.position.y = 1.36;
    d.add(pl);
    d.userData.fls = fls; d.userData.pl = pl;
    d.scale.setScalar(s); d.position.set(x, y, z);
    S.add(d); return d;
  };
  const deepas = [
    deepa(-3.8, 1.10, 1.9, 1.45),
    deepa(3.8, 1.10, 1.9, 1.45),
  ];
  /* the landing, the steps, the terrace: one mesh per material. The two big
     courses under the pad stay their own meshes: Brindavana Pravesha buries
     them by name of their geometry while the chamber is open (pravesha.js). */
  mergeStatic(S, { keep: (o) => o.isMesh && o.geometry.type === 'BoxGeometry' && (o.geometry.boundingSphere || o.geometry.computeBoundingSphere(), o.geometry.boundingSphere.radius > 5) });

  /* ---- the ruins bundle: real weathered rocks along the platform edges,
          the waterline and the soil transition; grass tufts on the bank ---- */
  loadRuins().then(ruins => {
    const rr = mulberry(53);
    const R = () => 'Small_Rock' + 'ABCDEF'[Math.floor(rr() * 6)];
    // a few large deliberate foundation boulders at the platform's corners —
    // the old scatter of small stones read as mess, not construction
    S.add(placeRuins(ruins, [
      [R(), -6.9, -.74, 5.5, 1.2, .042],
      [R(), GX - 6.6, -.75, GZ + 8.8, 2.9, .038],
      [R(), GX + 7.0, -.75, GZ + 8.3, 4.4, .036],
      [R(), GX + 6.8, -.68, GZ + 1.5, .8, .040],
    ], { tint: new THREE.Color(0x7d786e) }));
    // the waterline of the right bank, and the eroded shore
    const shore = [];
    for (let i = 0; i < 16; i++) {
      const z = -46 + rr() * 70, x = rightShore(z) + .3 + rr() * 1.8;
      const tall = rr() < .35;
      if (z > 8 && z < 30 && x < 16) continue;              // keep only the flight of steps clear
      shore.push([tall ? 'Tall_Rock' + 'ABC'[Math.floor(rr() * 3)] : R(), x, -.75 + rr() * .35, z, rr() * 6.3, tall ? .014 + rr() * .010 : .024 + rr() * .020]);
    }
    H.add(placeRuins(ruins, shore, { tint: new THREE.Color(0x878379) }));
    // half-submerged stones along the visible near shoreline — the eye reads
    // the land-water edge off them at first glance
    const wline = [];
    for (let i = 0; i < 6; i++) {
      const z = 28 + rr() * 14, xw = rightShore(z) + .15 + rr() * .9;   // hugging the shore, never adrift
      wline.push([R(), xw, -.90 + rr() * .16, z, rr() * 6.3, .020 + rr() * .016]);
    }
    for (let i = 0; i < 3; i++) {
      const z = 16 + rr() * 8, xw = rightShore(z) + .4 + rr() * .8;
      wline.push([R(), Math.max(xw, 12.2), -.85 + rr() * .15, z, rr() * 6.3, .018 + rr() * .013]);
    }
    // one weathered stone at the edge of each reed hummock, anchoring it
    wline.push([R(), 13.2, -.62, 21.6, 2.1, .030]);
    wline.push([R(), 15.9, -.68, 23.4, 4.4, .024]);
    wline.push([R(), 1.1, -.72, 35.2, 1.4, .028]);
    // stones half in the water, following the new shoreline curve —
    // at the point's tip, the bay mouth, and the right sweep's edge
    wline.push([R(), -4.2, -.52, 35.0, 1.7, .034]);
    wline.push([R(), 4.6, -.50, 37.8, 3.3, .038]);
    wline.push([R(), 9.8, -.55, 33.4, 5.1, .030]);
    // …and two small ones bedded into the meadow bank, mostly sunk in grass
    [[7.8, 38.4, .6, .016], [13.0, 37.2, 4.9, .020]].forEach(([sx, sz, ra, sc]) => {
      wline.push([R(), sx, groundHeight(sx, sz, 7) - .30, sz, ra, sc]);
    });
    H.add(placeRuins(ruins, wline, { tint: new THREE.Color(0x827e75) }));
    // native grass: tufts scattered where the bank is dry
    const tufts = [];
    const G = () => 'Grass' + 'ABCDEFGH'[Math.floor(rr() * 8)];
    for (let i = 0; i < 190 && tufts.length < 140; i++) {
      const z = -55 + rr() * 99, x = rightShore(z) + 1.6 + rr() * 16;
      if (z > 8 && z < 30 && x < 16) continue;                 // not on the flight
      if (z > 33) continue;                                    // the near strip wears carpets, not specks
      const h = groundHeight(x, z, 7);
      if (h < .05) continue;                                   // grass only above the waterline
      tufts.push([G(), x, h - .04, z, rr() * 6.3, .040 + rr() * .038]);
    }
    // the upriver bank behind the platform stays planted, not bare
    [[18, 8], [22, 3], [16, 12], [20, -2], [24, 10], [14.5, 4], [26, -6], [19, 14]].forEach(([x, z]) => {
      const h = groundHeight(x, z, 7);
      if (h > .05) tufts.push([G(), x, h - .04, z, rr() * 6.3, .045 + rr() * .04]);
    });
    // a few clumps where the right bank turns toward the camera — the near
    // strip itself is dressed by the grass carpets, not by speck tufts
    [[17.5, 31], [16.2, 30], [20, 28], [23, 26]].forEach(([x, z]) => {
      const h = groundHeight(x, z, 7);
      if (h > .05) tufts.push([G(), x, h - .04, z, rr() * 6.3, .05 + rr() * .04]);
    });
    // ground cover scattered through the near strip's open soil, between the
    // carpets — varied scale and rotation, crest-height land only: a tuft on
    // the waterline slope stands against open water and reads as a prop
    for (let i = 0; i < 30; i++) {
      const x = -9.5 + rr() * 20, z = 33.5 + rr() * 8.8;
      if (z < 39 && x > -3.5 && x < 5) continue;   // the bay mouth stays clear
      const h = groundHeight(x, z, 7);
      if (h < .55) continue;
      tufts.push([G(), x, h - .06, z, rr() * 6.3, .022 + rr() * .028]);
    }
    // a soft belt just above the waterline, where the soil stays damp —
    // never in the open water itself
    for (let i = 0; i < 60 && tufts.length < 130; i++) {
      const z = -50 + rr() * 92, x = rightShore(z) + .6 + rr() * 1.6;
      if (z > 8) continue;                                     // upriver only; the near reach is carpeted
      const h = groundHeight(x, z, 7);
      if (h < .08) continue;
      tufts.push([G(), x, h - .05, z, rr() * 6.3, .028 + rr() * .022]);
    }
    // grass about the foot of the house's pad, where the swept yard meets the bank
    {
      const T = threshold.group.position;
      for (let i = 0; i < 46; i++) {
        const a = rr() * 6.3, r = 10.6 + rr() * 3.2;
        const x = T.x + .8 + Math.cos(a) * r, z = T.z - 1.6 + Math.sin(a) * r;
        const h = groundHeight(x, z, 7);
        if (h < .05) continue;
        tufts.push([G(), x, h - .05, z, rr() * 6.3, .035 + rr() * .04]);
      }
    }
    /* nothing grows under the platform: a tuft rooted on the terrain inside
       its footprint was buried in the stone, and showed the moment the bank
       was cut open for the chamber (pravesha.js) */
    const clear = tufts.filter(([, x, , z]) => Math.hypot(x - BRND.x, z - BRND.z) > 8);
    const tuftGroup = placeRuins(ruins, clear, { shadows: false, tint: new THREE.Color(0x93a072) });
    H.add(tuftGroup);
    // two low shrubs by the bank — the same tufts, larger and darker
    H.add(placeRuins(ruins, [
      ['GrassC', rightShore(24) + 2.6, groundHeight(rightShore(24) + 2.6, 24, 7) - .05, 24, 1.2, .115],
      ['GrassG', rightShore(-12) + 3.4, groundHeight(rightShore(-12) + 3.4, -12, 7) - .05, -12, 2.8, .10],
    ], { shadows: false, tint: new THREE.Color(0x7a8560) }));
  }).catch(e => console.warn('ruins bundle failed', e));

  /* ---- ground ---- */
  H.add(terrain(7));

  /* ---- THE THRESHOLD (threshold.js): the Bhuvanagiri house's compound
          wall and gate, on the right bank's sweep south-east of the flight,
          its door turned toward the walk along the near strip. The first
          chapter is read approaching it (main.js STATIONS mv-01); the
          veena on its bench is the household (mv-02m). It stands on a
          levelled pad set at the bank's own height under its footprint. */
  const threshold = buildThreshold(ctx);
  {
    const TX = 27, TZ = 33;
    let pad = -9;
    for (let dx = -7; dx <= 7; dx += 2) for (let dz = -5; dz <= 5; dz += 2) pad = Math.max(pad, groundHeight(TX + dx, TZ + dz, 7));
    threshold.group.position.set(TX, pad + .04, TZ);
    threshold.group.rotation.y = -1.06;                       // its front toward (12, 40): the walk's approach
    H.add(threshold.group);
    mergeStatic(threshold.group);   // the house's two hundred boxes and beams become a handful of meshes; its lamps (userData) stay their own
  }

  /* ---- vegetation: palms and banana plants frame the right edge; reeds
          and grass at the waterline; a low hazy tree line on the far bank ---- */
  // must track ATMOS[0] or distant cards go pale; during the arrival the
  // same colour is pulled down toward night so the cards darken with the sky
  const fogDay = new THREE.Color(0x9c93b8), fogNight = new THREE.Color(0x2b2848), fogGlow = new THREE.Color(0xd9cdb8);
  /* the sun's colour ride: deep orange at the horizon, warm gold once risen */
  const SUN_LOW = new THREE.Color(0xff7a30), SUN_HIGH = new THREE.Color(0xffc890), EDGE_HIGH = new THREE.Color(0xffcf9a);
  const fogC = fogDay.clone();
  const veg = [];
  // par: mouse-parallax factor per layer — negative pulls near layers against
  // the camera drift, positive lets far layers ride with it (see update)
  const add = (m, par = 0) => { m.userData.par = par; m.userData.bx = m.position.x; m.userData.tint0 = m.material.uniforms.uTint.value; veg.push(m); H.add(m); return m; };
  /* the riverside grove: a coconut palm still reads, and banana plants
     still read, but they stand inside a layered cluster — canopy over
     mid foliage over shrubs over undergrowth, the trunk feet swallowed */
  /* ---- THE TREES ARE VOLUMES (trees.js, 18 Sept 2026). The painted tree
     cards that stood here read as flat cutouts the moment the chapters'
     camera walked round them (a sliver seen edge-on, a lollipop seen
     square). The grove is now built: trunks and limbs, crowns of leaf
     clusters with the crown's own normals, lit by the scene's sun and sky,
     casting shadows, taking the fog. Tamarind (the pinnate 'fine' crown)
     and neem / mango ('broad'); coconut palms leaning over the water
     upriver; shrubs of the same make where the trunk feet meet the bank.
     Placed on the terrain by groundHeight, sunk a hand into it. ---- */
  const trees = [];
  const cardsN = ctx.isMobile ? 170 : 320;
  const plant = (o, x, z, ry = 0, sink = .18) => { o.position.set(x, groundHeight(x, z, 7) - sink, z); o.rotation.y = ry; H.add(o); trees.push(o); return o; };
  const tree = (seed, x, z, height, spread, kind, ry = 0, extra = {}) => plant(makeTree({ seed, height, spread, kind, cards: cardsN, shadows: !ctx.isMobile, tint: kind === 'fine' ? 0xaeb8a2 : 0xc2c0ae, ...extra }), x, z, ry);
  const palm = (seed, x, z, height, lean, ry) => plant(makePalm({ seed, height, lean, shadows: !ctx.isMobile, fronds: ctx.isMobile ? 11 : 15 }), x, z, ry, .25);
  const shrub = (seed, x, z, radius, height, ry = 0) => plant(makeShrub({ seed, radius, height, cards: ctx.isMobile ? 60 : 90, shadows: !ctx.isMobile }), x, z, ry, .1);
  // the grove that holds the right edge of the composition, behind the platform
  tree(11, 21.5, 13, 13.5, 9.5, 'fine', .3, { trunkR: .42 });     // the tall tamarind
  tree(12, 17.4, 18.6, 9.5, 6.4, 'broad', 1.1);                     // a neem knitting into it
  tree(13, 27.5, 6, 10.5, 7.5, 'broad', 2.2);
  tree(14, 33, -4, 9.5, 6.8, 'fine', .7);
  // the bank stays wooded as it recedes toward the far line
  tree(15, 30, -14, 8.5, 6, 'broad', 1.6);
  tree(16, 38, -22, 9.5, 7, 'fine', .2);
  tree(17, 52, -30, 7.5, 5.5, 'broad', 2.8);
  tree(18, 44, -38, 8.5, 6.5, 'fine', 1.2);
  tree(19, 56, -46, 7.5, 5.5, 'broad', .4);
  tree(20, 60, -58, 6.5, 5, 'fine', 2.0);
  tree(21, 66, -54, 8, 6, 'broad', .9);
  // coconut palms leaning out over the water from the right bank
  /* MEASURED (project the crowns from the hold camera, desktop and phone):
     the gateway's opening spans screen x 43–72% on a wide frame, and a
     tree or palm upriver whose bearing from (−1.5, 46) is under 24° right
     of −z stands in it beside the Brindavana. Everything upriver keeps
     beyond that bearing (x ≳ 29 at z −10, ≳ 58 at z −56): the line of
     palms and the receding trees are right of the gateway on a wide frame
     and out of frame on a phone; the opening holds the far bank's haze
     alone, as the composition always had it. */
  palm(31, 29, -10, 9.5, -1.4, .2);
  palm(32, 38, -22, 10.5, -1.7, .5);
  palm(33, 46, -36, 8.5, -1.3, .1);
  palm(34, 52, -44, 9.5, -1.6, .8);
  palm(35, 58, -56, 8, -1.2, .3);
  // shrubs where the trunk feet meet the bank, the understory the old cards painted
  shrub(41, 19.8, 20.5, 2.2, 1.5); shrub(42, 23.2, 15.5, 1.8, 1.3); shrub(43, 15.0, 28.5, 2.6, 1.6);
  shrub(44, 12.6, 30.2, 1.6, 1.1); shrub(45, 21.5, 12.5, 2.0, 1.4); shrub(46, 25.8, 8.5, 1.9, 1.3);
  shrub(47, 29, 2.5, 2.1, 1.4); shrub(48, 16.5, 24.5, 1.7, 1.2); shrub(49, 20.4, 26.2, 2.4, 1.5);
  shrub(50, 31, -10, 2.0, 1.3); shrub(51, 26, -25, 1.8, 1.2); shrub(52, 18, -12, 2.2, 1.4);
  /* the banana clumps at the grove's foot, built (trees.js makeBanana): the
     walk from the household to the Matha passes right through them, and a
     painted card there lay flat across the lens */
  const banana = (seed, x, z, h, ry) => plant(makeBanana({ seed, height: h, shadows: !ctx.isMobile }), x, z, ry, .12);
  banana(61, 13.9, 27, 3.4, .3);      // the plantain low on the bank, at the composition's right edge
  banana(62, 17.6, 23.5, 2.8, 2.1);
  banana(63, 20.4, 25.4, 3.6, 4.0);
  const reedM = cardMaterial(reedTexture(87), fogC, { tint: .44, sway: .9 });   // reeds at .44 belong to the bank's own light, not brighter than it
  /* reed beds only where a river would grow them: the sheltered corner where
     the platform meets the right bank, and the shallows off the near strip —
     clustered, rooted below the surface, never lone tufts in open water */
  add(billboard(card(reedM, 2.6, 2.0, 14.4, .35, 22.6, .2)), -.07);
  add(billboard(card(reedM.clone(), 2.2, 1.7, 15.4, .30, 21.2, -.15)), -.07);
  add(billboard(card(reedM.clone(), 1.8, 1.5, 13.8, .28, 23.8, .05)), -.06);
  // The two beds that stood at local x 1.6–3.2 / z 35.8–36.6 were REMOVED:
  // measured, they projected to screen x 58% and 68% — dead centre of the
  // hold frame, reading as reeds growing out of open river. Reeds belong
  // against a bank the eye can see, so the bay stays open water.
  const grass = [
    grassSheet(grassCutout(101, { crest: .4, peak: .32, wide: .5, blades: 6000, len: 24, warm: .2, day: true, rough: .6 }), 9, 1.8, fogC),
    grassSheet(grassCutout(107, { crest: .5, peak: .36, wide: .44, blades: 5000, len: 24, warm: .2, day: true, rough: .6 }), 8, 1.7, fogC),
  ];
  grass[0].position.set(16.5, .40, 26); grass[0].rotation.y = .15;
  grass[1].position.set(13.5, .35, -30); grass[1].rotation.y = .3;

  for (const gr of grass) { gr.material.uniforms.uTint.value = .55; gr.renderOrder = 4; gr.userData.par = -.03; gr.userData.bx = gr.position.x; H.add(gr); }
  /* low grass carpets lying on the upriver bank — texture the terrain colour
     alone can't give; this is what stops the bank reading as bare brown */
  {
    const bank1 = grassSheet(grassCutout(113, { crest: .5, peak: .30, wide: .75, blades: 7000, len: 22, warm: .2, day: true, rough: .65 }), 10, 1.4, fogC);
    bank1.position.set(19, .8, 12); bank1.rotation.y = .12;
    const bank2 = grassSheet(grassCutout(127, { crest: .45, peak: .28, wide: .8, blades: 6500, len: 20, warm: .2, day: true, rough: .6 }), 9, 1.3, fogC);
    bank2.position.set(23, .8, 2); bank2.rotation.y = .25;
    // and one clump on the flank of the grassy point — a buried sheet shows
    // only its tallest tips, which read as pale specks, so it stands proud
    const bank3 = grassSheet(grassCutout(131, { crest: .5, peak: .26, wide: .8, blades: 5200, len: 20, warm: 0, day: true, rough: .65, crest2: .3 }), 8, 1.2, fogC);
    bank3.position.set(-5.6, .85, 39.4);   // low on the point's flank, under the camera's eye-line
    for (const gr of [bank1, bank2, bank3]) {
      gr.material.uniforms.uTint.value = .5; gr.renderOrder = 4;
      gr.userData.par = -.02; gr.userData.bx = gr.position.x;
      H.add(gr); grass.push(gr);
    }
  }

  /* ---- the foreground: low irregular grass clusters rooted on the near
          strip of land — KAGE's device. They frame the bottom of the frame
          without ever mounding into hills; open water shows past them. ---- */
  /* MEASURED CONSTRAINT (project each sheet's centre to screen before
     placing it): in the hold frame the river occupies roughly screen x
     20–75%. Sheets that land inside that band stand in the water however
     well they are rooted, so the foreground frames from the corners only —
     the left group projects to x < 0% and the right group to x > 110%. */
  const fore = [
    grassSheet(grassCutout(223, { crest: .42, peak: .40, wide: .70, blades: 12000, len: 42, warm: .25, day: true, crest2: .34, crest3: .34, rough: .75 }), 12, 2.1, fogC),
    grassSheet(grassCutout(227, { crest: .52, peak: .44, wide: .62, blades: 11000, len: 46, warm: .25, day: true, crest2: .28, crest3: .32, rough: .75 }), 10.5, 2.2, fogC),
  ];
  // the grassy point, left of centre — shifted left so its right end stops
  // on the point's own land, never against the open bay behind it
  fore[0].position.set(-8.6, groundHeight(-8.6, 39.0, 7) + .55, 39.0); fore[0].rotation.y = .14;
  fore[1].position.set(9.0, 1.0, 37.4); fore[1].rotation.y = -.12;     // a cluster on the right sweep
  // (the two body:false straggler sheets that sat at local x −1.6 and 0.8
  // were removed — they projected to screen x 29% and 58%, hanging blades
  // across open water in the middle of the composition)
  // the near strip is dressed, not bare. GOTCHA (measured): this close to
  // the hold camera the visible band is only local x ≈ −5..8 and the near
  // slope hides anything textured below y ≈ .5 — so the bottom-edge fringe
  // sits at z 44 right under the lens, and the right-corner run at z 34.8.
  // near-edge clumps — separate tussocks with open ground between, never a
  // wall-to-wall ribbon
  fore.push(grassSheet(grassCutout(239, { crest: .5, peak: .34, wide: .6, blades: 5200, len: 34, warm: 0, day: true, crest2: .3, rough: .7 }), 6.5, 1.15, fogC));
  fore[2].position.set(-3.2, 1.18, 43.9);                              // the bottom-left corner, right under the lens
  fore.push(grassSheet(grassCutout(241, { crest: .45, peak: .36, wide: .75, blades: 6000, len: 34, warm: .25, day: true, crest2: .32, rough: .7 }), 7, 1.6, fogC));
  fore[3].position.set(12.0, 1.35, 35.0); fore[3].rotation.y = -.08;   // the right corner, on the bank sweep
  /* the phone framing looks straight down the near strip, which the corner
     sheets leave open — two broad LOW carpets keep that band grassed. They
     sit deep in the terrain so only a fringe of tips shows on the brown
     bank: this near the lens, a taller sheet's crown would climb past the
     camera's eye-line and hang its blades across the open water beyond. */
  fore.push(grassSheet(grassCutout(251, { crest: .48, peak: .30, wide: .85, blades: 7000, len: 26, warm: .15, day: true, crest2: .3, rough: .7 }), 9, 1.5, fogC));
  fore[4].position.set(6.8, groundHeight(6.8, 40.8, 7) + .12, 40.8); fore[4].rotation.y = .06;
  fore.push(grassSheet(grassCutout(257, { crest: .5, peak: .28, wide: .8, blades: 6000, len: 24, warm: 0, day: true, crest2: .28, rough: .7 }), 8, 1.35, fogC));
  fore[5].position.set(-5.4, groundHeight(-5.4, 42.0, 7) + .1, 42.0); fore[5].rotation.y = -.1;
  /* the tablet and portrait framings look across a broader stretch of the
     strip — three more irregular low carpets break up the open soil while
     leaving trodden earth showing between them */
  fore.push(grassSheet(grassCutout(263, { crest: .46, peak: .3, wide: .78, blades: 6200, len: 24, warm: .1, day: true, crest2: .3, rough: .7 }), 7.5, 1.25, fogC));
  fore[6].position.set(.6, groundHeight(.6, 41.4, 7) + .1, 41.4); fore[6].rotation.y = .18;
  fore.push(grassSheet(grassCutout(271, { crest: .52, peak: .27, wide: .72, blades: 5400, len: 22, warm: 0, day: true, crest2: .26, rough: .68 }), 6.8, 1.2, fogC));
  fore[7].position.set(7.6, groundHeight(7.6, 43.2, 7) + .1, 43.2); fore[7].rotation.y = -.14;
  fore.push(grassSheet(grassCutout(277, { crest: .48, peak: .29, wide: .8, blades: 5000, len: 22, warm: .18, day: true, crest2: .3, rough: .72 }), 6, 1.15, fogC));
  fore[8].position.set(-8.4, groundHeight(-8.4, 42.6, 7) + .12, 42.6); fore[8].rotation.y = .08;
  // the frame's edges sit in dawn shadow: brighter than the mid-ground bank,
  // the foreground reads as a pasted-on green band rather than near land
  const foreTint = [.28, .28, .27, .27, .30, .30, .30, .29, .30];
  fore.forEach((f, i) => {
    f.material.uniforms.uTint.value = foreTint[i]; f.renderOrder = 6;
    f.userData.par = -.08; f.userData.bx = f.position.x; f.userData.by = f.position.y;   // nearest parallax layer
    H.add(f); grass.push(f);
  });
  /* the far lines are hazes by day (paler than the near bank) and
     silhouettes by night (darker than the sky): userData.far pulls their
     tint down with the night in update, where the near plants keep the
     lamps' colour */
  const farA = cardMaterial(farBankTexture(61, { palms: 1, trees: 30 }), fogC, { tint: .62, sway: .2 });
  const farB = cardMaterial(farBankTexture(67, { palms: 1, trees: 24 }), fogC, { tint: .62, sway: .2 });
  add(card(farA, 300, 7.2, -20, 2.5, -73, 0, 4), .15).userData.far = true;
  add(card(farB, 260, 6.4, 40, 2.2, -95, 0, 3.5), .18).userData.far = true;
  add(card(farB, 110, 4.2, -78, 1.4, -66, .3, 2.6), .12).userData.far = true;  // the promontory far left
  /* atmospheric layering: a farther, paler line dissolving behind the first —
     the horizon reads as receding country, not a single clean edge */
  const farC = cardMaterial(farBankTexture(73, { palms: 0, trees: 20 }), fogC, { tint: .78, sway: .15 });
  add(card(farC, 340, 8.5, 10, 3.0, -112, 0, 4.5), .20).userData.far = true;
  /* the country east of the house: a far tree line closing the view up
     the bank, so no edge of the world shows past the threshold */
  const farE = cardMaterial(farBankTexture(79, { palms: 2, trees: 26 }), fogC, { tint: .66, sway: .2 });
  add(card(farE, 150, 6.0, 82, 2.2, 28, -Math.PI / 2, 2.2), .05).userData.far = true;

  /* ---- river mist lying on the water in the distance: three torn bands,
          each fading out along its length and up its top, coloured from the
          air itself (the fog) so they read as haze, never as a panel ---- */
  const mistBands = [];
  const mistMat = new THREE.MeshBasicMaterial({ map: mistBandTexture(1), transparent: true, opacity: 0, depthWrite: false, fog: false, color: 0xd6d2cc });
  [[1, 130, 2.0, -6, .55, -42], [2, 210, 2.8, 24, .75, -62], [3, 300, 3.8, -30, 1.1, -86]].forEach(([seed, w, h, x, y, z]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), seed === 1 ? mistMat : mistMat.clone());
    if (seed !== 1) m.material.map = mistBandTexture(seed);
    m.position.set(x, y, z); m.renderOrder = 2;
    H.add(m); mistBands.push(m);
  });
  const mist = { material: { set opacity(v) { for (const m of mistBands) m.material.opacity = v; }, get opacity() { return mistBands[0].material.opacity; } } };

  /* ---- the sky's slow systems ---- */
  const clouds = createClouds({ count: ctx.isMobile ? 4 : 6, mobile: ctx.isMobile });
  H.add(clouds.group);
  const birds = createBirds({ mobile: ctx.isMobile });
  H.add(birds.group);

  /* the river mist that fills the frame as chapter 00 lets go: three soft
     sheets carried in front of the camera, low over the water */
  const mistFore = [];
  for (let i = 0; i < 3; i++) {
    const s = glowSprite(0xdccfbc, 9 + i * 3, 0);
    s.material.map = mistTexture(i);
    s.material.blending = THREE.NormalBlending;
    s.material.fog = false;
    s.renderOrder = 7;
    H.add(s); mistFore.push(s);
  }
  for (const gr of grass) gr.userData.tint0 = gr.material.uniforms.uTint.value;
  const _fwd = new THREE.Vector3(), _rgt = new THREE.Vector3(), _wp = new THREE.Vector3(), _camL = new THREE.Vector3();

  /* the same bank, before anything stood on it (Manchale, scene 08): the
     gateway, platform, deepas and the Brindavana withdraw as MESHES — the
     lamps' point lights stay in the scene at zero intensity, because a
     light toggled on and off recompiles every material in view */
  let sacredOn = 1, dreamAmt = 0, tailAmt = 0;
  const GOLD = new THREE.Color(0xe6c48c), BLUE = new THREE.Color(0xcedcee);
  const setSacred = (v) => {
    if (v === sacredOn) return;
    sacredOn = v;
    S.traverse(o => { if (o.isMesh || o.isSprite) o.visible = !!v; });
    brnd.group.traverse(o => { if (o.isMesh || o.isSprite) o.visible = !!v; });
  };
  const fogAfternoon = new THREE.Color(0xcfc3a4), fogNightDeep = new THREE.Color(0x161225);
  const HEMI_DAY = new THREE.Color(0xd8d2c0), HEMI_NIGHT = new THREE.Color(0x4e5870), SUN_DAY = new THREE.Color(0xf2e2c4);

  const api = {
    group: g, gate, deepas, veg, grass, trees, threshold, hemi, sun, fill, clouds, birds, setSacred,
    setDream(v) { dreamAmt = v; }, setTail(v) { tailAmt = v; },
    setVisible(v) { g.visible = v; },
    /* a point of the threshold (its `points` keys) in the approach frame
       the cameras are authored in, optionally stepped out along the house's
       front (f) and its right (r), for main.js STATIONS */
    thresholdPoint(key, f = 0, r = 0, y = null) {
      const T = threshold.group;
      T.updateMatrixWorld(true);
      const v = threshold.points[key].clone().addScaledVector(threshold.front, f).addScaledVector(threshold.right, r);
      T.localToWorld(v); H.worldToLocal(v);
      if (y !== null) v.y = T.position.y + y;   // heights are over the yard's pad, wherever the bank put it
      return [v.x, v.y, v.z];
    },
    placeWord() {},
    /* openT: 0 pre-dawn → 1 morning; glow: the leave-taking's light (0→1);
       hour: { day, night } — the same place in afternoon light (Manchale,
       before the Brindavana) and at night with the deepas lit (the
       Brindavana on its bank, before the second dawn). Both 0 = the opening. */
    update(time, openT, reduced, fogDensity = .006, camera = null, dt = .016, glow = 0, hour = null) {
      const a = openT;
      const day = hour ? hour.day : 0, night = hour ? hour.night : 0;
      /* a true sunrise, not a fade. The land is already there before the
         sun: at a = 0 the sky's own pre-dawn light is on the scene — trees
         as dark forms, grass visible, the stone visible — and what changes
         is colour temperature, contrast and the direction of light. Then
         the sun crests the horizon and its direct light sweeps in, deep
         orange and near-horizontal at first, warming as the disc lifts. */
      const PRE = .38;                                                   // the pre-dawn floor
      const twilight = PRE + (1 - PRE) * smooth(THREE.MathUtils.clamp(a * 1.35, 0, 1));
      const crest = smooth(THREE.MathUtils.clamp((a - .32) / .55, 0, 1));   // as the disc breaches the horizon
      fogC.copy(fogNight).lerp(fogDay, .34 + .66 * a);
      /* the leave-taking: light floods the frame — haze warms and pales,
         the far banks dissolve, the near mist stands up */
      fogC.lerp(fogGlow, glow * .8);
      /* layered mouse parallax: the camera already drifts; each depth band
         slides a touch more (near, against) or less (far, with) so the
         landscape opens up quietly under the cursor — KAGE's feel */
      const ms = camera && camera.userData ? camera.userData.mouse : null;
      if (ms && !reduced) {
        for (const s of veg) if (s.userData.par) s.position.x = s.userData.bx + ms.x * s.userData.par;
        for (const s of grass) if (s.userData.par) {
          s.position.x = s.userData.bx + ms.x * s.userData.par;
          if (s.userData.by !== undefined) s.position.y = s.userData.by + ms.y * .03;
        }
      }
      /* pre-dawn is cool: the sky light starts blue-grey and warms as the
         morning fills it */
      hemi.color.setHex(0x8290ab).lerp(new THREE.Color(0xbfd0e2), crest);
      hemi.intensity = 1.15 * twilight + 1.4 * glow;
      fill.intensity = 1.0 * twilight + .6 * glow;
      amb.intensity = .34 * twilight + .5 * glow;
      /* the sun itself: below the horizon until it crests, then rising —
         its light long and deep orange at first, whitening as it climbs */
      sun.intensity = 2.9 * crest;
      sun.color.copy(SUN_LOW).lerp(SUN_HIGH, crest);
      sun.position.set(-48, THREE.MathUtils.lerp(.5, 12, crest), -44);
      edge.intensity = 1.0 * crest;
      edge.color.copy(SUN_LOW).lerp(EDGE_HIGH, crest);
      brndKey.intensity = (.9 * (twilight * .3 + crest * .7) + .8 * glow) * sacredOn;
      brndGlow.material.opacity = (.10 * twilight + .30 * glow) * sacredOn;   // a breath of air, not a spotlight
      brndGlow.material.color.copy(BLUE).lerp(GOLD, Math.max(dreamAmt, tailAmt * .6));
      mist.material.opacity = .16 * twilight + .5 * glow;
      /* ---- the other hours of the same place ----
         afternoon: the sun high and warm-white, the sky light pale, the
         haze Bone; night: the sky light nearly gone, blue-grey, the two
         deepas the only warmth. Both are MIXED over the dawn values so
         the scroll can move between them without a step. */
      if (day > 0) {
        hemi.color.lerp(HEMI_DAY, day);
        hemi.intensity = THREE.MathUtils.lerp(hemi.intensity, 1.7, day);
        fill.intensity = THREE.MathUtils.lerp(fill.intensity, .9, day);
        amb.intensity = THREE.MathUtils.lerp(amb.intensity, .55, day);
        sun.intensity = THREE.MathUtils.lerp(sun.intensity, 2.6, day);
        sun.color.lerp(SUN_DAY, day);
        sun.position.lerp(new THREE.Vector3(-22, 42, -12), day);
        edge.intensity *= 1 - day;
        mist.material.opacity *= 1 - day * .8;
        fogC.lerp(fogAfternoon, day * .85);
      }
      if (night > 0) {
        hemi.color.lerp(HEMI_NIGHT, night);
        /* lifted 18 Sept 2026: the chapters are read on this bank at night,
           and the bank, the grove and the far shore must stay legible under
           the words. Moonlight, not lamplight: cool and even. */
        hemi.intensity = THREE.MathUtils.lerp(hemi.intensity, .92, night);
        fill.intensity = THREE.MathUtils.lerp(fill.intensity, .42, night);
        amb.intensity = THREE.MathUtils.lerp(amb.intensity, .42, night);
        sun.intensity *= 1 - night;
        edge.intensity *= 1 - night;
        /* the cards' air goes dark with the sky. This lived in the tail's
           block until 18 Sept 2026, so through the night chapters the far
           tree lines kept the dawn's lavender haze and stood on the dark
           bank as pale cotton */
        fogC.lerp(fogNightDeep, night * .9);
        /* at night the stone is lit by its own lamps: enough to read its
           carving from close, never a spotlight */
        brndKey.intensity = THREE.MathUtils.lerp(brndKey.intensity, .84 * sacredOn, night);
        brndGlow.material.opacity = THREE.MathUtils.lerp(brndGlow.material.opacity, .22 * sacredOn, night);
      }
      /* the dream's light behind the stone; the warmth of the deepas as the walk reaches the face */
      brndGlow.material.opacity = Math.max(brndGlow.material.opacity, (.92 * dreamAmt + .34 * tailAmt) * sacredOn);
      if (tailAmt > 0) {
        hemi.intensity *= 1 - tailAmt * .45; fill.intensity *= 1 - tailAmt * .5; amb.intensity *= 1 - tailAmt * .3;
        brndKey.intensity *= 1 + tailAmt * .6;
        mist.material.opacity *= 1 - night * .6;
      }
      /* the foreground mist: carried ahead of the camera, rising with the glow */
      if (camera) {
        camera.getWorldDirection(_fwd);
        _rgt.crossVectors(_fwd, new THREE.Vector3(0, 1, 0)).normalize();
        for (let i = 0; i < mistFore.length; i++) {
          const s = mistFore[i];
          const ph = time * .05 + i * 2.1;
          _wp.copy(camera.position).addScaledVector(_fwd, 6 + i * 3.5)
            .addScaledVector(_rgt, Math.sin(ph) * (2.5 + i) - 1 + i * 1.5);
          _wp.y = 1.0 + i * .6 + Math.sin(ph * 1.3) * .3 + glow * 1.2;
          H.worldToLocal(s.position.copy(_wp));
          s.material.opacity = glow * (.42 - i * .08);
        }
      }
      for (const k in brnd.materials) {
        // only the map-based stone materials, whose base color is white — a
        // scalar on the colored ones (oxide seams, the mala) would bleach them
        const m = brnd.materials[k]; if (!m || !m.color || !m.map) continue;
        // the krishna-shila stays dark stone — only a whisper of lift
        const lift = (k === 'rosette') ? .92 : 1.0;
        m.color.setScalar(1 + (lift - 1) * a);
      }
      for (const d of deepas) {
        // the lamps were lit before dawn — they burn from the first moments
        let f = .9;
        for (let i = 0; i < d.userData.fls.length; i++) {
          f = d.userData.fls[i].userData.flicker(time + d.position.x * 2.7 + i * 1.9);
        }
        // at night they are the only light on the bank; in the afternoon, and
        // while the bank stands empty, they are unlit
        d.userData.pl.intensity = Math.max(Math.min(1, a * 4) * (1 - day), night * 1.8, dreamAmt * .9) * (.5 + f * .22) * sacredOn * (1 + tailAmt * 1.6);
        for (const fl of d.userData.fls) fl.scale.setScalar(Math.max(.001, Math.max(a * (1 - day), night, dreamAmt * .8)));
      }
      /* the vegetation never fades in: it stands as dark forms before dawn
         and takes colour as the light comes — the tint carries the sunrise,
         the alpha stays full */
      let veil = .30 + .70 * smooth(THREE.MathUtils.clamp(a * 1.25, 0, 1));
      veil = THREE.MathUtils.lerp(veil, 1.0, day);
      veil = THREE.MathUtils.lerp(veil, .50, night);
      if (camera) H.worldToLocal(_camL.copy(camera.position));
      for (const s of veg) {
        const u = s.material.uniforms;
        u.uTime.value = time; u.uFade.value = 1; u.uFogD.value = fogDensity * (1 + glow * 1.6);
        u.uTint.value = s.userData.tint0 * veil * (s.userData.far ? 1 - night * .35 : 1);
        if (reduced) u.uSway.value = Math.min(u.uSway.value, .15);
        /* a plant the walk passes through dissolves as it reaches the lens,
           instead of laying its painted leaves flat across the frame */
        if (s.userData.billboard && camera) u.uFade.value = smooth(THREE.MathUtils.clamp((s.position.distanceTo(_camL) - 2.4) / 3.4, 0, 1));
      }
      /* the trees: their leaves' wind clock; the round plants turn to face the camera */
      setTreeTime(reduced ? 0 : time);
      if (camera) faceCamera(veg, camera.position, H);
      /* the mist takes the air's colour, a shade lighter, so it is haze and not paint */
      mistMat.color.copy(fogC).lerp(new THREE.Color(0xf7f1e1), .22);
      for (const m of mistBands) m.material.color.copy(mistMat.color);
      threshold.update(time, { night, day, fogD: fogDensity });
      for (const s of grass) {
        const u = s.material.uniforms;
        u.uTime.value = time; u.uSway.value = reduced ? .2 : 1; u.uFade.value = 1; u.uLinear.value = 0; u.uFogD.value = fogDensity * (1 + glow * 1.6);
        u.uTint.value = s.userData.tint0 * veil;
      }
      clouds.update(time, reduced ? 0 : dt);
      clouds.setHour({ dawn: a, day, night });
      birds.update(time, reduced ? 0 : dt, camera);
    },
  };
  return api;
}
