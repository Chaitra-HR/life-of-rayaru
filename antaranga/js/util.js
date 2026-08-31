// ANTARANGA · shared utilities
import * as THREE from 'three';

/* ---------------- math ---------------- */
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const clamp01 = v => clamp(v, 0, 1);
export const lerp = (a, b, t) => a + (b - a) * t;
export const remap = (v, a, b) => clamp01((v - a) / (b - a));
export const smooth = t => t * t * (3 - 2 * t);
const smoother = t => t * t * t * (t * (t * 6 - 15) + 10);
// window: 0 outside [a,d], 1 inside [b,c], smooth ramps between
export const win = (v, a, b, c, d) => smooth(remap(v, a, b)) * (1 - smooth(remap(v, c, d)));
// frame-rate independent damping
export const damp = (cur, target, lambda, dt) => lerp(cur, target, 1 - Math.exp(-lambda * dt));

export function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* value noise + fbm (for terrain, stone) */
const _r = mulberry(1337);
const PERM = new Uint8Array(512);
{ const p = []; for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(_r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255]; }
function grad2(h, x, y) { switch (h & 3) { case 0: return x + y; case 1: return -x + y; case 2: return x - y; default: return -x - y; } }
export function noise2(x, y) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
  x -= Math.floor(x); y -= Math.floor(y);
  const u = smoother(x), v = smoother(y);
  const a = PERM[X + PERM[Y]], b = PERM[X + 1 + PERM[Y]], c = PERM[X + PERM[Y + 1]], d = PERM[X + 1 + PERM[Y + 1]];
  return lerp(lerp(grad2(a, x, y), grad2(b, x - 1, y), u), lerp(grad2(c, x, y - 1), grad2(d, x - 1, y - 1), u), v) * .7;
}
export function fbm(x, y, oct = 4, lac = 2, gain = .5) {
  let s = 0, amp = .5, f = 1;
  for (let i = 0; i < oct; i++) { s += amp * noise2(x * f, y * f); f *= lac; amp *= gain; }
  return s;
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
   ONE face (Onest), and only the two weights the CSS ladder allows —
   500 for titles and labels, 300 for the monumental/dim register.
   These stacks are deliberately SHORTER than the CSS ones: a family named
   in a canvas font stack is downloaded even when the first family covers
   every glyph, so listing Satoshi here fetched it on every load for
   nothing. The DOM keeps Satoshi as its offline fallback; canvas floors
   out on the system sans, which only matters if Onest itself fails. */
const FONTS = {
  serif: '500 %spx "Onest", sans-serif',        // in-scene titles, names
  serifItalic: '300 %spx "Onest", sans-serif',  // dim echoes
  kn: '300 %spx "Noto Sans Kannada", sans-serif',
  dn: '400 %spx "Noto Serif Devanagari", serif',
  sans: '500 %spx "Onest", sans-serif',         // in-scene labels
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

export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

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
