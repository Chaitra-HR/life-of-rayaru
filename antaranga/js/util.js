// ANTARANGA · shared utilities
import * as THREE from 'three';

/* ---------------- math ----------------
   The pure half lives in math.js so the stone Worker can import it without
   THREE; it is re-exported here so every existing `from './util.js'` import
   keeps working unchanged. */
export * from './math.js';
import { clamp, lerp, smooth, remap, mulberry, noise2, fbm } from './math.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';

/* ---- mergeStatic (19 Sept 2026): fewer draw calls for the same picture ----
   A built thing (a house of two hundred boxes, a gateway, a tree's limbs) is
   many small meshes sharing a few materials, and on a phone every mesh is a
   draw call the driver pays for. This bakes each mesh's transform into its
   geometry and joins every mesh that shares a material (and shadow flags,
   render order, depth material, attribute set) into ONE mesh under `group`,
   in the group's own frame, so the group can still be moved, hidden or
   lifted as a whole. Anything that might be moved or changed on its own is
   left alone: a mesh or an ancestor (below `group`) carrying userData, a
   shader material (per-mesh uniforms), an instanced or skinned mesh, a
   sprite, anything `keep(object)` claims. Materials are shared, never
   copied, so a material driven by the hour keeps driving the merged mesh.
   Returns { merged, removed } for the record. */
const _mInv = new THREE.Matrix4(), _mRel = new THREE.Matrix4();
export function mergeStatic(group, { keep = () => false, minCount = 2 } = {}) {
  group.updateWorldMatrix(true, true);
  _mInv.copy(group.matrixWorld).invert();
  const marked = (o) => { let p = o; while (p && p !== group) { if ((p.userData && Object.keys(p.userData).length) || keep(p)) return true; p = p.parent; } return false; };
  const buckets = new Map();
  group.traverse(o => {
    if (o === group || !o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || !o.visible) return;
    const m = o.material;
    if (!m || Array.isArray(m) || m.isShaderMaterial || m.isSpriteMaterial) return;
    if (o.morphTargetInfluences || marked(o)) return;
    const g = o.geometry;
    if (!g || !g.attributes.position) return;
    const key = [m.uuid, g.index ? 'i' : 'n', Object.keys(g.attributes).sort().join(','), o.castShadow, o.receiveShadow, o.renderOrder, o.customDepthMaterial ? o.customDepthMaterial.uuid : '', o.layers.mask].join('|');
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(o);
  });
  let merged = 0, removed = 0;
  for (const list of buckets.values()) {
    if (list.length < minCount) continue;
    const geos = list.map(o => { _mRel.multiplyMatrices(_mInv, o.matrixWorld); return o.geometry.clone().applyMatrix4(_mRel); });
    const mg = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!mg) continue;
    mg.computeBoundingSphere();
    const first = list[0];
    const mesh = new THREE.Mesh(mg, first.material);
    mesh.castShadow = first.castShadow; mesh.receiveShadow = first.receiveShadow; mesh.renderOrder = first.renderOrder;
    mesh.layers.mask = first.layers.mask;
    if (first.customDepthMaterial) mesh.customDepthMaterial = first.customDepthMaterial;
    group.add(mesh);
    for (const o of list) { if (o.parent) o.parent.remove(o); removed++; }
    merged++;
  }
  return { merged, removed };
}

/* ---------------- canvas helpers ---------------- */
export function canvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
export function tex(c, { repeat = null, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

/* dark Krishna-shila style stone texture */
export function stoneCanvas(size = 512, base = [42, 46, 44], variance = 16, seed = 7) {
  const [c, g] = canvas(size, size);
  const rnd = mulberry(seed);
  g.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
  g.fillRect(0, 0, size, size);
  const img = g.getImageData(0, 0, size, size), d = img.data;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const n = fbm(x / 90, y / 90, 4) * .8 + fbm(x / 17, y / 17, 3) * .35;
    const i = (y * size + x) * 4;
    const v = n * variance;
    d[i] = clamp(d[i] + v, 0, 255); d[i + 1] = clamp(d[i + 1] + v, 0, 255); d[i + 2] = clamp(d[i + 2] + v * .92, 0, 255);
  }
  g.putImageData(img, 0, 0);
  // faint chisel strokes + pitting
  g.globalAlpha = .06; g.strokeStyle = '#000';
  for (let i = 0; i < 60; i++) {
    g.beginPath();
    const x = rnd() * size, y = rnd() * size, l = 12 + rnd() * 46, a = rnd() * Math.PI;
    g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  g.globalAlpha = .1; g.fillStyle = '#000';
  for (let i = 0; i < 240; i++) { g.beginPath(); g.arc(rnd() * size, rnd() * size, rnd() * 1.7, 0, 7); g.fill(); }
  g.globalAlpha = 1;
  return c;
}

/* palm-leaf manuscript texture: tan leaf with faint script rows */
export function palmLeafCanvas(seed = 3, w = 512, h = 128) {
  const [c, g] = canvas(w, h);
  const rnd = mulberry(seed);
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#b39662'); grad.addColorStop(.5, '#c2a874'); grad.addColorStop(1, '#a8895a');
  g.fillStyle = grad; g.fillRect(0, 0, w, h);
  // long fibres
  g.globalAlpha = .12; g.strokeStyle = '#7a5f38';
  for (let i = 0; i < 40; i++) {
    const y = rnd() * h; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + (rnd() - .5) * 6); g.stroke();
  }
  // script rows — abstract akshara strokes, not readable text
  g.globalAlpha = .55; g.strokeStyle = '#38290f'; g.lineWidth = 1.4; g.lineCap = 'round';
  const rows = 3;
  for (let r = 0; r < rows; r++) {
    const y = h * (r + .55) / (rows + .35);
    let x = w * .045;
    while (x < w * .95) {
      const gw = 4 + rnd() * 9;
      g.beginPath();
      const seg = 1 + Math.floor(rnd() * 3);
      for (let s = 0; s < seg; s++) {
        const x0 = x + s * gw / seg;
        g.moveTo(x0, y - 4 + rnd() * 3);
        g.bezierCurveTo(x0 + gw / seg * .4, y - 7 + rnd() * 4, x0 + gw / seg * .6, y + 4 - rnd() * 4, x0 + gw / seg, y - 3 + rnd() * 5);
      }
      g.stroke();
      // top bar (shirorekha-like hint)
      if (rnd() > .45) { g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + gw, y - 6); g.stroke(); }
      x += gw + 2 + rnd() * 4;
    }
  }
  // binding hole
  g.globalAlpha = .8; g.fillStyle = '#241a0c';
  g.beginPath(); g.arc(w * .5, h * .5, 3.4, 0, 7); g.fill();
  g.globalAlpha = 1;
  return c;
}

/* rosette medallion (chakra flower) for the brindavana band */
export function rosetteCanvas(size = 128) {
  const [c, g] = canvas(size, size);
  g.fillStyle = '#22262 4'.replace(' ', ''); g.fillRect(0, 0, size, size);
  const cx = size / 2, cy = size / 2;
  g.strokeStyle = 'rgba(190,196,190,.5)'; g.fillStyle = 'rgba(150,158,152,.32)';
  g.lineWidth = 2;
  g.beginPath(); g.arc(cx, cy, size * .42, 0, 7); g.stroke();
  const petals = 12;
  for (let i = 0; i < petals; i++) {
    const a = i / petals * Math.PI * 2;
    g.save(); g.translate(cx, cy); g.rotate(a);
    g.beginPath();
    g.ellipse(size * .26, 0, size * .13, size * .05, 0, 0, 7);
    g.fill(); g.stroke();
    g.restore();
  }
  g.beginPath(); g.arc(cx, cy, size * .09, 0, 7); g.fillStyle = 'rgba(210,214,206,.55)'; g.fill();
  return c;
}

/* diamond lattice for pilasters */
export function latticeCanvas(w = 128, h = 256) {
  const [c, g] = canvas(w, h);
  g.fillStyle = '#252927'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(185,192,186,.4)'; g.lineWidth = 2.4;
  const step = 32;
  for (let y = -h; y < h * 2; y += step) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + w); g.stroke();
    g.beginPath(); g.moveTo(0, y); g.lineTo(w, y - w); g.stroke();
  }
  g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 5;
  g.strokeRect(1, 1, w - 2, h - 2);
  return c;
}

/* dentil / beaded strip for cornices */
export function dentilCanvas(w = 512, h = 64) {
  const [c, g] = canvas(w, h);
  g.fillStyle = '#232725'; g.fillRect(0, 0, w, h);
  const n = 26;
  for (let i = 0; i < n; i++) {
    const x = (i + .5) / n * w;
    const grd = g.createRadialGradient(x, h / 2, 1, x, h / 2, h * .34);
    grd.addColorStop(0, 'rgba(190,197,190,.55)'); grd.addColorStop(1, 'rgba(190,197,190,0)');
    g.fillStyle = grd;
    g.beginPath(); g.arc(x, h / 2, h * .3, 0, 7); g.fill();
  }
  return c;
}

/* arched niche panel for the brindavana body faces — two niches, clear of the
   central pilaster strip */
export function nichePanelCanvas(w = 512, h = 256) {
  const [c, g] = canvas(w, h);
  g.fillStyle = '#2a2e2c'; g.fillRect(0, 0, w, h);
  for (const fx of [.27, .73]) {
    const cx = fx * w;
    const niches = 2.6; // niche width basis
    const nw = w / niches * .46, nh = h * .62, y0 = h * .78;
    // recess
    g.fillStyle = 'rgba(0,0,0,.66)';
    g.beginPath();
    g.moveTo(cx - nw / 2, y0);
    g.lineTo(cx - nw / 2, y0 - nh * .6);
    g.quadraticCurveTo(cx - nw / 2, y0 - nh, cx, y0 - nh);
    g.quadraticCurveTo(cx + nw / 2, y0 - nh, cx + nw / 2, y0 - nh * .6);
    g.lineTo(cx + nw / 2, y0);
    g.closePath(); g.fill();
    // frame
    g.strokeStyle = 'rgba(185,192,186,.4)'; g.lineWidth = 3; g.stroke();
    // cusped arch line
    g.strokeStyle = 'rgba(185,192,186,.28)'; g.lineWidth = 2;
    g.beginPath();
    g.moveTo(cx - nw / 2 + 6, y0 - nh * .55);
    g.quadraticCurveTo(cx - nw * .22, y0 - nh * .92, cx, y0 - nh * .8);
    g.quadraticCurveTo(cx + nw * .22, y0 - nh * .92, cx + nw / 2 - 6, y0 - nh * .55);
    g.stroke();
  }
  return c;
}

/* ---------------- 3D text ---------------- */
/* Type painted into the world obeys the same system as the DOM layer:
   TWO faces and no third — Marcellus 400 for anything that NAMES, Karla
   400 for the small labels — and no bold anywhere.
   These stacks are deliberately SHORTER than the CSS ones: a family named
   in a canvas font stack is downloaded even when the first family covers
   every glyph, so a long stack here fetched faces on every load for
   nothing. Canvas floors out on the system serif/sans, which only matters
   if the vendored faces themselves fail. */
const FONTS = {
  serif: '400 %spx "Marcellus", serif',         // in-scene titles, names
  serifItalic: '400 %spx "Marcellus", serif',   // dim echoes
  kn: '300 %spx "Noto Sans Kannada", sans-serif',
  dn: '400 %spx "Noto Serif Devanagari", serif',
  sans: '400 %spx "Karla", sans-serif',         // in-scene labels
};

export function textMesh(str, {
  font = 'serif', px = 120, color = '#e8e2d6', letter = 0, worldH = 1,
  opacity = 1, blend = 'normal', align = 'center',
} = {}) {
  const f = FONTS[font].replace('%s', px);
  const [mc, mg] = canvas(8, 8);
  mg.font = f;
  let width = 0;
  if (letter > 0) { for (const ch of str) width += mg.measureText(ch).width + letter * px; }
  else width = mg.measureText(str).width;
  const pad = px * .55;
  const w = Math.ceil(width + pad * 2), h = Math.ceil(px * 1.7);
  const [c, g] = canvas(w, h);
  g.font = f; g.fillStyle = color; g.textBaseline = 'middle';
  if (letter > 0) {
    let x = pad;
    for (const ch of str) { g.fillText(ch, x, h / 2); x += g.measureText(ch).width + letter * px; }
  } else {
    g.textAlign = 'center'; g.fillText(str, w / 2, h / 2);
  }
  const t = tex(c); t.anisotropy = 8;
  const mat = new THREE.MeshBasicMaterial({
    map: t, transparent: true, opacity, depthWrite: false,
    blending: blend === 'add' ? THREE.AdditiveBlending : THREE.NormalBlending,
    side: THREE.DoubleSide,
  });
  const aspect = w / h;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(worldH * aspect, worldH), mat);
  mesh.userData.aspect = aspect;
  return mesh;
}

/* soft radial glow sprite */
export function glowTexture(inner = 'rgba(255,214,150,1)', outer = 'rgba(255,150,60,0)', size = 128) {
  const [c, g] = canvas(size, size);
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, inner);
  grd.addColorStop(.35, inner.replace(/,[\d.]+\)$/, ',.45)'));
  grd.addColorStop(1, outer);
  g.fillStyle = grd; g.fillRect(0, 0, size, size);
  return tex(c);
}

export function glowSprite(color = 0xffc47a, scale = 1, opacity = .8) {
  const mat = new THREE.SpriteMaterial({
    map: glowTexture(), color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const s = new THREE.Sprite(mat);
  s.scale.setScalar(scale);
  return s;
}

/* flame: layered sprite with per-frame flicker (call .userData.flicker(time)) */
export function flame(scale = 1) {
  const g = new THREE.Group();
  const core = glowSprite(0xffe6b0, .16 * scale, .95);
  const halo = glowSprite(0xd97b2e, .55 * scale, .32);
  const far = glowSprite(0x8a4515, 1.6 * scale, .13);
  g.add(far, halo, core);
  const seed = Math.random() * 100;
  g.userData.flicker = (t) => {
    const f = .82 + noise2(t * 2.4 + seed, seed) * .35 + noise2(t * 7.1 + seed, seed * 2) * .12;
    core.scale.setScalar(.16 * scale * f);
    halo.scale.setScalar(.55 * scale * (0.9 + f * .18));
    core.position.y = .02 * scale * (f - .9);
    return f;
  };
  return g;
}


/* ---------------- the deepa ----------------
   ONE oil lamp for the whole site: a small standing brass deepa — bell foot,
   knopped stem, a shallow oil dish with a wick spout, one flame. Every
   interior lamp (the household, the Matha, the sanctum) is this object at
   some scale, so ritual light speaks one language from the river to the
   Brindavana. Aged brass, dim under point lights (bright brass reads as
   glowing orange boxes). Call .userData.flicker(time) each frame. */
let _brass = null, _brassDeep = null, _oil = null, _clay = null;
export function deepaLamp({ scale = 1, light = true, intensity = 4, distance = 6, wicks = 1, flameScale = .5 } = {}) {
  /* the same aged brass as the opening's two tall deepas (hero.js): one alloy across the site */
  _brass = _brass || new THREE.MeshStandardMaterial({ color: 0x8a6226, roughness: .5, metalness: .45 });
  _brassDeep = _brassDeep || new THREE.MeshStandardMaterial({ color: 0x4a350f, roughness: .55, metalness: .5 });
  _oil = _oil || new THREE.MeshStandardMaterial({ color: 0x2a1c0a, roughness: .35, metalness: .1 });
  const g = new THREE.Group();
  const lathe = (pts, mat = _brass, seg = 36) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg), mat);
  /* a kuthuvilakku in small: a tiered bell foot, a knopped baluster, the
     bowl with a rolled lip, a bud finial rising from its centre. Drawn round
     (36 segments): the 18-sided version read as a turned goblet in close-up */
  g.add(lathe([[0, 0], [.150, 0], [.153, .018], [.126, .032], [.132, .052], [.104, .068], [.110, .086], [.080, .106], [.060, .130], [.046, .150]]));   // bell foot
  g.add(lathe([[.046, .150], [.026, .180], [.048, .212], [.026, .238], [.024, .292], [.050, .322], [.024, .352], [.023, .395], [.040, .415]]));        // knopped stem
  g.add(lathe([[0, .410], [.046, .412], [.108, .424], [.148, .448], [.160, .478], [.150, .494], [.132, .484], [.118, .470], [.048, .458], [0, .456]]));  // the bowl, its lip rolled
  const oil = new THREE.Mesh(new THREE.CircleGeometry(.118, 36), _oil);
  oil.rotation.x = -Math.PI / 2; oil.position.y = .4665;
  g.add(oil);
  g.add(lathe([[0, .456], [.016, .456], [.018, .500], [.034, .526], [.014, .552], [.018, .568], [0, .590]]));   // the bud finial
  const fls = [];
  /* the spout: a beak pinched out of the lip, not a block set on it */
  const spoutGeo = new THREE.CylinderGeometry(.010, .026, .062, 10);
  for (let i = 0; i < wicks; i++) {
    const a = i * Math.PI * 2 / wicks + Math.PI / 4;
    const sp = new THREE.Mesh(spoutGeo, _brass);
    sp.position.set(Math.cos(a) * .168, .480, Math.sin(a) * .168);
    sp.rotation.z = Math.PI / 2; sp.rotation.order = 'YZX'; sp.rotation.y = -a;
    g.add(sp);
    const fl = flame(flameScale);
    fl.position.set(Math.cos(a) * .196, .525, Math.sin(a) * .196);
    g.add(fl); fls.push(fl);
  }
  const pl = light ? new THREE.PointLight(0xffa850, intensity, distance, 2) : null;
  if (pl) { pl.position.y = .62; g.add(pl); }
  g.traverse(o => { if (o.isMesh && o.material === _brass) { o.castShadow = true; o.receiveShadow = true; } });
  g.scale.setScalar(scale);
  g.userData.on = 1;
  g.userData.flames = fls;
  g.userData.light = pl;
  /* on: 0..1 — the flame shrinks to nothing and the light goes with it */
  g.userData.setOn = (v) => {
    g.userData.on = v;
    for (const fl of fls) fl.scale.setScalar(Math.max(.001, v));
    if (pl && v <= .01) pl.intensity = 0;   // never toggle .visible: a light-count change recompiles every lit program in view
  };
  g.userData.flicker = (t) => {
    let f = 1;
    for (let i = 0; i < fls.length; i++) f = fls[i].userData.flicker(t + i * 1.7);
    if (pl) pl.intensity = intensity * (.84 + f * .2) * g.userData.on;
    return f;
  };
  return g;
}
export function clayLamp({ scale = 1, light = true, intensity = 2.4, distance = 5, flameScale = .3 } = {}) {
  _clay = _clay || new THREE.MeshStandardMaterial({ color: 0x4a2c1f, roughness: 1 });   // fired clay, Kobicha darkened: under a flame it reads as earthenware, not an orange dish
  _oil = _oil || new THREE.MeshStandardMaterial({ color: 0x2a1c0a, roughness: .35, metalness: .1 });
  const g = new THREE.Group();
  const pts = [[0, 0], [.07, 0], [.09, .012], [.1, .03], [.096, .046], [.072, .042], [0, .042]].map(([r, y]) => new THREE.Vector2(r, y));
  const dish = new THREE.Mesh(new THREE.LatheGeometry(pts, 36), _clay);   // round enough for the lamp world's close-ups
  dish.castShadow = true; g.add(dish);
  const spout = new THREE.Mesh(new THREE.BoxGeometry(.05, .018, .032), _clay);
  spout.position.set(.1, .038, 0); g.add(spout);
  const oil = new THREE.Mesh(new THREE.CircleGeometry(.066, 36), _oil);
  oil.rotation.x = -Math.PI / 2; oil.position.y = .038; g.add(oil);
  const fl = flame(flameScale);
  fl.position.set(.11, .062, 0); g.add(fl);
  const pl = light ? new THREE.PointLight(0xffb070, intensity, distance, 2) : null;
  if (pl) { pl.position.set(.06, .26, 0); g.add(pl); }
  g.scale.setScalar(scale);
  g.userData.on = 1; g.userData.flames = [fl]; g.userData.light = pl;
  g.userData.setOn = (v) => { g.userData.on = v; fl.scale.setScalar(Math.max(.001, v)); if (pl && v <= .01) pl.intensity = 0; };
  g.userData.flicker = (t) => { const f = fl.userData.flicker(t); if (pl) pl.intensity = intensity * (.84 + f * .2) * g.userData.on; return f; };
  return g;
}
/* a lamp on a wall bracket: a small stone shelf let into the plaster, a
   clay lamp on it, and the soot it has left on the wall above. The group
   faces +z (the lamp out into the room); rotate it to its wall. */
export function bracketLamp({ scale = 1, intensity = 2.6, distance = 6, flameScale = .3, light = true } = {}) {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x847a6c, roughness: 1 });
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(.36, .05, .22), stone);
  shelf.position.set(0, 0, .11); shelf.castShadow = true; g.add(shelf);
  const brace = new THREE.Mesh(new THREE.BoxGeometry(.12, .15, .15), stone);
  brace.position.set(0, -.1, .075); g.add(brace);
  const lamp = clayLamp({ scale: .95, intensity, distance, flameScale, light });
  lamp.position.set(-.03, .025, .1); lamp.rotation.y = -Math.PI / 2;
  g.add(lamp);
  /* The smoke stain above the flame. Two things made it read as a LIT BOX
     on the wall rather than soot: an unlit material draws its texture at
     full strength, so a warm-brown stain sat BRIGHTER than a wall in
     lamplight; and the gradient's outer radius (64) reached past the
     canvas's half-width (32), so it was still opaque where the texture
     ran out — a hard vertical edge down each side. Now it is black, so it
     can only darken, and the falloff closes inside the canvas on every
     side, so it has no edge at all. */
  const [sc, sg] = canvas(64, 128);
  const grd = sg.createRadialGradient(32, 104, 3, 32, 86, 31);
  grd.addColorStop(0, 'rgba(0,0,0,.30)'); grd.addColorStop(.55, 'rgba(0,0,0,.10)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  sg.fillStyle = grd; sg.fillRect(0, 0, 64, 128);
  const soot = new THREE.Mesh(new THREE.PlaneGeometry(.4, .8), new THREE.MeshBasicMaterial({ map: tex(sc), transparent: true, depthWrite: false }));
  soot.position.set(0, .42, .008); g.add(soot);
  g.scale.setScalar(scale);
  g.userData.light = lamp.userData.light;
  g.userData.setOn = (v) => lamp.userData.setOn(v);
  g.userData.flicker = (t) => lamp.userData.flicker(t);
  return g;
}

export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/* Move a lamp's PointLight out of a group that will be shown and hidden,
   into one that stays visible, keeping its world position. Three.js keys
   every lit program on the number of visible lights, so a light inside a
   toggled group recompiles every material in view each time the group
   flips: a hitch of 100–300 ms in the middle of a scroll gesture. The
   flicker and setOn closures keep their reference to the light. */
export function hoistLight(lamp, into) {
  const pl = lamp.userData.light;
  if (!pl) return;
  into.updateMatrixWorld(true);
  const wp = pl.getWorldPosition(new THREE.Vector3());
  pl.removeFromParent();
  into.add(pl);
  pl.position.copy(into.worldToLocal(wp));
}

/* camera path helper: keys of {u,pos,look,fov} — smoothstep-blended per segment */
export function camTrack(keys) {
  return (u, out = {}) => {
    let i = 0;
    if (u <= keys[0].u) i = 0;
    else if (u >= keys[keys.length - 1].u) i = keys.length - 2;
    else while (keys[i + 1].u < u) i++;
    const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
    const t = a === b ? 0 : smooth(remap(u, a.u, b.u));
    out.pos = new THREE.Vector3().lerpVectors(a.pos, b.pos, t);
    out.look = new THREE.Vector3().lerpVectors(a.look, b.look, t);
    out.fov = lerp(a.fov ?? 42, b.fov ?? 42, t);
    return out;
  };
}
