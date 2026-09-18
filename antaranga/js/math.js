// ANTARANGA · pure math — no THREE, no DOM.
// Split out of util.js so a Worker can import the noise and the RNG without
// dragging the renderer (and `document`) into a thread that has neither.

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
