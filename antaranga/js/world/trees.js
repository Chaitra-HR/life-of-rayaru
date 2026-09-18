// ANTARANGA · Trees — the Tungabhadra's trees as VOLUMES, not cards.
//
// The painted cards (vegetation.js) read as flat cutouts the moment the
// camera walked round them: seen edge-on a tree became a sliver, and its
// baked light never turned with the sun. These are built the way a real
// time engine builds a tree: a trunk and a few limbs as geometry, and the
// crown as a few hundred small leaf-cluster quads scattered through an
// ellipsoid around each limb's tip, crossed at random angles so there is
// parallax from every side. Two things make them read as one mass rather
// than a cloud of tickets:
//   · every vertex's NORMAL points from the crown's centre outward (with a
//     little up), so the scene's own sun and sky shade the whole crown as a
//     rounded volume, lit side and shadow side, whatever the hour;
//   · each quad is darkened by how deep inside the crown it sits, the
//     cheapest ambient occlusion there is, and lightened toward the top.
// The quads are alpha-tested (they write depth, sort themselves, cast and
// receive shadows, take the scene fog), and their tips sway in the vertex
// shader. Species: broadleaf (neem, mango) and pinnate (tamarind, the
// temple tree), a low shrub of the same make, and the coconut palm with a
// curved trunk and hinged fronds. Muted olive, the six's Earth Green side.
import * as THREE from 'three';
import { mulberry } from '../math.js';
import { mergeStatic } from '../util.js';

/* ------------------------------------------------------------------ textures */
const _tex = new Map();
const sRGB = (cv) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t; };

/* a clump of leaves on a clear ground; the alpha is the leaves themselves.
   'broad': neem / mango, elongated leaves radiating from short stalks.
   'fine' : tamarind, pinnate stalks of tiny leaflets, a feathered mass. */
export function leafClusterTexture(kind = 'broad', seed = 1) {
  const key = kind + seed;
  if (_tex.has(key)) return _tex.get(key);
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const x = cv.getContext('2d'); const t = mulberry(seed * 31 + 7);
  const cx = S / 2, cy = S / 2;
  x.lineCap = 'round';
  // a soft dark heart so the clump has a body behind its leaves
  const heart = x.createRadialGradient(cx, cy + 10, 4, cx, cy + 10, S * .30);
  heart.addColorStop(0, 'rgba(28,38,22,.85)'); heart.addColorStop(.6, 'rgba(28,38,22,.45)'); heart.addColorStop(1, 'rgba(28,38,22,0)');
  x.fillStyle = heart; x.beginPath(); x.arc(cx, cy + 10, S * .30, 0, 7); x.fill();
  const col = (lit, k = 0) => {
    // olive, lit toward a warm sage, shaded toward Earth Green
    const r = 34 + lit * 78 + k * 8, g = 48 + lit * 92 + k * 6, b = 26 + lit * 40;
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  };
  if (kind === 'fine') {
    const NS = 26;
    for (let s = 0; s < NS; s++) {
      const a = t() * Math.PI * 2, r0 = Math.pow(t(), .7) * S * .18;
      const sx = cx + Math.cos(a) * r0, sy = cy + Math.sin(a) * r0 * .8;
      const dir = a + (t() - .5) * 1.2, len = 40 + t() * 46;
      const ex = sx + Math.cos(dir) * len, ey = sy + Math.sin(dir) * len;
      const litS = .35 + .45 * Math.max(0, -Math.sin(dir)) + (t() - .5) * .3;   // stalks pointing up are lit
      x.strokeStyle = col(litS * .6); x.lineWidth = 1.6;
      x.beginPath(); x.moveTo(sx, sy); x.lineTo(ex, ey); x.stroke();
      const NL = 12 + (t() * 6 | 0);
      for (let k = 1; k <= NL; k++) {
        const u = k / NL, px = sx + (ex - sx) * u, py = sy + (ey - sy) * u;
        const ll = 5.5 * Math.sin(Math.PI * Math.min(.15 + u * .85, .95)) + 1.5;
        for (const sg of [-1, 1]) {
          const lit = Math.max(0, Math.min(1, litS + (t() - .5) * .35 + (sg > 0 ? .06 : -.06)));
          x.fillStyle = col(lit);
          x.beginPath();
          x.ellipse(px - Math.sin(dir) * sg * ll * .55, py + Math.cos(dir) * sg * ll * .55, ll * .55, 1.7, dir + sg * .55, 0, 7);
          x.fill();
        }
      }
    }
  } else {
    const NL = 54;
    const leaves = [];
    for (let k = 0; k < NL; k++) {
      const a = t() * Math.PI * 2, r0 = Math.pow(t(), .6) * S * .34;
      leaves.push([cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * .82, a]);
    }
    leaves.sort((p, q) => q[1] - p[1]);                         // low leaves first, upper ones over them
    for (const [px, py, a] of leaves) {
      const dir = a + (t() - .5) * 1.6;
      const len = 15 + t() * 15, wid = 4.2 + t() * 3;
      const up = (cy - py) / (S * .34);
      const lit = Math.max(0, Math.min(1, .38 + .34 * up + .22 * Math.max(0, -Math.sin(dir)) + (t() - .5) * .34));
      x.fillStyle = col(lit);
      x.beginPath(); x.ellipse(px + Math.cos(dir) * len * .5, py + Math.sin(dir) * len * .5, len * .5, wid, dir, 0, 7); x.fill();
      x.strokeStyle = col(Math.min(1, lit + .18), 1); x.lineWidth = .9;                  // the midrib
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(dir) * len * .92, py + Math.sin(dir) * len * .92); x.stroke();
    }
  }
  const tx = sRGB(cv);
  _tex.set(key, tx);
  return tx;
}

/* bark: vertical fissures, grey-brown, a little moss low down */
export function barkTexture(seed = 3, { tone = [88, 74, 58] } = {}) {
  const key = 'bark' + seed;
  if (_tex.has(key)) return _tex.get(key);
  const W = 128, H = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d'); const t = mulberry(seed * 17 + 3);
  x.fillStyle = `rgb(${tone[0]},${tone[1]},${tone[2]})`; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) {
    const px = t() * W, w = 2 + t() * 7, dark = t() < .6;
    const v = dark ? -22 - t() * 26 : 14 + t() * 22;
    x.fillStyle = `rgb(${tone[0] + v | 0},${tone[1] + v | 0},${tone[2] + v * .8 | 0})`;
    let y = -10;
    while (y < H) { const seg = 20 + t() * 60; x.fillRect(px + (t() - .5) * 3, y, w, seg); y += seg + t() * 12; }
  }
  const img = x.getImageData(0, 0, W, H), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const v = (t() - .5) * 18; d[i] += v; d[i + 1] += v; d[i + 2] += v; }
  x.putImageData(img, 0, 0);
  const tx = sRGB(cv); tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
  _tex.set(key, tx);
  return tx;
}

/* a coconut frond: the spine along the strip, leaflets swept toward the
   tip and drooping; the alpha is the leaflets */
export function frondTexture(seed = 5) {
  const key = 'frond' + seed;
  if (_tex.has(key)) return _tex.get(key);
  const W = 512, H = 160, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d'); const t = mulberry(seed * 13 + 1);
  x.lineCap = 'round';
  const y0 = H * .42;
  const NL = 44;
  for (let k = 0; k <= NL; k++) {
    const u = .04 + (k / NL) * .95, px = 8 + u * (W - 30);
    const prof = Math.pow(Math.sin(Math.PI * Math.min(.06 + u * .9, .96)), .75);
    const ll = (H * .42) * prof * (.8 + t() * .3);
    for (const sg of [-1, 1]) {
      const lit = (.42 + t() * .4) * (sg < 0 ? 1.04 : .8);
      const g = 46 + lit * 74, r = 30 + lit * 48, b = 24 + lit * 30;
      x.strokeStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
      x.lineWidth = 3.4 - u * 1.4;
      x.beginPath(); x.moveTo(px, y0);
      x.quadraticCurveTo(px + ll * .35, y0 + sg * ll * .55, px + ll * .62, y0 + sg * ll * .96);
      x.stroke();
    }
  }
  x.strokeStyle = 'rgb(74,66,36)'; x.lineWidth = 5;
  x.beginPath(); x.moveTo(4, y0); x.lineTo(W - 12, y0 + 2); x.stroke();
  const tx = sRGB(cv); tx.wrapS = THREE.ClampToEdgeWrapping;
  _tex.set(key, tx);
  return tx;
}

/* a banana blade: a broad paddle, the ribs running off a pale midrib, torn
   between ribs where the wind has split it; the alpha is the blade */
export function bananaBladeTexture(seed = 7) {
  const key = 'bblade' + seed;
  if (_tex.has(key)) return _tex.get(key);
  const W = 512, H = 192, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d'); const t = mulberry(seed * 19 + 5);
  x.lineCap = 'round';
  const y0 = H * .5, splits = [];
  for (let k = 0; k < 2 + (t() * 3 | 0); k++) splits.push(.2 + t() * .7);
  const N = 150;
  for (let k = 0; k <= N; k++) {
    const u = .03 + (k / N) * .95, px = 6 + u * (W - 14);
    let gap = false; for (const sp of splits) if (Math.abs(u - sp) < .012) gap = true;
    if (gap && t() < .8) continue;
    const half = (H * .47) * Math.pow(Math.sin(Math.PI * Math.min(.08 + u * .9, .97)), .6) * (.94 + t() * .08);
    for (const sg of [-1, 1]) {
      const lit = (.44 + t() * .34) * (sg < 0 ? 1.06 : .84);
      const r = 30 + lit * 46, g = 48 + lit * 76, b = 26 + lit * 30;
      x.strokeStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
      x.lineWidth = 2.6 + t() * 1.2;
      x.beginPath(); x.moveTo(px, y0);
      x.quadraticCurveTo(px + half * .10, y0 + sg * half * .55, px + half * .18, y0 + sg * half);
      x.stroke();
    }
  }
  x.strokeStyle = 'rgb(150,160,96)'; x.lineWidth = 6;
  x.beginPath(); x.moveTo(4, y0); x.lineTo(W - 10, y0); x.stroke();
  const tx = sRGB(cv); tx.wrapS = THREE.ClampToEdgeWrapping;
  _tex.set(key, tx);
  return tx;
}

/* ------------------------------------------------------------------ materials */
const _mats = new Map();
const WIND = { value: 0 };   // shared time uniform: every leaf material reads it
export function setTreeTime(t) { WIND.value = t; }

/* a leaf material: alpha-tested so it writes depth and shadows, both sides
   drawn WITHOUT the normal flip (the normals are the crown's, not the
   quad's), the tips swayed by the vertex shader */
function leafMaterial(map, { tint = 0xbcc0b2, sway = 1 } = {}) {   // well under white: the leaves sit in the bank's light, never above it
  const key = map.uuid + tint + sway;
  if (_mats.has(key)) return _mats.get(key);
  const m = new THREE.MeshStandardMaterial({
    map, color: tint, roughness: .94, metalness: 0, side: THREE.DoubleSide,
    alphaTest: .42, alphaToCoverage: true, vertexColors: true,
  });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uWind = WIND;
    sh.uniforms.uSway = { value: sway };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uWind, uSway; attribute float aSway, aPhase;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          float w = aSway * uSway;
          float t1 = uWind * 0.55 + aPhase, t2 = uWind * 1.7 + aPhase * 2.3;
          transformed.x += (sin(t1) * 0.10 + sin(t2) * 0.030) * w;
          transformed.z += (cos(t1 * 0.8 + 1.3) * 0.08 + cos(t2 * 1.1) * 0.025) * w;
          transformed.y += (sin(t2 * 0.7) * 0.02) * w;
        }`);
    /* keep the crown's normal on the back face too: the whole quad is one
       piece of a rounded mass, whichever way round it happens to face */
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', ''))
      /* leaves the walk passes through dissolve at the lens (alpha to coverage dithers the fade) */
      .replace('#include <alphatest_fragment>', 'diffuseColor.a *= smoothstep(0.9, 2.2, length(vViewPosition));\n#include <alphatest_fragment>');
  };
  m.customProgramCacheKey = () => 'leaf' + sway;
  _mats.set(key, m);
  return m;
}
/* the depth material for the shadow pass: the same alpha, no sway (the
   shadow of a still crown under a swaying one is not seen) */
function leafDepth(map) {
  const key = 'depth' + map.uuid;
  if (_mats.has(key)) return _mats.get(key);
  const d = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: .42, side: THREE.DoubleSide });
  _mats.set(key, d);
  return d;
}
function barkMaterial(seed = 3, tone) {
  const key = 'barkm' + seed;
  if (_mats.has(key)) return _mats.get(key);
  const m = new THREE.MeshStandardMaterial({ map: barkTexture(seed, tone ? { tone } : undefined), roughness: 1, metalness: 0 });
  _mats.set(key, m);
  return m;
}

/* ------------------------------------------------------------------ crown builder
   quads: [{ p: Vector3 centre, s: size, cluster centre c, cluster radius R }]
   → one merged geometry with spherical normals, an occlusion vertex colour,
   and the sway attributes. */
function crownGeometry(quads, crownC, crownR, { occl = .55, topLift = .25 } = {}) {
  const n = quads.length;
  const pos = new Float32Array(n * 12), nrm = new Float32Array(n * 12), uv = new Float32Array(n * 8);
  const col = new Float32Array(n * 12), sway = new Float32Array(n * 4), phase = new Float32Array(n * 4);
  const idx = new Uint32Array(n * 6);
  const q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), nn = new THREE.Vector3();
  const corners = [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]];
  const rnd = mulberry(quads.length * 7 + 11);
  for (let i = 0; i < n; i++) {
    const { p, s, rot, depth, rim } = quads[i];
    e.set(rot[0], rot[1], rot[2]); q.setFromEuler(e);
    // the crown's normal at this quad: outward from the centre, lifted a little toward the sky
    nn.subVectors(p, crownC); nn.y = nn.y * .8 + crownR * topLift; nn.normalize();
    // lit by height and by how far out it sits; shaded deep inside the mass
    const up = THREE.MathUtils.clamp((p.y - crownC.y) / crownR * .5 + .5, 0, 1);
    const shade = (1 - occl) + occl * (1 - depth);
    const tone = Math.min(1, shade * (.70 + .30 * up) * (.9 + rnd() * .2));
    const warm = rnd() * .12;
    const ph = rnd() * 6.28;
    for (let k = 0; k < 4; k++) {
      v.set(corners[k][0] * s, corners[k][1] * s, 0).applyQuaternion(q).add(p);
      const o = i * 12 + k * 3;
      pos[o] = v.x; pos[o + 1] = v.y; pos[o + 2] = v.z;
      nrm[o] = nn.x; nrm[o + 1] = nn.y; nrm[o + 2] = nn.z;
      col[o] = tone * (1 + warm); col[o + 1] = tone; col[o + 2] = tone * (1 - warm * .6);
      uv[i * 8 + k * 2] = corners[k][0] + .5; uv[i * 8 + k * 2 + 1] = corners[k][1] + .5;
      sway[i * 4 + k] = rim; phase[i * 4 + k] = ph;
    }
    const b = i * 4, o6 = i * 6;
    idx[o6] = b; idx[o6 + 1] = b + 1; idx[o6 + 2] = b + 2; idx[o6 + 3] = b; idx[o6 + 4] = b + 2; idx[o6 + 5] = b + 3;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSway', new THREE.BufferAttribute(sway, 1));
  g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return g;
}

/* a tapered, slightly bent limb between two points */
function limbMesh(a, b, r0, r1, mat, bend = 0, seg = 7) {
  const len = a.distanceTo(b);
  const geo = new THREE.CylinderGeometry(r1, r0, len, seg, 4, true);
  geo.translate(0, len / 2, 0);
  if (bend) {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const u = p.getY(i) / len; p.setX(i, p.getX(i) + Math.sin(u * Math.PI) * bend); }
    geo.computeVertexNormals();
  }
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(a);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3().subVectors(b, a).normalize());
  m.castShadow = m.receiveShadow = true;
  return m;
}

/* ------------------------------------------------------------------ a broadleaf tree
   height, spread in world units; kind 'broad' | 'fine'; cards the number of
   leaf quads (a phone gets fewer); seed for its shape. Returns a Group whose
   origin is the foot of the trunk. */
export function makeTree({ seed = 1, height = 9, spread = 6, kind = 'broad', cards = 220, trunkR = .30, lean = 0, tint = 0xffffff, sway = 1, shadows = true, dark = 0 } = {}) {
  const rnd = mulberry(seed * 101 + 5);
  const G = new THREE.Group();
  const bark = barkMaterial(kind === 'fine' ? 3 : 5, kind === 'fine' ? [72, 62, 52] : [92, 78, 62]);
  const forkY = height * (.36 + rnd() * .1);
  const top = new THREE.Vector3(lean * height * .4, forkY, 0);
  G.add(limbMesh(new THREE.Vector3(0, -.3, 0), top, trunkR * 1.35, trunkR * .8, bark, (rnd() - .5) * .35, 9));
  // a root flare
  const flare = new THREE.Mesh(new THREE.CylinderGeometry(trunkR * 1.35, trunkR * 2.2, .5, 9, 1, true), bark);
  flare.position.y = -.05; flare.castShadow = flare.receiveShadow = true; G.add(flare);
  /* the limbs: three to five leaving the fork, each tipped by a cluster,
     each carrying one thinner branch to a smaller cluster */
  const clusters = [];
  const NL = 3 + (rnd() * 3 | 0);
  const a0 = rnd() * 6.28;
  for (let i = 0; i < NL; i++) {
    const a = a0 + i / NL * 6.28 + (rnd() - .5) * .8;
    const tilt = .55 + rnd() * .55;                                // from vertical
    const len = height * (.30 + rnd() * .2);
    const tip = new THREE.Vector3(top.x + Math.cos(a) * Math.sin(tilt) * len, top.y + Math.cos(tilt) * len, top.z + Math.sin(a) * Math.sin(tilt) * len);
    G.add(limbMesh(top, tip, trunkR * .62, trunkR * .22, bark, (rnd() - .5) * .5));
    clusters.push({ c: tip, R: spread * (.30 + rnd() * .10) });
    const a2 = a + (rnd() - .5) * 1.6, tilt2 = tilt * (.5 + rnd() * .5), len2 = len * (.45 + rnd() * .3);
    const mid = new THREE.Vector3().lerpVectors(top, tip, .55 + rnd() * .25);
    const tip2 = new THREE.Vector3(mid.x + Math.cos(a2) * Math.sin(tilt2) * len2, mid.y + Math.cos(tilt2) * len2, mid.z + Math.sin(a2) * Math.sin(tilt2) * len2);
    G.add(limbMesh(mid, tip2, trunkR * .26, trunkR * .1, bark, (rnd() - .5) * .3, 5));
    clusters.push({ c: tip2, R: spread * (.22 + rnd() * .08) });
  }
  // the heart of the crown, above the fork
  const crownC = new THREE.Vector3(top.x, forkY + height * .34, top.z);
  clusters.push({ c: crownC.clone(), R: spread * .38 });
  clusters.push({ c: new THREE.Vector3(crownC.x, crownC.y + height * .16, crownC.z), R: spread * .28 });
  const crownR = spread * .55;
  /* the quads */
  const quads = [];
  const wsum = clusters.reduce((s, c) => s + c.R * c.R, 0);
  const cardS = spread * (kind === 'fine' ? .21 : .18);   // a card is a hand's breadth of leaves, never a placard
  for (let i = 0; i < cards; i++) {
    let r = rnd() * wsum, cl = clusters[0];
    for (const c of clusters) { r -= c.R * c.R; if (r <= 0) { cl = c; break; } }
    // a point in the cluster's ellipsoid, denser toward its heart
    const u = rnd() * 6.28, cv = rnd() * 2 - 1, rr = Math.pow(rnd(), .55) * cl.R;
    const sv = Math.sqrt(1 - cv * cv);
    const p = new THREE.Vector3(cl.c.x + Math.cos(u) * sv * rr, cl.c.y + cv * rr * .78, cl.c.z + Math.sin(u) * sv * rr);
    // how deep inside the whole crown, for the occlusion tint and the sway
    const d = p.distanceTo(crownC) / crownR;
    const depth = THREE.MathUtils.clamp(1 - d, 0, 1);
    const rim = THREE.MathUtils.clamp(d * .9 + (p.y - crownC.y) / crownR * .3, .15, 1);
    quads.push({ p, s: cardS * (.75 + rnd() * .6), rot: [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28], depth: Math.pow(depth, 1.4), rim });
  }
  const geo = crownGeometry(quads, crownC, crownR, { occl: .55 + dark * .2 });
  const map = leafClusterTexture(kind, 1 + (seed % 3));
  const crown = new THREE.Mesh(geo, leafMaterial(map, { tint, sway }));
  crown.customDepthMaterial = leafDepth(map);
  crown.castShadow = crown.receiveShadow = shadows;
  crown.frustumCulled = true;
  G.add(crown);
  G.userData.crown = crown; G.userData.top = crownC.y + crownR;
  if (!shadows) G.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = false; });
  mergeStatic(G);   // the trunk, its flare and every limb: one bark mesh (the crown is one already)
  return G;
}

/* a shrub: the same crown with no trunk, low and wide */
export function makeShrub({ seed = 1, radius = 1.6, height = 1.3, cards = 90, kind = 'broad', tint = 0xffffff, shadows = true } = {}) {
  const rnd = mulberry(seed * 77 + 3);
  const G = new THREE.Group();
  const crownC = new THREE.Vector3(0, height * .45, 0);
  const quads = [];
  const NC = 3 + (rnd() * 3 | 0), cl = [];
  for (let i = 0; i < NC; i++) cl.push({ c: new THREE.Vector3((rnd() - .5) * radius * 1.1, height * (.3 + rnd() * .4), (rnd() - .5) * radius * 1.1), R: radius * (.45 + rnd() * .3) });
  for (let i = 0; i < cards; i++) {
    const c = cl[(rnd() * NC) | 0];
    const u = rnd() * 6.28, cv = rnd() * 2 - 1, rr = Math.pow(rnd(), .6) * c.R, sv = Math.sqrt(1 - cv * cv);
    const p = new THREE.Vector3(c.c.x + Math.cos(u) * sv * rr, Math.max(.1, c.c.y + cv * rr * .6), c.c.z + Math.sin(u) * sv * rr);
    const d = Math.hypot(p.x, (p.y - crownC.y) * 1.4, p.z) / radius;
    quads.push({ p, s: radius * (.34 + rnd() * .26), rot: [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28], depth: Math.pow(THREE.MathUtils.clamp(1 - d, 0, 1), 1.3), rim: THREE.MathUtils.clamp(d, .2, 1) * .6 });
  }
  const geo = crownGeometry(quads, crownC, radius, { occl: .6, topLift: .5 });
  const map = leafClusterTexture(kind, 2 + (seed % 3));
  const m = new THREE.Mesh(geo, leafMaterial(map, { tint, sway: .6 }));
  m.customDepthMaterial = leafDepth(map);
  m.castShadow = m.receiveShadow = shadows;
  G.add(m);
  return G;
}

/* ------------------------------------------------------------------ the coconut palm
   a curved tapering trunk with ring scars, a crown of hinged fronds that
   droop with age, a cluster of nuts. lean: how far the trunk leans (world
   units at the crown) along +x of the group. */
export function makePalm({ seed = 1, height = 9, lean = 1.2, fronds = 14, tint = 0xffffff, shadows = true } = {}) {
  const rnd = mulberry(seed * 53 + 9);
  const G = new THREE.Group();
  const bark = barkMaterial(8, [104, 92, 76]);
  const SEG = 14;
  const geo = new THREE.CylinderGeometry(.13, .24, height, 9, SEG, true);
  geo.translate(0, height / 2, 0);
  const p = geo.attributes.position;
  const curve = (u) => lean * u * u * (1.2 - .2 * u);
  for (let i = 0; i < p.count; i++) {
    const u = p.getY(i) / height;
    // the trunk leans along a parabola; ring scars as a small radial ripple
    const ring = 1 + .035 * Math.sin(u * SEG * 6.28 * 1.6);
    p.setX(i, p.getX(i) * ring + curve(u)); p.setZ(i, p.getZ(i) * ring);
  }
  geo.computeVertexNormals();
  const trunk = new THREE.Mesh(geo, bark);
  trunk.castShadow = trunk.receiveShadow = shadows;
  G.add(trunk);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(.26, .42, .4, 9, 1, true), bark);
  foot.position.y = .05; foot.castShadow = foot.receiveShadow = shadows; G.add(foot);
  const crown = new THREE.Vector3(curve(1), height, 0);
  // the crown's direction, for the fronds' hinge: the trunk's tangent at the top
  const tangent = new THREE.Vector3(curve(1) - curve(.94), height * .06, 0).normalize();
  const C = new THREE.Group(); C.position.copy(crown);
  C.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
  G.add(C);
  /* the fronds: a strip hinged at the crown, drooped along a parabola, the
     older (lower) ones drooping more; the alpha is the leaflets */
  const map = frondTexture(1 + (seed % 2));
  const mat = leafMaterial(map, { tint, sway: 1.4 });
  const FL = height * .42, FW = FL * .30;
  const a0 = rnd() * 6.28;
  for (let i = 0; i < fronds; i++) {
    const a = a0 + i / fronds * 6.28 + (rnd() - .5) * .5;
    const age = rnd();                                           // 0 young, upright · 1 old, hanging
    const tiltDown = .25 + age * 1.15 + (rnd() - .5) * .2;      // from horizontal
    const fg = new THREE.PlaneGeometry(FL, FW, 12, 1);
    fg.translate(FL / 2, 0, 0);
    const fp = fg.attributes.position, fn = fg.attributes.normal;
    const sw = new Float32Array(fp.count), ph = new Float32Array(fp.count), cl = new Float32Array(fp.count * 3);
    const phase = rnd() * 6.28, droop = FL * (.28 + age * .34);
    for (let k = 0; k < fp.count; k++) {
      const u = fp.getX(k) / FL;
      fp.setY(k, fp.getY(k) * (1 - u * .35) - droop * u * u);   // the strip narrows and drops toward its tip
      fp.setZ(k, fp.getY(k) * .12);                              // a slight fold along the spine
      sw[k] = u * u; ph[k] = phase;
      const tone = .72 + .3 * (1 - age) * (1 - u * .3);
      cl[k * 3] = tone; cl[k * 3 + 1] = tone; cl[k * 3 + 2] = tone;
    }
    // the frond's normal: up-and-out from the crown, so its upper face takes the sun
    for (let k = 0; k < fn.count; k++) fn.setXYZ(k, 0, 1, 0);
    fg.setAttribute('aSway', new THREE.BufferAttribute(sw, 1));
    fg.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
    fg.setAttribute('color', new THREE.BufferAttribute(cl, 3));
    const f = new THREE.Mesh(fg, mat);
    f.customDepthMaterial = leafDepth(map);
    f.rotation.order = 'YZX';
    f.rotation.y = -a; f.rotation.z = -tiltDown + .9;            // hinged at the crown, lifted then drooping
    f.rotation.x = (rnd() - .5) * .5;
    f.castShadow = f.receiveShadow = shadows;
    C.add(f);
  }
  // the nuts
  const nutMat = new THREE.MeshStandardMaterial({ color: 0x6a5a2e, roughness: .8 });
  for (let i = 0; i < 5; i++) {
    const n = new THREE.Mesh(new THREE.SphereGeometry(.16 + rnd() * .06, 7, 6), nutMat);
    n.position.set((rnd() - .5) * .5, -.18 - rnd() * .2, (rnd() - .5) * .5);
    n.castShadow = shadows; C.add(n);
  }
  G.userData.crown = C; G.userData.top = height + 1;
  mergeStatic(G);   // the trunk and its foot one bark mesh; the fronds one leaf mesh (their sway is per vertex); the nuts one
  return G;
}

/* ------------------------------------------------------------------ the banana clump
   a mother stem with two pups: pale pseudostems, broad blades hinged at the
   crown and arching hard down, one furled spike standing up. height is the
   mother's crown. */
export function makeBanana({ seed = 1, height = 3.2, tint = 0xc2c8b4, shadows = true } = {}) {
  const rnd = mulberry(seed * 41 + 7);
  const G = new THREE.Group();
  const stemM = new THREE.MeshStandardMaterial({ color: 0x8a9460, roughness: .9 });
  const map = bananaBladeTexture(1 + (seed % 2));
  const mat = leafMaterial(map, { tint, sway: 1.2 });
  const plant = (h, x, z, n) => {
    const P = new THREE.Group(); P.position.set(x, 0, z);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(h * .045, h * .07, h * .55, 9), stemM);
    stem.position.y = h * .27; stem.castShadow = stem.receiveShadow = shadows; P.add(stem);
    const C = new THREE.Group(); C.position.y = h * .55; P.add(C);
    const a0 = rnd() * 6.28, L = h * .62, Wd = L * .36;
    for (let i = 0; i < n; i++) {
      const a = a0 + i / n * 6.28 + (rnd() - .5) * .5, age = rnd();
      const fg = new THREE.PlaneGeometry(L, Wd, 10, 1);
      fg.translate(L / 2, 0, 0);
      const fp = fg.attributes.position, fn = fg.attributes.normal;
      const sw = new Float32Array(fp.count), ph = new Float32Array(fp.count), cl = new Float32Array(fp.count * 3);
      const phase = rnd() * 6.28, droop = L * (.30 + age * .40);
      for (let k = 0; k < fp.count; k++) {
        const u = fp.getX(k) / L;
        fp.setY(k, fp.getY(k) * (.35 + .65 * Math.sin(Math.PI * Math.min(.1 + u * .9, 1))) - droop * u * u);
        fp.setZ(k, Math.abs(fp.getY(k)) * .25);           // the blade folds down from its midrib
        sw[k] = u * u; ph[k] = phase;
        const tone = .76 + .28 * (1 - age);
        cl[k * 3] = tone; cl[k * 3 + 1] = tone; cl[k * 3 + 2] = tone;
      }
      for (let k = 0; k < fn.count; k++) fn.setXYZ(k, 0, 1, 0);
      fg.setAttribute('aSway', new THREE.BufferAttribute(sw, 1));
      fg.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
      fg.setAttribute('color', new THREE.BufferAttribute(cl, 3));
      const f = new THREE.Mesh(fg, mat);
      f.customDepthMaterial = leafDepth(map);
      f.rotation.order = 'YZX'; f.rotation.y = -a; f.rotation.z = .95 - age * .9; f.rotation.x = (rnd() - .5) * .4;
      f.castShadow = f.receiveShadow = shadows;
      C.add(f);
    }
    // the furled new leaf, a spike standing out of the crown
    const spike = new THREE.Mesh(new THREE.ConeGeometry(h * .03, h * .42, 7), stemM);
    spike.position.y = h * .18; spike.rotation.z = (rnd() - .5) * .3; C.add(spike);
    G.add(P);
    return P;
  };
  plant(height, 0, 0, 8);
  plant(height * .62, -height * .22, height * .10, 6);
  plant(height * .48, height * .2, -height * .12, 5);
  G.userData.top = height;
  return G;
}

/* a card turned each frame to face the camera about its foot, so it never
   shows its edge on the walk (the reeds) */
export function billboard(mesh) { mesh.userData.billboard = true; return mesh; }
const _v = new THREE.Vector3();
export function faceCamera(meshes, camWorld, parent) {
  parent.worldToLocal(_v.copy(camWorld));
  for (const m of meshes) {
    if (!m.userData.billboard) continue;
    m.rotation.y = Math.atan2(_v.x - m.position.x, _v.z - m.position.z);
  }
}
