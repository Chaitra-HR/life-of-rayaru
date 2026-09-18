// ANTARANGA · the opening composition (chapter 00 only)
// A stone gateway at three-quarter on the right, the Brindavana framed through
// it, the Tungabhadra across the lower third, first light from the upper right.
// Everything here is gated by scroll so the morning chapters are untouched.
import * as THREE from 'three';
import { mulberry, fbm, clamp01 } from '../util.js';
import { stoneMaps, stoneKey } from './stone-maps.js';
import { GLTFLoader } from '../../vendor/GLTFLoader.js';
import { MeshoptDecoder } from '../../vendor/meshopt_decoder.module.js';

/* ======================================================================
   Stone PBR — one seed drives four maps so they agree pixel for pixel:
   albedo (per-block colour variation, weathering), normal (derived from a
   height field of courses, joints, chisel and pitting), roughness and AO.

   THE MAPS ARE DRAWN OFF THE MAIN THREAD. Each 768² set is roughly a second
   and a half of solid arithmetic, and the opening needs four of them: built
   inline, that is some six seconds during which nothing can paint — which
   the visitor meets as a preloader that freezes and jumps. So stoneSet()
   still returns its four textures IMMEDIATELY, carrying a neutral 1×1 image,
   and a pool of workers fills them in. The material is complete from the
   first instant: same maps, same slots, so the program three compiles for it
   never changes and the swap costs one upload, not a recompile.

   Nothing may be shown before the stone has landed — stoneMapsReady() is the
   gate, and boot awaits it. Awaiting is free: the thread stays open, and the
   drawing keeps its frames the whole time.
   ====================================================================== */
const _stoneCache = new Map();
const _stonePending = new Set();

/* the pool: as many threads as the machine will honestly give, capped at the
   number of sets the opening actually asks for */
const STONE_THREADS = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1));
let _pool = null, _next = 0, _job = 0;
const _jobs = new Map();
function pool() {
  if (_pool) return _pool;
  try {
    _pool = [];
    for (let i = 0; i < STONE_THREADS; i++) {
      const w = new Worker(new URL('./stone-worker.js', import.meta.url), { type: 'module' });
      w.onmessage = (e) => {
        const job = _jobs.get(e.data.id);
        if (!job) return;
        _jobs.delete(e.data.id);
        job(e.data);
      };
      /* a thread that dies must not take the boot down with it: every job
         still out is failed here, and each one redraws itself inline */
      w.onerror = () => {
        _pool = null;
        for (const [id, job] of [..._jobs]) { _jobs.delete(id); job({ error: 'stone worker failed' }); }
      };
      _pool.push(w);
    }
  } catch (e) { _pool = null; }                      // no workers here: draw inline
  return _pool;
}

/* a texture that is valid on the first frame and repainted when the bytes
   arrive: one canvas, resized in place, so the texture object never changes */
function blankTex(fill, srgb) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1;
  const c2 = cv.getContext('2d');
  c2.fillStyle = fill; c2.fillRect(0, 0, 1, 1);
  const t = new THREE.CanvasTexture(cv);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
function paint(tex, arr, size) {
  const cv = tex.image;
  cv.width = cv.height = size;
  cv.getContext('2d').putImageData(new ImageData(arr, size, size), 0, 0);
  tex.needsUpdate = true;
}

export function stoneSet(seed, opts = {}) {
  const key = stoneKey(seed, opts);
  if (_stoneCache.has(key)) return _stoneCache.get(key);

  /* neutral until the real bytes land: white albedo, flat normal, full
     roughness, no occlusion — the stone reads pale for an instant it is
     never on screen for, and never wrong */
  const set = {
    map: blankTex('#ffffff', true),
    normalMap: blankTex('rgb(128,128,255)', false),
    roughnessMap: blankTex('#ffffff', false),
    aoMap: blankTex('#ffffff', false),
  };
  _stoneCache.set(key, set);

  const fill = (m) => {
    paint(set.map, m.alb, m.size);
    paint(set.normalMap, m.nrm, m.size);
    paint(set.roughnessMap, m.rough, m.size);
    paint(set.aoMap, m.ao, m.size);
  };

  const p = pool();
  if (!p) { fill(stoneMaps(seed, opts)); return set; }   // no worker: inline, as before

  const id = ++_job;
  const done = new Promise((res) => {
    const land = (data) => {
      clearTimeout(timer);
      if (data && data.error) fill(stoneMaps(seed, opts));   // the thread failed: draw it here
      else fill(data);
      res();
    };
    /* and if a thread simply never answers, the sheet is not held hostage:
       the set is drawn on this thread instead and the loader carries on */
    const timer = setTimeout(() => {
      if (!_jobs.has(id)) return;
      _jobs.delete(id);
      land({ error: 'stone worker timed out' });
    }, 15000);
    _jobs.set(id, land);
  });
  p[_next++ % p.length].postMessage({ id, seed, opts });
  _stonePending.add(done);
  done.then(() => _stonePending.delete(done));
  return set;
}

/* every stone set asked for so far, landed. The loader waits on this before
   the first frame is shown; it costs no thread time to wait. */
export function stoneMapsReady() { return Promise.all([..._stonePending]); }

export function stoneMaterial(seed, opts = {}, { normal = .9, ao = .85, roughness = 1, metalness = 0, color = 0xffffff } = {}) {
  const s = stoneSet(seed, opts);
  return new THREE.MeshStandardMaterial({
    map: s.map, normalMap: s.normalMap, normalScale: new THREE.Vector2(normal, normal),
    roughnessMap: s.roughnessMap, roughness, aoMap: s.aoMap, aoMapIntensity: ao, metalness, color,
  });
}

/* UV helpers — texture space is in world units so block scale is consistent */
const TEX_UNIT = 2.6;   // world units spanned by one texture tile
export function boxUV(geo, w, h, d) {
  const uv = geo.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let i = 0; i < uv.count; i++) {
    const f = Math.floor(i / 4);
    uv.setXY(i, uv.getX(i) * dims[f][0] / TEX_UNIT, uv.getY(i) * dims[f][1] / TEX_UNIT);
  }
  geo.setAttribute('uv1', geo.attributes.uv);
  return geo;
}
function roundUV(geo, circ, h) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * circ / TEX_UNIT, uv.getY(i) * h / TEX_UNIT);
  geo.setAttribute('uv1', geo.attributes.uv);
  return geo;
}
export function shadowed(m) { m.castShadow = true; m.receiveShadow = true; return m; }

/* Box-projected UVs in world units: each vertex is mapped by its dominant
   normal axis, so a carved model with meaningless CAD UVs wears the stone
   maps at a consistent scale on every face. */
function projectUV(geo, matrixWorld, unit = TEX_UNIT) {
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const n = pos.count, uv = new Float32Array(n * 2);
  const p = new THREE.Vector3(), nn = new THREE.Vector3();
  const nm = new THREE.Matrix3().getNormalMatrix(matrixWorld);
  for (let i = 0; i < n; i++) {
    p.fromBufferAttribute(pos, i).applyMatrix4(matrixWorld);
    nn.fromBufferAttribute(nor, i).applyMatrix3(nm);
    const ax = Math.abs(nn.x), ay = Math.abs(nn.y), az = Math.abs(nn.z);
    let u, v;
    if (ay >= ax && ay >= az) { u = p.x; v = p.z; }
    else if (ax >= az) { u = p.z; v = p.y; }
    else { u = p.x; v = p.y; }
    uv[i * 2] = u / unit; uv[i * 2 + 1] = v / unit;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('uv1', geo.attributes.uv);
}

/* The temple arch (Er. B. Nijithkumar, Sketchfab, CC-BY-4.0), re-dressed in
   the site's stone: granite body with a slightly warmer carved crown. */
const ARCH_HEIGHT = 8.3;
export async function loadArch(into, ctx, height = ARCH_HEIGHT) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);   // models ship EXT_meshopt_compression (22MB → 4.2MB house)
  const gltf = await loader.loadAsync('./models/temple_arch.glb');
  const root = gltf.scene;
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const sc = height / size.y;
  // re-centre on the ground at the origin, scale to the site
  const holder = new THREE.Group();
  root.position.set(-(box.min.x + box.max.x) / 2 * sc, -box.min.y * sc, -(box.min.z + box.max.z) / 2 * sc);
  root.scale.setScalar(sc);
  holder.add(root);
  holder.updateMatrixWorld(true);
  const body = stoneMaterial(71, { base: [92, 90, 88], courses: 1, cols: 1, jointPx: .01, vary: .18, cool: .05, warm: .05, chisel: .45, size: 1024 }, { normal: .8, ao: .6 });
  const crown = stoneMaterial(73, { base: [104, 98, 90], courses: 1, cols: 1, jointPx: .01, vary: .16, cool: .03, warm: .07, chisel: .35, size: 1024 }, { normal: .7, ao: .6 });
  body.side = crown.side = THREE.FrontSide;
  const lintelTop = height * .56;   // above this the shrine forms begin
  root.traverse(o => {
    if (!o.isMesh) return;
    // split shared vertices so each face can carry its own projected uv
    o.geometry = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
    projectUV(o.geometry, o.matrixWorld);
    const b = new THREE.Box3().setFromObject(o);
    o.material = b.min.y > lintelTop ? crown : body;
    o.castShadow = o.receiveShadow = true;
    o.frustumCulled = false;
  });
  into.add(holder);
  return holder;
}

/* ----------------------------------------------------------------------
   RAYARU · the shrine form.

   Wherever Rayaru is present in this world he is THIS object, at this
   scale, in this stone: seated in padmāsana, the right hand raised in
   abhaya, the japamālā at his neck, the prabhāvalī and its canopy behind
   him. One model, loaded once and shared — scene 04 and scene 07 hold
   clones of the same geometry, so the second scene costs nothing.

   Scanned at 1.13M triangles; welded, simplified and meshopt-compressed to
   211k / 1.4MB (weld + simplify --ratio .15 --error .0005 + quantize +
   meshopt, the same recipe as the arch and the house). The scan carries
   vertex colours, but they are near-white and say nothing — the stone is
   ours, so the lamps in each scene can actually land on his face.
   ---------------------------------------------------------------------- */
export const RAYARU_HEIGHT = 1.62;      // the shrine form, floor to canopy
let _rayaru = null;                     // the loaded original, cloned per scene
const _rayaruPending = new Set();

/* every Rayaru asked for so far, in its scene. A chapter waits on this
   before it compiles: a 211k-triangle mesh that arrives AFTER the compile
   would compile itself on the visitor's first frame in the room, which is
   exactly the hitch the warm pass exists to prevent. */
export function rayaruReady() { return Promise.all([..._rayaruPending]); }

export function loadRayaru(into, opts) {
  const p = _loadRayaru(into, opts);
  _rayaruPending.add(p);
  p.then(() => _rayaruPending.delete(p), () => _rayaruPending.delete(p));
  return p;
}

async function _loadRayaru(into, { height = RAYARU_HEIGHT } = {}) {
  if (!_rayaru) {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    _rayaru = (await loader.loadAsync('./models/rayaru.glb')).scene;
  }
  const root = _rayaru.clone(true);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const sc = height / size.y;
  /* stand him on the ground at the origin, facing +z — the direction every
     camera that looks at him comes from */
  const holder = new THREE.Group();
  root.position.set(-(box.min.x + box.max.x) / 2 * sc, -box.min.y * sc, -(box.min.z + box.max.z) / 2 * sc);
  root.scale.setScalar(sc);
  holder.add(root);
  holder.updateMatrixWorld(true);

  /* carved stone, warm — dark enough to sit in a night scene, light enough
     that a lamp two feet away reads on the cheek and on the raised hand */
  const stone = new THREE.MeshStandardMaterial({
    color: 0x6b5843, roughness: .82, metalness: 0,
    vertexColors: false, side: THREE.FrontSide,
  });
  root.traverse(o => {
    if (!o.isMesh) return;
    if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
    o.material = stone;
    o.castShadow = o.receiveShadow = true;
    o.frustumCulled = false;
  });
  holder.userData.material = stone;      // the scene may re-tint him to its own light
  into.add(holder);
  return holder;
}

/* ======================================================================
   The gateway — stepped plinths, moulded bases, octagonal shafts, bracketed
   capitals, a chamfered lintel with dentil fascia, oversailing cornice and
   a tiered pediment crowned by kalashas.
   ====================================================================== */
function buildGate(ctx) {
  const ashlar = stoneMaterial(51, { base: [88, 91, 94], vary: .24, cool: .07, warm: .035 }, { normal: 1.0 });
  const trim = stoneMaterial(63, { base: [96, 97, 98], courses: 3, cols: 6, vary: .16, cool: .04, warm: .04, chisel: .25 }, { normal: .7, ao: .7 });
  const brass = new THREE.MeshStandardMaterial({ color: 0x5a4420, roughness: .42, metalness: .8 });

  const gate = new THREE.Group();
  const box = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(boxUV(new THREE.BoxGeometry(w, h, d), w, h, d), mat);
    m.position.set(x, y, z); return shadowed(m);
  };
  const lathe = (pts, mat, segs = 8, x = 0, y = 0, z = 0) => {
    const geo = new THREE.LatheGeometry(pts, segs);
    const r = Math.max(...pts.map(p => p.x)), hh = Math.max(...pts.map(p => p.y)) - Math.min(...pts.map(p => p.y));
    roundUV(geo, r * 6.3, hh);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.rotation.y = Math.PI / segs;
    return shadowed(m);
  };
  const V2 = (x, y) => new THREE.Vector2(x, y);
  const kalasha = (s = 1) => {
    const k = new THREE.Mesh(new THREE.LatheGeometry([V2(0, 0), V2(.09, .01), V2(.12, .07), V2(.06, .15), V2(.1, .21), V2(.07, .29), V2(.02, .33), V2(.012, .43), V2(0, .47)].map(p => p.multiplyScalar(s)), 18), brass);
    return shadowed(k);
  };

  const half = 1.95;
  for (const s of [-1, 1]) {
    const x = s * half;
    // stepped plinth
    gate.add(box(1.62, .34, 1.62, trim, x, .17, 0));
    gate.add(box(1.40, .26, 1.40, ashlar, x, .47, 0));
    // moulded base (torus-like profile)
    gate.add(lathe([V2(.70, 0), V2(.70, .08), V2(.62, .14), V2(.66, .22), V2(.56, .30), V2(.50, .34), V2(.50, .36)], trim, 8, x, .60, 0));
    // octagonal shaft with a slight entasis
    gate.add(lathe([V2(.50, 0), V2(.49, .9), V2(.47, 1.8), V2(.44, 2.7), V2(.42, 3.0)], ashlar, 8, x, .96, 0));
    // capital: neck, bracket flare, abacus
    gate.add(lathe([V2(.42, 0), V2(.46, .06), V2(.52, .14), V2(.62, .24), V2(.70, .30), V2(.70, .34)], trim, 8, x, 3.96, 0));
    gate.add(box(1.46, .2, 1.46, ashlar, x, 4.42, 0));
    gate.add(box(1.64, .2, 1.64, trim, x, 4.62, 0));
  }
  // lintel: deep chamfered beam
  {
    const w = half * 2 + 1.7, h = .58, d = 1.12, c = .10;
    const sh = new THREE.Shape();
    sh.moveTo(-d / 2 + c, -h / 2); sh.lineTo(d / 2 - c, -h / 2); sh.lineTo(d / 2, -h / 2 + c);
    sh.lineTo(d / 2, h / 2 - c); sh.lineTo(d / 2 - c, h / 2); sh.lineTo(-d / 2 + c, h / 2);
    sh.lineTo(-d / 2, h / 2 - c); sh.lineTo(-d / 2, -h / 2 + c); sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false });
    geo.rotateY(Math.PI / 2); geo.translate(-w / 2, 0, 0);
    // scale uvs (extrude uvs are in shape units)
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / TEX_UNIT, uv.getY(i) / TEX_UNIT);
    geo.setAttribute('uv1', geo.attributes.uv);
    const lintel = shadowed(new THREE.Mesh(geo, ashlar));
    lintel.position.set(0, 5.01, 0);
    gate.add(lintel);
  }
  // dentil course: a run of small blocks under the cornice
  {
    const n = 17, dw = .22, gap = (half * 2 + 1.5) / n;
    const geo = boxUV(new THREE.BoxGeometry(dw, .16, .16), dw, .16, .16);
    const inst = new THREE.InstancedMesh(geo, trim, n * 2);
    const m = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      const x = -(half * 2 + 1.5) / 2 + gap * (i + .5);
      m.makeTranslation(x, 5.38, .62); inst.setMatrixAt(i, m);
      m.makeTranslation(x, 5.38, -.62); inst.setMatrixAt(n + i, m);
    }
    shadowed(inst); gate.add(inst);
  }
  gate.add(box(half * 2 + 2.2, .22, 1.42, trim, 0, 5.57, 0));   // cornice
  // tiered pediment
  gate.add(box(4.6, .36, 1.04, ashlar, 0, 5.86, 0));
  gate.add(box(3.6, .3, .94, trim, 0, 6.19, 0));
  gate.add(box(2.6, .28, .84, ashlar, 0, 6.48, 0));
  gate.add(box(1.6, .26, .74, trim, 0, 6.75, 0));
  for (const [kx, ky, ks] of [[0, 6.88, 1.15], [-1.0, 6.62, .72], [1.0, 6.62, .72], [-2.8, 5.68, .66], [2.8, 5.68, .66]]) {
    const k = kalasha(ks); k.position.set(kx, ky, 0); gate.add(k);
  }
  return { gate, ashlar, trim };
}

/* ======================================================================
   Sunrise rays — animated noise planes, depth-tested so the gateway
   occludes them: the light breaks across the pillars and the lintel.
   ====================================================================== */
function buildRays(count) {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uAmp: { value: 0 }, uSeed: { value: 0 }, uLinear: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
      uniform float uTime; uniform float uAmp; uniform float uSeed; uniform float uLinear; varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453123); }
      float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
      void main(){
        // soft-edged shaft, fading along its length
        float edge = smoothstep(0.0,0.42,vUv.x)*smoothstep(1.0,0.58,vUv.x);
        float len  = smoothstep(0.0,0.22,vUv.y)*smoothstep(1.0,0.30,vUv.y);
        // slow streaks drifting along the shaft, broken by a second octave
        float n = vn(vec2(vUv.x*5.0 + uSeed, vUv.y*1.6 - uTime*0.016));
        float m = vn(vec2(vUv.x*14.0 - uTime*0.006 + uSeed*3.1, vUv.y*3.0 + uTime*0.004));
        float a = edge*len*(0.3+0.7*n)*(0.55+0.45*m)*uAmp;
        vec3 rc = vec3(0.96, 0.74, 0.46);
        if (uLinear > 0.5) rc = pow(rc, vec3(2.2));
        gl_FragColor = vec4(rc, a);
      }`,
  });
  const rays = [];
  const geo = new THREE.PlaneGeometry(1, 1);
  for (let i = 0; i < count; i++) {
    const r = new THREE.Mesh(geo, mat.clone());
    r.material.uniforms.uSeed.value = i * 1.7;
    rays.push(r);
  }
  return rays;
}

/* ======================================================================
   River grass — sparse instanced blades, tips displaced asynchronously
   ====================================================================== */
function bladeGeometry() {
  const g = new THREE.BufferGeometry();
  const segs = 5, w0 = .045;
  const pos = [], uvs = [], idx = [];
  for (let s = 0; s <= segs; s++) {
    const t = s / segs, w = w0 * (1 - t * .92);
    pos.push(-w, t, t * t * .18, w, t, t * t * .18);
    uvs.push(0, t, 1, t);
  }
  for (let s = 0; s < segs; s++) { const a = s * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  g.setIndex(idx);
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  return g;
}
function grassPatch(count, area, hMin, hMax, seed, fogColor) {
  const geo = bladeGeometry();
  const inst = new THREE.InstancedMesh(geo, null, count);
  const phase = new Float32Array(count), amp = new Float32Array(count), tint = new Float32Array(count);
  const rnd = mulberry(seed);
  const clumps = [];
  for (let k = 0; k < 9; k++) clumps.push([area.x + rnd() * area.w, area.z + rnd() * area.d]);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    let x, z;
    if (rnd() < .7) { const c = clumps[(i * 5) % clumps.length]; x = c[0] + (rnd() + rnd() - 1) * .5; z = c[1] + (rnd() + rnd() - 1) * .45; }
    else { x = area.x + rnd() * area.w; z = area.z + rnd() * area.d; }
    const h = hMin + rnd() * (hMax - hMin);
    e.set((rnd() - .5) * .5, rnd() * Math.PI * 2, (rnd() - .5) * .55);
    q.setFromEuler(e);
    m.compose(v.set(x, area.y, z), q, s.set(1 + rnd() * .6, h, 1));
    inst.setMatrixAt(i, m);
    phase[i] = rnd() * Math.PI * 2; amp[i] = .5 + rnd(); tint[i] = rnd();
  }
  geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1));
  geo.setAttribute('aAmp', new THREE.InstancedBufferAttribute(amp, 1));
  geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(tint, 1));
  inst.material = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 }, uSway: { value: 1 }, uFade: { value: 1 },
      uBase: { value: new THREE.Color(0x0b110d) }, uTip: { value: new THREE.Color(0x3f5a3a) },
      uSunTip: { value: new THREE.Color(0x9a8a52) }, uFog: { value: fogColor },
    },
    transparent: true, depthWrite: true,
    vertexShader: `
      attribute float aPhase; attribute float aAmp; attribute float aTint;
      uniform float uTime; uniform float uSway;
      varying float vT; varying float vTint; varying float vDepth;
      void main(){
        vT = uv.y; vTint = aTint;
        vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
        float tip = uv.y * uv.y;
        // each blade on its own clock: a slow breathe and an occasional gust
        float breeze = sin(uTime*0.45 + aPhase) * 0.6 + sin(uTime*0.23 + wp.x*0.4 + aPhase*0.7) * 0.4;
        float gust = pow(sin(uTime*0.17 - wp.x*0.15 + aPhase*0.3)*0.5+0.5, 3.0);
        wp.x += tip * aAmp * uSway * (0.05*breeze + 0.08*gust);
        wp.z += tip * aAmp * uSway * 0.03 * sin(uTime*0.31 + aPhase*1.9);
        vec4 mv = viewMatrix * wp;
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uBase; uniform vec3 uTip; uniform vec3 uSunTip; uniform vec3 uFog; uniform float uFade;
      varying float vT; varying float vTint; varying float vDepth;
      void main(){
        vec3 col = mix(uBase, uTip, pow(vT, 1.5));
        // only some blade tips catch the low sun
        col = mix(col, uSunTip, smoothstep(0.55, 1.0, vT) * step(0.72, vTint) * 0.55);
        col *= 0.75 + 0.5 * vTint;
        float f = 1.0 - exp(-vDepth*vDepth*0.00006);
        col = mix(col, uFog, f);
        gl_FragColor = vec4(col, uFade);
      }`,
  });
  inst.frustumCulled = false;
  return inst;
}

/* ======================================================================
   The monumental word — crisp, light weight, cropped by the frame
   ====================================================================== */
function wordPlane() {
  const W = 4096, H = 640;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  x.clearRect(0, 0, W, H);
  x.font = '400 470px "Marcellus", serif';
  x.fillStyle = '#fff';
  x.textBaseline = 'middle';
  const word = 'ANTARANGA', LS = 30;
  let w = 0; for (const ch of word) w += x.measureText(ch).width + LS;
  const scale = Math.min(1, (W * .985) / (w - LS));
  x.save(); x.translate(W / 2, H / 2); x.scale(scale, scale);
  let cx = -(w - LS) / 2;
  for (const ch of word) { x.fillText(ch, cx, 0); cx += x.measureText(ch).width + LS; }
  x.restore();
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: .96, depthWrite: false, depthTest: true, fog: false, color: 0xe9e2d2, toneMapped: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, H / W), mat);
  m.frustumCulled = false; m.renderOrder = 5;
  return m;
}

/* ======================================================================
   Painted grass — a cutout sheet: a bank silhouette, thousands of blades
   drawn far-to-near, each shaded by its lean against the light, graded
   with sky on the crest and sun bounce from the right. Three such sheets
   at different depths, swayed in the vertex shader, are what read as a
   living bank; instanced geometry never did.
   ====================================================================== */
/* 36 of these exist across the river and the yard; at 2048×1024 RGBA with
   mipmaps that was ~400 MB of texture on a phone, and the silhouette is
   the same at half size on a phone's screen */
const SMALL = window.matchMedia('(max-width: 768px)').matches || ('ontouchstart' in window && window.innerWidth < 900);
export function grassCutout(seed, opt = {}) {
  const W = opt.w || (SMALL ? 1024 : 2048), H = opt.h || (SMALL ? 512 : 1024);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const rr = mulberry(seed);
  const crest = opt.crest ?? .46, peak = opt.peak ?? .58, wide = opt.wide ?? .42;
  const rough = opt.rough ?? 0;                    // 0 smooth mound … 1 broken, ragged crest
  const prof = new Float32Array(W);
  for (let i = 0; i < W; i++) {
    const t = i / W;
    let m = Math.exp(-Math.pow((t - crest) / wide, 2) * 2.1);
    m += .46 * Math.exp(-Math.pow((t - crest - (opt.crest2 ?? .40)) / (wide * .62), 2) * 3.1);
    m += .30 * Math.exp(-Math.pow((t - crest + (opt.crest3 ?? .46)) / (wide * .70), 2) * 3.4);
    const g = fbm(t * 4.2 + seed, .5, 4) + .5;
    let p = m * (.80 + .38 * g);
    if (rough) {
      // clumps, not a sculpted hump: mid- and fine-scale bites out of the crest
      const g2 = fbm(t * 11 + seed * 2.3, 1.5, 3) + .5;
      const g3 = fbm(t * 27 + seed * 4.1, 2.5, 2) + .5;
      p *= 1 - rough * (.42 * Math.pow(1 - g2, 1.6) + .22 * Math.pow(1 - g3, 2.0));
    }
    prof[i] = p;
  }
  let pk = 0; for (let i = 0; i < W; i++) pk = Math.max(pk, prof[i]);
  for (let i = 0; i < W; i++) prof[i] *= H * peak / pk;
  const surf = i => H - prof[Math.max(0, Math.min(W - 1, i | 0))];
  // body (body:false leaves loose blades only — stragglers, not a mound)
  if (opt.body !== false) {
    x.beginPath(); x.moveTo(0, H);
    for (let i = 0; i < W; i += 3) x.lineTo(i, surf(i));
    x.lineTo(W, surf(W - 1)); x.lineTo(W, H); x.closePath();
    const bg = x.createLinearGradient(0, H - H * peak, 0, H);
    if (opt.day) { bg.addColorStop(0, '#5c6a48'); bg.addColorStop(.4, '#46523a'); bg.addColorStop(1, '#33392c'); }
    else { bg.addColorStop(0, '#182214'); bg.addColorStop(.4, '#0d140b'); bg.addColorStop(1, '#040604'); }
    x.fillStyle = bg; x.fill();
  }
  // blades, far (high) first
  const N = opt.blades || 12000, blades = [];
  for (let k = 0; k < N; k++) {
    const i = (rr() * W) | 0, sy = surf(i);
    const depth = Math.pow(rr(), 2.3);
    const by = sy + depth * (H - sy) + (rr() - .5) * 6;
    if (by > H + 20) continue;
    blades.push([i, by, depth, rr(), rr(), rr()]);
  }
  blades.sort((p, q) => p[1] - q[1]);
  const LIGHT = opt.light || [.42, -.91];           // sun from the upper right
  const LEN = (opt.len || 44) * (W / 2048);
  const warmAmt = opt.warm ?? 1, wind = opt.wind ?? .12;
  const sat = v => Math.max(0, Math.min(1, v));
  for (const [i, by, depth, r1, r2, r3] of blades) {
    const bx = i + (r1 - .5) * 5, grow = 1 - .52 * depth;
    const len = LEN * (.36 + 1.05 * r2 * r2) * grow;
    const lean = (r3 - .5) * 1.5 + wind;
    const tipx = bx + lean * len * .95, tipy = by - len;
    const cx2 = bx + lean * len * .3, cy2 = by - len * .62;
    const w = (.9 + 1.9 * r1) * grow * (W / 2048);
    const dx = tipx - bx, dy = tipy - by, il = 1 / Math.hypot(dx, dy);
    const ndl = sat((-(dx * il) * LIGHT[0] - (dy * il) * LIGHT[1]) * .5 + .5);
    const open = Math.pow(1 - depth, 1.35);
    const l = .07 + .38 * open + .36 * ndl * open;
    const warm = sat(open * 1.25 - .42) * warmAmt;
    let R = 10 + 78 * l + 40 * warm, G = 16 + 104 * l + 26 * warm, B = 12 + 78 * l + 10 * warm;
    if (opt.day) { R = 70 + 90 * l + 20 * warm; G = 84 + 96 * l + 14 * warm; B = 52 + 54 * l; }
    x.fillStyle = `rgb(${R | 0},${G | 0},${B | 0})`;
    x.beginPath();
    x.moveTo(bx - w, by);
    x.quadraticCurveTo(cx2 - w * .35, cy2, tipx, tipy);
    x.quadraticCurveTo(cx2 + w * .35, cy2, bx + w, by);
    x.closePath(); x.fill();
  }
  // grade: sun bounce from the right, cold sky on the crest
  x.globalCompositeOperation = 'source-atop';
  const rb = x.createLinearGradient(W, 0, 0, 0);
  rb.addColorStop(0, 'rgba(170,96,30,.22)'); rb.addColorStop(.55, 'rgba(130,70,24,.06)'); rb.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = rb; x.fillRect(0, 0, W, H);
  const sk = x.createLinearGradient(0, H - H * peak * 1.05, 0, H);
  sk.addColorStop(0, 'rgba(110,140,185,.13)'); sk.addColorStop(.35, 'rgba(80,100,140,.04)'); sk.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = sk; x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = 'source-over';
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
export function grassSheet(tex, w, h, fogColor) {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { map: { value: tex }, uTime: { value: 0 }, uSway: { value: 1 }, uFade: { value: 1 }, uTint: { value: 1 }, uFog: { value: fogColor }, uFogD: { value: .01 }, uLinear: { value: 0 } },
    vertexShader: `
      uniform float uTime, uSway; varying vec2 vUv; varying float vDepth;
      void main(){
        vUv = uv;
        vec3 p = position;
        float h = uv.y;
        p.x += (sin(uTime*0.55 + uv.x*9.0) * 0.35 + sin(uTime*0.23 + uv.x*3.1) * 0.65) * uSway * 0.05 * h * h;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D map; uniform float uFade, uFogD, uLinear, uTint; uniform vec3 uFog;
      varying vec2 vUv; varying float vDepth;
      void main(){
        vec4 c = texture2D(map, vUv);
        // dissolve the sheet's own edges so no bank ends on a straight line
        float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x) * smoothstep(0.0, 0.06, vUv.y);
        float a = c.a * edge * uFade;
        if (a < 0.01) discard;
        vec3 col = c.rgb * uTint;              // sampled linear (sRGB texture)
        float f = 1.0 - exp(-uFogD*uFogD*vDepth*vDepth);
        col = mix(col, uFog, f);
        if (uLinear < 0.5) col = pow(max(col, 0.0), vec3(1.0/2.2));
        gl_FragColor = vec4(col, a);
      }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.frustumCulled = false;
  return m;
}

/* ======================================================================
   Tree line — a row of individually drawn trees: a trunk, a few branches,
   foliage clustered along them with crown sizes that vary tree to tree.
   `dark` 0..1 sets how much detail shows (near trees show some leaf
   light; far ones are near-silhouettes).
   ====================================================================== */
function treeLine(seed, { n = 8, hMin = .5, hMax = 1, dark = .6, x0 = 0, x1 = 1 } = {}) {
  const W = 2048, H = 1024, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d'); const rr = mulberry(seed);
  x.clearRect(0, 0, W, H);
  const trees = [];
  for (let i = 0; i < n; i++) {
    const u = x0 + (i + rr() * .8 + .1) / n * (x1 - x0);
    trees.push({ px: u * W, h: (hMin + rr() * (hMax - hMin)) * H, kind: rr(), seed: rr() * 100 });
  }
  trees.sort((a, b) => a.h - b.h);                        // short (far) first
  const blob = (bx, by, r, k, lit) => {
    const base = [6, 12, 9];
    const R = base[0] + lit * 54, G = base[1] + lit * 40, B = base[2] + lit * 14;
    x.fillStyle = `rgba(${R | 0},${G | 0},${B | 0},${.88 + k * .1})`;
    x.beginPath();
    for (let j = 0; j < 10; j++) {
      const a = j / 10 * Math.PI * 2, rr2 = r * (.7 + .34 * Math.sin(a * 3 + k * 11) * Math.sin(a * 5 + k * 7));
      const ax = bx + Math.cos(a) * rr2, ay = by + Math.sin(a) * rr2 * .78;
      j ? x.lineTo(ax, ay) : x.moveTo(ax, ay);
    }
    x.closePath(); x.fill();
  };
  for (const tr of trees) {
    const t = mulberry(tr.seed);
    const gy = H, top = H - tr.h, trunkH = tr.h * (.30 + .2 * tr.kind);
    const tw = 6 + tr.h * .04;
    // trunk
    x.strokeStyle = '#060705'; x.lineCap = 'round';
    x.lineWidth = tw; x.beginPath(); x.moveTo(tr.px, gy + 10); x.lineTo(tr.px + (t() - .5) * 30, gy - trunkH); x.stroke();
    // branches, each carrying a cluster of foliage
    const nb = 3 + Math.floor(t() * 4);
    const spread = tr.h * (.28 + .32 * tr.kind);
    for (let b = 0; b < nb; b++) {
      const ang = -Math.PI / 2 + (b / (nb - 1) - .5) * (1.5 + tr.kind * .8) + (t() - .5) * .5;
      const len = spread * (.5 + t() * .7);
      const sx = tr.px + (t() - .5) * 18, sy = gy - trunkH * (.7 + t() * .4);
      const ex = sx + Math.cos(ang) * len, ey = Math.min(sy + Math.sin(ang) * len, top);
      x.lineWidth = tw * (.35 + t() * .3); x.beginPath(); x.moveTo(sx, sy);
      x.quadraticCurveTo(sx + (ex - sx) * .5 + (t() - .5) * 40, sy + (ey - sy) * .6, ex, ey); x.stroke();
      const nl = 16 + Math.floor(t() * 22), cr = spread * (.09 + t() * .09);
      for (let l = 0; l < nl; l++) {
        const q = .35 + t() * .75;
        const bx = sx + (ex - sx) * q + (t() - .5) * cr * 1.6, by = sy + (ey - sy) * q + (t() - .5) * cr * 1.2;
        const r = cr * (.35 + t() * .75);
        const lit = Math.max(0, (1 - dark) * (t() * .9 - .35 + (bx - tr.px) / spread * .25));
        blob(bx, by, r, t(), lit);
      }
    }
  }
  // depth grade: far layers dissolve into sky at the crown and go cool
  x.globalCompositeOperation = 'source-atop';
  const sg = x.createLinearGradient(0, 0, 0, H);
  sg.addColorStop(0, `rgba(60,80,120,${.10 + dark * .22})`); sg.addColorStop(.6, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,0,.4)');
  x.fillStyle = sg; x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = 'source-over';
  const tx = new THREE.CanvasTexture(cv);
  tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
  return tx;
}

/* ======================================================================
   Treeline — painted silhouettes: a ridge of rounded crowns, unlit, with a
   band of mist between it and the architecture. Far planes, flat colour,
   no leaf detail: at this distance detail is what reads as fake.
   ====================================================================== */
function ridgeTexture(seed, { base = .40, amp = .30, crowns = 420, col = '#06090d' } = {}) {
  const W = 2048, H = 512, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d'); const rr = mulberry(seed);
  const ridge = t => base + amp * (fbm(t * 2.4 + seed, .5, 4) + .5) + .14 * (fbm(t * 7.5 + seed * 3, 3.1, 3) + .5);
  x.fillStyle = col;
  x.beginPath(); x.moveTo(0, H);
  for (let i = 0; i <= W; i += 4) x.lineTo(i, H - ridge(i / W) * H * .84);
  x.lineTo(W, H); x.closePath(); x.fill();
  // rounded crowns along the crest — tamarind and mango, not conifers
  for (let i = 0; i < crowns; i++) {
    const px = rr() * W, t = px / W, by = H - ridge(t) * H * .84;
    const r = 10 + rr() * 34;
    x.beginPath(); x.arc(px, by - r * .3 + rr() * 8, r, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.arc(px + (rr() - .5) * r, by - r * .8, r * .6, 0, Math.PI * 2); x.fill();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function ridge(tex, w, h) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
  m.frustumCulled = false;
  return m;
}
function glowTex(inner, outer) {
  const S = 256, cv = document.createElement('canvas'); cv.width = S; cv.height = S;
  const x = cv.getContext('2d');
  const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, inner); g.addColorStop(.55, outer); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* a low colonnaded wall — restrained stone along the right edge */
function buildWall(len, mat, trimMat) {
  const w = new THREE.Group();
  const mk = (bw, bh, bd, m, x, y, z) => { const b = shadowed(new THREE.Mesh(boxUV(new THREE.BoxGeometry(bw, bh, bd), bw, bh, bd), m)); b.position.set(x, y, z); return b; };
  w.add(mk(1.2, 1.2, len, mat, 0, .6, 0));                  // base rising from the water
  w.add(mk(1.4, .18, len + .2, trimMat, 0, 1.29, 0));       // plinth course
  w.add(mk(.8, 2.0, len, mat, 0, 2.38, 0));                 // wall
  for (let z = -len / 2 + 1; z < len / 2; z += 2.2) w.add(mk(1.1, 2.1, .5, trimMat, 0, 2.4, z));   // pilasters
  w.add(mk(1.3, .22, len + .3, trimMat, 0, 3.5, 0));        // cornice
  return w;
}

/* The chapter-00 assembly that used to live here (createOpening and its
   APPROACH_ROT / GATE_Z / BRND_LOCAL / approachToWorld / STYLED constants)
   was superseded by world/hero.js and has been removed. What remains is the
   shared toolkit hero.js and river.js build the opening FROM: the stone set
   and its material, boxUV, shadowed, loadArch, and the grass cutout/sheet. */
