// ANTARANGA · stone maps — the pixels, and nothing else.
//
// One seed drives four maps so they agree pixel for pixel: albedo, a normal
// derived from a height field of courses, joints, chisel and pitting, plus
// roughness and AO. This is the arithmetic only — no canvas, no texture, no
// DOM — so the same code runs on the main thread and inside stone-worker.js
// and produces byte-identical maps either way.
//
// It is not cheap: a 768² set is ~590k pixels, each costing three fbm calls
// and four hashes. That is a second and a half of solid main thread, which is
// exactly why it is worth moving off it.

import { mulberry, fbm, clamp01 } from '../math.js';

export const STONE_DEFAULTS = {
  size: 768, courses: 7, cols: 4, jointPx: 7,
  base: [92, 94, 96], vary: .22, cool: .05, warm: .03, normalScale: 1, chisel: .5,
};

/* the cache key must name every value that changes a pixel */
export function stoneKey(seed, o = {}) {
  const p = { ...STONE_DEFAULTS, ...o };
  return [seed, p.size, p.courses, p.cols, p.jointPx, p.base.join(),
    p.vary, p.cool, p.warm, p.normalScale, p.chisel].join('/');
}

export function stoneMaps(seed, opts = {}) {
  const { size, courses, cols, jointPx, base, vary, cool, warm, normalScale, chisel } =
    { ...STONE_DEFAULTS, ...opts };
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
  return { size: W, alb, nrm, rough, ao };
}
