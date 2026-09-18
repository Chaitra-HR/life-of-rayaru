// ANTARANGA · scene 07 / The Journey — DESTINATION CONFIGURATION.
// Everything the chapter needs to know about a place lives in one record.
// The five positions are inherited unchanged from the chapter as it was
// authored; only the order of the first two is corrected so the route reads
// Srirangam → Kumbakonam, the sequence the narrative names.
import * as THREE from 'three';
import { clamp01, lerp, smooth, V3 } from '../../util.js';
import { height, TRAIL } from './field.js';

/* environmental signature of each leg — the air, not the ground */
const AIR = {
  plains:  { sun: 0xd6c3aa, sky: 0x8a8574, ground: 0x2a2620, mist: .30, warm: .55 },
  dry:     { sun: 0xd8c1a2, sky: 0x8d8570, ground: 0x2e2820, mist: .19, warm: .60 },
  ghats:   { sun: 0xc3c3b6, sky: 0x76806f, ground: 0x1f2620, mist: .70, warm: .22 },
  coast:   { sun: 0xc9c8b8, sky: 0x738078, ground: 0x1e2622, mist: .56, warm: .28 },
  inland:  { sun: 0xd3c4ab, sky: 0x878373, ground: 0x2c2720, mist: .36, warm: .48 },
};

/* The road passes five places. Four are NAMED in the world (a word on the
   land, labels.js) and given a beat in the narrative column (scroll.js);
   Srirangam stays on the route but is passed without a name — the story
   has nothing to say there, and a stop without a story is a tour. The
   stations (uTarget) are spaced so each named place has a viewport of
   scroll to be read; scroll.js maps them through t = .560 + u·.095. */
export const DESTINATIONS = [
  {
    id: 'srirangam', name: 'SRIRANGAM',
    x: 6, z: 26, scale: 1.0, landmark: 'srirangam', unnamed: true,
    labelSide: 'left', air: AIR.plains, uTarget: .06, sCam: .057,
  },
  {
    id: 'kumbakonam', name: 'KUMBAKONAM',
    x: 10, z: 25, scale: .92, landmark: 'kumbakonam',
    labelSide: 'right', air: AIR.plains, uTarget: .20, sCam: .150,
  },
  {
    id: 'madurai', name: 'MADURAI',
    x: 4, z: 34, scale: 1.04, landmark: 'madurai',
    labelSide: 'left', air: AIR.dry, uTarget: .42, sCam: .285,
  },
  {
    id: 'udupi', name: 'UDUPI',
    x: -14, z: 8, scale: .9, landmark: 'udupi',
    labelSide: 'right', air: AIR.coast, uTarget: .66, sCam: .679,
  },
  {
    id: 'manchale', name: 'MANCHALE',
    x: -2, z: -16, scale: .8, landmark: 'manchale',
    labelSide: 'left', air: AIR.inland, final: true, uTarget: .93, sCam: .935,
  },
];
for (const d of DESTINATIONS) d.y = height(d.x, d.z);

/* ---------------- the pilgrimage route ----------------
   Not a straight line between pins: it leans around relief, follows the
   Kaveri east, turns south-west into the dry country, climbs the Ghats at a
   shallow angle and comes down to the coast. The points live in the field,
   because the ground is carved and paled along them. */
export const ROUTE_PTS = TRAIL;

export function routeCurve() {
  return new THREE.CatmullRomCurve3(
    ROUTE_PTS.map(([x, z]) => V3(x, 0, z)), false, 'catmullrom', .3);
}

/* ---------------- the camera path ----------------
   The chapter's original travel, kept: one continuous glide that opens
   beside the first destination, crosses the peninsula and decelerates into
   Manchale. Only the first two waypoints are re-ordered (Srirangam now
   precedes Kumbakonam) and the line is carried slightly off the route so the
   landmarks and the path never sit dead-centre.
   y is not authored here — the camera rides a measured height above the
   terrain, so it can never clip a hill or float off one. */
export const CAM_PTS = [
  // south down the Kaveri country to Srirangam, then east to Kumbakonam
  [2.6, 13.0], [2.2, 17.0], [2.0, 21.0], [2.4, 25.0],
  [3.6, 27.6], [6.4, 28.6], [9.4, 28.4], [11.8, 26.6],
  // south-west into the dry basin and Madurai
  [10.2, 30.2], [8.8, 34.2], [6.8, 38.0], [3.4, 39.8],
  // north up the dry inland plateau, well east of the crest
  [1.4, 36.4], [1.6, 31.0], [1.8, 26.0], [1.4, 21.4],
  // north-west into the Western Ghats, over the crest, down the seaward face
  [-.6, 17.8], [-3.0, 15.2], [-6.2, 13.2], [-9.4, 11.6],
  // along the coast past Udupi, then inland to the Tungabhadra and Manchale
  [-12.6, 9.6], [-15.6, 8.4], [-17.4, 5.0], [-16.4, .6],
  [-14.4, -3.4], [-11.6, -6.8], [-9.0, -9.6], [-7.0, -11.6], [-6.5, -12.6],
];

export function camCurve() {
  return new THREE.CatmullRomCurve3(
    CAM_PTS.map(([x, z]) => V3(x, 0, z)), false, 'catmullrom', .32);
}

/* ---------------- the flight profile ----------------
   Altitude above the ground and downward viewing angle, keyed to u. The
   rhythm the brief asks for is written here once: pull away on departure,
   ride high across the great landscape transitions, settle low on approach —
   and at the very end give up the map altogether. */
/* the peaks were 12–15 with troughs of 3–6, five times: a helicopter
   reel. The rhythm stays (higher between places, lower at each) inside a
   band a viewer reads as one steady glide. */
/* ON THE GROUND. This was a helicopter: 6–10 units up, looking 20° down,
   and from there a temple is a model and the sea fills the frame. A
   pilgrim's eye is a unit and a half off the road. Between places the
   camera lifts a little so the country reads; at each place it comes
   right down and the building stands over it. */
const ALT = [
  [.00, 2.4], [.075, 1.7], [.13, 2.6], [.16, 1.7], [.24, 2.9],
  [.32, 1.8], [.44, 3.0], [.52, 2.6], [.60, 1.7], [.72, 3.0],
  [.84, 2.5], [.93, 1.6], [1.0, 1.4],
];
/* a lower gaze than before: the land passes beneath, but the buildings are
   seen in elevation at every arrival, never top-down */
/* and the gaze is nearly level: down the road ahead, up at the gopuram */
const PITCH = [
  [.00, 8], [.075, 4], [.13, 8], [.16, 4], [.25, 8],
  [.32, 4], [.44, 8], [.52, 7], [.60, 4], [.72, 8],
  [.84, 7], [.93, 3], [1.0, 2],
];

function curveAt(table, u) {
  if (u <= table[0][0]) return table[0][1];
  const n = table.length;
  if (u >= table[n - 1][0]) return table[n - 1][1];
  let i = 0; while (table[i + 1][0] < u) i++;
  const a = table[i], b = table[i + 1];
  return lerp(a[1], b[1], smooth((u - a[0]) / (b[0] - a[0])));
}
export const altitudeAt = (u) => curveAt(ALT, u);
export const pitchAt = (u) => curveAt(PITCH, u);

/* the air, blended between the destinations we are travelling between.
   One scratch record, reused: this runs every frame. */
const _air = {
  sun: new THREE.Color(), sky: new THREE.Color(), ground: new THREE.Color(),
  mist: 0, warm: 0,
};
const _cA = new THREE.Color(), _cB = new THREE.Color();
export function airAt(u) {
  const ds = DESTINATIONS;
  let i = 0;
  while (i < ds.length - 1 && ds[i + 1].u0 < u) i++;
  const a = ds[i], b = ds[Math.min(i + 1, ds.length - 1)];
  const t = a === b || b.u0 <= a.u0 ? 0 : smooth(clamp01((u - a.u0) / (b.u0 - a.u0)));
  const A = a.air, B = b.air;
  _air.sun.copy(_cA.setHex(A.sun)).lerp(_cB.setHex(B.sun), t);
  _air.sky.copy(_cA.setHex(A.sky)).lerp(_cB.setHex(B.sky), t);
  _air.ground.copy(_cA.setHex(A.ground)).lerp(_cB.setHex(B.ground), t);
  _air.mist = lerp(A.mist, B.mist, t);
  _air.warm = lerp(A.warm, B.warm, t);
  return _air;
}
