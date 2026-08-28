// ANTARANGA · the opening composition (chapter 00 only)
// A stone gateway at three-quarter on the right, the Brindavana framed through
// it, the Tungabhadra across the lower third, first light from the upper right.
// Everything here is gated by scroll so the morning chapters are untouched.
import * as THREE from 'three';
import { mulberry, noise2, fbm, glowSprite, glowTexture, flame, clamp01 } from '../util.js';
import { GLTFLoader } from '../../vendor/GLTFLoader.js';

/* ======================================================================
   Stone PBR — one seed drives four maps so they agree pixel for pixel:
   albedo (per-block colour variation, weathering), normal (derived from a
   height field of courses, joints, chisel and pitting), roughness and AO.
   ====================================================================== */
const _stoneCache = new Map();
export function stoneSet(seed, {
  size = 768, courses = 7, cols = 4, jointPx = 7,
  base = [92, 94, 96], vary = .22, cool = .05, warm = .03, normalScale = 1, chisel = .5,
} = {}) {
  const key = `${seed}/${size}/${courses}/${cols}/${base.join()}`;
  if (_stoneCache.has(key)) return _stoneCache.get(key);
  const W = size, H = size;
  const rr = mulberry(seed);
  const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7 + seed * 7.3) * 43758.5453; return s - Math.floor(s); };

  const height = new Float32Array(W * H);
  const alb = new Uint8ClampedArray(W * H * 4);
  const rough = new Uint8ClampedArray(W * H * 4);
  const ao = new Uint8ClampedArray(W * H * 4);

  const rowH = H / courses;
  // per-row block widths with alternating offsets
  const rowOff = []; for (let r = 0; r < courses; r++) rowOff.push((r % 2) * .5 + rr() * .18);
  const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

  for (let y = 0; y < H; y++) {
    const r = Math.floor(y / rowH);
    const ly = y - r * rowH;
    for (let x = 0; x < W; x++) {
      const colW = W / cols;
      const fx = x / colW + rowOff[r];
      const c = Math.floor(fx);
      const lx = (fx - c) * colW;
      // distance to the nearest joint (in px)
      const dEdge = Math.min(lx, colW - lx, ly, rowH - ly);
      const joint = 1 - sstep(jointPx * .35, jointPx, dEdge);          // 1 in the joint
      const bevel = 1 - sstep(jointPx, jointPx * 3.2, dEdge);           // rounded block edge
      const bh = hash(c + 13, r + 5), bt = hash(c + 31, r + 17), bc = hash(c + 57, r + 29);
      // height field
      const lowF = fbm(x / 140, y / 140, 3) - .5;
      const midF = fbm(x / 26 + c, y / 26 + r, 3) - .5;
      let h = 1 - joint * .75 - bevel * .22 + lowF * .16 + midF * .10;
      // chisel: fine parallel grooves at a per-block angle
      const ang = bh * Math.PI;
      const g = Math.sin((x * Math.cos(ang) + y * Math.sin(ang)) * .55 + bt * 9);
      h -= (g > .62 ? (g - .62) * .5 : 0) * (1 - joint) * chisel;
      // pitting
      const p = hash(x * .37 + bt, y * .41 + bc);
      if (p > .992) h -= (p - .992) * 40 * (1 - joint);
      height[y * W + x] = h;

      // albedo: block colour variation, cool or warm tint, weathering
      const i = (y * W + x) * 4;
      let L = 1 + (bh - .5) * 2 * vary + midF * .22 + lowF * .12;
      const tintCool = (bt - .5) * 2 * cool, tintWarm = (bc - .5) * 2 * warm;
      const streak = Math.max(0, fbm(x / 9, y / 400, 2) - .62) * 1.4;      // vertical water streaks
      L *= 1 - streak * .3;
      L *= 1 - joint * .55;
      L *= 1 - (h < .3 ? (.3 - h) * .6 : 0);
      alb[i]     = base[0] * L * (1 + tintWarm - tintCool * .5);
      alb[i + 1] = base[1] * L * (1 + tintWarm * .35);
      alb[i + 2] = base[2] * L * (1 + tintCool - tintWarm * .6);
      alb[i + 3] = 255;
      // roughness: joints and pits rough, smoothed block faces a little less
      const ro = .72 + joint * .22 + (bh - .5) * .12 + (midF) * .16 + streak * .1;
      rough[i] = rough[i + 1] = rough[i + 2] = Math.max(0, Math.min(1, ro)) * 255; rough[i + 3] = 255;
      ao[i + 3] = 255;
    }
  }
  // normal from height (Sobel)
  const nrm = new Uint8ClampedArray(W * H * 4);
  const hAt = (x, y) => height[((y + H) % H) * W + ((x + W) % W)];
  const k = 2.2 * normalScale;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (hAt(x + 1, y) - hAt(x - 1, y)) * k;
    const dy = (hAt(x, y + 1) - hAt(x, y - 1)) * k;
    const len = Math.hypot(dx, dy, 1);
    const i = (y * W + x) * 4;
    nrm[i] = (-dx / len * .5 + .5) * 255;
    nrm[i + 1] = (dy / len * .5 + .5) * 255;
    nrm[i + 2] = (1 / len * .5 + .5) * 255;
    nrm[i + 3] = 255;
    // AO: a wide blur of the joint valleys, cheap two-sample approximation
    const o = (hAt(x + 3, y) + hAt(x - 3, y) + hAt(x, y + 3) + hAt(x, y - 3)) * .25 - hAt(x, y);
    const a = Math.max(0, Math.min(1, 1 - o * 1.2));
    ao[i] = ao[i + 1] = ao[i + 2] = (.55 + a * .45) * 255;
  }
  const toTex = (arr, srgb) => {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    cv.getContext('2d').putImageData(new ImageData(arr, W, H), 0, 0);
    const t = new THREE.CanvasTexture(cv);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    return t;
  };
  const set = { map: toTex(alb, true), normalMap: toTex(nrm, false), roughnessMap: toTex(rough, false), aoMap: toTex(ao, false) };
  _stoneCache.set(key, set);
  return set;
}

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
  const gltf = await new GLTFLoader().loadAsync('./models/temple_arch.glb');
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
  x.font = '500 470px "Onest", sans-serif';
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
export function grassCutout(seed, opt = {}) {
  const W = opt.w || 2048, H = opt.h || 1024;
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

/* ======================================================================
   Assembly
   ====================================================================== */
/* The approach is one axis: river → steps → gateway → ghat → Brindavana.
   It is built in a local frame whose origin is the Brindavana and whose +z
   points toward the viewer, then turned APPROACH_ROT so the gateway's right
   side recedes into the scene. */
export const APPROACH_ROT = 0.30;   // ~17°: the gateway's right side recedes
export const GATE_Z = 12.6;          // local z of the gateway
/* where the Brindavana stands in the approach frame: a little right of the
   stair axis and nearer the gateway, so an oblique camera from the left bank
   still sees all of it through the opening */
export const BRND_LOCAL = { x: 4.2, z: 1.0 };
export function approachToWorld(brndPos, x, y, z) {
  const c = Math.cos(APPROACH_ROT), sn = Math.sin(APPROACH_ROT);
  x -= BRND_LOCAL.x; z -= BRND_LOCAL.z;
  return new THREE.Vector3(brndPos.x + x * c + z * sn, y, brndPos.z - x * sn + z * c);
}
export const STYLED = { fog: true, bloom: true, rays: true, linear: true };

export function createOpening(ctx, { brndPos, brnd, ghatMat, fogColor }) {
  const g = new THREE.Group();
  g.visible = false;

  /* ---- lighting: indigo-charcoal ambient, a cool fill from the front so
          nothing falls to black, the sun low from the rear right ---- */
  const hemi = new THREE.HemisphereLight(0x2c3654, 0x0a0b0e, .22);
  const amb = new THREE.AmbientLight(0x141a2c, .25);
  const key = new THREE.DirectionalLight(0x8c9ac0, 0);        // cool sky fill from front-left
  key.position.set(-18, 22, 24);
  key.target.position.set(3, 2.5, -10);
  const fill = new THREE.PointLight(0x6e7ea6, 0, 40, 2);      // cool fill high over the gateway
  fill.position.set(-2, 14, 2);
  const front = new THREE.DirectionalLight(0x3a4058, 0);      // water bounce
  front.position.set(-4, 5, 60);
  front.target.position.set(2, 3, -14);
  g.add(front, front.target);
  // the sun: warm, low, from the rear right — it carries the shadows
  const rim = new THREE.DirectionalLight(0xffb878, 0);
  rim.position.set(34, 16, -52);
  rim.target.position.set(0, 2.5, -4);
  rim.castShadow = true;
  rim.shadow.mapSize.set(ctx.isMobile ? 1024 : 2048, ctx.isMobile ? 1024 : 2048);
  const sc = rim.shadow.camera;
  sc.left = -26; sc.right = 26; sc.top = 22; sc.bottom = -16; sc.near = 10; sc.far = 160;
  rim.shadow.bias = -0.0004; rim.shadow.normalBias = .03; rim.shadow.radius = 4;
  g.add(hemi, amb, key, key.target, fill, rim, rim.target);

  /* ---- the approach group (local frame, see above) ---- */
  const approach = new THREE.Group();
  approach.position.copy(approachToWorld(brndPos, 0, 0, 0));
  approach.rotation.y = APPROACH_ROT;
  g.add(approach);
  const trim = stoneMaterial(63, { base: [96, 97, 98], courses: 1, cols: 2, vary: .10, cool: .04, warm: .04, chisel: .12 }, { normal: .35, ao: .6 });
  const paving = stoneMaterial(12, { base: [84, 86, 88], courses: 1, cols: 2, vary: .10, cool: .05, warm: .03, chisel: .10 }, { normal: .30, ao: .55 });
  const mkBox = (w, h, d, mat, x = 0, y = 0, z = 0) => { const m = shadowed(new THREE.Mesh(boxUV(new THREE.BoxGeometry(w, h, d), w, h, d), mat)); m.position.set(x, y, z); return m; };

  /* gateway */
  const gate = new THREE.Group();
  gate.position.set(0, 1.0, GATE_Z);
  approach.add(gate);
  loadArch(gate, ctx).catch(err => {
    console.warn('temple arch failed to load, using the procedural gateway', err);
    gate.add(buildGate(ctx).gate);
  });

  /* the terrace: one dressed platform from the ghat to just past the gateway, top at y = 1.0 */
  const PLAT_W = 9.6, PLAT_Z0 = BRND_LOCAL.z + 4.8, PLAT_Z1 = GATE_Z + 1.6;
  approach.add(mkBox(PLAT_W, 1.0, PLAT_Z1 - PLAT_Z0, paving, 0, .5, (PLAT_Z0 + PLAT_Z1) / 2));
  /* one shallow step up onto the ghat */
  approach.add(mkBox(8.6, .15, .9, trim, 0, 1.075, PLAT_Z0 + .3));
  /* four broad steps down to the river — deep treads, the last one at the water */
  const STEP_W = 9.2, RISE = .25, TREAD = 1.75, NSTEP = 4;
  for (let i = 0; i < NSTEP; i++) {
    const top = 1.0 - RISE * (i + 1);
    const z = PLAT_Z1 + TREAD * (i + .5);
    approach.add(mkBox(STEP_W, top + .6, TREAD, i % 2 ? trim : paving, 0, (top - .6 + top) / 2, z));
  }
  /* low flank walls holding the bank either side of the terrace */
  for (const sgn of [-1, 1]) {
    approach.add(mkBox(.7, 1.4, PLAT_Z1 - PLAT_Z0, trim, sgn * (PLAT_W / 2 + .15), .7, (PLAT_Z0 + PLAT_Z1) / 2));
  }

  /* ---- the Brindavana: untouched model, lit so it reads as carved stone ---- */
  brnd.group.rotation.y = APPROACH_ROT;
  brnd.group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  {
    const relief = stoneSet(5, { courses: 1, cols: 1, jointPx: .01, size: 512, chisel: .7 });
    for (const m of [brnd.materials.stone, brnd.materials.stoneDark]) {
      m.normalMap = relief.normalMap; m.normalScale = new THREE.Vector2(.7, .7);
      m.roughnessMap = relief.roughnessMap; m.roughness = 1; m.needsUpdate = true;
    }
  }
  const BX = BRND_LOCAL.x, BZ = BRND_LOCAL.z;
  const brndFill = new THREE.PointLight(0xd8a873, 0, 16, 2);
  brndFill.position.copy(approachToWorld(brndPos, BX - 1.0, brndPos.y + 4.6, BZ + 5.2));
  const brndCool = new THREE.PointLight(0x5a6ea8, 0, 20, 2);
  brndCool.position.copy(approachToWorld(brndPos, BX - 5, brndPos.y + 6, BZ + 3));
  const brndSun = new THREE.SpotLight(0xf2b677, 0, 44, .40, .6, 1.2);
  brndSun.position.copy(approachToWorld(brndPos, BX + 14, brndPos.y + 13, BZ - 6));
  brndSun.target.position.set(brndPos.x, brndPos.y + 3.4, brndPos.z);
  g.add(brndSun, brndSun.target, brndFill, brndCool);

  /* ---- contact shadows on the water around the approach ---- */
  const shTex = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const x = cv.getContext('2d');
    const grd = x.createRadialGradient(64, 64, 10, 64, 64, 64);
    grd.addColorStop(0, 'rgba(4,6,12,.7)'); grd.addColorStop(1, 'rgba(4,6,12,0)');
    x.fillStyle = grd; x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(cv);
  })();
  const shMat = new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, opacity: .9 });
  const contact = (w, d, x, z) => {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(w, d), shMat);
    s.rotation.x = -Math.PI / 2; s.position.set(x, .014, z); return s;
  };
  approach.add(contact(14, 22, 0, (PLAT_Z0 + PLAT_Z1) / 2 + 2));
  approach.add(contact(17, 14, 0, 1));

  /* ---- exactly four brass deepas: two beside the gateway approach, two
          beside the Brindavana. Flared foot, moulded stem with knops, a wide
          oil bowl with a lip, one small flame and its own amber light. ---- */
  const brass = new THREE.MeshStandardMaterial({ color: 0x9c7a3a, roughness: .42, metalness: .55 });
  const brassDark = new THREE.MeshStandardMaterial({ color: 0x5a4320, roughness: .5, metalness: .5 });
  const lathe = (pts, mat, segs = 28) => shadowed(new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs), mat));
  const deepa = (x, y, z, s = 1) => {
    const d = new THREE.Group();
    // foot: a broad flared disc with a moulded ring
    d.add(lathe([[0, 0], [.30, 0], [.30, .03], [.22, .06], [.16, .10], [.14, .14], [.10, .18], [.08, .22], [0, .22]], brass));
    // stem: slender with two knops
    d.add(lathe([[.05, .20], [.07, .34], [.05, .42], [.05, .56], [.085, .62], [.05, .68], [.045, .86], [.075, .92], [.045, .98], [.04, 1.10], [0, 1.10]], brass));
    // bowl: wide shallow dish with a rolled lip, dark oil inside
    d.add(lathe([[0, 1.08], [.06, 1.08], [.16, 1.11], [.24, 1.16], [.27, 1.21], [.25, 1.23], [.22, 1.21], [.15, 1.17], [.05, 1.15], [0, 1.15]], brass));
    const oil = new THREE.Mesh(new THREE.CircleGeometry(.2, 24), brassDark); oil.rotation.x = -Math.PI / 2; oil.position.y = 1.155; d.add(oil);
    // the wick's small flame
    const fl = flame(.42); fl.position.set(0, 1.26, 0);
    d.add(fl); d.userData.fl = fl;
    const pl = new THREE.PointLight(0xffa040, 0, 5.5, 2); pl.position.y = 1.34; d.add(pl); d.userData.pl = pl;
    d.scale.setScalar(s); d.position.set(x, y, z);
    return d;
  };
  const deepas = [
    deepa(-4.2, 1.0, GATE_Z + 1.0, 1.25), deepa(4.2, 1.0, GATE_Z + 1.0, 1.25),   // front, beside the gateway approach
    deepa(BRND_LOCAL.x - 3.2, 1.15, BRND_LOCAL.z + 3.6, 1.1), deepa(BRND_LOCAL.x + 3.2, 1.15, BRND_LOCAL.z + 3.6, 1.1),   // back, beside the Brindavana
  ];
  for (const d of deepas) approach.add(d);

  /* ---- the stair's own lamp: the spine of the composition ---- */
  const stairL = new THREE.PointLight(0xffa049, 0, 16, 2);
  stairL.position.set(0, 5.2, GATE_Z + 6);
  approach.add(stairL);

  /* ---- trees: three depth layers of individually drawn trees — far
          (softest, foggiest), mid behind the gateway, near on the left ---- */
  const farRidge = ridge(ridgeTexture(17, { base: .30, amp: .30, col: '#0c1220' }), 130, 30);
  farRidge.position.set(4, 9.5, -56);
  const treeFar = grassSheet(treeLine(61, { n: 30, hMin: .30, hMax: .62, dark: .9, x0: 0, x1: 1 }), 150, 30, fogColor);
  treeFar.position.set(-8, 11, -42);
  const treeMidL = grassSheet(treeLine(67, { n: 9, hMin: .45, hMax: .95, dark: .65, x0: 0, x1: 1 }), 44, 22, fogColor);
  treeMidL.position.set(-24, 9.5, -16); treeMidL.rotation.y = .35;
  const treeMidR = grassSheet(treeLine(71, { n: 6, hMin: .40, hMax: .80, dark: .75, x0: 0, x1: 1 }), 36, 18, fogColor);
  treeMidR.position.set(24, 8, -22); treeMidR.rotation.y = -.35;
  const treeNear = grassSheet(treeLine(73, { n: 4, hMin: .70, hMax: 1.0, dark: .4, x0: 0, x1: .9 }), 26, 24, fogColor);
  treeNear.position.set(-17.5, 10.5, 12); treeNear.rotation.y = .3;
  const trees = [treeFar, treeMidL, treeMidR, treeNear];
  for (const tr of trees) { tr.renderOrder = 3; approach.add(tr); }
  approach.add(farRidge);
  // the band of mist that separates the shrine from the trees behind it
  const mist = new THREE.Mesh(new THREE.PlaneGeometry(70, 14),
    new THREE.MeshBasicMaterial({ map: glowTex('rgba(150,170,200,.6)', 'rgba(100,124,160,.2)'), transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: .14 }));
  mist.position.set(2, 2.6, -9); mist.renderOrder = 2;
  approach.add(mist);

  /* ---- riverbanks: low irregular ground either side, soil-dark, with a
          scatter of stones and nothing that repeats ---- */
  const bankMat = new THREE.MeshStandardMaterial({ color: 0x15120e, roughness: 1 });
  const bank = (seed, x, w, d) => {
    const geo = new THREE.PlaneGeometry(w, d, 36, 72);
    const rr = mulberry(seed), pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i), py = pos.getY(i);
      const edge = Math.max(0, 1 - Math.abs(px) / (w / 2));                 // falls toward the water at the inner edge
      const inner = (x < 0 ? px > 0 : px < 0) ? 1 - Math.min(1, Math.abs(px) / (w * .5)) : 0;
      const hgt = .10 + .42 * (fbm(px * .12 + seed, py * .09, 4) + .5) + .12 * (fbm(px * .5, py * .4 + seed, 3) + .5);
      pos.setZ(i, Math.max(-.3, hgt * (1 - inner * .9) - .18) + rr() * .015);
    }
    geo.computeVertexNormals();
    const m = shadowed(new THREE.Mesh(geo, bankMat));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0, 2);
    return m;
  };
  approach.add(bank(5, -17.5, 24, 48), bank(9, 18, 24, 48));
  {
    const stoneM = new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: .95 });
    const stones = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.26, 0), stoneM, 44);
    const rr = mulberry(77), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let i = 0; i < 44; i++) {
      const left = i < 30;
      const sx = left ? -(6 + rr() * 9) : (6 + rr() * 8), sz = -6 + rr() * 36;
      e.set(rr() * 3, rr() * 3, rr() * 3); q.setFromEuler(e);
      m.compose(new THREE.Vector3(sx, .05 + rr() * .2, sz), q, new THREE.Vector3(.5 + rr() * 1.3, .35 + rr() * .6, .5 + rr() * 1.2));
      stones.setMatrixAt(i, m);
    }
    stones.castShadow = stones.receiveShadow = true;
    approach.add(stones);
  }

  /* ---- restrained stone along the right edge ---- */
  const wall = buildWall(16, paving, trim);
  wall.position.set(10.5, 0, -1); wall.scale.y = .5;
  approach.add(wall);

  /* ---- grass: sparse painted sheets along the bottom-left, one close
          tuft passing in front of the word ---- */
  const grass = [
    grassSheet(grassCutout(101, { crest: .34, peak: .50, wide: .40, blades: 9000, len: 36, warm: .4 }), 18, 4.2, fogColor),
    grassSheet(grassCutout(202, { crest: .30, peak: .56, wide: .36, blades: 11000, len: 40, warm: .5 }), 16, 3.6, fogColor),
    grassSheet(grassCutout(303, { crest: .22, peak: .62, wide: .30, blades: 9000, len: 46, warm: .5, crest2: .30, crest3: .40 }), 14, 3.4, fogColor),
  ];
  grass[0].position.set(-13.5, 1.6, 18.5);
  grass[1].position.set(-11.5, 1.2, 23.5);
  grass[2].userData.near = true; grass[2].material.uniforms.uTint.value = .38;          // placed each frame just in front of the camera, lower-left
  for (const gr of grass) approach.add(gr);

  /* ---- drifting petals: sparse, slow, muted ---- */
  const petalN = ctx.reduced ? 0 : (ctx.isMobile ? 18 : 44);
  const petalGeo = new THREE.CircleGeometry(.045, 6);
  const petalMat = new THREE.MeshBasicMaterial({ color: 0x6e3a1c, transparent: true, opacity: .45, side: THREE.DoubleSide, fog: true });
  const petals = new THREE.InstancedMesh(petalGeo, petalMat, Math.max(1, petalN));
  petals.visible = petalN > 0;
  const petalSeed = [];
  { const pr = mulberry(83); for (let i = 0; i < petalN; i++) petalSeed.push([(pr() - .5) * 26, 1 + pr() * 9, 2 + pr() * 26, pr() * Math.PI * 2, .6 + pr() * .8]); }
  approach.add(petals);

  /* ---- sunrise rays through the gateway (styling pass) ---- */
  const rays = buildRays(ctx.isMobile ? 3 : 5);
  // local frame: behind the gateway, falling from the upper right toward the axis
  const rayGeom = [
    [6.0, 34, 6.0, 12.0, -2, 0, -.55],
    [4.2, 30, 2.5, 11.0, 1, 0, -.62],
    [7.5, 36, 10.5, 13.5, -6, 0, -.48],
    [3.2, 26, .5, 9.5, 3, 0, -.68],
    [5.0, 32, 14.0, 14.0, -10, 0, -.42],
  ];
  rays.forEach((r, i) => {
    const [w, h, x, y, z, ry, rz] = rayGeom[i];
    r.scale.set(w, h, 1); r.position.set(x, y, z); r.rotation.set(0, ry, rz);
    r.visible = STYLED.rays;
    approach.add(r);
  });

  /* ---- the word: one flat, unlit sheet held in front of the camera across
          the lower third; foreground grass can cross it ---- */
  const word = wordPlane();
  g.add(word);
  const WORD_DIST = 3.4;
  const _f = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3(0, 1, 0);
  const placeWord = (camera) => {
    camera.getWorldDirection(_f);
    _r.crossVectors(_f, _u).normalize();
    const vh = 2 * WORD_DIST * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const vw = vh * camera.aspect;
    word.position.copy(camera.position).addScaledVector(_f, WORD_DIST).addScaledVector(_u, -vh * .27);
    word.quaternion.copy(camera.quaternion);
    word.scale.setScalar(vw * 1.15);          // crops a little at both edges
    // the near tuft sits between the camera and the word, lower-left
    const gr = grass[2];
    gr.position.copy(camera.position).addScaledVector(_f, 2.5).addScaledVector(_r, -vw * .30).addScaledVector(_u, -vh * .30);
    gr.quaternion.copy(camera.quaternion);
    gr.scale.setScalar(vw * .26 / 14);
  };

  const api = {
    group: g, approach, key, fill, rim, hemi, amb, gate, deepas, rays, grass, trees, word, placeWord, brndFill, brndCool, petals,
    setVisible(v) { g.visible = v; },
    update(time, openT, reduced, fogDensity = .01) {
      const a = openT;
      key.intensity = a * 7.0;
      fill.intensity = a * 3.0;
      front.intensity = a * .9;
      rim.intensity = a * 3.2;
      hemi.intensity = .80 * a;
      amb.intensity = .45 * a;
      stairL.intensity = a * (5.0 + Math.sin(time * 1.3) * .2);
      brndFill.intensity = a * (30 + Math.sin(time * 1.7) * 1);
      brndCool.intensity = a * 40;
      brndSun.intensity = a * 1400;
      brnd.group.scale.setScalar(1);
      for (const d of deepas) {
        const f = d.userData.fl.userData.flicker(time + d.position.x * 2.7);
        d.userData.pl.intensity = a * (1.1 + f * .5);
      }
      for (let i = 0; i < rays.length; i++) {
        rays[i].visible = STYLED.rays;
        const u = rays[i].material.uniforms;
        u.uLinear.value = STYLED.linear ? 1 : 0;
        u.uTime.value = reduced ? 0 : time;
        u.uAmp.value = a * (.08 + .03 * Math.sin(time * .05 + i * 1.9));
      }
      if (petals.visible) {
        const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
        for (let i = 0; i < petalSeed.length; i++) {
          const [x0, y0, z0, ph, sp] = petalSeed[i];
          const tt = time * .07 * sp + ph;
          const fall = (tt * .9) % 1;
          p.set(x0 + Math.sin(tt * 1.7) * 1.2 + fall * 1.5, y0 + 3 - fall * 10, z0 + Math.cos(tt * 1.3) * .8);
          e.set(tt * 2.1, tt * 1.3, 0); q.setFromEuler(e);
          m.compose(p, q, sc); petals.setMatrixAt(i, m);
        }
        petals.instanceMatrix.needsUpdate = true;
        petalMat.opacity = .45 * a;
      }
      for (const gr of [...grass, ...trees]) {
        const u = gr.material.uniforms;
        u.uTime.value = time; u.uSway.value = reduced ? .2 : (trees.includes(gr) ? .35 : 1); u.uFade.value = a;
        u.uLinear.value = STYLED.linear ? 1 : 0;
      }
      mist.material.opacity = .14 * a;
      for (const gr of [...grass, ...trees]) gr.material.uniforms.uFogD.value = fogDensity;
      word.material.opacity = .96 * a;
    },
  };
  return api;
}
