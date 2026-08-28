// ANTARANGA · scene 07 / The Journey — THE ROUTE.
// The terrain is already worn and paled along the path (see field.js); this
// is the fine line inside that wear — a shallow engraved trace lying on the
// ground. It is revealed only as far as the traveller has come:
//   Srirangam · Srirangam ── Kumbakonam · Srirangam ── Kumbakonam ── Madurai
// No glow, no dashes, no arrows, nothing that belongs to a user interface.
import * as THREE from 'three';
import { canvas, tex, mulberry } from '../../util.js';
import { height } from './field.js';
import { routeCurve } from './config.js';

/* the trace itself: pale dust in the middle, a faint dark score inside it,
   and both fading out well before the edge so nothing reads as a stroke */
function trailTexture() {
  const W = 64, H = 512;
  const [c, g] = canvas(W, H);
  const rnd = mulberry(311);
  g.clearRect(0, 0, W, H);
  for (let y = 0; y < H; y++) {
    // the path wanders a little inside its own width
    const wob = Math.sin(y * .06) * 3 + Math.sin(y * .017) * 5;
    for (let x = 0; x < W; x++) {
      const d = Math.abs(x - W / 2 - wob) / (W / 2);
      let a = Math.max(0, 1 - d * d * 2.4);
      a *= .55 + rnd() * .45;                      // the wear is uneven
      if (a <= .01) continue;
      const score = Math.exp(-Math.pow((x - W / 2 - wob) / 3.2, 2)) * .5;
      const v = 176 - score * 90;
      g.fillStyle = `rgba(${v | 0},${(v * .90) | 0},${(v * .74) | 0},${(a * .8).toFixed(3)})`;
      g.fillRect(x, y, 1, 1);
    }
  }
  const t = tex(c);
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function createRoute(ctx) {
  const curve = routeCurve();
  const N = ctx.isMobile ? 200 : 380;
  const HALF = .40;

  const pos = [], uv = [], route = [], idx = [];
  const p = new THREE.Vector3(), t = new THREE.Vector3();
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    curve.getPoint(s, p);
    curve.getTangent(s, t);
    const nx = -t.z, nz = t.x;
    const len = Math.hypot(nx, nz) || 1;
    const ox = nx / len * HALF, oz = nz / len * HALF;
    // both edges sit on their own ground, so the trace bends with the land
    const ax = p.x + ox, az = p.z + oz, bx = p.x - ox, bz = p.z - oz;
    pos.push(ax, height(ax, az) + .045, az);
    pos.push(bx, height(bx, bz) + .045, bz);
    uv.push(0, s * 26, 1, s * 26);
    route.push(s, s);
    if (i < N) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('aRoute', new THREE.Float32BufferAttribute(route, 1));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  const uniforms = { uReveal: { value: 0 }, uFade: { value: 1 } };
  const mat = new THREE.MeshStandardMaterial({
    map: trailTexture(), transparent: true, depthWrite: false,
    roughness: 1, metalness: 0, opacity: .85,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
  });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aRoute;\nvarying float vRoute;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRoute = aRoute;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vRoute;\nuniform float uReveal;\nuniform float uFade;')
      .replace('#include <alphamap_fragment>', `#include <alphamap_fragment>
        diffuseColor.a *= uFade * (1.0 - smoothstep(uReveal - 0.020, uReveal, vRoute));
        if (diffuseColor.a < 0.004) discard;`);
  };

  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 4;

  return {
    mesh, curve, uniforms,
    /* how far along the route the traveller has come, 0–1 */
    setReveal(v) { uniforms.uReveal.value = v; },
    /* the whole trace withdraws as the map gives way to Manchale itself */
    setFade(v) { uniforms.uFade.value = v; },
  };
}
