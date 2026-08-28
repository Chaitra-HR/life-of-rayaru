// ANTARANGA · scene 07 / The Journey — WHAT GROWS AND WHAT LIES ON THE LAND.
// Everything here is instanced and placed by the field: forest gathers on
// the windward Ghats, palms follow the delta and the coast, scrub holds the
// dry basin, boulders belong to the Tungabhadra country. Nothing decorative
// is scattered for its own sake — the job of every one of these is to give
// the miniature architecture a sense of scale.
import * as THREE from 'three';
import { mergeGeometries } from '../../../vendor/BufferGeometryUtils.js';
import { clamp01, lerp, mulberry } from '../../util.js';
import { height, moisture, landness, riverField, trailNear, SITES, PAL } from './field.js';
import { LAND } from './terrain.js';

/* the Manchale approach: the one place the miniature is allowed to become
   full size, so the last leg stops reading as a map (see the brief, §17) */
const MANCHALE = { x: -2, z: -16 };
function lifeSize(x, z) {
  const d = Math.hypot(x - MANCHALE.x, z - MANCHALE.z);
  return 1 + (1 - clamp01((d - 3.0) / 11)) * 2.6;
}

/* ---------------- the pieces ---------------- */
function broadleaf() {
  // the polyhedra come out non-indexed, so the trunk has to be flattened
  // too — mergeGeometries refuses a mixed set and returns null
  const trunk = new THREE.CylinderGeometry(.018, .028, .16, 4);
  trunk.translate(0, .08, 0);
  const c1 = new THREE.IcosahedronGeometry(.13, 0);
  c1.scale(1, .82, 1); c1.translate(0, .24, 0);
  const c2 = new THREE.IcosahedronGeometry(.085, 0);
  c2.scale(1, .8, 1); c2.translate(.07, .32, -.04);
  return mergeGeometries([trunk.toNonIndexed(), c1, c2], false);
}

function palm() {
  const trunk = new THREE.CylinderGeometry(.012, .02, .34, 4);
  trunk.translate(0, .17, 0);
  const parts = [trunk];
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    const f = new THREE.PlaneGeometry(.22, .055);
    f.rotateX(-Math.PI / 2);
    f.rotateZ(.42);
    f.translate(.10, .35, 0);
    f.rotateY(a);
    parts.push(f);
  }
  return mergeGeometries(parts, false);
}

function scrub() {
  const g = new THREE.IcosahedronGeometry(.10, 0);
  g.scale(1.25, .58, 1.1);
  g.translate(0, .055, 0);
  return g;
}

function boulder() {
  const g = new THREE.IcosahedronGeometry(.16, 0);
  g.scale(1.1, .74, .92);
  g.translate(0, .07, 0);
  return g;
}

function reeds() {
  const parts = [];
  for (let i = 0; i < 5; i++) {
    const c = new THREE.ConeGeometry(.012, .19, 3);
    c.translate((i - 2) * .022, .095, (i % 2) * .02);
    c.rotateZ((i - 2) * .07);
    parts.push(c);
  }
  return mergeGeometries(parts, false);
}

/* One material recipe for everything instanced here. It carries two edits:
   a per-instance tint (r160 declares instanceColor in the vertex shader but
   never forwards it to the fragment, so the varying has to be our own), and
   a slow wind that bends anything standing up. */
function instancedMaterial(uniforms, { wind = 0, side = null } = {}) {
  const mat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
  if (side) mat.side = side;
  const bend = wind.toFixed(3), drift = (wind * .45).toFixed(3);
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', [
        '#include <common>',
        'varying vec3 vTint;',
        'uniform float uWind;',
        'uniform float uWindT;',
      ].join('\n'))
      .replace('#include <begin_vertex>', [
        '#include <begin_vertex>',
        '#ifdef USE_INSTANCING_COLOR',
        '  vTint = instanceColor;',
        '#else',
        '  vTint = vec3(1.0);',
        '#endif',
        '#ifdef USE_INSTANCING',
        '{',
        '  float ph = instanceMatrix[3][0] * .8 + instanceMatrix[3][2] * .55;',
        '  float lift = max(transformed.y, 0.0);',
        '  float sw = sin(uWindT * .9 + ph) * .7 + sin(uWindT * 1.9 + ph * 1.7) * .3;',
        '  transformed.x += sw * lift * uWind * ' + bend + ';',
        '  transformed.z += sw * lift * uWind * ' + drift + ';',
        '}',
        '#endif',
      ].join('\n'));
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTint;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n\tdiffuseColor.rgb *= vTint;');
  };
  return mat;
}

/* ---------------- placement ---------------- */
export function createScatter(ctx) {
  const group = new THREE.Group();
  const rnd = mulberry(4207);
  const uniforms = { uWind: { value: ctx.reduced ? 0 : 1 }, uWindT: { value: 0 } };

  const N = ctx.isMobile
    ? { tree: 1500, palm: 220, scrub: 600, rock: 90, reed: 240 }
    : { tree: 4200, palm: 520, scrub: 1400, rock: 190, reed: 560 };

  const bank = [];   // candidate sites, sampled once and shared
  const tries = ctx.isMobile ? 10000 : 22000;
  for (let i = 0; i < tries; i++) {
    const x = LAND.cx + (rnd() - .5) * LAND.w * .62;
    const z = LAND.cz + (rnd() - .5) * LAND.d * .78;
    const L = landness(x, z);
    if (L < .8) continue;                                   // not in the sea
    const rf = riverField(x, z);
    if (rf.near < -.2) continue;                            // not in the water
    const h = height(x, z, rf);
    if (h < -.05) continue;
    if (trailNear(x, z) < .8) continue;                     // the path stays clear
    let onSite = false;                                     // and so does each site
    for (const st of SITES) if (Math.hypot(x - st.x, z - st.z) < 2.6) { onSite = true; break; }
    if (onSite) continue;
    bank.push({ x, z, h, m: moisture(x, z, rf), near: rf.near, L });
  }

  const mk = (geo, mat, count, pick, seedOff) => {
    if (!count || !geo) return null;
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    const p = new THREE.Vector3(), sc = new THREE.Vector3();
    const col = new THREE.Color();
    const r2 = mulberry(seedOff);
    let n = 0;
    for (let i = 0; i < bank.length && n < count; i++) {
      const b = bank[(i * 7919 + seedOff) % bank.length];
      const got = pick(b, r2);
      if (!got) continue;
      const life = lifeSize(b.x, b.z);
      const s = got.s * lerp(1, life, got.life === undefined ? 1 : got.life);
      p.set(b.x, b.h - .01, b.z);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r2() * 6.283);
      sc.set(s * (.8 + r2() * .5), s * (.8 + r2() * .6), s * (.8 + r2() * .5));
      m.compose(p, q, sc);
      mesh.setMatrixAt(n, m);
      col.setHex(got.c);
      col.offsetHSL((r2() - .5) * .03, (r2() - .5) * .07, (r2() - .5) * .09);
      mesh.setColorAt(n, col);
      n++;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.frustumCulled = true;
    group.add(mesh);
    return mesh;
  };

  const leafMat = instancedMaterial(uniforms, { wind: .10 });
  const palmMat = instancedMaterial(uniforms, { wind: .07, side: THREE.DoubleSide });
  const scrubMat = instancedMaterial(uniforms, { wind: .05 });
  const reedMat = instancedMaterial(uniforms, { wind: .22 });
  const rockMat = instancedMaterial(uniforms, { wind: 0 });

  // forest: the wet side of the Ghats and the coastal strip
  mk(broadleaf(), leafMat, N.tree, (b, r) => {
    if (b.m < .42) return null;
    if (r() > (b.m - .38) * 1.9) return null;
    const c = b.m > .74 ? PAL.deepForest : b.m > .58 ? PAL.forest : PAL.scrub;
    return { s: lerp(.62, .95, b.m), c };
  }, 13);

  // palms: the delta, the riverbanks and the coast behind the beach
  mk(palm(), palmMat, N.palm, (b, r) => {
    const coastal = b.L < 5.5 && b.z > -6;
    const riverine = b.near < 2.4;
    if (!coastal && !riverine) return null;
    if (r() > .45) return null;
    return { s: .78, c: 0x606c46 };
  }, 29);

  // scrub: the dry basin, the rain shadow, the northern plateau
  mk(scrub(), scrubMat, N.scrub, (b, r) => {
    if (b.m > .55) return null;
    if (r() > .55 - b.m * .5) return null;
    return { s: lerp(.95, .68, b.m), c: b.m < .25 ? 0x7a7558 : PAL.scrub };
  }, 47);

  // reeds: only where there is water to stand in
  mk(reeds(), reedMat, N.reed, (b, r) => {
    if (b.near > 1.1 || b.near < -.1) return null;
    if (r() > .6) return null;
    return { s: .8, c: 0x6d7152 };
  }, 61);

  // boulders: rounded granite, and the Tungabhadra country is full of it
  mk(boulder(), rockMat, N.rock, (b, r) => {
    const tungabhadra = b.z < -2 && b.x > -14 && b.x < 8;
    const dry = b.m < .38;
    if (!tungabhadra && !dry) return null;
    if (r() > (tungabhadra ? .32 : .1)) return null;
    return { s: lerp(.6, 1.5, r()), c: 0x88816f };
  }, 83);

  return {
    group, uniforms,
    update(time) { if (!ctx.reduced) uniforms.uWindT.value = time; },
  };
}
