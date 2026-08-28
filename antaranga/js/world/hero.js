// ANTARANGA · the hero — Mantralaya on the Tungabhadra at first light.
// Three depth layers: the river in the foreground running on past the
// camera, the gateway and Brindavana on a stone landing that grows out of
// the right bank, and a broad low far bank under an immense dawn sky.
// Environment systems live in their own modules (clouds, birds, vegetation).
// THE BRINDAVANA IS A LOCKED ASSET — only its staging is touched here.
import * as THREE from 'three';
import { mulberry, fbm, flame } from '../util.js';
import { stoneMaterial, boxUV, shadowed, loadArch, grassCutout, grassSheet } from './opening.js';
import { createClouds } from './clouds.js';
import { createBirds } from './birds.js';
import { cardMaterial, bananaTexture, farBankTexture, card, riverTreeTexture, bushTexture, reedTexture } from './vegetation.js';
import { loadRuins, placeRuins } from './ruins.js';

export const APPROACH_ROT = 0;
export const BRND = { x: 11.4, z: 2, scale: 1.15 };
export const GATE = { x: 8.6, z: 15, rot: -.50, h: 11.5 };
// the whole sacred group faces ~17° left of the camera axis, toward the copy
export const SACRED_ROT = -.50;
export const GATE_Z = GATE.z;
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
function groundHeight(px, pz, seed) {
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
  sun.castShadow = true;
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

  /* ---- the tulasi mala: as at Mantralaya — one long garland hung from the
          cornice corners, sagging in a deep U across the whole front, and a
          shorter loop above it. Leafy green strands, not a brass chain:
          small clustered tulasi beads with the occasional wooden bead. ---- */
  {
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x3d4a28, roughness: .88, metalness: 0 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5e452a, roughness: .7, metalness: .05 });
    const rr2 = mulberry(19);
    const loops = [
      { a: [-1.58, 5.10, 1.42], m: [0, -0.5, 2.10], b: [1.58, 5.10, 1.42], n: 96, r: .056 },  // the long U, down past the niche
      { a: [-1.30, 5.20, 1.38], m: [0, 3.45, 1.75], b: [1.30, 5.20, 1.38], n: 60, r: .050 },  // the upper loop
    ];
    /* the structure's front silhouette (scaled S units): the strand can never
       pass through stone — it rests just proud of each ledge it crosses and
       hangs free between them, which is what real weight looks like */
    const zSurf = (yy) =>
      yy > 5.5 ? 1.46 :        // attic and crown
      yy > 4.55 ? 1.92 :       // cornice courses
      yy > 4.05 ? 1.63 :       // rosette band
      yy > 1.95 ? 1.60 :       // body face and lower molding
      yy > 1.10 ? 1.92 :       // lotus base
      2.55;                    // plinth steps
    const leafPts = [], woodPts = [];
    for (const L of loops) {
      for (let i = 0; i < L.n; i++) {
        const u = i / (L.n - 1);
        const x = (1 - u) * (1 - u) * L.a[0] + 2 * (1 - u) * u * L.m[0] + u * u * L.b[0];
        const y = (1 - u) * (1 - u) * L.a[1] + 2 * (1 - u) * u * L.m[1] + u * u * L.b[1];
        let z = (1 - u) * (1 - u) * L.a[2] + 2 * (1 - u) * u * L.m[2] + u * u * L.b[2];
        z = Math.max(z, zSurf(y) + .10);
        // a garland is not a row of spheres: each station is a small cluster
        if (i % 7 === 3) { woodPts.push([x, y, z, L.r * 1.35]); continue; }
        const nCl = 2 + (rr2() * 2 | 0);
        for (let c = 0; c < nCl; c++) {
          leafPts.push([x + (rr2() - .5) * .07, y + (rr2() - .5) * .07, z + (rr2() - .5) * .05,
                        L.r * (.6 + rr2() * .7)]);
        }
      }
    }
    const put = (mesh, pts) => {
      const mm = new THREE.Matrix4(), e = new THREE.Euler();
      pts.forEach(([x, y, z, r], i) => {
        e.set(rr2() * 3, rr2() * 3, rr2() * 3);
        mm.makeRotationFromEuler(e);
        mm.scale(new THREE.Vector3(r, r * .72, r));
        mm.setPosition(x, y, z);
        mesh.setMatrixAt(i, mm);
      });
      mesh.castShadow = true;
      S.add(mesh);
    };
    put(new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), leafMat, leafPts.length), leafPts);
    put(new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), woodMat, woodPts.length), woodPts);
    // a single marigold knot where the long strand bottoms out
    const knot = new THREE.Mesh(new THREE.SphereGeometry(.085, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x9a5b1c, roughness: .8 }));
    knot.position.set(0, 2.28, 1.78); knot.scale.y = .8;
    S.add(knot);
  }

  /* ---- exactly two standing deepas, one either side of the Brindavana.
          Warm gold — a soft-burnished lamp brass that stays luminous even
          against the light, without ever glowing like an ornament. ---- */
  const bronze = new THREE.MeshStandardMaterial({ color: 0xb08a42, roughness: .46, metalness: .32, emissive: 0x241704 });
  const bronzeDark = new THREE.MeshStandardMaterial({ color: 0x3e2c12, roughness: .6, metalness: .3 });
  const lathe = (pts, mat) => shadowed(new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 28), mat));
  const deepa = (x, y, z, s) => {
    const d = new THREE.Group();
    d.add(lathe([[0, 0], [.26, 0], [.26, .035], [.195, .06], [.125, .115], [.085, .17], [.06, .22], [0, .22]], bronze));   // broad weighted foot
    d.add(lathe([[.05, .21], [.068, .37], [.045, .47], [.041, .70], [.070, .77], [.041, .84], [.038, 1.04], [.064, 1.11], [.038, 1.18], [.034, 1.30], [0, 1.30]], bronze));   // a stem with real girth, two knops
    d.add(lathe([[0, 1.28], [.05, 1.28], [.12, 1.30], [.165, 1.332], [.155, 1.356], [.115, 1.346], [.045, 1.332], [0, 1.332]], bronze));   // broad shallow oil bowl
    const oil = new THREE.Mesh(new THREE.CircleGeometry(.105, 22), bronzeDark); oil.rotation.x = -Math.PI / 2; oil.position.y = 1.338; d.add(oil);
    const fl = flame(.19); fl.position.set(0, 1.378, 0); d.add(fl); d.userData.fl = fl;
    const pl = new THREE.PointLight(0xffa850, 0, 2.8, 2); pl.position.y = 1.44; d.add(pl); d.userData.pl = pl;
    d.scale.setScalar(s); d.position.set(x, y, z);
    S.add(d); return d;
  };
  const deepas = [
    deepa(-3.8, 1.10, 1.9, 1.7),
    deepa(3.8, 1.10, 1.9, 1.7),
  ];

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
    // a soft belt just above the waterline, where the soil stays damp —
    // never in the open water itself
    for (let i = 0; i < 60 && tufts.length < 130; i++) {
      const z = -50 + rr() * 92, x = rightShore(z) + .6 + rr() * 1.6;
      if (z > 8) continue;                                     // upriver only; the near reach is carpeted
      const h = groundHeight(x, z, 7);
      if (h < .08) continue;
      tufts.push([G(), x, h - .05, z, rr() * 6.3, .028 + rr() * .022]);
    }
    const tuftGroup = placeRuins(ruins, tufts, { shadows: false, tint: new THREE.Color(0x93a072) });
    H.add(tuftGroup);
    // two low shrubs by the bank — the same tufts, larger and darker
    H.add(placeRuins(ruins, [
      ['GrassC', rightShore(24) + 2.6, groundHeight(rightShore(24) + 2.6, 24, 7) - .05, 24, 1.2, .115],
      ['GrassG', rightShore(-12) + 3.4, groundHeight(rightShore(-12) + 3.4, -12, 7) - .05, -12, 2.8, .10],
    ], { shadows: false, tint: new THREE.Color(0x7a8560) }));
  }).catch(e => console.warn('ruins bundle failed', e));

  /* ---- ground ---- */
  H.add(terrain(7));

  /* ---- vegetation: palms and banana plants frame the right edge; reeds
          and grass at the waterline; a low hazy tree line on the far bank ---- */
  // must track ATMOS[0] or distant cards go pale; during the arrival the
  // same colour is pulled down toward night so the cards darken with the sky
  const fogDay = new THREE.Color(0x93a3b4), fogNight = new THREE.Color(0x121722);
  const fogC = fogDay.clone();
  const veg = [];
  // par: mouse-parallax factor per layer — negative pulls near layers against
  // the camera drift, positive lets far layers ride with it (see update)
  const add = (m, par = 0) => { m.userData.par = par; m.userData.bx = m.position.x; veg.push(m); H.add(m); return m; };
  /* the riverside grove: a coconut palm still reads, and banana plants
     still read, but they stand inside a layered cluster — canopy over
     mid foliage over shrubs over undergrowth, the trunk feet swallowed */
  const banana = cardMaterial(bananaTexture(41), fogC, { tint: .46, sway: .7 });
  const banana2 = cardMaterial(bananaTexture(43), fogC, { tint: .36, sway: .6 });
  const rTree = cardMaterial(riverTreeTexture(83), fogC, { tint: .78, sway: .3 });
  const bushLit = cardMaterial(bushTexture(91), fogC, { tint: .62, sway: .35 });
  const bushDark = cardMaterial(bushTexture(97, { dark: 1 }), fogC, { tint: .48, sway: .3 });
  // reeds sat brighter than anything else in the dawn palette and read as
  // plastic; at .44 they belong to the same light as the bank behind them
  const reedM = cardMaterial(reedTexture(87), fogC, { tint: .44, sway: .9 });
  const rTreeB = cardMaterial(riverTreeTexture(89), fogC, { tint: .68, sway: .25 });
  const rTreeC = cardMaterial(riverTreeTexture(101), fogC, { tint: .58, sway: .2 });
  const rTreeTall = cardMaterial(riverTreeTexture(107), fogC, { tint: .72, sway: .3 });
  add(card(rTreeTall, 16, 16, 21.5, 7.2, 13, .2), -.06);   // the tall broadleaf holding the right edge
  add(card(rTree, 12, 12, 17.2, 5.4, 18, .1), -.06);       // a second knitting into it
  add(card(rTreeB, 10, 10, 27, 4.6, 6, .2), -.02);         // the bank stays wooded as it recedes…
  add(card(rTreeC, 9, 9, 33, 4.2, -4, .15), .04);          // …dissolving toward the far tree line
  add(card(banana, 6.2, 6.2, 13.9, 2.9, 27, .15), -.08);   // the banana plant, low on the bank
  add(card(banana2, 4.8, 4.8, 17.6, 2.6, 23.5, .25), -.05);
  add(card(bushLit, 7.5, 3.75, 19.8, 1.9, 20.5, .1), -.06);   // shrubs at the palm's foot
  add(card(bushLit, 6, 3, 23.2, 2.3, 15.5, -.1), -.05);
  add(card(bushLit, 5, 2.5, 12.8, 1.2, 28.8, .1), -.09);   // low foliage at the banana's foot
  add(card(bushDark, 9, 4.5, 15.0, 1.5, 28.5, .05), -.09); // undergrowth swallowing the trunk feet
  add(card(bushDark, 5, 2.5, 12.4, 1.1, 30, 0), -.10);
  /* the understory band: ground cover → shrub → canopy builds continuously
     along the grove so every trunk foot is buried in vegetation */
  add(card(bushDark, 8, 4, 21.5, 1.5, 12.5, .1), -.04);
  add(card(bushLit, 6.5, 3.2, 25.8, 1.7, 8.5, -.05), -.03);
  add(card(bushDark, 7, 3.5, 29, 1.6, 2.5, .1), -.02);
  add(card(bushLit, 5.5, 2.8, 16.5, 1.2, 24.5, .1), -.06);
  /* reed beds only where a river would grow them: the sheltered corner where
     the platform meets the right bank, and the shallows off the near strip —
     clustered, rooted below the surface, never lone tufts in open water */
  add(card(reedM, 2.6, 2.0, 14.4, .35, 22.6, .2), -.07);
  add(card(reedM, 2.2, 1.7, 15.4, .30, 21.2, -.15), -.07);
  add(card(reedM, 1.8, 1.5, 13.8, .28, 23.8, .05), -.06);
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
    bank3.position.set(-5.6, 1.10, 39.4);
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
  fore[0].position.set(-7.2, 1.1, 38.6); fore[0].rotation.y = .14;     // the grassy point, left of centre
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
  // the frame's edges sit in dawn shadow: brighter than the mid-ground bank,
  // the foreground reads as a pasted-on green band rather than near land
  const foreTint = [.28, .28, .27, .27];
  fore.forEach((f, i) => {
    f.material.uniforms.uTint.value = foreTint[i]; f.renderOrder = 6;
    f.userData.par = -.08; f.userData.bx = f.position.x; f.userData.by = f.position.y;   // nearest parallax layer
    H.add(f); grass.push(f);
  });
  const farA = cardMaterial(farBankTexture(61, { palms: 1, trees: 30 }), fogC, { tint: .62, sway: .2 });
  const farB = cardMaterial(farBankTexture(67, { palms: 1, trees: 24 }), fogC, { tint: .62, sway: .2 });
  add(card(farA, 300, 7.2, -20, 2.5, -73, 0, 4), .15);
  add(card(farB, 260, 6.4, 40, 2.2, -95, 0, 3.5), .18);
  add(card(farB, 110, 4.2, -78, 1.4, -66, .3, 2.6), .12);  // the promontory far left
  /* atmospheric layering: a farther, paler line dissolving behind the first —
     the horizon reads as receding country, not a single clean edge */
  const farC = cardMaterial(farBankTexture(73, { palms: 0, trees: 20 }), fogC, { tint: .78, sway: .15 });
  add(card(farC, 340, 8.5, 10, 3.0, -112, 0, 4.5), .20);
  const midTreeMat = cardMaterial(farBankTexture(71, { palms: 0, trees: 9 }), fogC, { tint: .55, sway: .25 });
  add(card(midTreeMat, 60, 5.6, 34, 2.6, -30, -.15, 1.2), .08);   // a few trees on the right bank behind the platform

  /* ---- thin river mist lying on the water in the distance ---- */
  const mist = (() => {
    const W = 512, Hc = 64, cv = document.createElement('canvas'); cv.width = W; cv.height = Hc;
    const cx = cv.getContext('2d');
    const grd = cx.createLinearGradient(0, 0, 0, Hc);
    grd.addColorStop(0, 'rgba(210,220,232,0)'); grd.addColorStop(.55, 'rgba(210,220,232,.55)'); grd.addColorStop(1, 'rgba(210,220,232,0)');
    cx.fillStyle = grd; cx.fillRect(0, 0, W, Hc);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(260, 3.4),
      new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    m.position.set(-10, .9, -58);
    m.renderOrder = 2;
    H.add(m);
    const m2 = m.clone(); m2.material = m.material; m2.position.set(30, .7, -40); m2.scale.set(.6, .7, 1); H.add(m2);
    // a wide low haze band lying along the far waterline — the atmospheric
    // seam between river and horizon
    const m3 = m.clone(); m3.material = m.material; m3.position.set(-30, 1.5, -88); m3.scale.set(1.6, 1.7, 1); H.add(m3);
    return m;
  })();

  /* ---- the sky's slow systems ---- */
  const clouds = createClouds({ count: ctx.isMobile ? 3 : 5, mobile: ctx.isMobile });
  H.add(clouds.group);
  const birds = createBirds({ mobile: ctx.isMobile });
  H.add(birds.group);

  const api = {
    group: g, gate, deepas, veg, grass, hemi, sun, fill, clouds, birds,
    setVisible(v) { g.visible = v; },
    placeWord() {},
    update(time, openT, reduced, fogDensity = .006, camera = null, dt = .016) {
      const a = openT;
      fogC.copy(fogNight).lerp(fogDay, a);
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
      hemi.intensity = 1.15 * a;
      sun.intensity = 2.9 * a;
      fill.intensity = 1.0 * a;
      edge.intensity = 1.0 * a;
      amb.intensity = .34 * a;
      brndKey.intensity = .9 * a;
      brndGlow.material.opacity = .10 * a;                 // a breath of air, not a spotlight
      mist.material.opacity = .16 * a;
      for (const k in brnd.materials) {
        const m = brnd.materials[k]; if (!m || !m.color) continue;
        // the krishna-shila stays dark stone — only a whisper of lift
        const lift = (k === 'rosette') ? .92 : 1.0;
        m.color.setScalar(1 + (lift - 1) * a);
      }
      for (const d of deepas) {
        const f = d.userData.fl.userData.flicker(time + d.position.x * 2.7);
        d.userData.pl.intensity = a * (.5 + f * .22);
      }
      for (const s of veg) {
        const u = s.material.uniforms;
        u.uTime.value = time; u.uFade.value = a; u.uFogD.value = fogDensity;
        if (reduced) u.uSway.value = Math.min(u.uSway.value, .15);
      }
      for (const s of grass) {
        const u = s.material.uniforms;
        u.uTime.value = time; u.uSway.value = reduced ? .2 : 1; u.uFade.value = a; u.uLinear.value = 0; u.uFogD.value = fogDensity;
      }
      clouds.update(time, reduced ? 0 : dt);
      birds.update(time, reduced ? 0 : dt, camera);
    },
  };
  return api;
}
