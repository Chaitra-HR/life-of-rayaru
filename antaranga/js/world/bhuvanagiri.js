// RAYARA ANTARANGA · Bhuvanagiri — the settlement around the house.
//
// The house model carries the chapter; this module gives it a place to
// stand in: an agrahara lane of adjoining tiled houses, a low lime-washed
// compound wall with a gate, the village tank with its granite ghat, the
// coconut palms and tamarinds of the Tamil coast, cooking smoke, birds and
// a far tree line that closes the horizon. Everything here is procedural
// and shares the sun, hemisphere and fog of purvashrama.js.
//
// Coordinates are stage-local (the house at the origin, its veranda toward
// +z). The arrival walks straight up the house's own axis from +z, along
// the path on the tank's east bund, so the tank lies to the walk's left
// (x −23…−2.5), the ghat steps go down beside the path, and the palms that
// frame the opening stand on the bund to the right.
import * as THREE from 'three';
import { canvas, tex, stoneCanvas, mulberry, glowTexture, smooth, remap, fbm } from '../util.js';
import { cardMaterial, palmTexture, riverTreeTexture, farBankTexture, reedTexture, card } from './vegetation.js';
import { createBirds } from './birds.js';
import { createClouds } from './clouds.js';
import { mergeGeometries } from '../../vendor/BufferGeometryUtils.js';

/* the tank: a soft-edged basin carved into the yard's height field */
export const TANK = { x0: -23, x1: -2.5, z0: 12, z1: 34, water: -.95, depth: 1.5, edge: 6.5 };
/* the ghat: granite steps down the east bank, beside the arrival's walk */
export const GHAT = { x0: -3.6, x1: .6, z0: 17.6, z1: 26.4, floor: -1.45 };
export function ghatCut(x, z) {
  const G = GHAT, e = 1.0;
  const d = Math.min(x - G.x0, G.x1 - x, z - G.z0, G.z1 - z);
  return d <= -e ? 0 : smooth(remap(d, -e, .2));
}
export function tankDip(x, z) {
  const T = TANK;
  const dx = Math.min(x - T.x0, T.x1 - x), dz = Math.min(z - T.z0, T.z1 - z);
  const d = Math.min(dx, dz);
  if (d <= -T.edge) return 0;
  return smooth(remap(d, -T.edge * .35, T.edge));
}

/* ---------------- textures ---------------- */
/* country tiles: half-round terracotta laid in courses, weathered to a
   muted brown, lichen on the shaded runs. Muted on purpose: bright
   terracotta reads as a toy roof. */
export function tileCanvas(seed = 5) {
  const [c, g] = canvas(256, 256);
  const rnd = mulberry(seed);
  g.fillStyle = '#7a5a4a'; g.fillRect(0, 0, 256, 256);
  const cw = 18, rh = 24;
  for (let row = 0; row < 12; row++) {
    const y = row * rh, off = (row % 2) * cw * .5;
    for (let col = -1; col < 16; col++) {
      const x = col * cw + off;
      const v = (rnd() - .5) * 26;
      g.fillStyle = `rgb(${146 + v | 0},${104 + v * .8 | 0},${84 + v * .6 | 0})`;
      g.beginPath(); g.moveTo(x, y + rh + 2); g.lineTo(x, y + 4); g.quadraticCurveTo(x + cw * .5, y - 5, x + cw, y + 4); g.lineTo(x + cw, y + rh + 2); g.closePath(); g.fill();
      // the tile's shaded flank and the deep line under its lip
      g.fillStyle = 'rgba(40,24,16,.28)'; g.fillRect(x + cw - 4, y + 2, 4, rh);
      g.fillStyle = 'rgba(30,18,10,.6)'; g.fillRect(x, y + rh - 3, cw, 4);
      g.fillStyle = 'rgba(235,205,170,.16)'; g.fillRect(x + 2, y + 3, cw * .45, 2);
    }
  }
  // lichen and moss patches, a little dust
  for (let i = 0; i < 40; i++) {
    const x = rnd() * 256, y = rnd() * 256, r = 6 + rnd() * 22;
    const grd = g.createRadialGradient(x, y, 1, x, y, r);
    const tone = rnd() > .5 ? '112,118,82' : '150,140,118';
    grd.addColorStop(0, `rgba(${tone},${.12 + rnd() * .16})`); grd.addColorStop(1, `rgba(${tone},0)`);
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  return c;
}
/* lime wash over mud brick: warm off-white, patchy, damp and darkened at
   the foot where the monsoon splashes back off the ground */
export function limeCanvas(seed = 9, { damp = .6, tone = [176, 166, 146] } = {}) {
  const [c, g] = canvas(256, 256);
  const rnd = mulberry(seed);
  g.fillStyle = `rgb(${tone[0]},${tone[1]},${tone[2]})`; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) {
    const x = rnd() * 256, y = rnd() * 256, r = 10 + rnd() * 50;
    const grd = g.createRadialGradient(x, y, 1, x, y, r);
    const k = rnd() > .5 ? 1 : -1;
    grd.addColorStop(0, `rgba(${k > 0 ? '210,200,180' : '110,100,84'},${.05 + rnd() * .09})`); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  const img = g.getImageData(0, 0, 256, 256), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const v = (rnd() - .5) * 12; d[i] += v; d[i + 1] += v; d[i + 2] += v * .9; }
  g.putImageData(img, 0, 0);
  if (damp > 0) {
    const grd = g.createLinearGradient(0, 256, 0, 256 - 256 * .42);
    grd.addColorStop(0, `rgba(58,48,36,${.62 * damp})`); grd.addColorStop(.5, `rgba(84,72,56,${.22 * damp})`); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
    // a faint red-oxide skirting line where the wall meets the plinth
    g.fillStyle = 'rgba(96,52,40,.35)'; g.fillRect(0, 236, 256, 6);
  }
  return c;
}
/* granite for the ghat steps: cool grey, fine grain, a damp band low down */
function graniteCanvas(seed = 13) {
  const c = stoneCanvas(256, [108, 104, 96], 9, seed);
  const g = c.getContext('2d');
  const rnd = mulberry(seed + 1);
  for (let i = 0; i < 30; i++) {
    g.fillStyle = rnd() > .5 ? 'rgba(70,68,62,.18)' : 'rgba(150,146,136,.16)';
    g.fillRect(rnd() * 256, rnd() * 256, 20 + rnd() * 90, 1 + rnd() * 2);
  }
  return c;
}

/* ---------------- geometry ---------------- */
/* a hipped roof: eaves rectangle w×d at y 0, the ridge (parallel to x) at
   height h. Four faces, tiles running down the slope. */
export function hipRoofGeometry(w, d, h, over = .5) {
  const W = w / 2 + over, D = d / 2 + over;
  const rl = Math.max(.4, w - d) / 2;                       // half ridge length
  const pos = [], uv = [];
  const slope = Math.hypot(D, h);
  const tri = (a, b, c, ua, ub, uc) => { pos.push(...a, ...b, ...c); uv.push(...ua, ...ub, ...uc); };
  const K = 1 / .48;                                          // tile courses per unit
  // front (+z) and back (−z) trapezoids
  for (const s of [1, -1]) {
    const e0 = [-W * s, 0, D * s], e1 = [W * s, 0, D * s], r1 = [rl * s, h, 0], r0 = [-rl * s, h, 0];
    tri(e0, e1, r1, [-W * K, 0], [W * K, 0], [rl * K, slope * K]);
    tri(e0, r1, r0, [-W * K, 0], [rl * K, slope * K], [-rl * K, slope * K]);
  }
  // the two hip ends
  for (const s of [1, -1]) {
    const e0 = [W * s, 0, D * s], e1 = [W * s, 0, -D * s], r = [rl * s, h, 0];
    tri(e0, e1, r, [-D * K, 0], [D * K, 0], [0, slope * K]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

/* the water: a still tank surface — deep olive-grey where the eye looks
   down into it, the sky where it looks across it, a slow breathing ripple.
   Fogged by hand (it is not a lit material), like the painted cards. */
function waterMaterial(fogC) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      uDeep: { value: new THREE.Color(0x2c3a36) }, uSky: { value: new THREE.Color(0x8e9a9c) },
      uFog: { value: fogC }, uFogD: { value: .0085 }, uTime: { value: 0 }, uOpacity: { value: .86 },
    },
    vertexShader: `
      varying vec3 vW; varying float vDepth; varying vec2 vUv;
      void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
        vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `
      uniform vec3 uDeep, uSky, uFog; uniform float uFogD, uTime, uOpacity;
      varying vec3 vW; varying float vDepth; varying vec2 vUv;
      void main(){
        vec3 V = normalize(cameraPosition - vW);
        float fr = pow(1.0 - clamp(V.y, 0.0, 1.0), 2.6);
        float rip = sin(vW.x * 2.7 + uTime * .5) * sin(vW.z * 1.9 - uTime * .37) * .5 + .5;
        rip *= sin(vW.x * 9.1 - uTime * .9 + vW.z * 4.0) * .5 + .5;
        vec3 col = mix(uDeep, uSky, .30 + .62 * fr);
        col += (rip - .4) * .035;
        float f = 1.0 - exp(-uFogD * uFogD * vDepth * vDepth);
        col = mix(col, uFog, f);
        col = pow(max(col, 0.0), vec3(1.0 / 2.2));
        gl_FragColor = vec4(col, uOpacity);
      }`,
  });
}

/* ---------------- the settlement ---------------- */
export function buildSettlement(outside, ctx, { heightAt, fogC, cards, shadowed, rnd }) {
  const T = TANK;
  const M = ctx.isMobile;

  /* ---- materials ---- */
  const tileTex = tex(tileCanvas(5), { repeat: [1, 1] });
  const tileMat = new THREE.MeshStandardMaterial({ map: tileTex, color: 0xd6bfae, roughness: 1 });
  const limeMat = new THREE.MeshStandardMaterial({ map: tex(limeCanvas(9), { repeat: [3, 1] }), color: 0xd8d0c0, roughness: 1 });
  const limeWallMat = new THREE.MeshStandardMaterial({ map: tex(limeCanvas(21, { damp: 1, tone: [146, 136, 116] }), { repeat: [3, 1] }), color: 0xa39a8a, roughness: 1 });
  const timberMat = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(128, [58, 42, 27], 12, 61), { repeat: [1, 2] }), roughness: .85 });
  const graniteMat = new THREE.MeshStandardMaterial({ map: tex(graniteCanvas(13), { repeat: [6, 1] }), color: 0xd8d2c6, roughness: 1 });
  const graniteWet = new THREE.MeshStandardMaterial({ map: tex(graniteCanvas(17), { repeat: [6, 1] }), color: 0x6e6c66, roughness: .7 });
  const lateriteMat = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(256, [122, 88, 66], 14, 23), { repeat: [4, 1] }), color: 0x9c8878, roughness: 1 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x140e08, roughness: 1 });

  /* ---- a neighbouring house: plinth, lime walls, a thinnai under the
     eave on square timber posts, a hipped tile roof. Windows and door are
     dark recesses; nothing is furnished, they are read in passing. ---- */
  const houses = new THREE.Group();
  outside.add(houses);
  const roofGeos = {};
  const roofGeo = (w, d, h) => { const k = `${w}|${d}|${h}`; return roofGeos[k] || (roofGeos[k] = hipRoofGeometry(w, d, h, .42)); };
  /* every part is a geometry baked into the house's frame and collected by
     material; the lane is drawn as five meshes, not two hundred */
  const bins = { lime: [], timber: [], tile: [], laterite: [], dark: [] };
  const _mm = new THREE.Matrix4(), _hm = new THREE.Matrix4();
  const mkHouse = (x, z, ry, w = 8, d = 6, { posts = 4, h = 2.5, tall = 2.0, lean = 0 } = {}) => {
    _hm.compose(new THREE.Vector3(x, heightAt(x, z) - .04, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry + lean, 0)), new THREE.Vector3(1, 1, 1));
    const put = (bin, geo, px, py, pz, ry2 = 0) => {
      const g2 = geo.clone();
      _mm.compose(new THREE.Vector3(px, py, pz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry2, 0)), new THREE.Vector3(1, 1, 1));
      g2.applyMatrix4(_mm).applyMatrix4(_hm);
      bins[bin].push(g2);
    };
    put('laterite', new THREE.BoxGeometry(w + .9, .5, d + 2.0), 0, .25, .6);
    put('lime', new THREE.BoxGeometry(w, h, d), 0, .5 + h / 2, 0);
    // the thinnai: a raised seat along the front, the veranda floor between
    put('laterite', new THREE.BoxGeometry(w * .82, .42, 1.0), 0, .5 + .21, d / 2 + .55);
    const postGeo = new THREE.BoxGeometry(.2, h + .25, .2);
    for (let i = 0; i < posts; i++) {
      const px = -w / 2 + .6 + i * (w - 1.2) / (posts - 1);
      put('timber', postGeo, px, .5 + (h + .25) / 2, d / 2 + 1.2);
    }
    put('timber', new THREE.BoxGeometry(w + .3, .18, .2), 0, .5 + h + .16, d / 2 + 1.2);
    // door and windows: recesses, three timber bars across each window
    put('dark', new THREE.PlaneGeometry(.9, 1.7), 0, .5 + .85, d / 2 + .012);
    for (const sx of [-1, 1]) {
      put('dark', new THREE.PlaneGeometry(.7, .8), sx * w * .3, .5 + 1.45, d / 2 + .012);
      for (let b = -1; b <= 1; b++) put('timber', new THREE.BoxGeometry(.05, .8, .05), sx * w * .3 + b * .22, .5 + 1.45, d / 2 + .04);
    }
    // the roof: over the body and the thinnai; the eave board along the front
    put('tile', roofGeo(w + .5, d + 2.3, tall), 0, .5 + h + .22, .65);
    put('timber', new THREE.BoxGeometry(w + 1.3, .12, .08), 0, .5 + h + .2, d / 2 + 1.8 + .2);
  };
  /* the lane: the house's neighbours share its line, set a little back or
     forward as village houses are; two more stand behind, half hidden */
  mkHouse(-11.0, -1.0, .02, 8.2, 6.2, { posts: 4, h: 2.45, tall: 1.95 });
  mkHouse(10.9, -1.6, -.02, 7.6, 6.0, { posts: 4, h: 2.3, tall: 1.85 });
  mkHouse(-21.2, .4, .06, 7.2, 5.6, { posts: 3, h: 2.3, tall: 1.8 });
  mkHouse(20.6, -.4, -.05, 7.6, 5.8, { posts: 4, h: 2.4, tall: 1.9 });
  mkHouse(-7.0, -16.5, .35, 7.0, 5.4, { posts: 3, h: 2.3, tall: 1.8 });
  mkHouse(9.5, -17.5, -.3, 7.8, 5.8, { posts: 4, h: 2.4, tall: 1.9 });
  if (!M) {
    mkHouse(-21.0, -15.0, .5, 6.6, 5.2, { posts: 3, h: 2.2, tall: 1.7 });
    mkHouse(23.5, -14.0, -.45, 7.0, 5.4, { posts: 3, h: 2.3, tall: 1.8 });
  }
  {
    const mats = { lime: limeMat, timber: timberMat, tile: tileMat, laterite: lateriteMat, dark: darkMat };
    for (const k in bins) {
      if (!bins[k].length) continue;
      const merged = mergeGeometries(bins[k], false);
      const m = new THREE.Mesh(merged, mats[k]);
      m.castShadow = k !== 'dark'; m.receiveShadow = true;
      houses.add(m);
      for (const g2 of bins[k]) g2.dispose();
    }
  }

  /* ---- the compound wall: low, lime-washed, tile-coped; a gate with two
     piers on the house's axis. The yard behind it is the family's. ---- */
  const walls = new THREE.Group();
  outside.add(walls);
  const WALL_Z = 8.2, WALL_H = 1.04, GATE = 1.45;
  const mkWall = (x0, x1, z0, z1, h = WALL_H) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const y0 = heightAt(cx, cz);
    const w = shadowed(new THREE.Mesh(new THREE.BoxGeometry(len, h, .32), limeWallMat));
    w.position.set(cx, y0 + h / 2 - .06, cz);
    w.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    walls.add(w);
    const cope = shadowed(new THREE.Mesh(new THREE.BoxGeometry(len + .06, .1, .46), tileMat));
    cope.position.set(cx, y0 + h - .06 + .05, cz);
    cope.rotation.y = w.rotation.y;
    walls.add(cope);
    return w;
  };
  mkWall(-6.4, -GATE, WALL_Z, WALL_Z);
  mkWall(GATE, 6.4, WALL_Z, WALL_Z);
  mkWall(-6.4, -6.4, WALL_Z, 3.6);
  mkWall(6.4, 6.4, WALL_Z, 3.6);
  for (const sx of [-1, 1]) {
    const pier = shadowed(new THREE.Mesh(new THREE.BoxGeometry(.46, 1.48, .46), limeWallMat));
    pier.position.set(sx * (GATE + .1), heightAt(sx * GATE, WALL_Z) + .68, WALL_Z);
    walls.add(pier);
    const cap = shadowed(new THREE.Mesh(new THREE.BoxGeometry(.62, .1, .62), tileMat));
    cap.position.set(sx * (GATE + .1), heightAt(sx * GATE, WALL_Z) + 1.46, WALL_Z);
    walls.add(cap);
  }
  // the threshold stone at the gate, worn
  const gateStone = new THREE.Mesh(new THREE.BoxGeometry(2.7, .1, .7), graniteMat);
  gateStone.position.set(0, heightAt(0, WALL_Z) + .02, WALL_Z); gateStone.receiveShadow = true;
  walls.add(gateStone);

  /* ---- the tank: granite steps down the east bank beside the walk, so
     the visitor passes the way down to the water; then the water ---- */
  const ghat = new THREE.Group();
  outside.add(ghat);
  const G = GHAT, LEN = G.z1 - G.z0, NST = 7, RISE = .2, TREAD = (G.x1 - G.x0 - .2) / NST;
  for (let i = 0; i < NST; i++) {
    const top = -RISE * i;
    const hgt = top - G.floor;
    const wet = top < T.water + .25;
    const st = shadowed(new THREE.Mesh(new THREE.BoxGeometry(TREAD, hgt, LEN), wet ? graniteWet : graniteMat));
    st.position.set(G.x1 - .1 - TREAD * (i + .5), G.floor + hgt / 2, (G.z0 + G.z1) / 2);
    ghat.add(st);
  }
  // the retaining walls either side of the steps, and two low lamp posts at the head
  for (const z of [G.z0 - .18, G.z1 + .18]) {
    const sw = shadowed(new THREE.Mesh(new THREE.BoxGeometry(G.x1 - G.x0 + .2, 1.45, .36), graniteMat));
    sw.position.set((G.x0 + G.x1) / 2, G.floor + .725 - .04, z);
    ghat.add(sw);
    const post = shadowed(new THREE.Mesh(new THREE.BoxGeometry(.22, .7, .22), graniteMat));
    post.position.set(G.x1 + .1, .35, z);
    ghat.add(post);
  }
  const water = new THREE.Mesh(new THREE.PlaneGeometry(T.x1 - T.x0 + 1.2, T.z1 - T.z0 + 1.2), waterMaterial(fogC));
  water.rotation.x = -Math.PI / 2;
  water.position.set((T.x0 + T.x1) / 2, T.water, (T.z0 + T.z1) / 2);
  water.renderOrder = 2;
  outside.add(water);

  /* ---- vegetation: palms on the bunds, tamarinds behind the houses,
     reeds at the water's edge, a far tree line ---- */
  const palmMats = [3, 7, 11].map((sd, i) => cardMaterial(palmTexture(sd, { haze: .08 }), fogC, { tint: [.62, .56, .6][i], sway: .45 }));
  const reflMats = palmMats.map(m => { const r = m.clone(); r.uniforms.uTint.value = m.uniforms.uTint.value * .55; r.uniforms.uFade.value = .42; return r; });
  const reflections = [];
  const mkPalm = (seed, x, z, h, ry, { reflect = true } = {}) => {
    const w = h * .58;
    const y0 = heightAt(x, z) - .1;
    const m = card(palmMats[seed % 3], w, h, x, y0 + h / 2, z, ry);
    m.renderOrder = 3; cards.push(m); outside.add(m);
    if (reflect) {
      /* the mirror image, hung below the water plane and drawn before it so
         the surface tints it; the basin floor clips whatever hangs deeper */
      const r = card(reflMats[seed % 3], w, h, x, 2 * T.water - (y0 + h / 2), z, ry);
      r.scale.y = -1; r.renderOrder = 1; cards.push(r); outside.add(r); reflections.push(r);
    }
    return m;
  };
  // the east bund, right of the walk: the framing palms
  mkPalm(3, 4.6, 21.5, 12.5, .25);
  mkPalm(7, 3.8, 15.4, 10.5, -.2);
  mkPalm(11, 5.4, 29.0, 11.5, .1, { reflect: false });
  // the far bank and the west bank
  mkPalm(11, -12.0, 36.5, 12.0, .15);
  mkPalm(3, -19.0, 36.0, 10.8, -.1);
  mkPalm(7, -4.5, 37.5, 11.2, .3);
  mkPalm(3, -25.5, 17.5, 11.0, .05);
  mkPalm(7, -26.0, 27.5, 12.2, -.25);
  if (!M) { mkPalm(11, -18.0, 39.0, 10.5, .2, { reflect: false }); mkPalm(3, -1.0, 39.5, 9.8, -.15, { reflect: false }); }

  const treeMats = [83, 89, 101].map((sd, i) => cardMaterial(riverTreeTexture(sd), fogC, { tint: [.62, .55, .5][i], sway: .3 }));
  const mkTree = (seed, sc, x, z, ry) => {
    const t = mulberry(seed);
    const h = (7.5 + t() * 2.5) * sc, w = h * (.85 + t() * .25);
    const m = card(treeMats[seed % 3], w, h, x, heightAt(x, z) + h / 2 - .15, z, ry);
    m.renderOrder = 3; cards.push(m); outside.add(m);
    return m;
  };
  // tamarind and neem: over the neighbours' roofs, along the lane's ends
  mkTree(21, 1.15, -12.0, -9.5, .25);
  mkTree(33, 1.2, 15.5, -9.0, -.3);
  mkTree(47, 1.0, -19.5, 4.5, .1);
  mkTree(53, .9, 19.5, 5.5, .4);
  mkTree(56, 1.3, -3.5, -12.0, -.15);
  mkTree(57, 1.05, 4.0, -13.5, .2);
  mkTree(58, 1.1, 28.5, -6.0, .35);
  mkTree(59, 1.0, -30.0, -2.0, -.2);
  // the big tamarind on the west bank, its shade over the water
  mkTree(61, 1.45, -28.5, 22.5, .3);
  mkTree(63, 1.1, -27.5, 33.0, -.1);
  if (!M) { mkTree(64, .95, 26.0, 14.0, .2); mkTree(65, 1.05, 30.0, 26.0, -.25); }

  const reedMat = cardMaterial(reedTexture(41), fogC, { tint: .6, sway: .6 });
  const mkReeds = (x, z, w, h, ry) => {
    const m = card(reedMat, w, h, x, T.water + h * .42, z, ry);
    m.renderOrder = 3; cards.push(m); outside.add(m); return m;
  };
  mkReeds(-19.5, 16.5, 2.6, 1.5, .4);
  mkReeds(-20.0, 29.5, 2.2, 1.3, -.3);
  mkReeds(-7.5, 31.0, 2.8, 1.5, .1);
  mkReeds(-5.6, 16.2, 2.0, 1.2, -.5);
  mkReeds(-14.0, 31.5, 2.4, 1.4, .2);
  mkReeds(-6.2, 28.8, 1.8, 1.1, .3);

  /* the far tree line: a ring of painted bands standing beyond the last
     houses, so the country never ends on a bare rule */
  const farMats = [cardMaterial(farBankTexture(61, { palms: 2, trees: 26 }), fogC, { tint: .74, sway: .15 }),
    cardMaterial(farBankTexture(67, { palms: 3, trees: 22 }), fogC, { tint: .70, sway: .15 })];
  const FAR_R = 64, FAR_N = 10;
  for (let i = 0; i < FAR_N; i++) {
    const a = i / FAR_N * Math.PI * 2 + .3;
    const x = Math.cos(a) * FAR_R, z = Math.sin(a) * FAR_R + 6;
    const m = card(farMats[i % 2], 44, 6.2, x, 2.6 + (i % 3) * .3, z, -a + Math.PI / 2 + Math.PI);
    m.renderOrder = 2; cards.push(m); outside.add(m);
  }

  /* ---- ambient life: cooking smoke behind the house, birds over the tank ---- */
  const smokeTex = glowTexture('rgba(196,192,184,.55)', 'rgba(196,192,184,0)', 128);
  const smoke = [];
  const SM_N = M ? 4 : 6;
  for (let i = 0; i < SM_N; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0, fog: false, color: 0xbdb8ae }));
    s.scale.setScalar(1.2);
    outside.add(s); smoke.push({ s, ph: i / SM_N });
  }
  const clouds = createClouds({ count: M ? 3 : 5, seed: 8, mobile: M });
  clouds.group.scale.setScalar(.5);
  clouds.group.position.set(0, 2, 0);
  outside.add(clouds.group);
  const birds = createBirds({ seed: 21, mobile: M });
  birds.group.scale.setScalar(.42);
  birds.group.position.set(0, 3.5, 0);
  outside.add(birds.group);

  let lastTime = 0;
  return {
    water, houses, walls, ghat, reflections,
    update(time, mistK = 0) {
      const dt = lastTime ? Math.min(.05, time - lastTime) : .016;
      lastTime = time;
      water.material.uniforms.uTime.value = time;
      water.material.uniforms.uFogD.value = .0085 * (1 + mistK * 2.2);
      if (!ctx.reduced) {
        for (const sm of smoke) {
          const u = (time * .07 + sm.ph) % 1;
          sm.s.position.set(-3.1 + u * 1.6 + Math.sin(time * .3 + sm.ph * 6) * .25, 4.7 + u * 4.2, -3.6 - u * .8);
          sm.s.scale.setScalar(1.1 + u * 3.2);
          sm.s.material.opacity = .14 * Math.sin(u * Math.PI) * (1 - mistK * .6);
        }
        birds.update(time, dt, null);
        clouds.update(time, dt);
      }
    },
  };
}
