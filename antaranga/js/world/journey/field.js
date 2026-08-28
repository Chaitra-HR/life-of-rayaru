// ANTARANGA · scene 07 / The Journey — THE GEOGRAPHIC FIELD.
// One authoritative description of the land: coastlines, relief, rivers,
// moisture and colour. Terrain, rivers, route, vegetation, landmarks and
// camera all read from here, so nothing can ever float above the ground or
// contradict the geography.
//
// Local frame: +x east, +z south, inherited unchanged from the destinations
// this chapter already placed —  x ≈ 5.0·(lon − 77.49),  z ≈ −8.5·(lat − 13.91).
// One unit is roughly 15–20 km. The map is not survey-grade; it is a
// sculptor's read of the peninsula, and the relative positions are true.
import { fbm, clamp01, lerp, smooth, win } from '../../util.js';

/* ---------------- coastlines ----------------
   [z, x] pairs sampled from the real coast through the frame above. */
const WEST = [
  [-60, -19.6], [-40, -18.6], [-25, -17.6], [-17, -17.0], [-6, -16.8],
  [5, -16.5], [12, -14.2], [17, -11.6], [24, -9.2], [33, -7.4],
  [41, -5.0], [47, -2.4], [52, 1.2], [70, 8.0],
];
const EAST = [
  [-60, 21.0], [-40, 19.2], [-32, 18.5], [-17, 14.4], [-4, 14.6],
  [7, 15.2], [15, 14.4], [21, 13.4], [28, 13.6], [31, 12.4],
  [34, 8.0], [39, 4.4], [45, 2.0], [52, -1.4], [70, -8.0],
];

function tableX(tab, z) {
  const n = tab.length;
  if (z <= tab[0][0]) return tab[0][1];
  if (z >= tab[n - 1][0]) return tab[n - 1][1];
  let i = 0; while (tab[i + 1][0] < z) i++;
  const a = tab[i], b = tab[i + 1];
  return lerp(a[1], b[1], smooth((z - a[0]) / (b[0] - a[0])));
}

export const westCoastX = (z) => tableX(WEST, z) + fbm(z * .09, 3.1, 2) * .9;
export const eastCoastX = (z) => tableX(EAST, z) + fbm(z * .075, 8.4, 2) * 1.3;

/* how far inland a point stands; negative at sea. South of the tip the two
   coasts cross, so the peninsula ends without any special case. */
export function landness(x, z) {
  return Math.min(x - westCoastX(z), eastCoastX(z) - x);
}

/* ---------------- the Western Ghats ----------------
   A single crest running just inland of the west coast: low in the north,
   tall through Karnataka and Malabar, interrupted at the Palghat gap. */
const ghatLine = (z) => westCoastX(z) + 4.6 + Math.sin(z * .07) * 1.2;
function ghatAmp(z) {
  let a = lerp(3.2, 10.0, smooth(clamp01((z + 26) / 28)));
  a *= lerp(1, .45, smooth(clamp01((z - 40) / 12)));            // spent by the tip
  const gap = Math.exp(-Math.pow((z - 26.5) / 3.4, 2));          // Palghat
  return a * (1 - gap * .6);
}

/* ---------------- rivers ----------------
   Physical channels, not drawn lines: each carves the terrain it crosses.
   [x, z] downstream. */
export const RIVERS = [
  { // Kaveri — down from the Ghats, past Srirangam, out through the delta.
    // It runs BESIDE the two Tamil sites, never through them.
    n: 'kaveri', d: .95, w: [[0, .7], [.35, 1.05], [.62, 1.35], [1, 1.9]],
    pts: [[-9.9, 12.8], [-6.4, 12.3], [-2.6, 13.4], [.9, 15.2], [1.3, 19.4],
          [2.0, 22.4], [4.2, 23.6], [6.2, 24.2], [8.6, 23.6], [10.4, 23.2],
          [12.2, 22.4], [14.4, 21.8]],
  },
  { // Vaigai — the dry river of the Madurai basin
    n: 'vaigai', d: .55, w: [[0, .5], [.5, .8], [1, 1.05]],
    pts: [[-.6, 32.6], [1.6, 34.2], [4.0, 35.4], [6.6, 37.6], [8.8, 38.6]],
  },
  { // the short coastal rivers behind Udupi — tidal by the time they arrive
    n: 'swarna', d: .5, w: [[0, .45], [.6, .8], [1, 1.3]],
    pts: [[-11.0, 3.4], [-12.6, 5.0], [-14.4, 6.2], [-16.2, 7.0], [-17.8, 7.4]],
  },
  { // Tungabhadra — the river the whole site begins and ends on. It widens
    // as the journey nears Manchale, and by then it is the subject; the
    // matha stands on its bank, not in it.
    n: 'tungabhadra', d: 1.05, w: [[0, .6], [.3, 1.0], [.55, 1.5], [.78, 2.0], [1, 2.6]],
    pts: [[-13.0, 3.2], [-11.2, -.6], [-9.2, -4.6], [-7.6, -8.6], [-6.2, -12.6],
          [-5.0, -16.4], [-3.0, -19.0], [.6, -20.2], [4.6, -20.6], [9.0, -20.4],
          [13.8, -19.6]],
  },
];

/* per-river arc tables and bounds, built once */
for (const r of RIVERS) {
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, wMax = 0;
  for (const [x, z] of r.pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  for (const [, w] of r.w) wMax = Math.max(wMax, w);
  const pad = wMax * 3.4;
  r.bb = [x0 - pad, x1 + pad, z0 - pad, z1 + pad];
  r.wMax = wMax;
  const cum = [0];
  for (let i = 1; i < r.pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]));
  }
  r.len = cum[cum.length - 1];
  r.cum = cum;
}

/* channel half-width at arc fraction s */
export function widthAt(r, s) {
  const w = r.w;
  if (s <= w[0][0]) return w[0][1];
  const n = w.length;
  if (s >= w[n - 1][0]) return w[n - 1][1];
  let i = 0; while (w[i + 1][0] < s) i++;
  return lerp(w[i][1], w[i + 1][1], smooth((s - w[i][0]) / (w[i + 1][0] - w[i][0])));
}

/* nearest point on a river: distance, and how far downstream it lies */
function nearestOn(r, x, z) {
  const pts = r.pts, cum = r.cum;
  let best = 1e9, bs = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i][0], az = pts[i][1];
    const dx = pts[i + 1][0] - ax, dz = pts[i + 1][1] - az;
    const len2 = dx * dx + dz * dz;
    let t = len2 > 0 ? ((x - ax) * dx + (z - az) * dz) / len2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = x - (ax + dx * t), ez = z - (az + dz * t);
    const d2 = ex * ex + ez * ez;
    if (d2 < best) { best = d2; bs = (cum[i] + Math.sqrt(len2) * t) / r.len; }
  }
  return { d: Math.sqrt(best), s: bs };
}

/* how deeply the rivers cut here, and how close the nearest water is */
export function riverField(x, z) {
  let carve = 0, near = 99, river = null, s = 0;
  for (const r of RIVERS) {
    const bb = r.bb;
    if (x < bb[0] || x > bb[1] || z < bb[2] || z > bb[3]) continue;
    const hit = nearestOn(r, x, z);
    const w = widthAt(r, hit.s);
    const t = hit.d / w;
    const c = r.d * Math.exp(-t * t);
    if (c > carve) { carve = c; river = r; s = hit.s; }
    const rel = hit.d - w;
    if (rel < near) near = rel;
  }
  return { carve, near, river, s };
}

/* ---------------- the five sites ----------------
   Their positions are geography too: the relief settles around each one so a
   landmark always has ground to stand on, exactly as the chapter did before. */
export const SITES = [
  { id: 'srirangam', x: 6, z: 26 },
  { id: 'kumbakonam', x: 10, z: 25 },
  { id: 'madurai', x: 4, z: 34 },
  { id: 'udupi', x: -14, z: 8 },
  { id: 'manchale', x: -2, z: -16 },
];

function siteSettle(x, z) {
  let k = 1;
  for (const s of SITES) {
    const d = Math.hypot(x - s.x, z - s.z);
    if (d > 6) continue;
    k = Math.min(k, lerp(.3, 1, smooth(clamp01((d - 1.2) / 4.2))));
  }
  return k;
}

/* ---------------- the pilgrimage route ----------------
   The path is geography too: it wears a shallow groove into the ground and
   pales the earth along it, so the line is IN the terrain and not drawn on
   top of it. The route mesh reads the same points. */
export const TRAIL = [
  [6, 26], [7.6, 25.4], [8.9, 25.0], [10, 25],
  [9.2, 26.8], [7.7, 29.2], [5.9, 31.6], [4, 34],
  [2.2, 32.6], [.2, 30.2], [-2.4, 27.0], [-5.0, 23.4],
  [-7.6, 19.6], [-10.0, 15.6], [-12.2, 11.8], [-14, 8],
  [-14.2, 4.4], [-13.2, .6], [-11.2, -3.4], [-8.6, -7.2],
  [-6.0, -10.6], [-3.8, -13.6], [-2, -16],
];
const TRAIL_BB = (() => {
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const [x, z] of TRAIL) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  return [x0 - 3, x1 + 3, z0 - 3, z1 + 3];
})();

/* distance from the worn path, in units */
export function trailNear(x, z) {
  if (x < TRAIL_BB[0] || x > TRAIL_BB[1] || z < TRAIL_BB[2] || z > TRAIL_BB[3]) return 99;
  let best = 1e9;
  for (let i = 0; i < TRAIL.length - 1; i++) {
    const ax = TRAIL[i][0], az = TRAIL[i][1];
    const dx = TRAIL[i + 1][0] - ax, dz = TRAIL[i + 1][1] - az;
    const len2 = dx * dx + dz * dz;
    let t = len2 > 0 ? ((x - ax) * dx + (z - az) * dz) / len2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = x - (ax + dx * t), ez = z - (az + dz * t);
    const d2 = ex * ex + ez * ez;
    if (d2 < best) best = d2;
  }
  return Math.sqrt(best);
}

/* ---------------- relief ----------------
   `rf` (a riverField result) may be passed in by callers that already have
   one — the terrain build asks for height and moisture at every vertex and
   the channel search is the expensive half. */
export function height(x, z, rf) {
  const L = landness(x, z);
  // the shelf falls away from the shore rather than dropping off a wall
  const sea = -.55 - clamp01(-L / 15) * 3.4;
  const shore = smooth(clamp01((L - .2) / 2.4));
  // the Deccan lifts to the north
  const plateau = smooth(clamp01((-z - 1) / 26)) * 3.8;
  // the crest
  // steep on the seaward face, a long dip into the rain shadow behind
  const gRaw = x - ghatLine(z);
  const gd = gRaw / (gRaw < 0 ? 2.6 : 4.0);
  // the crest is broken country, not a smooth swell
  const ridge = Math.exp(-gd * gd) * ghatAmp(z)
    * (1 + fbm(x * .11, z * .11, 2) * .55 + fbm(x * .34, z * .34, 3) * .42);
  // the Coromandel plain and the Kaveri delta lie almost flat
  const flat = win(z, 11, 19, 32, 40) * clamp01(x / 4) * .84;
  // a broken range closes the northern horizon, so the Deccan reads as
  // country continuing past the frame rather than a sheet with an edge
  const north = Math.exp(-Math.pow((z + 48) / 10, 2)) * (2.4 + fbm(x * .07, 17, 2) * 2.6);
  const coarse = fbm(x * .055 + 11, z * .055, 4);
  const mid = fbm(x * .12 + 3, z * .12, 3);
  const fine = fbm(x * .13, z * .13 + 5, 3);
  let h = 1.9 + plateau + ridge + north + (coarse * 2.7 + mid * 1.3 + fine * .55) * (1 - flat) * siteSettle(x, z);
  h = lerp(sea, h, shore);
  h -= (rf || riverField(x, z)).carve * shore;
  // the path has been walked into the ground
  const td = trailNear(x, z);
  if (td < 2) h -= .075 * Math.exp(-Math.pow(td / .62, 2)) * shore;
  return h;
}

/* ---------------- moisture ----------------
   0 dry earth, 1 wet forest. Drives colour, vegetation and the sense that
   the land itself is changing under the journey. */
export function moisture(x, z, rf) {
  const gd = x - ghatLine(z);
  // the windward side holds the rain; east of the crest is the shadow
  let m = smooth(clamp01((5.5 - gd) / 11));
  m *= lerp(.5, 1, smooth(clamp01((z + 22) / 30)));              // drier to the north
  // cultivation follows the delta
  m = Math.max(m, win(z, 17, 21, 28, 33) * smooth(clamp01((9 - Math.abs(x - 8)) / 6)) * .62);
  m -= win(z, 28, 32, 39, 45) * .30;                             // the Madurai basin is dry
  const r = rf || riverField(x, z);
  m = Math.max(m, clamp01((3.4 - r.near) / 3.4) * .58);          // green follows water
  m += fbm(x * .09 + 31, z * .09, 3) * .3;
  return clamp01(m);
}

/* ---------------- the palette ----------------
   Muted mineral colour. Nothing saturated, nothing tropical-postcard. */
export const PAL = {
  seaDeep: 0x25302f, seaShallow: 0x3a453f, sand: 0x93866c,
  dry: 0x8b7d61, warmEarth: 0x7c7156, cultivated: 0x6b7350,
  scrub: 0x7b8163, forest: 0x5d6a45, deepForest: 0x4c583a,
  rock: 0x77705f, highRock: 0x6c675a, stone: 0xa39a86,
};
