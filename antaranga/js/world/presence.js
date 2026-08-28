// ANTARANGA · scene 09 — Presence. The stones become points of light, names
// pass in the dark, and the lights quietly reassemble the Brindavana outside.
import * as THREE from 'three';
import { buildBrindavana } from './brindavana.js';
import { BRND_POS } from './river.js';
import { glowTexture, mulberry, lerp, clamp01, remap, smooth, win, V3 } from '../util.js';

/* sample points on the brindavana's surface for the reassembly */
function sampleBrindavana(n) {
  const tmp = buildBrindavana({ withMala: false });
  tmp.group.position.copy(BRND_POS);
  tmp.group.updateMatrixWorld(true);
  const tris = [];
  let areaSum = 0;
  const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
  tmp.group.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh) return;
    const geo = o.geometry;
    const pos = geo.attributes.position;
    const idx = geo.index;
    const triCount = idx ? idx.count / 3 : pos.count / 3;
    const stride = Math.max(1, Math.floor(triCount / 60));
    for (let t = 0; t < triCount; t += stride) {
      const i0 = idx ? idx.getX(t * 3) : t * 3;
      const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
      const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
      va.fromBufferAttribute(pos, i0).applyMatrix4(o.matrixWorld);
      vb.fromBufferAttribute(pos, i1).applyMatrix4(o.matrixWorld);
      vc.fromBufferAttribute(pos, i2).applyMatrix4(o.matrixWorld);
      const area = vb.clone().sub(va).cross(vc.clone().sub(va)).length() * .5;
      if (area <= 0) continue;
      areaSum += area;
      tris.push({ a: va.clone(), b: vb.clone(), c: vc.clone(), cum: areaSum });
    }
  });
  const rnd = mulberry(909);
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const target = rnd() * areaSum;
    let lo = 0, hi = tris.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (tris[mid].cum < target) lo = mid + 1; else hi = mid; }
    const tri = tris[lo];
    let u = rnd(), v = rnd();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const p = tri.a.clone()
      .addScaledVector(vb.copy(tri.b).sub(tri.a), u)
      .addScaledVector(vc.copy(tri.c).sub(tri.a), v);
    out[i * 3] = p.x; out[i * 3 + 1] = p.y; out[i * 3 + 2] = p.z;
  }
  return out;
}

export function createPresenceStage(ctx) {
  const g = new THREE.Group();
  g.visible = false;
  const rnd = mulberry(919);

  const N = ctx.isMobile ? 520 : 1100;
  const targets = sampleBrindavana(N);

  /* per-point spread positions: a calm field wrapped around the pull-back path */
  const spread = new Float32Array(N * 3);
  const seeds = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 1.5 + Math.pow(rnd(), .7) * 14;
    spread[i * 3] = Math.cos(a) * r;
    spread[i * 3 + 1] = .4 + rnd() * 8;
    spread[i * 3 + 2] = BRND_POS.z + 3 + rnd() * 30;
    seeds[i] = rnd();
  }
  const positions = new Float32Array(N * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xd9a860, size: .17, sizeAttenuation: true, map: glowTexture(),
    transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  pts.frustumCulled = false;
  g.add(pts);

  /* (the earlier name typography was retired: this passage now belongs to
     the Mruttika narrative — the light itself carries it, the DOM explains) */

  const amb = new THREE.AmbientLight(0x0a0a0c, 1);
  g.add(amb);

  /* camera: pulled slowly backwards out of the dark, ending outside */
  const cam = (u) => {
    const v = smooth(u);
    return {
      pos: V3(
        lerp(.4, 0, v),
        lerp(1.6, 2.05, v),
        lerp(BRND_POS.z + 4.5, 8, easeOutQ(v))
      ),
      look: V3(0, lerp(1.8, 3.1, v), BRND_POS.z),
      fov: lerp(40, 42, v),
    };
  };

  return {
    group: g,
    setVisible(v) { g.visible = v; },
    cam,
    update(time, globalT, u) {
      /* emerge + spread (0–.45), reassemble (.5–.9), hand over (.9–1) */
      const emerge = smooth(remap(u, 0, .1));
      const gather = smooth(remap(u, .5, .88));
      const handover = smooth(remap(u, .9, 1));

      for (let i = 0; i < N; i++) {
        const s = seeds[i];
        const stagger = clamp01((gather - s * .25) / .75);
        const gg = smooth(stagger);
        const drift = Math.sin(time * .2 + s * 9) * .12 * (1 - gg);
        // from a tight center out to the spread field, then into the silhouette
        const ex = smooth(remap(u, 0, .3 + s * .2));
        const cx = 0, cy = 1.5, cz = BRND_POS.z + 6;
        let x = lerp(cx, spread[i * 3], ex) + drift;
        let y = lerp(cy, spread[i * 3 + 1], ex) + drift * .6;
        let z = lerp(cz, spread[i * 3 + 2], ex);
        x = lerp(x, targets[i * 3], gg);
        y = lerp(y, targets[i * 3 + 1], gg);
        z = lerp(z, targets[i * 3 + 2], gg);
        positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z;
      }
      geo.attributes.position.needsUpdate = true;
      pts.material.opacity = .85 * emerge * (1 - handover);
      pts.material.size = .1 * (1 - gather * .35);

    },
  };
}

function easeOutQ(t) { return 1 - (1 - t) * (1 - t); }
